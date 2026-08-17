import { randomUUID } from 'crypto';
import type { Prisma, BookingStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../utils/http';
import { logger } from '../../utils/logger';
import { assertBookingTransition, bookingAudit } from '../bookings/booking-integrity';
import { enqueueDispatchNotification } from '../notifications/notification.service';
import { canonicalBookingWindow, calculateOfferReleaseAt, calculateReminderAt } from './dispatch-time';
import { canDispatchBooking, isDispatchReleaseDue, isOfferAcceptable, nextRetryState } from './dispatch-state-machine';
import { listEligibleHeroes } from './eligibility.service';

const HERO_BUSY = ['ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'] as const;

async function loadDispatchableBooking(bookingId: number) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, deletedAt: null },
    select: {
      id: true,
      bookingNo: true,
      status: true,
      assignedHeroId: true,
      isPackagePurchase: true,
      paymentMethod: true,
      paymentStatus: true,
      slotStartAt: true,
      slotEndAt: true,
      scheduledDate: true,
      scheduledFromTime: true,
      scheduledToTime: true,
      customerName: true,
      serviceAddress: true,
      version: true,
    },
  });
  if (!booking) throw new AppError(404, 'Booking not found', 'NOT_FOUND');
  return booking;
}

export async function planOrDispatchBooking(bookingId: number, reason: string): Promise<void> {
  const booking = await loadDispatchableBooking(bookingId);
  if (!canDispatchBooking(booking)) {
    logger.info('dispatch skipped', { bookingId, reason, status: booking.status });
    return;
  }

  const window = canonicalBookingWindow(booking);
  const releaseAt = calculateOfferReleaseAt({
    scheduledStartAt: window.start,
    routeEtaSeconds: 15 * 60,
    acceptanceWindowSeconds: env.DISPATCH_ACCEPTANCE_WINDOW_SECONDS,
    reassignmentBufferMinutes: env.DISPATCH_REASSIGNMENT_BUFFER_MINUTES,
    arrivalBufferMinutes: env.DISPATCH_CLEANUP_PREP_BUFFER_MINUTES,
  });
  const reminderAt = calculateReminderAt(window.start, env.DISPATCH_FINAL_REMINDER_MINUTES);

  await prisma.bookingDispatch.upsert({
    where: { bookingId },
    create: {
      bookingId,
      scheduledStartAt: window.start,
      dispatchReleaseAt: releaseAt,
      reminderAt,
      dispatchState: 'PLANNED',
      maxAttempts: env.DISPATCH_MAX_ATTEMPTS,
      shadowMode: env.DISPATCH_SHADOW_MODE,
      nextAttemptAt: releaseAt,
    },
    update: {
      scheduledStartAt: window.start,
      dispatchReleaseAt: releaseAt,
      reminderAt,
      nextAttemptAt: releaseAt,
      failureCode: null,
    },
  });

  if (!env.DISPATCH_FEATURE_ENABLED || env.DISPATCH_SHADOW_MODE) {
    if (isDispatchReleaseDue(releaseAt, new Date()) || !env.DISPATCH_FEATURE_ENABLED) {
      await offerNextHero(bookingId, reason);
    }
    return;
  }

  if (isDispatchReleaseDue(releaseAt, new Date())) {
    await offerNextHero(bookingId, reason);
  }
}

