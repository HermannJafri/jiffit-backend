import { Router } from 'express';
import { z } from 'zod';
import { dashboardAuthRouter } from '../modules/auth/auth.routes';
import { catalogRouter } from '../modules/catalog/catalog.routes';
import { customerAuthRouter } from '../modules/customer-auth/customer-auth.routes';
import { customerAppRouter } from '../modules/customer-app/customer-app.routes';
import { geographyRouter } from '../modules/geography/geography.routes';
import { heroAuthRouter } from '../modules/hero-auth/hero-auth.routes';
import { publicRouter } from '../modules/public/public.routes';
import { bookingRouter } from '../modules/bookings/booking.routes';
import { refreshDashboard } from '../modules/auth/auth.service';
import { validate } from '../middleware/validate';
import { ok } from '../utils/http';

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

apiRouter.use('/public', publicRouter);
apiRouter.use('/geography', geographyRouter);
apiRouter.use('/catalog', catalogRouter);
apiRouter.use('/bookings', bookingRouter);
apiRouter.use('/customer/me', customerAppRouter);
