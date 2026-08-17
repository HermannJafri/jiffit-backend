import { prisma } from '../../config/database';
import { AppError } from '../../utils/http';
import { haversineDistance } from '../../utils/haversine';
import { env } from '../../config/env';
import { HUB_CHECKIN_RADIUS_METERS } from '../../config/constants';
import { assertBookingTransition, bookingAudit } from '../bookings/booking-integrity';
import { acceptOffer, declineOffer, getHeroOffers } from '../dispatch/dispatch.service';
import { uploadPublicObject } from '../media/storage.service';

export async function checkIn(heroId: number, input: { hubId: number; latitude: number; longitude: number; selfieUrl?: string }) {
  const hub = await prisma.hub.findFirst({ where: { id: input.hubId, isActive: true } });
  if (!hub) throw new AppError(404, 'Hub not found', 'NOT_FOUND');
  const distance = haversineDistance(input.latitude, input.longitude, Number(hub.latitude), Number(hub.longitude));
  const radius = hub.checkinRadiusMeters || HUB_CHECKIN_RADIUS_METERS;
  if (distance > radius) {
    throw new AppError(400, 'You are outside the hub check-in radius', 'OUTSIDE_CHECKIN_RADIUS', {
      distanceMeters: Math.round(distance),
      radiusMeters: radius,
    });
  }
  const open = await prisma.heroAttendance.findFirst({ where: { heroId, checkedOutAt: null } });
  if (open) throw new AppError(409, 'Already checked in', 'ALREADY_CHECKED_IN');
  const attendance = await prisma.heroAttendance.create({
    data: {
      heroId,
      hubId: hub.id,
      latitude: input.latitude,
      longitude: input.longitude,
      distanceMeters: Math.round(distance),
      selfieUrl: input.selfieUrl,
      checkedInAt: new Date(),
    },
  });
  await prisma.hero.update({ where: { id: heroId }, data: { dutyStatus: 'ONLINE', hubId: hub.id } });
  return attendance;
}

export async function checkOut(heroId: number, reason?: string) {
  const open = await prisma.heroAttendance.findFirst({ where: { heroId, checkedOutAt: null }, orderBy: { checkedInAt: 'desc' } });
  if (!open) throw new AppError(409, 'Not checked in', 'NOT_CHECKED_IN');
  const attendance = await prisma.heroAttendance.update({
    where: { id: open.id },
    data: { checkedOutAt: new Date(), checkoutReason: reason },
  });
  await prisma.hero.update({ where: { id: heroId }, data: { dutyStatus: 'OFFLINE' } });
  return attendance;
}

export async function pingLocation(heroId: number, input: { latitude: number; longitude: number; accuracyMeters?: number; isMocked?: boolean }) {
  const now = new Date();
  const stale = new Date(now.getTime() + env.HERO_LOCATION_DUTY_STALE_SECONDS * 1000);
  await prisma.hero.update({
    where: { id: heroId },
    data: { currentLat: input.latitude, currentLng: input.longitude, currentLocationUpdatedAt: now },
  });
  return prisma.heroLatestLocation.upsert({
    where: { heroId },
    create: {
      heroId,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracyMeters: input.accuracyMeters,
      isMocked: input.isMocked ?? false,
      mode: 'DUTY',
      source: 'REST',
      origin: 'GPS',
      serverReceivedAt: now,
      locationUpdatedAt: now,
      staleAfterAt: stale,
    },
    update: {
      latitude: input.latitude,
      longitude: input.longitude,
      accuracyMeters: input.accuracyMeters,
      isMocked: input.isMocked ?? false,
      source: 'REST',
      serverReceivedAt: now,
      locationUpdatedAt: now,
      staleAfterAt: stale,
    },
  });
}

