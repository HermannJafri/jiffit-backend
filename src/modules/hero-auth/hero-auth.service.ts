import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/http';
import { hashToken, refreshExpiryDate, tokensFor, verifyRefreshToken } from '../../services/jwt.service';
import { requestOtp, verifyOtp } from '../../services/otp-security.service';
import {
  HeroAccountStateError,
  heroAuthContract,
  heroAuthStateSelect,
} from './hero-auth-state';

export async function sendHeroOtp(phone: string, metadata: { ipAddress?: string; deviceId?: string }) {
  return requestOtp(phone, 'HERO', metadata);
}

export async function verifyHeroOtp(phone: string, otp: string, options: { referralCode?: string }) {
  await verifyOtp(phone, 'HERO', otp);

  let hero = await prisma.hero.findUnique({ where: { phone }, select: heroAuthStateSelect });
  if (!hero) {
    let referredByHeroId: number | undefined;
    const entered = options.referralCode?.trim();
    if (entered) {
      const referrer = await prisma.hero.findFirst({
        where: { referralCode: entered, deletedAt: null },
        select: { id: true },
      });
      referredByHeroId = referrer?.id;
    }
    try {
      hero = await prisma.hero.create({
        data: {
          phone,
          onboardingSource: 'MOBILE_APP',
          referredByHeroId,
        },
        select: heroAuthStateSelect,
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
      hero = await prisma.hero.findUnique({ where: { phone }, select: heroAuthStateSelect });
      if (!hero) throw error;
    }
  }

  try {
    const contract = heroAuthContract(hero);
    const tokens = tokensFor({ id: hero.id, actor: 'hero', phone: hero.phone });
    await prisma.heroRefreshToken.create({
      data: {
        heroId: hero.id,
        tokenHash: await hashToken(tokens.refreshToken),
        expiresAt: refreshExpiryDate(),
      },
    });
    return { ...tokens, hero: { id: hero.id, phone: hero.phone, name: hero.name, status: hero.status }, ...contract };
  } catch (error) {
    if (error instanceof HeroAccountStateError) {
      throw new AppError(error.statusCode, error.message, error.code);
    }
    throw error;
  }
}

export async function refreshHero(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);
  if (!payload || payload.actor !== 'hero') {
    throw new AppError(401, 'Invalid refresh token', 'UNAUTHENTICATED');
  }
  const hero = await prisma.hero.findUnique({ where: { id: payload.id }, select: heroAuthStateSelect });
  if (!hero) throw new AppError(401, 'Invalid refresh token', 'UNAUTHENTICATED');
  const stored = await prisma.heroRefreshToken.findMany({
    where: { heroId: hero.id, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  let matched = false;
  for (const row of stored) {
    if (await bcrypt.compare(refreshToken, row.tokenHash)) {
      await prisma.heroRefreshToken.delete({ where: { id: row.id } });
      matched = true;
      break;
    }
  }
  if (!matched) throw new AppError(401, 'Invalid refresh token', 'UNAUTHENTICATED');

  try {
    const contract = heroAuthContract(hero);
    const tokens = tokensFor({ id: hero.id, actor: 'hero', phone: hero.phone });
    await prisma.heroRefreshToken.create({
      data: {
        heroId: hero.id,
        tokenHash: await hashToken(tokens.refreshToken),
        expiresAt: refreshExpiryDate(),
      },
    });
    return { ...tokens, hero: { id: hero.id, phone: hero.phone, name: hero.name, status: hero.status }, ...contract };
  } catch (error) {
    if (error instanceof HeroAccountStateError) {
      throw new AppError(error.statusCode, error.message, error.code);
    }
    throw error;
  }
}

export async function getHeroMe(id: number) {
  const hero = await prisma.hero.findUnique({ where: { id }, select: heroAuthStateSelect });
  if (!hero) throw new AppError(404, 'Hero not found', 'NOT_FOUND');
  try {
    return { hero: { id: hero.id, phone: hero.phone, name: hero.name, status: hero.status }, ...heroAuthContract(hero) };
  } catch (error) {
    if (error instanceof HeroAccountStateError) {
      throw new AppError(error.statusCode, error.message, error.code);
    }
    throw error;
  }
}
