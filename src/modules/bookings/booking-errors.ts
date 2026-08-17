import { AppError } from '../../utils/http';
import { AuthoritativePricingError } from './pricing';
import { BookingIntegrityError } from './booking-integrity';

export class BookingCancellationPolicyError extends Error {
  constructor(public readonly code: 'PAID_BOOKING_SERVICE_ALREADY_STARTED') {
    super('Paid booking cannot be cancelled after service start');
    this.name = 'BookingCancellationPolicyError';
  }
}

const INTEGRITY_STATUS: Record<BookingIntegrityError['code'], number> = {
  BOOKING_IDEMPOTENCY_CONFLICT: 409,
  BOOKING_INVALID_TRANSITION: 400,
  BOOKING_VERSION_CONFLICT: 409,
  BOOKING_NOT_OWNED: 404,
  BOOKING_ALREADY_CANCELLED: 409,
  BOOKING_TERMINAL_STATE: 409,
  ONLINE_PAYMENT_CUSTOMER_REQUIRED: 400,
  ONLINE_PAYMENT_ITEMS_REQUIRED: 400,
};

export function toBookingHttpError(error: unknown): unknown {
  if (error instanceof BookingIntegrityError) {
    return new AppError(INTEGRITY_STATUS[error.code], error.message, error.code);
  }
  if (error instanceof AuthoritativePricingError) {
    return new AppError(400, error.message, error.code);
  }
  if (error instanceof BookingCancellationPolicyError) {
    return new AppError(409, error.message, error.code);
  }
  return error;
}
