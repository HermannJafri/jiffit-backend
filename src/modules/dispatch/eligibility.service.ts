import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { haversineDistance } from '../../utils/haversine';
import { calculateRouteEta } from './route-eta.service';
import { canonicalBookingWindow } from './dispatch-time';
import { comparePrimaryHeroCandidates, isFollowingRouteFeasible, isPreviousRouteFeasible } from './dispatch-state-machine';

export type EligibilityPhase = 'PREFLIGHT' | 'RELEASE' | 'ACCEPTANCE' | 'MANUAL';

export type RankedHero = {
  heroId: number;
  heroName: string | null;
  rating: number;
  workload: number;
  distanceMeters: number;
  etaSeconds: number;
  locationConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  originSource: string;
  latitude: number;
  longitude: number;
  code?: string;
};

function coords(lat: unknown, lng: unknown): { latitude: number; longitude: number } | null {
  const latitude = Number(lat);
  const longitude = Number(lng);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
}

export async function listEligibleHeroes(bookingId: number, phase: EligibilityPhase = 'RELEASE'): Promise<RankedHero[]> {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, deletedAt: null },
    select: {
      id: true,
      cityId: true,
      latitude: true,
      longitude: true,
      status: true,
      slotStartAt: true,
      slotEndAt: true,
      scheduledDate: true,
      scheduledFromTime: true,
      scheduledToTime: true,
      items: { select: { serviceId: true } },
    },
  });
  if (!booking || !['PENDING_ASSIGNMENT', 'ON_HOLD', 'ASSIGNED', 'ACCEPTED'].includes(booking.status)) return [];

  const destination = coords(booking.latitude, booking.longitude);
  const window = canonicalBookingWindow(booking);
  const requiredSkills = [...new Set(booking.items.flatMap((item) => (item.serviceId == null ? [] : [item.serviceId])))];
  const dayStart = new Date(`${window.start.toISOString().slice(0, 10)}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  const heroes = await prisma.hero.findMany({
    where: {
      cityId: booking.cityId,
      status: 'VERIFIED',
      isActive: true,
      isBlacklisted: false,
      deletedAt: null,
      deleteRequestedAt: null,
      ...(requiredSkills.length
        ? { skills: { some: { isActive: true, serviceId: { in: requiredSkills } } } }
        : {}),
    },
    select: {
      id: true,
      name: true,
      rating: true,
      dutyStatus: true,
      deviceToken: true,
      currentLat: true,
      currentLng: true,
      homeLatitude: true,
      homeLongitude: true,
      hub: { select: { latitude: true, longitude: true } },
      skills: { where: { isActive: true }, select: { serviceId: true } },
      devices: { select: { id: true } },
      attendance: { where: { checkedOutAt: null }, take: 1, select: { latitude: true, longitude: true, checkedInAt: true } },
      leaves: {
        where: { status: 'APPROVED', fromDate: { lt: dayEnd }, toDate: { gte: dayStart } },
        select: { id: true },
      },
    },
  });

  const ranked: RankedHero[] = [];
  for (const hero of heroes) {
    const skills = new Set(hero.skills.map((skill) => skill.serviceId));
    if (requiredSkills.some((serviceId) => !skills.has(serviceId))) continue;
    if (hero.leaves.length > 0) continue;
    if (!hero.deviceToken && hero.devices.length === 0 && phase !== 'MANUAL' && phase !== 'PREFLIGHT') continue;
    if ((phase === 'RELEASE' || phase === 'ACCEPTANCE' || phase === 'MANUAL') && (hero.dutyStatus !== 'ONLINE' || hero.attendance.length === 0)) {
      continue;
    }

    const overlap = await prisma.booking.findFirst({
      where: {
        id: { not: bookingId },
        deletedAt: null,
        status: { in: ['ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'] },
        slotStartAt: { lt: window.end },
        slotEndAt: { gt: window.start },
        OR: [{ assignedHeroId: hero.id }, { teamMembers: { some: { heroId: hero.id, status: 'ACTIVE' } } }],
      },
      select: { id: true },
    });
    if (overlap) continue;

    const origin =
      coords(hero.currentLat, hero.currentLng) ??
      coords(hero.attendance[0]?.latitude, hero.attendance[0]?.longitude) ??
      coords(hero.homeLatitude, hero.homeLongitude) ??
      coords(hero.hub?.latitude, hero.hub?.longitude);
    if (!origin) continue;

    const eta = destination
      ? await calculateRouteEta(origin, destination, { allowFallback: true })
      : { durationSeconds: 15 * 60, distanceMeters: 0, fallbackUsed: true, provider: 'CONSERVATIVE_FALLBACK' as const };

    if (destination) {
      const previous = await prisma.booking.findFirst({
        where: {
          id: { not: bookingId },
          deletedAt: null,
          slotEndAt: { lte: window.start },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
          OR: [{ assignedHeroId: hero.id }, { teamMembers: { some: { heroId: hero.id, status: 'ACTIVE' } } }],
        },
        orderBy: { slotEndAt: 'desc' },
        select: { slotEndAt: true, latitude: true, longitude: true },
      });
      if (previous?.slotEndAt && previous.latitude && previous.longitude) {
        const previousEta = await calculateRouteEta(
          { latitude: Number(previous.latitude), longitude: Number(previous.longitude) },
          destination,
          { allowFallback: true },
        );
        if (!isPreviousRouteFeasible(previous.slotEndAt, previousEta.durationSeconds, env.DISPATCH_CLEANUP_PREP_BUFFER_MINUTES, window.start)) {
          continue;
        }
      }
      const following = await prisma.booking.findFirst({
        where: {
          id: { not: bookingId },
          deletedAt: null,
          slotStartAt: { gte: window.end },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
          OR: [{ assignedHeroId: hero.id }, { teamMembers: { some: { heroId: hero.id, status: 'ACTIVE' } } }],
        },
        orderBy: { slotStartAt: 'asc' },
        select: { slotStartAt: true, latitude: true, longitude: true },
      });
      if (following?.slotStartAt && following.latitude && following.longitude) {
        const followingEta = await calculateRouteEta(destination, {
          latitude: Number(following.latitude),
          longitude: Number(following.longitude),
        }, { allowFallback: true });
        if (!isFollowingRouteFeasible(window.end, followingEta.durationSeconds, env.DISPATCH_CLEANUP_PREP_BUFFER_MINUTES, following.slotStartAt)) {
          continue;
        }
      }
    }

    const workload = await prisma.booking.count({
      where: {
        deletedAt: null,
        status: { notIn: ['CANCELLED', 'REFUNDED', 'COMPLETED'] },
        OR: [{ assignedHeroId: hero.id }, { teamMembers: { some: { heroId: hero.id, status: 'ACTIVE' } } }],
      },
    });

    ranked.push({
      heroId: hero.id,
      heroName: hero.name,
      rating: Number(hero.rating),
      workload,
      distanceMeters: destination ? haversineDistance(origin.latitude, origin.longitude, destination.latitude, destination.longitude) : eta.distanceMeters,
      etaSeconds: eta.durationSeconds,
      locationConfidence: hero.currentLat ? 'HIGH' : hero.attendance[0] ? 'MEDIUM' : 'LOW',
      originSource: hero.currentLat ? 'FRESH_LIVE_LOCATION' : hero.attendance[0] ? 'ATTENDANCE_CHECK_IN' : 'HUB',
      latitude: origin.latitude,
      longitude: origin.longitude,
    });
  }

  return ranked.sort(comparePrimaryHeroCandidates);
}
