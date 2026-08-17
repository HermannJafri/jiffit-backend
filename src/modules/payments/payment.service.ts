import { createHash, randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../utils/http';
import { logger } from '../../utils/logger';
import { bookingAudit } from '../bookings/booking-integrity';
import { planOrDispatchBooking } from '../dispatch/dispatch.service';
import {
  isPaymentMockEnabled,
  money,
  normalizeZohoPaymentMethod,
  quoteHashForBooking,
  verifyZohoWebhookSignature,
  type TrustedZohoPaymentMethod,
} from './payment-crypto';
import { createZohoPaymentLink } from './zoho.provider';

export class PaymentDomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'PaymentDomainError';
  }
}

export async function ensurePaymentOrderForBooking(customerId: number, bookingId: number) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, customerId, deletedAt: null },
    select: {
      id: true,
      customerId: true,
      isPackagePurchase: true,
      payableTotal: true,
      subtotal: true,
      taxTotal: true,
      coinsRedeemed: true,
      coinsDiscount: true,
      overtimeFeeAmount: true,
      items: { select: { serviceId: true, serviceVariantId: true, quantity: true, unitPrice: true, taxAmount: true, totalAmount: true } },
    },
  });
  if (!booking?.customerId) return null;
  const { snapshot, quoteHash, expectedAmount } = quoteHashForBooking(booking, env.ZOHO_PAYMENTS_CURRENCY);
  if (expectedAmount <= 0) throw new PaymentDomainError('PAYMENT_AMOUNT_INVALID', 'Booking amount is invalid');
  const subjectType = booking.isPackagePurchase ? 'PACKAGE_PURCHASE' : 'BOOKING';
  const existing = await prisma.paymentOrder.findUnique({
    where: {
      environment_subjectType_subjectId_commercialVersion: {
        environment: env.ZOHO_PAYMENTS_ENVIRONMENT,
        subjectType,
        subjectId: booking.id,
        commercialVersion: 1,
      },
    },
  });
  if (existing) {
    if (money(existing.expectedAmount) !== expectedAmount || existing.quoteHash !== quoteHash) {
      throw new PaymentDomainError('PAYMENT_QUOTE_CHANGED', 'Booking price changed; create a new commercial version');
    }
    return existing;
  }
  try {
    return await prisma.paymentOrder.create({
      data: {
        subjectType,
        subjectId: booking.id,
        customerId: booking.customerId,
        bookingId: booking.id,
        environment: env.ZOHO_PAYMENTS_ENVIRONMENT,
        currency: env.ZOHO_PAYMENTS_CURRENCY,
        expectedAmount,
        commercialVersion: 1,
        quoteHash,
        quoteSnapshotJson: snapshot as Prisma.InputJsonValue,
        idempotencyKey: `booking:${booking.id}:commercial:1`,
        auditLogs: { create: { actorType: 'CUSTOMER', actorId: customerId, action: 'PAYMENT_ORDER_CREATED', newStatus: 'CREATED' } },
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return prisma.paymentOrder.findFirstOrThrow({ where: { bookingId: booking.id, commercialVersion: 1 } });
    }
    throw error;
  }
}

export async function createCheckoutForBooking(customerId: number, bookingId: number) {
  const order = await ensurePaymentOrderForBooking(customerId, bookingId);
  if (!order) throw new AppError(404, 'Booking not found', 'NOT_FOUND');
  if (['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(order.status)) {
    throw new PaymentDomainError('PAYMENT_ALREADY_PAID', 'Booking is already paid');
  }
  if (order.activeAttemptId) {
    const active = await prisma.paymentAttempt.findUnique({ where: { id: order.activeAttemptId } });
    if (active?.checkoutUrl && ['AWAITING_CUSTOMER', 'PROCESSING'].includes(active.status)) {
      if (!active.expiresAt || active.expiresAt.getTime() > Date.now()) {
        return { order, attempt: active, reused: true as const };
      }
    }
  }

  const attemptNumber = (await prisma.paymentAttempt.count({ where: { orderId: order.id } })) + 1;
  const legacyPayment = await prisma.payment.create({
    data: {
      bookingId,
      customerId,
      amount: order.expectedAmount,
      method: 'UPI',
      provider: 'ZOHO',
      status: 'PENDING',
      notes: `Zoho order ${order.id} attempt ${attemptNumber}`,
    },
  });
  const attempt = await prisma.paymentAttempt.create({
    data: {
      orderId: order.id,
      legacyPaymentId: legacyPayment.id,
      environment: order.environment,
      attemptNumber,
      requestedAmount: order.expectedAmount,
      currency: order.currency,
      providerReferenceId: `jiffit:order:${order.id}:attempt:pending`,
    },
  });
  const reference = `jiffit:order:${order.id}:attempt:${attempt.id}`;
  await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { providerReferenceId: reference } });
  await prisma.paymentOrder.update({
    where: { id: order.id },
    data: { activeAttemptId: attempt.id, status: 'ATTEMPT_CREATING', version: { increment: 1 } },
  });

  if (!env.ZOHO_PAYMENTS_ENABLED || !env.ZOHO_PAYMENTS_ACCOUNT_ID || !env.ZOHO_PAYMENTS_API_KEY) {
    await prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: { status: 'FAILED', failureCode: 'ZOHO_NOT_CONFIGURED', failureMessageSafe: 'Zoho credentials are not configured', failedAt: new Date() },
    });
    await prisma.paymentOrder.update({ where: { id: order.id }, data: { status: 'CREATION_FAILED', failedAt: new Date() } });
    throw new AppError(503, 'Online payments are not configured yet', 'ZOHO_NOT_CONFIGURED');
  }

  try {
    const link = await createZohoPaymentLink({
      amount: money(order.expectedAmount),
      currency: order.currency,
      reference,
      description: `Jiffit booking ${bookingId}`,
    });
    const updated = await prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: 'AWAITING_CUSTOMER',
        providerPaymentLinkId: link.paymentLinkId,
        checkoutUrl: link.checkoutUrl,
        expiresAt: link.expiresAt,
      },
    });
    await prisma.paymentOrder.update({ where: { id: order.id }, data: { status: 'AWAITING_CUSTOMER', version: { increment: 1 } } });
    return { order, attempt: updated, reused: false as const };
  } catch (error) {
    await prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: { status: 'FAILED', failureCode: 'ZOHO_LINK_FAILED', failureMessageSafe: 'Unable to create payment link', failedAt: new Date() },
    });
    throw error;
  }
}