export async function offerNextHero(bookingId: number, reason: string): Promise<void> {
  const booking = await loadDispatchableBooking(bookingId);
  if (!canDispatchBooking(booking) && booking.status !== 'ASSIGNED') return;
  const dispatch = await prisma.bookingDispatch.findUnique({ where: { bookingId } });
  if (!dispatch || ['CANCELLED', 'FAILED', 'ESCALATED', 'HERO_ACCEPTED'].includes(dispatch.dispatchState)) return;

  const candidates = await listEligibleHeroes(bookingId, env.DISPATCH_FEATURE_ENABLED ? 'RELEASE' : 'RELEASE');
  const hero = candidates[0];
  if (!hero) {
    const next = nextRetryState(dispatch.attemptCount + 1, dispatch.maxAttempts);
    await prisma.bookingDispatch.update({
      where: { id: dispatch.id },
      data: {
        attemptCount: { increment: 1 },
        dispatchState: next,
        failureCode: 'NO_ELIGIBLE_HERO',
        nextAttemptAt: next === 'RETRY_WAIT' ? new Date(Date.now() + 60_000) : null,
        escalatedAt: next === 'ESCALATED' ? new Date() : null,
      },
    });
    await prisma.booking.update({
      where: { id: bookingId },
      data: { autoDispatchAttempts: { increment: 1 } },
    });
    logger.warn('dispatch no eligible hero', { bookingId, reason, next });
    return;
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + env.DISPATCH_ACCEPTANCE_WINDOW_SECONDS * 1000);
  await prisma.$transaction(async (tx) => {
    const participant = await tx.bookingDispatchParticipant.upsert({
      where: { dispatchId_slotNumber: { dispatchId: dispatch.id, slotNumber: 1 } },
      create: {
        dispatchId: dispatch.id,
        slotNumber: 1,
        role: 'PRIMARY',
        participantState: 'OFFER_PENDING',
        routeEtaSeconds: hero.etaSeconds,
        distanceMeters: Math.round(hero.distanceMeters),
      },
      update: {
        participantState: 'OFFER_PENDING',
        routeEtaSeconds: hero.etaSeconds,
        distanceMeters: Math.round(hero.distanceMeters),
        acceptedHeroId: null,
      },
    });
    const attemptNumber = dispatch.attemptCount + 1;
    const offer = await tx.bookingOfferAttempt.create({
      data: {
        bookingId,
        dispatchId: dispatch.id,
        participantSlotId: participant.id,
        heroId: hero.heroId,
        role: 'PRIMARY',
        attemptNumber,
        status: 'PENDING',
        activeKey: `offer:${bookingId}:${hero.heroId}:${attemptNumber}`,
        offerReleaseAt: now,
        offerExpiresAt: expiresAt,
        eventId: randomUUID(),
        etaSeconds: hero.etaSeconds,
        distanceMeters: Math.round(hero.distanceMeters),
        originSource: hero.originSource,
      },
    });
    await tx.bookingDispatch.update({
      where: { id: dispatch.id },
      data: {
        dispatchState: 'OFFER_PENDING',
        attemptCount: attemptNumber,
        currentOfferAttemptId: offer.id,
        currentCandidateHeroId: hero.heroId,
        candidateCount: candidates.length,
        bestEtaSeconds: hero.etaSeconds,
        bestDistanceMeters: Math.round(hero.distanceMeters),
        bestOriginSource: hero.originSource,
        nextAttemptAt: expiresAt,
      },
    });
    await tx.bookingDispatchParticipant.update({
      where: { id: participant.id },
      data: { currentOfferAttemptId: offer.id },
    });
    assertBookingTransition({ from: booking.status, to: 'ASSIGNED', actorType: 'SYSTEM' });
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: 'ASSIGNED',
        assignedHeroId: hero.heroId,
        version: { increment: 1 },
        statusHistory: {
          create: {
            fromStatus: booking.status,
            toStatus: 'ASSIGNED',
            ...bookingAudit({
              actorType: 'SYSTEM',
              source: 'AUTO_DISPATCH',
              reasonCode: 'HERO_OFFERED',
              reasonText: reason,
            }),
          },
        },
        assignments: {
          create: {
            heroId: hero.heroId,
            status: 'ASSIGNED',
          },
        },
      },
    });
  });

  await enqueueDispatchNotification({
    heroId: hero.heroId,
    title: 'New Jiffit job',
    body: `${booking.customerName} · ${booking.serviceAddress}`,
    data: { bookingId: String(bookingId), type: 'BOOKING_OFFER' },
  });
}

