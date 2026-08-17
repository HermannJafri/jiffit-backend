import bcrypt from 'bcryptjs';
import { createHmac, randomInt } from 'crypto';
import { Prisma } from '@prisma/client';
import {
  OTP_EXPIRY_MINUTES,
  OTP_LENGTH,
  OTP_LOCKOUT_MINUTES,
  OTP_MAX_REQUESTS_PER_DEVICE,
  OTP_MAX_REQUESTS_PER_IP,
  OTP_MAX_REQUESTS_PER_PHONE,
  OTP_MAX_VERIFY_ATTEMPTS,
  OTP_REQUEST_WINDOW_MINUTES,
  OTP_RESEND_SECONDS,
} from '../config/constants';
import { prisma } from '../config/database';
import { env, isMasterOtpEnabled } from '../config/env';
import { AppError } from '../utils/http';
import { logger } from '../utils/logger';
import { deliverSmsOtp } from './sms.service';

export type OtpContext = 'CUSTOMER' | 'HERO';

interface OtpRequestMetadata {
  ipAddress?: string;
  deviceId?: string;
}

const hashReference = (value: string): string =>
  createHmac('sha256', env.OTP_HASH_SECRET).update(value.trim()).digest('hex');

const secondsUntil = (date: Date, now: Date): number =>
  Math.max(1, Math.ceil((date.getTime() - now.getTime()) / 1000));

async function serializable<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (attempt < 3 && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        continue;
      }
      throw error;
    }
  }
}

async function enforceRequestScope(
  tx: Prisma.TransactionClient,
  scopeType: 'PHONE' | 'IP' | 'DEVICE',
  scopeKey: string,
  context: OtpContext,
  maxRequests: number,
  now: Date,
  applyCooldown: boolean,
): Promise<void> {
  const unique = { scopeType_scopeKey_context: { scopeType, scopeKey, context } };
  await tx.otpSecurityState.upsert({
    where: unique,
    create: { scopeType, scopeKey, context, requestCount: 0, windowStartedAt: now },
    update: {},
  });
  const state = await tx.otpSecurityState.findUniqueOrThrow({ where: unique });
  if (state.lockoutUntil && state.lockoutUntil > now) {
    throw new AppError(429, 'OTP verification is temporarily locked', 'OTP_TEMPORARILY_LOCKED', {
      retryAfterSeconds: secondsUntil(state.lockoutUntil, now),
    });
  }
  if (applyCooldown && state.cooldownUntil && state.cooldownUntil > now) {
    throw new AppError(429, 'Please wait before requesting another OTP', 'OTP_COOLDOWN_ACTIVE', {
      retryAfterSeconds: secondsUntil(state.cooldownUntil, now),
    });
  }
  const windowExpired = state.windowStartedAt.getTime() + OTP_REQUEST_WINDOW_MINUTES * 60_000 <= now.getTime();
  const nextCount = windowExpired ? 1 : state.requestCount + 1;
  if (nextCount > maxRequests) {
    const retryAt = new Date(state.windowStartedAt.getTime() + OTP_REQUEST_WINDOW_MINUTES * 60_000);
    throw new AppError(429, 'Too many OTP requests', 'OTP_TOO_MANY_REQUESTS', {
      retryAfterSeconds: secondsUntil(retryAt, now),
    });
  }
  await tx.otpSecurityState.update({
    where: unique,
    data: {
      requestCount: nextCount,
      windowStartedAt: windowExpired ? now : state.windowStartedAt,
      cooldownUntil: applyCooldown ? new Date(now.getTime() + OTP_RESEND_SECONDS * 1000) : state.cooldownUntil,
    },
  });
}