export async function mockPayBooking(customerId: number, bookingId: number) {
  if (!isPaymentMockEnabled(env.NODE_ENV, env.PAYMENT_MOCK_ENABLED)) {
    throw new AppError(404, 'Not found', 'NOT_FOUND');
  }
  const order = await ensurePaymentOrderForBooking(customerId, bookingId);
  if (!order) throw new AppError(404, 'Booking not found', 'NOT_FOUND');
  const checkout = order.activeAttemptId
    ? { order, attempt: await prisma.paymentAttempt.findUniqueOrThrow({ where: { id: order.activeAttemptId } }), reused: true }
    : await createMockAttempt(order, bookingId, customerId);
  await applyPaid(checkout.attempt.id, money(order.expectedAmount), 'UPI', 'RECONCILER');
  return prisma.booking.findFirstOrThrow({ where: { id: bookingId } });
}

async function createMockAttempt(order: { id: number; expectedAmount: unknown; currency: string; environment: 'SANDBOX' | 'LIVE' }, bookingId: number, customerId: number) {
  const attemptNumber = (await prisma.paymentAttempt.count({ where: { orderId: order.id } })) + 1;
  const legacyPayment = await prisma.payment.create({
    data: { bookingId, customerId, amount: Number(order.expectedAmount), method: 'UPI', provider: 'MOCK', status: 'PENDING' },
  });
  const attempt = await prisma.paymentAttempt.create({
    data: {
      orderId: order.id,
      legacyPaymentId: legacyPayment.id,
      environment: order.environment,
      attemptNumber,
      requestedAmount: Number(order.expectedAmount),
      currency: order.currency,
      status: 'AWAITING_CUSTOMER',
      checkoutUrl: 'https://payments.local/mock',
      providerReferenceId: `jiffit:order:${order.id}:attempt:mock`,
    },
  });
  const reference = `jiffit:order:${order.id}:attempt:${attempt.id}`;
  const updated = await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { providerReferenceId: reference } });
  await prisma.paymentOrder.update({ where: { id: order.id }, data: { activeAttemptId: attempt.id, status: 'AWAITING_CUSTOMER' } });
  return { order, attempt: updated, reused: false as const };
}

