import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/http';
import { hashToken, refreshExpiryDate, tokensFor, verifyRefreshToken } from '../../services/jwt.service';
import { requestOtp, verifyOtp } from '../../services/otp-security.service';

const customerSelect = {
  id: true,
  phone: true,
  name: true,
  email: true,
  profilePhotoUrl: true,
  whatsappOptIn: true,
  referralCode: true,
  isActive: true,
  deletedAt: true,
} as const;

function makeReferralCode(phone: string): string {
  const suffix = phone.slice(-4);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `JC${suffix}${rand}`;
}

async function allocateReferralCode(phone: string): Promise<string> {
  for (let i = 0; i < 20; i += 1) {
    const code = makeReferralCode(phone);
    const exists = await prisma.customer.findFirst({ where: { referralCode: code }, select: { id: true } });
    if (!exists) return code;
  }
  throw new Error('Unable to allocate referral code');
}

export async function sendCustomerOtp(phone: string, metadata: { ipAddress?: string; deviceId?: string }) {
  return requestOtp(phone, 'CUSTOMER', metadata);
}

export async function verifyCustomerOtp(
  phone: string,
  otp: string,
  options: { whatsappOptIn?: boolean; referralCode?: string },
) {
  await verifyOtp(phone, 'CUSTOMER', otp);

  let customer = await prisma.customer.findUnique({ where: { phone }, select: customerSelect });
  if (customer && (!customer.isActive || customer.deletedAt)) {
    throw new AppError(403, 'This customer account is inactive', 'CUSTOMER_INACTIVE');
  }

  let isNewCustomer = false;
  if (!customer) {
    isNewCustomer = true;
    let referrerPhone: string | undefined;
    const enteredCode = options.referralCode?.trim();
    if (enteredCode) {
      const referrer = await prisma.customer.findFirst({
        where: { referralCode: enteredCode, deletedAt: null },
        select: { phone: true },
      });
      referrerPhone = referrer?.phone;
    }
    try {
      customer = await prisma.customer.create({
        data: {
          phone,
          whatsappOptIn: options.whatsappOptIn ?? true,
          referralCode: await allocateReferralCode(phone),
          referredByPhone: referrerPhone,
        },
        select: customerSelect,
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
      customer = await prisma.customer.findUnique({ where: { phone }, select: customerSelect });
      if (!customer) throw error;
      isNewCustomer = false;
    }
  }

  const tokens = tokensFor({ id: customer.id, actor: 'customer', phone: customer.phone });
  await prisma.customerRefreshToken.create({
    data: {
      customerId: customer.id,
      tokenHash: await hashToken(tokens.refreshToken),
      expiresAt: refreshExpiryDate(),
    },
  });

  return {
    ...tokens,
    customer,
    isNewCustomer,
    requiresOnboarding: isNewCustomer,
    profileComplete: customer.phone.trim().length > 0,
  };
}

export async function refreshCustomer(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);
  if (!payload || payload.actor !== 'customer') {
    throw new AppError(401, 'Invalid refresh token', 'UNAUTHENTICATED');
  }
  const customer = await prisma.customer.findUnique({ where: { id: payload.id }, select: customerSelect });
  if (!customer || !customer.isActive || customer.deletedAt) {
    throw new AppError(401, 'Invalid refresh token', 'UNAUTHENTICATED');
  }
  const stored = await prisma.customerRefreshToken.findMany({
    where: { customerId: customer.id, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  const bcrypt = await import('bcryptjs');
  let matched = false;
  for (const row of stored) {
    if (await bcrypt.compare(refreshToken, row.tokenHash)) {
      await prisma.customerRefreshToken.delete({ where: { id: row.id } });
      matched = true;
      break;
    }
  }
  if (!matched) throw new AppError(401, 'Invalid refresh token', 'UNAUTHENTICATED');
  const tokens = tokensFor({ id: customer.id, actor: 'customer', phone: customer.phone });
  await prisma.customerRefreshToken.create({
    data: {
      customerId: customer.id,
      tokenHash: await hashToken(tokens.refreshToken),
      expiresAt: refreshExpiryDate(),
    },
  });
  return { ...tokens, customer };
}

export async function getCustomerMe(id: number) {
  const customer = await prisma.customer.findUnique({ where: { id }, select: customerSelect });
  if (!customer) throw new AppError(404, 'Customer not found', 'NOT_FOUND');
  return customer;
}