async function markHeroAccepted(
  tx: Prisma.TransactionClient,
  booking: { id: number; status: BookingStatus },
  heroId: number,
  now: Date,
) {
  assertBookingTransition({ from: booking.status, to: 'ACCEPTED', actorType: 'HERO' });
  await tx.bookingAssignment.updateMany({
    where: { bookingId: booking.id, heroId, status: 'ASSIGNED' },
    data: { status: 'ACCEPTED', acceptedAt: now },
  });
  return tx.booking.update({
    where: { id: booking.id },
    data: {
      status: 'ACCEPTED',
      assignedHeroId: heroId,
      version: { increment: 1 },
      statusHistory: {
        create: {
          fromStatus: booking.status,
          toStatus: 'ACCEPTED',
          ...bookingAudit({
            actorType: 'HERO',
            actorId: heroId,
            source: 'HERO_APP',
            reasonCode: 'HERO_ACCEPTED',
            reasonText: 'Hero accepted the job',
          }),
        },
      },
    },
  });
}

export async function acceptOffer(bookingId: number, heroId: number) {
  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
      select: { id: true, status: true, assignedHeroId: true, version: true },
    });
    if (!booking) throw new AppError(404, 'Booking not found', 'NOT_FOUND');
    const dispatch = await tx.bookingDispatch.findUnique({ where: { bookingId } });
    if (!dispatch?.currentOfferAttemptId) {
      if (booking.assignedHeroId !== heroId || booking.status !== 'ASSIGNED') {
        throw new AppError(409, 'No active offer', 'OFFER_NOT_FOUND');
      }
      if (dispatch) {
        await tx.bookingDispatch.update({
          where: { id: dispatch.id },
          data: { dispatchState: 'HERO_ACCEPTED', currentCandidateHeroId: heroId },
        });
      }
      return markHeroAccepted(tx, booking, heroId, now);
    }
    const offer = await tx.bookingOfferAttempt.findUnique({ where: { id: dispatch.currentOfferAttemptId } });
    if (!offer) throw new AppError(409, 'No active offer', 'OFFER_NOT_FOUND');
    const decision = isOfferAcceptable({
      status: offer.status,
      offerExpiresAt: offer.offerExpiresAt,
      databaseNow: now,
      expectedHeroId: offer.heroId,
      actualHeroId: heroId,
      currentOfferId: dispatch.currentOfferAttemptId,
      actualOfferId: offer.id,
    });
    if (decision === 'REJECT') throw new AppError(409, 'Offer is no longer acceptable', 'OFFER_REJECTED');
    if (decision === 'IDEMPOTENT') return booking;
    await tx.bookingOfferAttempt.update({
      where: { id: offer.id },
      data: { status: 'ACCEPTED', acceptedAt: now, activeKey: null },
    });
    await tx.bookingDispatch.update({
      where: { id: dispatch.id },
      data: { dispatchState: 'HERO_ACCEPTED', currentCandidateHeroId: heroId },
    });
    return markHeroAccepted(tx, booking, heroId, now);
  });
  return result;
}

