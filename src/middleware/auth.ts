import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/http';

export type Actor = 'dashboard' | 'customer' | 'hero';

export interface TokenPayload {
  id: number;
  actor: Actor;
  role?: string;
  phone?: string;
  username?: string;
}

export function authenticate(actors: Actor[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      next(new AppError(401, 'Authentication required', 'UNAUTHENTICATED'));
      return;
    }
    try {
      const payload = jwt.verify(header.slice(7), env.JWT_SECRET) as TokenPayload;
      if (!actors.includes(payload.actor)) {
        next(new AppError(403, 'Forbidden', 'FORBIDDEN'));
        return;
      }
      req.auth = payload;
      next();
    } catch {
      next(new AppError(401, 'Invalid or expired token', 'UNAUTHENTICATED'));
    }
  };
}
