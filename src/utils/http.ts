import type { Response } from 'express';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function ok<T>(res: Response, data: T, message = 'OK', status = 200): void {
  res.status(status).json({ success: true, message, data });
}

export function fail(
  res: Response,
  statusCode: number,
  message: string,
  code?: string,
  details?: Record<string, unknown>,
): void {
  res.status(statusCode).json({
    success: false,
    message,
    ...(code ? { code } : {}),
    ...(details ? { details } : {}),
  });
}
