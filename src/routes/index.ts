import { Router } from 'express';
import { dashboardAuthRouter } from '../modules/auth/auth.routes';
import { customerAuthRouter } from '../modules/customer-auth/customer-auth.routes';
import { heroAuthRouter } from '../modules/hero-auth/hero-auth.routes';
import { refreshDashboard } from '../modules/auth/auth.service';
import { ok } from '../utils/http';
import { z } from 'zod';
import { validate } from '../middleware/validate';

export const apiRouter = Router();

apiRouter.use('/auth/dashboard', dashboardAuthRouter);
apiRouter.use('/auth/customer', customerAuthRouter);
apiRouter.use('/auth/hero', heroAuthRouter);

apiRouter.post(
  '/auth/refresh',
  validate(z.object({ refreshToken: z.string().min(1) })),
  async (req, res, next) => {
    try {
      ok(res, await refreshDashboard(req.body.refreshToken), 'Token refreshed');
    } catch (error) {
      next(error);
    }
  },
);