export async function declineOffer(bookingId: number, heroId: number, reason?: string) {
  const now = new Date();
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, deletedAt: null } });
  if (!booking) throw new AppError(404, 'Booking not found', 'NOT_FOUND');
  const dispatch = await prisma.bookingDispatch.findUnique({ where: { bookingId } });
  if (!dispatch?.currentOfferAttemptId) throw new AppError(409, 'No active offer', 'OFFER_NOT_FOUND');
  const offer = await prisma.bookingOfferAttempt.findUnique({ where: { id: dispatch.currentOfferAttemptId } });
  if (!offer || offer.heroId !== heroId) throw new AppError(403, 'This offer is not yours', 'FORBIDDEN');
  if (!['PENDING', 'DELIVERED'].includes(offer.status)) throw new AppError(409, 'Offer is not active', 'OFFER_INACTIVE');

  assertBookingTransition({ from: booking.status, to: 'PENDING_ASSIGNMENT', actorType: 'HERO' });
  await prisma.$transaction([
    prisma.bookingOfferAttempt.update({
      where: { id: offer.id },
      data: { status: 'REJECTED', rejectedAt: now, activeKey: null, failureCode: 'HERO_DECLINED' },
    }),
    prisma.bookingDispatch.update({
      where: { id: dispatch.id },
      data: {
        dispatchState: nextRetryState(dispatch.attemptCount, dispatch.maxAttempts),
        currentOfferAttemptId: null,
        currentCandidateHeroId: null,
        nextAttemptAt: new Date(now.getTime() + 5_000),
      },
    }),
    prisma.bookingAssignment.updateMany({
      where: { bookingId, heroId, status: { in: ['ASSIGNED', 'ACCEPTED'] } },
      data: { status: 'REJECTED', cancelledAt: now, cancelReason: reason ?? 'Hero declined' },
    }),
    prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'PENDING_ASSIGNMENT',
        assignedHeroId: null,
        version: { increment: 1 },
        statusHistory: {
          create: {
            fromStatus: booking.status,
            toStatus: 'PENDING_ASSIGNMENT',
            ...bookingAudit({
              actorType: 'HERO',
              actorId: heroId,
              source: 'HERO_APP',
              reasonCode: 'HERO_DECLINED',
              reasonText: reason ?? 'Hero declined',
            }),
          },
        },
      },
    }),
  ]);
  setImmediate(() => {
    offerNextHero(bookingId, 'HERO_DECLINED').catch((error) => logger.error('reoffer failed', error));
  });
}

export async function expireStaleOffers(now = new Date()): Promise<number> {
  const stale = await prisma.bookingOfferAttempt.findMany({
    where: { status: { in: ['PENDING', 'DELIVERED'] }, offerExpiresAt: { lte: now } },
    select: { id: true, bookingId: true, heroId: true, dispatchId: true },
    take: 50,
  });
  for (const offer of stale) {
    const booking = await prisma.booking.findFirst({ where: { id: offer.bookingId, deletedAt: null } });
    if (!booking) continue;
    if (booking.status === 'ASSIGNED') {
      assertBookingTransition({ from: 'ASSIGNED', to: 'PENDING_ASSIGNMENT', actorType: 'SYSTEM' });
    }
    await prisma.$transaction([
      prisma.bookingOfferAttempt.update({
        where: { id: offer.id },
        data: { status: 'EXPIRED', expiredAt: now, activeKey: null, failureCode: 'OFFER_EXPIRED' },
      }),
      prisma.bookingDispatch.update({
        where: { id: offer.dispatchId },
        data: {
          dispatchState: 'RETRY_WAIT',
          currentOfferAttemptId: null,
          currentCandidateHeroId: null,
          nextAttemptAt: now,
        },
      }),
      prisma.bookingAssignment.updateMany({
        where: { bookingId: offer.bookingId, heroId: offer.heroId, status: 'ASSIGNED' },
        data: { status: 'CANCELLED', cancelledAt: now, cancelReason: 'Offer expired' },
      }),
      prisma.booking.update({
        where: { id: offer.bookingId },
        data: {
          status: booking.status === 'ASSIGNED' ? 'PENDING_ASSIGNMENT' : booking.status,
          assignedHeroId: booking.status === 'ASSIGNED' ? null : booking.assignedHeroId,
          version: { increment: 1 },
        },
      }),
    ]);
    await offerNextHero(offer.bookingId, 'OFFER_EXPIRED');
  }
  return stale.length;
}

export async function processDueDispatches(now = new Date()): Promise<number> {
  await expireStaleOffers(now);
  const due = await prisma.bookingDispatch.findMany({
    where: {
      dispatchState: { in: ['PLANNED', 'PREFLIGHT_READY', 'RETRY_WAIT'] },
      nextAttemptAt: { lte: now },
    },
    take: 25,
    select: { bookingId: true },
  });
  for (const row of due) {
    await planOrDispatchBooking(row.bookingId, 'DISPATCH_POLL').catch((error) => logger.error('dispatch poll failed', error));
  }
  return due.length;
}

