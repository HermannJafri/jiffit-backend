import { Router } from 'express';
import { z } from 'zod';
import { asyncRoute } from '../../middleware/async';
import { authenticate } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { ok } from '../../utils/http';
import * as catalog from './catalog.service';

export const catalogRouter = Router();
const dashboard = authenticate(['dashboard']);
const canWrite = requireRoles('SUPER_ADMIN', 'ADMIN');

catalogRouter.use(dashboard);

const optionalUrl = z.string().url().max(500).optional();
const categoryBody = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z.string().trim().max(100).optional(),
  description: z.string().optional(),
  iconUrl: optionalUrl,
  bannerImageUrl: optionalUrl,
  days: z.number().int().positive().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

catalogRouter.get('/categories', asyncRoute(async (_req, res) => ok(res, await catalog.listCategories())));
catalogRouter.get('/categories/:id', asyncRoute(async (req, res) => ok(res, await catalog.getCategory(Number(req.params.id)))));
catalogRouter.post('/categories', canWrite, validate(categoryBody), asyncRoute(async (req, res) => {
  ok(res, await catalog.createCategory(req.body), 'Created', 201);
}));
catalogRouter.put('/categories/:id', canWrite, validate(categoryBody.partial()), asyncRoute(async (req, res) => {
  ok(res, await catalog.updateCategory(Number(req.params.id), req.body));
}));
catalogRouter.patch('/categories/:id/toggle', canWrite, asyncRoute(async (req, res) => {
  ok(res, await catalog.toggleCategory(Number(req.params.id)));
}));
catalogRouter.delete('/categories/:id', canWrite, asyncRoute(async (req, res) => {
  ok(res, await catalog.deleteCategory(Number(req.params.id)));
}));

const groupBody = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z.string().trim().max(100).optional(),
  parentId: z.number().int().positive().nullable().optional(),
  iconUrl: optionalUrl.nullable(),
  bannerImageUrl: optionalUrl.nullable(),
  description: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

catalogRouter.get('/groups', asyncRoute(async (req, res) => {
  const raw = req.query.parentId;
  const parentId = raw === 'null' ? null : raw ? Number(raw) : undefined;
  ok(res, await catalog.listGroups(parentId));
}));
catalogRouter.get('/groups/:id', asyncRoute(async (req, res) => ok(res, await catalog.getGroup(Number(req.params.id)))));
catalogRouter.post('/groups', canWrite, validate(groupBody), asyncRoute(async (req, res) => {
  ok(res, await catalog.createGroup(req.body), 'Created', 201);
}));
catalogRouter.put('/groups/:id', canWrite, validate(groupBody.partial()), asyncRoute(async (req, res) => {
  ok(res, await catalog.updateGroup(Number(req.params.id), req.body));
}));
catalogRouter.patch('/groups/:id/toggle', canWrite, asyncRoute(async (req, res) => {
  ok(res, await catalog.toggleGroup(Number(req.params.id)));
}));
catalogRouter.delete('/groups/:id', canWrite, asyncRoute(async (req, res) => {
  ok(res, await catalog.deleteGroupCascade(Number(req.params.id)));
}));

const serviceBody = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z.string().trim().max(100).optional(),
  categoryId: z.number().int().positive().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  price: z.number().nonnegative().optional(),
  mrp: z.number().nonnegative().nullable().optional(),
  taxMode: z.string().max(20).optional(),
  taxValue: z.number().nonnegative().optional(),
  imageUrl: optionalUrl,
  detailImageUrl: optionalUrl,
  detailContent: z.record(z.unknown()).nullable().optional(),
  duration: z.number().int().positive().nullable().optional(),
  workerCount: z.number().int().positive().nullable().optional(),
  serviceGroupId: z.number().int().positive().nullable().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

catalogRouter.get('/services', asyncRoute(async (req, res) => {
  ok(
    res,
    await catalog.listServices({
      categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined,
      serviceGroupId: req.query.serviceGroupId ? Number(req.query.serviceGroupId) : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    }),
  );
}));
catalogRouter.get('/services/:id', asyncRoute(async (req, res) => ok(res, await catalog.getService(Number(req.params.id)))));
catalogRouter.post('/services', canWrite, validate(serviceBody), asyncRoute(async (req, res) => {
  ok(res, await catalog.createService(req.body), 'Created', 201);
}));
catalogRouter.put('/services/:id', canWrite, validate(serviceBody.partial()), asyncRoute(async (req, res) => {
  ok(res, await catalog.updateService(Number(req.params.id), req.body));
}));
catalogRouter.patch('/services/:id/toggle', canWrite, asyncRoute(async (req, res) => {
  ok(res, await catalog.toggleService(Number(req.params.id)));
}));
catalogRouter.delete('/services/:id', canWrite, asyncRoute(async (req, res) => {
  ok(res, await catalog.deleteService(Number(req.params.id)));
}));

const variantBody = z.object({
  serviceId: z.number().int().positive(),
  name: z.string().trim().min(1).max(100),
  description: z.string().optional(),
  imageUrl: optionalUrl,
  durationMinutes: z.number().int().positive().optional(),
  mrp: z.number().nonnegative().optional(),
  singlePrice: z.number().nonnegative().optional(),
  price1Month: z.number().nonnegative().optional(),
  price3Month: z.number().nonnegative().optional(),
  price6Month: z.number().nonnegative().optional(),
  price12Month: z.number().nonnegative().optional(),
  visitsPerMonth: z.number().int().positive().optional(),
  validityDays: z.number().int().positive().nullable().optional(),
  totalVisits: z.number().int().positive().nullable().optional(),
  pricePerVisit: z.number().nonnegative().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

catalogRouter.get('/variants', asyncRoute(async (req, res) => {
  const serviceId = Number(req.query.serviceId);
  ok(res, await catalog.listVariants(serviceId));
}));
catalogRouter.get('/variants/:id', asyncRoute(async (req, res) => ok(res, await catalog.getVariant(Number(req.params.id)))));
catalogRouter.post('/variants', canWrite, validate(variantBody), asyncRoute(async (req, res) => {
  ok(res, await catalog.createVariant(req.body), 'Created', 201);
}));
catalogRouter.put('/variants/:id', canWrite, validate(variantBody.partial()), asyncRoute(async (req, res) => {
  ok(res, await catalog.updateVariant(Number(req.params.id), req.body));
}));
catalogRouter.patch('/variants/:id/toggle', canWrite, asyncRoute(async (req, res) => {
  ok(res, await catalog.toggleVariant(Number(req.params.id)));
}));
catalogRouter.delete('/variants/:id', canWrite, asyncRoute(async (req, res) => {
  ok(res, await catalog.deleteVariant(Number(req.params.id)));
}));

catalogRouter.get('/hub-availability', asyncRoute(async (req, res) => {
  ok(res, await catalog.getHubServiceAvailability(Number(req.query.hubId)));
}));
catalogRouter.put(
  '/hub-availability/:hubId',
  canWrite,
  validate(
    z.object({
      items: z.array(
        z.object({
          serviceId: z.number().int().positive(),
          isActive: z.boolean(),
          sortOrder: z.number().int().min(0).nullable().optional(),
        }),
      ),
    }),
  ),
  asyncRoute(async (req, res) => {
    ok(res, await catalog.setHubServiceAvailability(Number(req.params.hubId), req.body.items));
  }),
);
