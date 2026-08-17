import { Router } from 'express';
import { z } from 'zod';
import { asyncRoute } from '../../middleware/async';
import { authenticate } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { ok } from '../../utils/http';
import * as geography from './geography.service';

export const geographyRouter = Router();
const dashboard = authenticate(['dashboard']);
const canWrite = requireRoles('SUPER_ADMIN', 'ADMIN');
const hhmm = z.string().regex(/^\d{2}:\d{2}$/).nullable().optional();

geographyRouter.use(dashboard);

geographyRouter.get(
  '/states',
  asyncRoute(async (_req, res) => {
    ok(res, await geography.listStates());
  }),
);
geographyRouter.post(
  '/states',
  canWrite,
  validate(z.object({ name: z.string().trim().min(1).max(100), code: z.string().trim().min(1).max(5) })),
  asyncRoute(async (req, res) => {
    ok(res, await geography.createState(req.body), 'Created', 201);
  }),
);
geographyRouter.put(
  '/states/:id',
  canWrite,
  validate(z.object({ name: z.string().trim().min(1).max(100).optional(), code: z.string().trim().min(1).max(5).optional() })),
  asyncRoute(async (req, res) => {
    ok(res, await geography.updateState(Number(req.params.id), req.body));
  }),
);
geographyRouter.patch(
  '/states/:id/toggle',
  canWrite,
  asyncRoute(async (req, res) => {
    ok(res, await geography.toggleState(Number(req.params.id)));
  }),
);

geographyRouter.get(
  '/cities',
  asyncRoute(async (req, res) => {
    const stateId = req.query.stateId ? Number(req.query.stateId) : undefined;
    ok(res, await geography.listCities(Number.isFinite(stateId) ? stateId : undefined));
  }),
);
geographyRouter.post(
  '/cities',
  canWrite,
  validate(
    z.object({
      name: z.string().trim().min(1).max(100),
      stateId: z.number().int().positive(),
      bookingCutoffTime: hhmm,
      imageUrl: z.string().url().max(500).optional(),
    }),
  ),
  asyncRoute(async (req, res) => {
    ok(res, await geography.createCity(req.body), 'Created', 201);
  }),
);
geographyRouter.put(
  '/cities/:id',
  canWrite,
  validate(
    z.object({
      name: z.string().trim().min(1).max(100).optional(),
      stateId: z.number().int().positive().optional(),
      bookingCutoffTime: hhmm,
      imageUrl: z.string().url().max(500).nullable().optional(),
    }),
  ),
  asyncRoute(async (req, res) => {
    ok(res, await geography.updateCity(Number(req.params.id), req.body));
  }),
);
geographyRouter.patch(
  '/cities/:id/toggle',
  canWrite,
  asyncRoute(async (req, res) => {
    ok(res, await geography.toggleCity(Number(req.params.id)));
  }),
);

geographyRouter.get(
  '/hubs',
  asyncRoute(async (req, res) => {
    const cityId = req.query.cityId ? Number(req.query.cityId) : undefined;
    ok(res, await geography.listHubs(Number.isFinite(cityId) ? cityId : undefined));
  }),
);
geographyRouter.get(
  '/hubs/:id',
  asyncRoute(async (req, res) => {
    ok(res, await geography.getHub(Number(req.params.id)));
  }),
);
const hubBody = z.object({
  cityId: z.number().int().positive(),
  name: z.string().trim().min(1).max(100),
  address: z.string().trim().min(1),
  latitude: z.string().min(1).max(20),
  longitude: z.string().min(1).max(20),
  checkinRadiusMeters: z.number().int().positive().optional(),
  serviceRadiusMeters: z.number().int().positive().optional(),
  managerId: z.number().int().positive().optional(),
});
geographyRouter.post(
  '/hubs',
  canWrite,
  validate(hubBody),
  asyncRoute(async (req, res) => {
    ok(res, await geography.createHub(req.body), 'Created', 201);
  }),
);
geographyRouter.put(
  '/hubs/:id',
  canWrite,
  validate(hubBody.partial()),
  asyncRoute(async (req, res) => {
    ok(res, await geography.updateHub(Number(req.params.id), req.body));
  }),
);
geographyRouter.patch(
  '/hubs/:id/toggle',
  canWrite,
  asyncRoute(async (req, res) => {
    ok(res, await geography.toggleHub(Number(req.params.id)));
  }),
);
