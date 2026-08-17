import { createHash, randomInt } from 'crypto';
import type { BookingStatus, Prisma } from '@prisma/client';
import { logger } from '../../utils/logger';

export type BookingActorType = 'CUSTOMER' | 'HERO' | 'DASHBOARD' | 'SYSTEM';
export type BookingMutationSource = 'CUSTOMER_APP' | 'HERO_APP' | 'DASHBOARD' | 'AUTO_DISPATCH' | 'PAYMENT' | 'RECONCILIATION';

export class BookingIntegrityError extends Error {
  constructor(
    public readonly code:
      | 'BOOKING_IDEMPOTENCY_CONFLICT'
      | 'BOOKING_INVALID_TRANSITION'
      | 'BOOKING_VERSION_CONFLICT'
      | 'BOOKING_NOT_OWNED'
      | 'BOOKING_ALREADY_CANCELLED'
      | 'BOOKING_TERMINAL_STATE'
      | 'ONLINE_PAYMENT_CUSTOMER_REQUIRED'
      | 'ONLINE_PAYMENT_ITEMS_REQUIRED',
    message: string,
  ) {
    super(message);
    this.name = 'BookingIntegrityError';
  }
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key, item]) => key !== 'idempotencyKey' && item !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]),
    );
  }
  return value;
}

export function fingerprintBookingRequest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

export function generateBookingNumber(now = new Date()): string {
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return `JB-${date}-${randomInt(100000, 1000000)}`;
}

export function generateStartOtp(): string {
  return String(randomInt(1000, 10000));
}

const actorTransitions: Record<BookingActorType, Partial<Record<BookingStatus, BookingStatus[]>>> = {
  CUSTOMER: {
    DRAFT: ['CANCELLED'],
    PENDING_PAYMENT: ['CANCELLED'],
    PENDING_ASSIGNMENT: ['CANCELLED'],
    ASSIGNED: ['CANCELLED'],
    ACCEPTED: ['CANCELLED'],
    ARRIVED: ['CANCELLED'],
    ON_HOLD: ['CANCELLED'],
  },
  HERO: {
    ASSIGNED: ['ACCEPTED', 'PENDING_ASSIGNMENT'],
    ACCEPTED: ['ON_THE_WAY', 'PENDING_ASSIGNMENT'],
    ON_THE_WAY: ['ARRIVED'],
    ARRIVED: ['IN_PROGRESS'],
    IN_PROGRESS: ['COMPLETED'],
  },
  DASHBOARD: {
    DRAFT: ['PENDING_PAYMENT', 'PENDING_ASSIGNMENT', 'CANCELLED'],
    PENDING_PAYMENT: ['PENDING_ASSIGNMENT', 'CANCELLED'],
    PENDING_ASSIGNMENT: ['ON_HOLD', 'CANCELLED'],
    ON_HOLD: ['PENDING_ASSIGNMENT', 'CANCELLED'],
    ASSIGNED: ['CANCELLED'],
    ACCEPTED: ['CANCELLED'],
    COMPLETED: ['REFUNDED'],
  },
  SYSTEM: {
    DRAFT: ['PENDING_PAYMENT', 'PENDING_ASSIGNMENT', 'CANCELLED'],
    PENDING_PAYMENT: ['PENDING_ASSIGNMENT', 'CANCELLED'],
    PENDING_ASSIGNMENT: ['ASSIGNED', 'ON_HOLD', 'CANCELLED'],
    ON_HOLD: ['PENDING_ASSIGNMENT', 'ASSIGNED', 'CANCELLED'],
    ASSIGNED: ['ACCEPTED', 'PENDING_ASSIGNMENT', 'ON_HOLD', 'CANCELLED'],
    ACCEPTED: ['ON_THE_WAY', 'PENDING_ASSIGNMENT', 'CANCELLED'],
    ON_THE_WAY: ['ARRIVED', 'CANCELLED'],
    ARRIVED: ['IN_PROGRESS'],
    IN_PROGRESS: ['COMPLETED'],
    COMPLETED: ['REFUNDED'],
  },
};

export function assertBookingTransition(input: {
  from: BookingStatus;
  to: BookingStatus;
  actorType: BookingActorType;
  reason?: string;
  hasRefundEvidence?: boolean;
}): void {
  if (input.from === 'CANCELLED') {
    throw new BookingIntegrityError('BOOKING_ALREADY_CANCELLED', 'Cancelled booking cannot progress');
  }
  if (input.from === 'REFUNDED' || input.from === 'LEGACY_ARCHIVED') {
    throw new BookingIntegrityError('BOOKING_TERMINAL_STATE', 'Booking is terminal');
  }
  if (input.from === 'COMPLETED' && input.to !== 'REFUNDED') {
    throw new BookingIntegrityError('BOOKING_TERMINAL_STATE', 'Completed booking cannot regress');
  }
  if (input.actorType === 'DASHBOARD' && !input.reason?.trim()) {
    throw new BookingIntegrityError('BOOKING_INVALID_TRANSITION', 'Dashboard status changes require a reason');
  }
  if (input.to === 'REFUNDED' && !input.hasRefundEvidence) {
    throw new BookingIntegrityError('BOOKING_INVALID_TRANSITION', 'Refund evidence is required');
  }
  if (!actorTransitions[input.actorType][input.from]?.includes(input.to)) {
    throw new BookingIntegrityError(
      'BOOKING_INVALID_TRANSITION',
      `${input.actorType} cannot move booking from ${input.from} to ${input.to}`,
    );
  }
}

export function bookingAudit(input: {
  actorType: BookingActorType;
  actorId?: number;
  source: BookingMutationSource;
  reasonCode: string;
  reasonText?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return {
    actorType: input.actorType,
    actorId: input.actorId,
    source: input.source,
    reasonCode: input.reasonCode,
    reasonText: input.reasonText,
    message: input.reasonText,
    metadataJson: input.metadata,
    changedByUserId: input.actorType === 'DASHBOARD' ? input.actorId : undefined,
    changedByHeroId: input.actorType === 'HERO' ? input.actorId : undefined,
  };
}

export function logBookingIdempotency(event: 'replayed' | 'conflict', scope: string, key: string): void {
  logger.info('booking_idempotency_event', {
    event,
    scopeHash: createHash('sha256').update(scope).digest('hex'),
    keyHash: createHash('sha256').update(key).digest('hex'),
  });
}
