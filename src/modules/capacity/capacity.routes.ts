import { Router } from 'express';
import { z } from 'zod';
import { asyncRoute } from '../../middleware/async';
import { authenticate } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { ok } from '../../utils/http';
import * as capacity from './capacity.service';

export const capacityRouter = Router();
capacityRouter.use(authenticate(['dashboard']));
const canWrite = requireRoles('SUPER_ADMIN', 'ADMIN', 'OPERATIONS');

capacityRouter.get(
  '/schedules',
  asyncRoute(async (_req, res) => {
    ok(res, await capacity.listWorkSchedules());
  }),
);
capacityRouter.post(
  '/schedules',
  canWrite,
  validate(
    z.object({
      name: z.string().trim().min(1).max(120),
      shiftStart: z.string().regex(/^\d{2}:\d{2}$/),
      shiftEnd: z.string().regex(/^\d{2}:\d{2}$/),
      scope: z.enum(['GLOBAL', 'STATE', 'HUB']).optional(),
      stateId: z.number().int().positive().optional(),
      hubId: z.number().int().positive().optional(),
      bookingEnabled: z.boolean().optional(),
    }),
  ),
  asyncRoute(async (req, res) => {
    ok(res, await capacity.createWorkSchedule(req.body), 'Created', 201);
  }),
);

capacityRouter.get(
  '/groups',
  asyncRoute(async (req, res) => {
    ok(res, await capacity.listCapacityGroups(req.query.hubId ? Number(req.query.hubId) : undefined));
  }),
);
capacityRouter.post(
  '/groups',
  canWrite,
  validate(
    z.object({
      hubId: z.number().int().positive(),
      name: z.string().trim().min(1).max(120),
      serviceIds: z.array(z.number().int().positive()).min(1),
      workScheduleIds: z.array(z.number().int().positive()).default([]),
    }),
  ),
  asyncRoute(async (req, res) => {
    ok(res, await capacity.createCapacityGroup(req.auth!.id, req.body), 'Created', 201);
  }),
);
capacityRouter.patch(
  '/groups/:id/toggle',
  canWrite,
  asyncRoute(async (req, res) => {
    ok(res, await capacity.toggleCapacityGroup(Number(req.params.id)));
  }),
);

capacityRouter.get(
  '/daily',
  asyncRoute(async (req, res) => {
    const groupId = Number(req.query.groupId);
    const dateFrom = String(req.query.dateFrom ?? '');
    const dateTo = String(req.query.dateTo ?? dateFrom);
    ok(res, await capacity.listDailyCapacity(groupId, dateFrom, dateTo));
  }),
);
capacityRouter.put(
  '/daily',
  canWrite,
  validate(
    z.object({
      groupId: z.number().int().positive(),
      capacityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      workScheduleId: z.number().int().positive(),
      heroCount: z.number().int().min(0),
      notes: z.string().max(500).optional(),
    }),
  ),
  asyncRoute(async (req, res) => {
    ok(res, await capacity.upsertDailyCapacity(req.auth!.id, req.body), 'Saved');
  }),
);
