import { prisma } from '../../config/database';
import { AppError } from '../../utils/http';

const heroSelect = {
  id: true,
  phone: true,
  name: true,
  email: true,
  status: true,
  dutyStatus: true,
  cityId: true,
  hubId: true,
  rating: true,
  totalBookings: true,
  isBlacklisted: true,
  needsSpotCheck: true,
  profilePhotoUrl: true,
  createdAt: true,
  city: { select: { id: true, name: true } },
  hub: { select: { id: true, name: true } },
} as const;

export async function listHeroes(filter: { status?: string; cityId?: number; q?: string; page?: number; limit?: number }) {
  const page = filter.page ?? 1;
  const limit = Math.min(filter.limit ?? 20, 100);
  const where: Record<string, unknown> = { deletedAt: null };
  if (filter.status) where.status = filter.status;
  if (filter.cityId) where.cityId = filter.cityId;
  if (filter.q) {
    where.OR = [
      { name: { contains: filter.q } },
      { phone: { contains: filter.q } },
    ];
  }
  const [total, heroes] = await Promise.all([
    prisma.hero.count({ where }),
    prisma.hero.findMany({ where, select: heroSelect, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
  ]);
  return { total, page, limit, heroes };
}

export async function getHero(id: number) {
  const hero = await prisma.hero.findFirst({
    where: { id, deletedAt: null },
    include: {
      city: true,
      hub: true,
      skills: { include: { service: { select: { id: true, name: true } } } },
      documents: true,
    },
  });
  if (!hero) throw new AppError(404, 'Hero not found', 'NOT_FOUND');
  return hero;
}

export async function verifyHero(id: number, actorUserId: number) {
  await getHero(id);
  return prisma.hero.update({
    where: { id },
    data: { status: 'VERIFIED', verifiedAt: new Date(), verifiedById: actorUserId, needsSpotCheck: false, rejectionReason: null },
  });
}

export async function rejectHero(id: number, reason: string) {
  await getHero(id);
  return prisma.hero.update({ where: { id }, data: { status: 'REJECTED', rejectionReason: reason } });
}

export async function setHeroBlacklist(id: number, blacklisted: boolean, reason?: string) {
  await getHero(id);
  return prisma.hero.update({
    where: { id },
    data: {
      isBlacklisted: blacklisted,
      blacklistReason: blacklisted ? reason : null,
      blacklistedAt: blacklisted ? new Date() : null,
    },
  });
}

export async function updateHero(
  id: number,
  input: {
    name?: string;
    cityId?: number;
    hubId?: number;
    language?: 'ENGLISH' | 'HINDI' | 'HINGLISH';
    workType?: 'HELPER' | 'BIKE_RIDER';
    vehicleType?: 'CYCLE' | 'BIKE' | 'ELECTRIC_BIKE' | 'NO_VEHICLE' | 'COMPANY_EV';
    earningsType?: 'SALARY' | 'COMMISSION';
    skillServiceIds?: number[];
  },
) {
  await getHero(id);
  return prisma.$transaction(async (tx) => {
    if (input.skillServiceIds) {
      await tx.heroSkill.deleteMany({ where: { heroId: id } });
      if (input.skillServiceIds.length) {
        await tx.heroSkill.createMany({
          data: input.skillServiceIds.map((serviceId) => ({ heroId: id, serviceId, isActive: true })),
        });
      }
    }
    return tx.hero.update({
      where: { id },
      data: {
        name: input.name,
        cityId: input.cityId,
        hubId: input.hubId,
        language: input.language,
        workType: input.workType,
        vehicleType: input.vehicleType,
        earningsType: input.earningsType,
      },
    });
  });
}

export async function listCustomers(filter: { q?: string; page?: number; limit?: number }) {
  const page = filter.page ?? 1;
  const limit = Math.min(filter.limit ?? 20, 100);
  const where: Record<string, unknown> = { deletedAt: null };
  if (filter.q) where.OR = [{ name: { contains: filter.q } }, { phone: { contains: filter.q } }];
  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { bookings: true, addresses: true } } },
    }),
  ]);
  return { total, page, limit, customers };
}

export async function listLiveMap() {
  const heroes = await prisma.hero.findMany({
    where: { deletedAt: null, isActive: true, dutyStatus: 'ONLINE' },
    select: {
      id: true,
      name: true,
      phone: true,
      dutyStatus: true,
      currentLat: true,
      currentLng: true,
      currentLocationUpdatedAt: true,
      hub: { select: { id: true, name: true } },
      city: { select: { id: true, name: true } },
    },
    orderBy: { currentLocationUpdatedAt: 'desc' },
    take: 200,
  });
  return {
    googleMapsConfigured: Boolean(process.env.GOOGLE_MAPS_API_KEY),
    heroes,
  };
}

export async function listAttendance(filter: { hubId?: number; page?: number; limit?: number }) {
  const page = filter.page ?? 1;
  const limit = Math.min(filter.limit ?? 20, 100);
  const where = filter.hubId ? { hubId: filter.hubId } : {};
  const [total, rows] = await Promise.all([
    prisma.heroAttendance.count({ where }),
    prisma.heroAttendance.findMany({
      where,
      orderBy: { checkedInAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        hero: { select: { id: true, name: true, phone: true } },
        hub: { select: { id: true, name: true } },
      },
    }),
  ]);
  return { total, page, limit, attendance: rows };
}

export async function listLeaves(filter: { status?: string; page?: number; limit?: number }) {
  const page = filter.page ?? 1;
  const limit = Math.min(filter.limit ?? 20, 100);
  const where = filter.status ? { status: filter.status as 'PENDING' | 'APPROVED' | 'REJECTED' } : {};
  const [total, rows] = await Promise.all([
    prisma.heroLeave.count({ where }),
    prisma.heroLeave.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { hero: { select: { id: true, name: true, phone: true } } },
    }),
  ]);
  return { total, page, limit, leaves: rows };
}

export async function reviewLeave(id: number, actorId: number, status: 'APPROVED' | 'REJECTED', note?: string) {
  const leave = await prisma.heroLeave.findUnique({ where: { id } });
  if (!leave) throw new AppError(404, 'Leave not found', 'NOT_FOUND');
  return prisma.heroLeave.update({
    where: { id },
    data: { status, reviewedById: actorId, reviewedAt: new Date(), reviewNote: note },
  });
}
