import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError, fail } from '../utils/http';
import { logger } from '../utils/logger';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    fail(res, 400, 'Invalid request', 'VALIDATION_ERROR', {
      issues: err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    });
    return;
  }

  if (err instanceof AppError) {
    fail(res, err.statusCode, err.message, err.code, err.details);
    return;
  }

  const message = err instanceof Error ? err.message : 'Unknown error';
  logger.error(message, err instanceof Error ? err.stack : err);
  fail(res, 500, 'Internal server error');
}

export function notFoundHandler(_req: Request, res: Response): void {
  fail(res, 404, 'Route not found', 'NOT_FOUND');
}
