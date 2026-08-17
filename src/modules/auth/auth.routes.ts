import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { ok } from '../../utils/http';
import { getDashboardMe, loginDashboard, logoutDashboard, refreshDashboard } from './auth.service';

const router = Router();

router.post(
  '/login',
  validate(
    z.object({
      username: z.string().trim().min(1).max(50),
      password: z.string().min(1).max(200),
    }),
  ),
  async (req, res, next) => {
    try {
      const result = await loginDashboard(req.body.username, req.body.password);
      ok(res, result, 'Logged in');
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/refresh',
  validate(z.object({ refreshToken: z.string().min(1) })),
  async (req, res, next) => {
    try {
      ok(res, await refreshDashboard(req.body.refreshToken), 'Token refreshed');
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/logout',
  authenticate(['dashboard']),
  async (req, res, next) => {
    try {
      await logoutDashboard(req.auth!.id, req.body?.refreshToken);
      ok(res, { loggedOut: true }, 'Logged out');
    } catch (error) {
      next(error);
    }
  },
);

router.get('/me', authenticate(['dashboard']), async (req, res, next) => {
  try {
    ok(res, await getDashboardMe(req.auth!.id));
  } catch (error) {
    next(error);
  }
});

export const dashboardAuthRouter = router;