export async function requestOtp(
  identifier: string,
  context: OtpContext,
  metadata: OtpRequestMetadata = {},
): Promise<{ devOtp: string | null }> {
  const normalized = identifier.trim();
  const now = new Date();
  const otp = randomInt(10 ** (OTP_LENGTH - 1), 10 ** OTP_LENGTH).toString();
  const otpHash = await bcrypt.hash(otp, 10);
  const ipHash = metadata.ipAddress ? hashReference(metadata.ipAddress) : undefined;
  const deviceHash = metadata.deviceId ? hashReference(metadata.deviceId) : undefined;

  const challenge = await serializable(async (tx) => {
    await enforceRequestScope(tx, 'PHONE', hashReference(normalized), context, OTP_MAX_REQUESTS_PER_PHONE, now, true);
    if (ipHash) await enforceRequestScope(tx, 'IP', ipHash, context, OTP_MAX_REQUESTS_PER_IP, now, false);
    if (deviceHash) await enforceRequestScope(tx, 'DEVICE', deviceHash, context, OTP_MAX_REQUESTS_PER_DEVICE, now, false);
    await tx.otpChallenge.updateMany({
      where: { identifier: normalized, context, consumedAt: null, invalidatedAt: null },
      data: { invalidatedAt: now },
    });
    return tx.otpChallenge.create({
      data: {
        identifier: normalized,
        context,
        otpHash,
        expiresAt: new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60_000),
        requestIpHash: ipHash,
        deviceHash,
      },
      select: { id: true },
    });
  });

  const delivered = await deliverSmsOtp(normalized, otp);
  if (!delivered) {
    await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { invalidatedAt: new Date() } });
    logger.info('otp_security_event', { event: 'delivery_failed', context });
    throw new AppError(502, 'OTP could not be sent', 'OTP_DELIVERY_FAILED');
  }

  return { devOtp: env.isDev() && env.OTP_TEST_MODE_ENABLED ? otp : null };
}

export async function verifyOtp(identifier: string, context: OtpContext, submittedOtp: string): Promise<void> {
  const normalized = identifier.trim();
  const now = new Date();
  const phoneKey = hashReference(normalized);
  const useTestOtp = isMasterOtpEnabled() && submittedOtp === env.MASTER_OTP;

  const rejection = await serializable(async (tx): Promise<AppError | null> => {
    const state = await tx.otpSecurityState.findUnique({
      where: { scopeType_scopeKey_context: { scopeType: 'PHONE', scopeKey: phoneKey, context } },
    });
    if (state?.lockoutUntil && state.lockoutUntil > now) {
      throw new AppError(429, 'OTP verification is temporarily locked', 'OTP_TEMPORARILY_LOCKED', {
        retryAfterSeconds: secondsUntil(state.lockoutUntil, now),
      });
    }

    const challenge = await tx.otpChallenge.findFirst({
      where: { identifier: normalized, context },
      orderBy: { createdAt: 'desc' },
    });
    if (!challenge) throw new AppError(400, 'Invalid OTP', 'OTP_INVALID');

    const matches = useTestOtp || (await bcrypt.compare(submittedOtp, challenge.otpHash));
    if (challenge.consumedAt) {
      throw new AppError(400, matches ? 'OTP has already been used' : 'Invalid OTP', matches ? 'OTP_ALREADY_USED' : 'OTP_INVALID');
    }
    if (challenge.invalidatedAt) throw new AppError(400, 'Invalid OTP', 'OTP_INVALID');
    if (challenge.expiresAt <= now) throw new AppError(400, 'OTP has expired', 'OTP_EXPIRED');

    if (!matches) {
      const attempts = challenge.verificationAttempts + 1;
      const locked = attempts >= OTP_MAX_VERIFY_ATTEMPTS;
      await tx.otpChallenge.update({ where: { id: challenge.id }, data: { verificationAttempts: attempts } });
      await tx.otpSecurityState.upsert({
        where: { scopeType_scopeKey_context: { scopeType: 'PHONE', scopeKey: phoneKey, context } },
        create: {
          scopeType: 'PHONE',
          scopeKey: phoneKey,
          context,
          requestCount: 0,
          windowStartedAt: now,
          failedAttempts: attempts,
          lockoutUntil: locked ? new Date(now.getTime() + OTP_LOCKOUT_MINUTES * 60_000) : null,
        },
        update: {
          failedAttempts: attempts,
          lockoutUntil: locked ? new Date(now.getTime() + OTP_LOCKOUT_MINUTES * 60_000) : undefined,
        },
      });
      return new AppError(
        400,
        locked ? 'Too many OTP verification attempts' : 'Invalid OTP',
        locked ? 'OTP_TOO_MANY_ATTEMPTS' : 'OTP_INVALID',
        locked ? { retryAfterSeconds: OTP_LOCKOUT_MINUTES * 60 } : undefined,
      );
    }

    const consumed = await tx.otpChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null, invalidatedAt: null },
      data: { consumedAt: now },
    });
    if (consumed.count !== 1) throw new AppError(400, 'OTP has already been used', 'OTP_ALREADY_USED');

    await tx.otpSecurityState.updateMany({
      where: { scopeType: 'PHONE', scopeKey: phoneKey, context },
      data: { failedAttempts: 0, lockoutUntil: null },
    });
    return null;
  });

  if (rejection) throw rejection;
}
