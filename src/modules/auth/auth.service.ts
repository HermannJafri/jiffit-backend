import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/http';
import { hashToken, refreshExpiryDate, tokensFor, verifyRefreshToken } from '../../services/jwt.service';

export async function loginDashboard(username: string, password: string) {
  const user = await prisma.dashboardUser.findUnique({ where: { username } });
  if (!user || !user.isActive) {
    throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
  }
  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
  }

  await prisma.dashboardUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const tokens = tokensFor({
    id: user.id,
    actor: 'dashboard',
    role: user.role,
    username: user.username,
  });
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: await hashToken(tokens.refreshToken),
      expiresAt: refreshExpiryDate(),
    },
  });

  return {
    ...tokens,
    user: publicDashboardUser(user),
  };
}

export async function refreshDashboard(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);
  if (!payload || payload.actor !== 'dashboard') {
    throw new AppError(401, 'Invalid refresh token', 'UNAUTHENTICATED');
  }
  const stored = await prisma.refreshToken.findMany({
    where: { userId: payload.id, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  let matchedId: number | null = null;
  for (const row of stored) {
    if (await bcrypt.compare(refreshToken, row.tokenHash)) {
      matchedId = row.id;
      break;
    }
  }
  if (!matchedId) throw new AppError(401, 'Invalid refresh token', 'UNAUTHENTICATED');

  await prisma.refreshToken.delete({ where: { id: matchedId } });
  const user = await prisma.dashboardUser.findUnique({ where: { id: payload.id } });
  if (!user || !user.isActive) throw new AppError(401, 'Invalid refresh token', 'UNAUTHENTICATED');

  const tokens = tokensFor({
    id: user.id,
    actor: 'dashboard',
    role: user.role,
    username: user.username,
  });
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: await hashToken(tokens.refreshToken),
      expiresAt: refreshExpiryDate(),
    },
  });
  return { ...tokens, user: publicDashboardUser(user) };
}

export async function logoutDashboard(userId: number, refreshToken?: string) {
  if (!refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { userId } });
    return;
  }
  const stored = await prisma.refreshToken.findMany({ where: { userId } });
  for (const row of stored) {
    if (await bcrypt.compare(refreshToken, row.tokenHash)) {
      await prisma.refreshToken.delete({ where: { id: row.id } });
      return;
    }
  }
}

export async function getDashboardMe(userId: number) {
  const user = await prisma.dashboardUser.findUnique({
    where: { id: userId },
    include: { cityScopes: true, hubScopes: true },
  });
  if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');
  return publicDashboardUser(user);
}

function publicDashboardUser(user: {
  id: number;
  username: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  cityId: number | null;
  hubId: number | null;
  mustResetPassword: boolean;
  profilePhotoUrl: string | null;
  isActive: boolean;
}) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    cityId: user.cityId,
    hubId: user.hubId,
    mustResetPassword: user.mustResetPassword,
    profilePhotoUrl: user.profilePhotoUrl,
    isActive: user.isActive,
  };
}
