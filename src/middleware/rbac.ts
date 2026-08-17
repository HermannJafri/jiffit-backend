import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/http';

export const DASHBOARD_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR', 'OPERATIONS'] as const;
export type DashboardRoleName = (typeof DASHBOARD_ROLES)[number];

export function requireRoles(...roles: DashboardRoleName[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (req.auth?.actor !== 'dashboard') {
      next(new AppError(403, 'Forbidden', 'FORBIDDEN'));
      return;
    }
    const role = req.auth.role ?? '';
    if (role === 'SUPER_ADMIN' || roles.includes(role as DashboardRoleName)) {
      next();
      return;
    }
    next(new AppError(403, 'Forbidden', 'FORBIDDEN'));
  };
}