async function applyPaid(attemptId: number, amountPaid: number, method: TrustedZohoPaymentMethod | null, actorType: 'WEBHOOK' | 'RECONCILER') {
  const result = await prisma.$transaction(async (tx) => {
    const attempt = await tx.paymentAttempt.findUnique({ where: { id: attemptId }, include: { order: true } });
    if (!attempt) throw new PaymentDomainError('PAYMENT_ATTEMPT_NOT_FOUND', 'Payment attempt not found');
    const order = attempt.order;
    if (['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(order.status)) {
      return { bookingId: order.bookingId, bookingReleased: false };
    }
    if (amountPaid !== money(order.expectedAmount)) {
      throw new PaymentDomainError('PAYMENT_AMOUNT_MISMATCH', 'Payment amount mismatch');
    }
    const now = new Date();
    await tx.paymentAttempt.update({ where: { id: attempt.id }, data: { status: 'PAID', paidAt: now } });
    await tx.paymentOrder.update({
      where: { id: order.id },
      data: { status: 'PAID', capturedAmount: order.expectedAmount, paidAt: now, version: { increment: 1 } },
    });
    if (attempt.legacyPaymentId) {
      await tx.payment.update({
        where: { id: attempt.legacyPaymentId },
        data: { status: 'PAID', method: method ?? 'UPI', paidAt: now },
      });
    }
    let bookingReleased = false;
    if (order.bookingId) {
      const booking = await tx.booking.findUnique({
        where: { id: order.bookingId },
        select: { id: true, status: true, isPackagePurchase: true, paymentMethod: true },
      });
      if (booking) {
        const nextStatus = booking.isPackagePurchase ? 'COMPLETED' : booking.status === 'PENDING_PAYMENT' ? 'PENDING_ASSIGNMENT' : booking.status;
        bookingReleased = !booking.isPackagePurchase && booking.status === 'PENDING_PAYMENT';
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: nextStatus,
            paymentStatus: 'PAID',
            paymentMethod: method ?? booking.paymentMethod,
            finalPaid: order.expectedAmount,
            completedAt: booking.isPackagePurchase ? now : undefined,
            version: nextStatus !== booking.status ? { increment: 1 } : undefined,
            statusHistory:
              nextStatus !== booking.status
                ? {
                    create: {
                      fromStatus: booking.status,
                      toStatus: nextStatus,
                      ...bookingAudit({
                        actorType: 'SYSTEM',
                        source: actorType === 'WEBHOOK' ? 'PAYMENT' : 'RECONCILIATION',
                        reasonCode: 'ONLINE_PAYMENT_VERIFIED',
                        reasonText: 'Online payment verified by provider',
                      }),
                    },
                  }
                : undefined,
          },
        });
        if (booking.isPackagePurchase) {
          const packages = await tx.customerServicePackage.findMany({ where: { bookingId: booking.id } });
          for (const item of packages) {
            const startDate = new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
            const endDate = new Date(startDate);
            endDate.setUTCDate(endDate.getUTCDate() + Math.max(item.validityDays - 1, 0));
            await tx.customerServicePackage.update({ where: { id: item.id }, data: { status: 'ACTIVE', startDate, endDate } });
          }
        }
      }
    }
    await tx.paymentAuditLog.create({
      data: { orderId: order.id, attemptId: attempt.id, actorType, action: 'PAYMENT_PAID', oldStatus: order.status, newStatus: 'PAID' },
    });
    return { bookingId: order.bookingId, bookingReleased };
  });
  if (result.bookingReleased && result.bookingId) {
    setImmediate(() => {
      planOrDispatchBooking(result.bookingId!, 'VERIFIED_ONLINE_PAYMENT').catch((error) => logger.error('dispatch after pay failed', error));
    });
  }
  return result;
}

export async function ingestZohoWebhook(rawBody: Buffer, signatureHeader: unknown) {
  const verified = verifyZohoWebhookSignature(rawBody, signatureHeader, {
    signingKey: env.ZOHO_PAYMENTS_WEBHOOK_SIGNING_KEY,
    toleranceSeconds: env.ZOHO_PAYMENTS_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS,
  });
  if (!verified.valid) {
    throw new AppError(401, `Invalid Zoho signature (${verified.reason})`, 'ZOHO_WEBHOOK_INVALID');
  }
  const payload = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>;
  const eventId = String(payload.event_id ?? payload.eventId ?? randomUUID());
  const eventType = String(payload.event_type ?? payload.event ?? 'unknown');
  const payloadHash = createHash('sha256').update(rawBody).digest('hex');
  const event = await prisma.paymentWebhookEvent.upsert({
    where: {
      provider_environment_eventId: {
        provider: 'ZOHO',
        environment: env.ZOHO_PAYMENTS_ENVIRONMENT,
        eventId,
      },
    },
    create: {
      environment: env.ZOHO_PAYMENTS_ENVIRONMENT,
      eventId,
      eventType,
      liveMode: Boolean(payload.live_mode),
      accountMatched: true,
      payloadHash,
      normalizedSubjectJson: payload as Prisma.InputJsonValue,
    },
    update: {},
  });
  if (event.processingStatus === 'PROCESSED') return { replayed: true, eventId };

  const data = (payload.event_object ?? payload.data ?? payload) as Record<string, any>;
  const paymentLink = data.payment_links ?? data.payment_link;
  const payment = data.payment;
  const reference = String(paymentLink?.reference_id ?? payment?.reference_id ?? '');
  const match = reference.match(/^jiffit:order:(\d+):attempt:(\d+)$/);
  const attempt = match
    ? await prisma.paymentAttempt.findUnique({ where: { id: Number(match[2]) } })
    : paymentLink?.payment_link_id
      ? await prisma.paymentAttempt.findFirst({ where: { providerPaymentLinkId: String(paymentLink.payment_link_id) } })
      : null;
  const status = String(paymentLink?.status ?? payment?.status ?? '').toLowerCase();
  if (attempt && ['paid', 'succeeded', 'success', 'completed'].includes(status)) {
    await applyPaid(
      attempt.id,
      money(paymentLink?.amount_paid ?? payment?.amount ?? paymentLink?.amount),
      normalizeZohoPaymentMethod(payment?.payment_method ?? paymentLink?.payment_method),
      'WEBHOOK',
    );
  }
  await prisma.paymentWebhookEvent.update({
    where: { id: event.id },
    data: { processingStatus: 'PROCESSED', processedAt: new Date() },
  });
  return { replayed: false, eventId };
}