export async function listHeroJobs(heroId: number, filter: 'active' | 'upcoming' | 'history' = 'active') {
  const status =
    filter === 'active'
      ? ['ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS']
      : filter === 'upcoming'
        ? ['ASSIGNED', 'ACCEPTED']
        : ['COMPLETED', 'CANCELLED'];
  return prisma.booking.findMany({
    where: { assignedHeroId: heroId, deletedAt: null, status: { in: status as any } },
    orderBy: { slotStartAt: 'asc' },
    include: {
      items: true,
      city: { select: { id: true, name: true } },
    },
  });
}

export async function getHeroJob(heroId: number, bookingId: number) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, assignedHeroId: heroId, deletedAt: null },
    include: { items: true, city: true, statusHistory: { orderBy: { createdAt: 'asc' } } },
  });
  if (!booking) throw new AppError(404, 'Job not found', 'NOT_FOUND');
  return booking;
}

export async function acceptHeroJob(heroId: number, bookingId: number) {
  return acceptOffer(bookingId, heroId);
}

export async function declineHeroJob(heroId: number, bookingId: number, reason?: string) {
  return declineOffer(bookingId, heroId, reason);
}

export async function listOffers(heroId: number) {
  return getHeroOffers(heroId);
}

export async function advanceHeroJob(heroId: number, bookingId: number, to: 'ON_THE_WAY' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED', extra?: { startOtp?: string; paymentMethod?: string }) {
  const booking = await getHeroJob(heroId, bookingId);
  if (to === 'IN_PROGRESS') {
    if (!extra?.startOtp || extra.startOtp !== booking.startOtp) {
      throw new AppError(400, 'Invalid start OTP', 'INVALID_START_OTP');
    }
  }
  if (to === 'COMPLETED' && !booking.afterPhotoUrl) {
    throw new AppError(400, 'After photo is required to complete', 'AFTER_PHOTO_REQUIRED');
  }
  assertBookingTransition({ from: booking.status, to, actorType: 'HERO' });
  return prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: to,
      startOtpVerifiedAt: to === 'IN_PROGRESS' ? new Date() : booking.startOtpVerifiedAt,
      completedAt: to === 'COMPLETED' ? new Date() : undefined,
      paymentMethod: extra?.paymentMethod ?? booking.paymentMethod,
      cashSettled: to === 'COMPLETED' && (extra?.paymentMethod ?? booking.paymentMethod) === 'CASH' ? false : booking.cashSettled,
      version: { increment: 1 },
      statusHistory: {
        create: {
          fromStatus: booking.status,
          toStatus: to,
          ...bookingAudit({
            actorType: 'HERO',
            actorId: heroId,
            source: 'HERO_APP',
            reasonCode: `HERO_${to}`,
            reasonText: `Hero moved job to ${to}`,
          }),
        },
      },
    },
  });
}

export async function attachJobPhoto(heroId: number, bookingId: number, kind: 'before' | 'after', file: { buffer: Buffer; filename: string; contentType: string }) {
  await getHeroJob(heroId, bookingId);
  const uploaded = await uploadPublicObject({
    folder: `bookings/${bookingId}/${kind}`,
    filename: file.filename,
    body: file.buffer,
    contentType: file.contentType,
  });
  return prisma.booking.update({
    where: { id: bookingId },
    data: kind === 'before' ? { beforePhotoUrl: uploaded.url } : { afterPhotoUrl: uploaded.url },
  });
}

export async function requestLeave(heroId: number, input: { type: 'SICK' | 'CASUAL' | 'EMERGENCY' | 'OTHER'; fromDate: string; toDate: string; reason: string }) {
  const from = new Date(`${input.fromDate}T00:00:00.000Z`);
  const to = new Date(`${input.toDate}T00:00:00.000Z`);
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1);
  return prisma.heroLeave.create({
    data: {
      heroId,
      type: input.type,
      fromDate: from,
      toDate: to,
      totalDays: days,
      reason: input.reason,
    },
  });
}

export async function listLeaves(heroId: number) {
  return prisma.heroLeave.findMany({ where: { heroId }, orderBy: { createdAt: 'desc' } });
}
