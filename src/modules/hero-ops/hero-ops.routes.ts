import { Router } from 'express';
import { z } from 'zod';
import { asyncRoute } from '../../middleware/async';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { ok } from '../../utils/http';
import { toBookingHttpError } from '../bookings/booking-errors';
import * as ops from './hero-ops.service';

export const heroOpsRouter = Router();
heroOpsRouter.use(authenticate(['hero']));

function wrap(handler: Parameters<typeof asyncRoute>[0]) {
  return asyncRoute(async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      throw toBookingHttpError(error);
    }
  });
}

heroOpsRouter.post(
  '/attendance/check-in',
  validate(
    z.object({
      hubId: z.number().int().positive(),
      latitude: z.number().finite(),
      longitude: z.number().finite(),
      selfieUrl: z.string().url().optional(),
    }),
  ),
  wrap(async (req, res) => {
    ok(res, await ops.checkIn(req.auth!.id, req.body), 'Checked in');
  }),
);

heroOpsRouter.post(
  '/attendance/check-out',
  validate(z.object({ reason: z.string().trim().max(30).optional() })),
  wrap(async (req, res) => {
    ok(res, await ops.checkOut(req.auth!.id, req.body.reason), 'Checked out');
  }),
);

heroOpsRouter.post(
  '/location',
  validate(
    z.object({
      latitude: z.number().finite(),
      longitude: z.number().finite(),
      accuracyMeters: z.number().nonnegative().optional(),
      isMocked: z.boolean().optional(),
    }),
  ),
  wrap(async (req, res) => {
    ok(res, await ops.pingLocation(req.auth!.id, req.body));
  }),
);

heroOpsRouter.get(
  '/jobs',
  wrap(async (req, res) => {
    const filter = req.query.filter === 'upcoming' || req.query.filter === 'history' ? req.query.filter : 'active';
    ok(res, await ops.listHeroJobs(req.auth!.id, filter));
  }),
);

heroOpsRouter.get(
  '/jobs/:id',
  wrap(async (req, res) => {
    ok(res, await ops.getHeroJob(req.auth!.id, Number(req.params.id)));
  }),
);

heroOpsRouter.get(
  '/offers',
  wrap(async (req, res) => {
    ok(res, await ops.listOffers(req.auth!.id));
  }),
);

heroOpsRouter.post(
  '/jobs/:id/accept',
  wrap(async (req, res) => {
    ok(res, await ops.acceptHeroJob(req.auth!.id, Number(req.params.id)), 'Accepted');
  }),
);

heroOpsRouter.post(
  '/jobs/:id/decline',
  validate(z.object({ reason: z.string().trim().max(500).optional() })),
  wrap(async (req, res) => {
    ok(res, await ops.declineHeroJob(req.auth!.id, Number(req.params.id), req.body.reason), 'Declined');
  }),
);

heroOpsRouter.post(
  '/jobs/:id/advance',
  validate(
    z.object({
      to: z.enum(['ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED']),
      startOtp: z.string().optional(),
      paymentMethod: z.string().optional(),
    }),
  ),
  wrap(async (req, res) => {
    ok(res, await ops.advanceHeroJob(req.auth!.id, Number(req.params.id), req.body.to, req.body));
  }),
);

heroOpsRouter.post(
  '/jobs/:id/photos',
  validate(
    z.object({
      kind: z.enum(['before', 'after']),
      dataBase64: z.string().min(16),
      filename: z.string().min(1).max(120).default('photo.jpg'),
      contentType: z.string().min(1).max(80).default('image/jpeg'),
    }),
  ),
  wrap(async (req, res) => {
    const buffer = Buffer.from(String(req.body.dataBase64).replace(/^data:[^;]+;base64,/, ''), 'base64');
    ok(
      res,
      await ops.attachJobPhoto(req.auth!.id, Number(req.params.id), req.body.kind, {
        buffer,
        filename: req.body.filename,
        contentType: req.body.contentType,
      }),
      'Photo attached',
    );
  }),
);

heroOpsRouter.get(
  '/leaves',
  wrap(async (req, res) => {
    ok(res, await ops.listLeaves(req.auth!.id));
  }),
);

heroOpsRouter.post(
  '/leaves',
  validate(
    z.object({
      type: z.enum(['SICK', 'CASUAL', 'EMERGENCY', 'OTHER']),
      fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      reason: z.string().trim().min(3).max(500),
    }),
  ),
  wrap(async (req, res) => {
    ok(res, await ops.requestLeave(req.auth!.id, req.body), 'Leave requested', 201);
  }),
);
