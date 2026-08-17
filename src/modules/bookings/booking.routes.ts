import { Router } from 'express';
import { z } from 'zod';
import type { BookingStatus } from '@prisma/client';
import { asyncRoute } from '../../middleware/async';
import { authenticate } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { AppError, ok } from '../../utils/http';
import { toBookingHttpError } from './booking-errors';
import * as bookings from './booking.service';

export const bookingRouter = Router();
const dashboard = authenticate(['dashboard']);
const canWrite = requireRoles('SUPER_ADMIN', 'ADMIN', 'OPERATIONS');

bookingRouter.use(dashboard);

const itemBody = z.object({
  serviceId: z.number().int().positive().optional(),
  serviceVariantId: z.number().int().positive().optional(),
  name: z.string().trim().min(1).max(150),
  description: z.string().optional(),
  quantity: z.number().int().min(1).optional(),
  unitPrice: z.number().nonnegative(),
  taxAmount: z.number().nonnegative().optional(),
  totalAmount: z.number().nonnegative(),
});

const createBody = z.object({
  idempotencyKey: z.string().trim().min(8).max(100).optional(),
  cityId: z.number().int().positive(),
  customerName: z.string().trim().min(1).max(100),
  customerPhone: z.string().trim().min(10).max(15),
  customerAltPhone: z.string().trim().max(15).optional(),
  customerEmail: z.string().email().optional(),
  serviceAddress: z.string().trim().min(1),
  latitude: z.number().finite().optional(),
  longitude: z.number().finite().optional(),
  customerId: z.number().int().positive().optional(),
  customerAddressId: z.number().int().positive().optional(),
  serviceCategoryId: z.number().int().positive().optional(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  scheduledFromTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  scheduledToTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  paymentMethod: z.string().max(50).optional(),
  customerNotes: z.string().trim().max(500).optional(),
  adminNotes: z.string().trim().max(2000).optional(),
  items: z.array(itemBody).min(1),
});

const listQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.string().optional(),
  cityId: z.coerce.number().int().positive().optional(),
  customerId: z.coerce.number().int().positive().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const slotQuery = z.object({
  cityId: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceId: z.coerce.number().int().positive(),
  serviceVariantId: z.coerce.number().int().positive().optional(),
  quantity: z.coerce.number().int().min(1).optional(),
  latitude: z.coerce.number().finite().optional(),
  longitude: z.coerce.number().finite().optional(),
});

function bookingRoute(handler: Parameters<typeof asyncRoute>[0]) {
  return asyncRoute(async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      throw toBookingHttpError(error);
    }
  });
}

bookingRouter.get(
  '/slots/availability',
  bookingRoute(async (req, res) => {
    const query = slotQuery.parse(req.query);
    ok(res, await bookings.getDashboardSlotAvailability(query.cityId, query.date, query.serviceId, query));
  }),
);
bookingRouter.get(
  '/slots/service-availability',
  bookingRoute(async (req, res) => {
    const query = slotQuery.parse(req.query);
    ok(res, await bookings.getDashboardSlotAvailability(query.cityId, query.date, query.serviceId, query));
  }),
);

bookingRouter.get(
  '/',
  bookingRoute(async (req, res) => {
    const query = listQuery.parse(req.query);
    ok(res, await bookings.listDashboardBookings({ ...query, status: query.status as BookingStatus | undefined }));
  }),
);
bookingRouter.post(
  '/',
  canWrite,
  validate(createBody),
  bookingRoute(async (req, res) => {
    ok(res, await bookings.createDashboardBooking(req.auth!.id, req.body), 'Created', 201);
  }),
);
bookingRouter.get(
  '/:id',
  bookingRoute(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw new AppError(400, 'Invalid booking id', 'VALIDATION_ERROR');
    ok(res, await bookings.getDashboardBooking(id));
  }),
);
bookingRouter.patch(
  '/:id/cancel',
  canWrite,
  validate(z.object({ reason: z.string().trim().min(3).max(500) })),
  bookingRoute(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw new AppError(400, 'Invalid booking id', 'VALIDATION_ERROR');
    ok(
      res,
      await bookings.cancelBooking(id, {
        type: 'DASHBOARD',
        id: req.auth!.id,
        source: 'DASHBOARD',
        reason: req.body.reason,
      }),
      'Cancelled',
    );
  }),
);
