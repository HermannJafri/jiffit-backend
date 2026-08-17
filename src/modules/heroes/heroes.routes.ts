import { Router } from 'express';
import { z } from 'zod';
import { asyncRoute } from '../../middleware/async';
import { authenticate } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { ok } from '../../utils/http';
import * as heroes from './heroes.service';

export const heroesRouter = Router();
heroesRouter.use(authenticate(['dashboard']));
const canWrite = requireRoles('SUPER_ADMIN', 'ADMIN', 'HR');

heroesRouter.get(
  '/',
  asyncRoute(async (req, res) => {
    ok(
      res,
      await heroes.listHeroes({
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        cityId: req.query.cityId ? Number(req.query.cityId) : undefined,
        q: typeof req.query.q === 'string' ? req.query.q : undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      }),
    );
  }),
);

heroesRouter.get(
  '/:id',
  asyncRoute(async (req, res) => {
    ok(res, await heroes.getHero(Number(req.params.id)));
  }),
);

heroesRouter.patch(
  '/:id/verify',
  canWrite,
  asyncRoute(async (req, res) => {
    ok(res, await heroes.verifyHero(Number(req.params.id), req.auth!.id), 'Verified');
  }),
);

heroesRouter.patch(
  '/:id/reject',
  canWrite,
  validate(z.object({ reason: z.string().trim().min(3).max(500) })),
  asyncRoute(async (req, res) => {
    ok(res, await heroes.rejectHero(Number(req.params.id), req.body.reason), 'Rejected');
  }),
);

heroesRouter.patch(
  '/:id/blacklist',
  canWrite,
  validate(z.object({ blacklisted: z.boolean(), reason: z.string().trim().max(500).optional() })),
  asyncRoute(async (req, res) => {
    ok(res, await heroes.setHeroBlacklist(Number(req.params.id), req.body.blacklisted, req.body.reason));
  }),
);

export const customersRouter = Router();
customersRouter.use(authenticate(['dashboard']));
customersRouter.get(
  '/',
  asyncRoute(async (req, res) => {
    ok(
      res,
      await heroes.listCustomers({
        q: typeof req.query.q === 'string' ? req.query.q : undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      }),
    );
  }),
);
