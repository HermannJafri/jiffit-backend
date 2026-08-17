import { Router } from 'express';
import { z } from 'zod';
import { asyncRoute } from '../../middleware/async';
import { authenticate } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { ok } from '../../utils/http';
import * as settings from './settings.service';

export const settingsRouter = Router();

settingsRouter.get(
  '/public',
  asyncRoute(async (_req, res) => {
    ok(res, await settings.listPublicSettings());
  }),
);

settingsRouter.use(authenticate(['dashboard']));

settingsRouter.get(
  '/',
  asyncRoute(async (req, res) => {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    ok(res, await settings.listSettings(category));
  }),
);

settingsRouter.put(
  '/',
  requireRoles('SUPER_ADMIN', 'ADMIN'),
  validate(
    z.object({
      key: z.string().min(1).max(100),
      value: z.string(),
      type: z.enum(['STRING', 'NUMBER', 'BOOLEAN', 'JSON']).optional(),
      category: z.string().min(1).max(50),
      label: z.string().min(1).max(200),
      isPublic: z.boolean().optional(),
    }),
  ),
  asyncRoute(async (req, res) => {
    ok(res, await settings.upsertSetting(req.body));
  }),
);
