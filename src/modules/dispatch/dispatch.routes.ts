import { Router } from 'express';
import { z } from 'zod';
import { asyncRoute } from '../../middleware/async';
import { authenticate } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { AppError, ok } from '../../utils/http';
import { toBookingHttpError } from '../bookings/booking-errors';
import * as dispatch from './dispatch.service';

export const dispatchRouter = Router();

function wrap(handler: Parameters<typeof asyncRoute>[0]) {
  return asyncRoute(async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      throw toBookingHttpError(error);
    }
  });
}

dispatchRouter.get(
  '/bookings/:id/eligible-heroes',
  authenticate(['dashboard']),
  wrap(async (req, res) => {
    ok(res, await dispatch.listDashboardEligibleHeroes(Number(req.params.id)));
  }),
);

dispatchRouter.patch(
  '/bookings/:id/assign',
  authenticate(['dashboard']),
  requireRoles('SUPER_ADMIN', 'ADMIN', 'OPERATIONS'),
  validate(z.object({ heroId: z.number().int().positive(), reason: z.string().trim().min(3).max(500) })),
  wrap(async (req, res) => {
    ok(res, await dispatch.assignHeroManually(Number(req.params.id), req.body.heroId, req.auth!.id, req.body.reason), 'Assigned');
  }),
);

dispatchRouter.post(
  '/bookings/:id/dispatch',
  authenticate(['dashboard']),
  requireRoles('SUPER_ADMIN', 'ADMIN', 'OPERATIONS'),
  wrap(async (req, res) => {
    await dispatch.planOrDispatchBooking(Number(req.params.id), 'MANUAL_DISPATCH');
    ok(res, { bookingId: Number(req.params.id) }, 'Dispatch queued');
  }),
);

dispatchRouter.get(
  '/hero/offers',
  authenticate(['hero']),
  wrap(async (req, res) => {
    ok(res, await dispatch.getHeroOffers(req.auth!.id));
  }),
);

dispatchRouter.post(
  '/hero/bookings/:id/accept',
  authenticate(['hero']),
  wrap(async (req, res) => {
    ok(res, await dispatch.acceptOffer(Number(req.params.id), req.auth!.id), 'Accepted');
  }),
);

dispatchRouter.post(
  '/hero/bookings/:id/decline',
  authenticate(['hero']),
  validate(z.object({ reason: z.string().trim().max(500).optional() })),
  wrap(async (req, res) => {
    await dispatch.declineOffer(Number(req.params.id), req.auth!.id, req.body.reason);
    ok(res, { bookingId: Number(req.params.id) }, 'Declined');
  }),
);

export function assertPositiveId(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw new AppError(400, 'Invalid id', 'VALIDATION_ERROR');
  return id;
}
