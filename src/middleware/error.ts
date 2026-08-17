import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError, fail } from '../utils/http';
import { logger } from '../utils/logger';
import { toBookingHttpError } from '../modules/bookings/booking-errors';
import { PaymentDomainError } from '../modules/payments/payment.service';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const mapped = toBookingHttpError(err);
  const error = mapped instanceof AppError || mapped instanceof ZodError ? mapped : err;

  if (error instanceof ZodError) {
    fail(res, 400, 'Invalid request', 'VALIDATION_ERROR', {
      issues: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    });
    return;
  }

  if (error instanceof PaymentDomainError) {
    fail(res, 409, error.message, error.code);
    return;
  }

  if (error instanceof AppError) {
    fail(res, error.statusCode, error.message, error.code, error.details);
    return;
  }

  const message = error instanceof Error ? error.message : 'Unknown error';
  logger.error(message, error instanceof Error ? error.stack : error);
  fail(res, 500, 'Internal server error');
}

export function notFoundHandler(_req: Request, res: Response): void {
  fail(res, 404, 'Route not found', 'NOT_FOUND');
}
