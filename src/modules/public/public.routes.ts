import { Router } from 'express';
import { asyncRoute } from '../../middleware/async';
import { AppError, ok } from '../../utils/http';
import * as publicCatalog from './public.service';

export const publicRouter = Router();

function scopeFrom(query: Record<string, unknown>) {
  const hubId = query.hubId ? Number(query.hubId) : undefined;
  const latitude = query.lat ? Number(query.lat) : query.latitude ? Number(query.latitude) : undefined;
  const longitude = query.lng ? Number(query.lng) : query.longitude ? Number(query.longitude) : undefined;
  return {
    hubId: Number.isFinite(hubId) ? hubId : undefined,
    latitude: Number.isFinite(latitude) ? latitude : undefined,
    longitude: Number.isFinite(longitude) ? longitude : undefined,
  };
}

publicRouter.get(
  '/catalog-scope',
  asyncRoute(async (req, res) => {
    ok(res, await publicCatalog.getPublicCatalogScope(scopeFrom(req.query as Record<string, unknown>)));
  }),
);
publicRouter.get(
  '/categories',
  asyncRoute(async (req, res) => {
    ok(res, await publicCatalog.getPublicCategories(scopeFrom(req.query as Record<string, unknown>)));
  }),
);
publicRouter.get(
  '/service-groups',
  asyncRoute(async (req, res) => {
    ok(res, await publicCatalog.getPublicServiceGroups(scopeFrom(req.query as Record<string, unknown>)));
  }),
);
publicRouter.get(
  '/service-groups/:groupId/services',
  asyncRoute(async (req, res) => {
    ok(
      res,
      await publicCatalog.getPublicGroupServices(Number(req.params.groupId), scopeFrom(req.query as Record<string, unknown>)),
    );
  }),
);
publicRouter.get(
  '/services/search',
  asyncRoute(async (req, res) => {
    const q = String(req.query.q ?? req.query.query ?? '').trim();
    ok(res, await publicCatalog.searchPublicServices(q, scopeFrom(req.query as Record<string, unknown>)));
  }),
);
publicRouter.get(
  '/services/:serviceId',
  asyncRoute(async (req, res) => {
    const service = await publicCatalog.getPublicService(
      Number(req.params.serviceId),
      scopeFrom(req.query as Record<string, unknown>),
    );
    if (!service) throw new AppError(404, 'Service not found', 'NOT_FOUND');
    ok(res, service);
  }),
);
publicRouter.get(
  '/cities',
  asyncRoute(async (_req, res) => {
    ok(res, await publicCatalog.listPublicCities());
  }),
);
publicRouter.get(
  '/hubs',
  asyncRoute(async (req, res) => {
    const cityId = req.query.cityId ? Number(req.query.cityId) : undefined;
    ok(res, await publicCatalog.listPublicHubs(Number.isFinite(cityId) ? cityId : undefined));
  }),
);