export async function assignHeroManually(bookingId: number, heroId: number, actorUserId: number, reason: string) {
  const booking = await loadDispatchableBooking(bookingId);
  if (!['PENDING_ASSIGNMENT', 'ON_HOLD', 'ASSIGNED'].includes(booking.status)) {
    throw new AppError(409, 'Booking cannot be assigned in this status', 'BOOKING_INVALID_TRANSITION');
  }
  const eligible = await listEligibleHeroes(bookingId, 'MANUAL');
  const candidate = eligible.find((hero) => hero.heroId === heroId);
  if (!candidate) {
    const busy = await prisma.booking.findFirst({
      where: {
        assignedHeroId: heroId,
        status: { in: [...HERO_BUSY] },
        deletedAt: null,
        id: { not: bookingId },
      },
      select: { id: true },
    });
    if (busy) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: 'ON_HOLD',
          version: { increment: 1 },
          adminNotes: reason,
          statusHistory: {
            create: {
              fromStatus: booking.status,
              toStatus: 'ON_HOLD',
              ...bookingAudit({
                actorType: 'DASHBOARD',
                actorId: actorUserId,
                source: 'DASHBOARD',
                reasonCode: 'HERO_BUSY',
                reasonText: reason,
              }),
            },
          },
        },
      });
      throw new AppError(409, 'Hero is busy; booking placed on hold', 'HERO_BUSY');
    }
    throw new AppError(400, 'Hero is not eligible for this booking', 'HERO_INELIGIBLE');
  }

    assertBookingTransition({ from: booking.status, to: 'ASSIGNED', actorType: 'DASHBOARD', reason });

  const window = canonicalBookingWindow(booking);
  await prisma.$transaction(async (tx) => {
    await tx.bookingDispatch.upsert({
      where: { bookingId },
      create: {
        bookingId,
        scheduledStartAt: window.start,
        dispatchReleaseAt: new Date(),
        reminderAt: calculateReminderAt(window.start, env.DISPATCH_FINAL_REMINDER_MINUTES),
        dispatchState: 'HERO_ACCEPTED',
        manualOverride: true,
        overrideReason: reason,
        shadowMode: false,
        currentCandidateHeroId: heroId,
      },
      update: {
        dispatchState: 'HERO_ACCEPTED',
        manualOverride: true,
        overrideReason: reason,
        currentCandidateHeroId: heroId,
      },
    });
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: 'ASSIGNED',
        assignedHeroId: heroId,
        version: { increment: 1 },
        statusHistory: {
          create: {
            fromStatus: booking.status,
            toStatus: 'ASSIGNED',
            ...bookingAudit({
              actorType: 'DASHBOARD',
              actorId: actorUserId,
              source: 'DASHBOARD',
              reasonCode: 'MANUAL_ASSIGN',
              reasonText: reason,
            }),
          },
        },
        assignments: {
          create: { heroId, assignedById: actorUserId, status: 'ASSIGNED' },
        },
      },
    });
  });
  await enqueueDispatchNotification({
    heroId,
    title: 'Job assigned',
    body: `${booking.customerName} · ${booking.serviceAddress}`,
    data: { bookingId: String(bookingId), type: 'BOOKING_ASSIGNED' },
  });
  return prisma.booking.findFirstOrThrow({ where: { id: bookingId } });
}

export async function listDashboardEligibleHeroes(bookingId: number) {
  return listEligibleHeroes(bookingId, 'MANUAL');
}

export async function getHeroOffers(heroId: number) {
  return prisma.bookingOfferAttempt.findMany({
    where: { heroId, status: { in: ['PENDING', 'DELIVERED'] }, offerExpiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    include: {
      booking: {
        select: {
          id: true,
          bookingNo: true,
          customerName: true,
          customerPhone: true,
          serviceAddress: true,
          scheduledDate: true,
          scheduledFromTime: true,
          slotStartAt: true,
          payableTotal: true,
          items: { select: { name: true, quantity: true } },
        },
      },
    },
  });
}
