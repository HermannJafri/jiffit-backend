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
