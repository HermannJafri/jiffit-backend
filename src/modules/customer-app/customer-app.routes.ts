import { Router } from 'express';
import { z } from 'zod';
import type { BookingStatus } from '@prisma/client';
import { asyncRoute } from '../../middleware/async';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { ok } from '../../utils/http';
import { toBookingHttpError } from '../bookings/booking-errors';
import * as addresses from './customer-address.service';
import * as bookings from '../bookings/booking.service';

export const customerAppRouter = Router();
customerAppRouter.use(authenticate(['customer']));

function bookingRoute(handler: Parameters<typeof asyncRoute>[0]) {
  return asyncRoute(async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      throw toBookingHttpError(error);
    }
  });
}

const addressBody = z.object({
  label: z.string().trim().max(50).optional(),
  addressLine1: z.string().trim().min(1).max(255),
  addressLine2: z.string().trim().max(255).optional(),
  cityId: z.number().int().positive(),
  pincode: z.string().trim().min(4).max(10),
  latitude: z.number().finite(),
  longitude: z.number().finite(),
  isDefault: z.boolean().optional(),
});

customerAppRouter.get(
  '/addresses',
  asyncRoute(async (req, res) => {
    ok(res, await addresses.listCustomerAddresses(req.auth!.id));
  }),
);
customerAppRouter.get(
  '/addresses/:id',
  asyncRoute(async (req, res) => {
    ok(res, await addresses.getCustomerAddress(req.auth!.id, Number(req.params.id)));
  }),
);
customerAppRouter.post(
  '/addresses',
  validate(addressBody),
  asyncRoute(async (req, res) => {
    ok(res, await addresses.createCustomerAddress(req.auth!.id, req.body), 'Created', 201);
  }),
);
customerAppRouter.put(
  '/addresses/:id',
  validate(addressBody.partial()),
  asyncRoute(async (req, res) => {
    ok(res, await addresses.updateCustomerAddress(req.auth!.id, Number(req.params.id), req.body));
  }),
);
customerAppRouter.delete(
  '/addresses/:id',
  asyncRoute(async (req, res) => {
    ok(res, await addresses.deleteCustomerAddress(req.auth!.id, Number(req.params.id)));
  }),
);

const bookingItemBody = z.object({
  serviceId: z.number().int().positive().optional(),
  serviceVariantId: z.number().int().positive().optional(),
  name: z.string().trim().min(1).max(150),
  description: z.string().optional(),
  quantity: z.number().int().min(1).optional(),
  unitPrice: z.number().nonnegative(),
  taxAmount: z.number().nonnegative().optional(),
  totalAmount: z.number().nonnegative(),
});

const createBookingBody = z.object({
  idempotencyKey: z.string().trim().min(8).max(100).optional(),
  addressId: z.number().int().positive(),
  items: z.array(bookingItemBody).min(1),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  scheduledFromTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  scheduledToTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  paymentMethod: z.enum(['CASH', 'UPI', 'ONLINE', 'ZOHO', 'CARD', 'NET_BANKING', 'WALLET']).optional(),
  customerNotes: z.string().trim().max(500).optional(),
  couponCode: z.string().trim().max(50).optional(),
  serviceCategoryId: z.number().int().positive().optional(),
  coinsToRedeem: z.number().int().positive().optional(),
});

customerAppRouter.post(
  '/booking-slots/calculate',
  validate(
    z.object({
      customerAddressId: z.number().int().positive(),
      serviceId: z.number().int().positive(),
      serviceVariantId: z.number().int().positive().optional(),
      quantity: z.number().int().min(1).max(100).optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }),
  ),
  bookingRoute(async (req, res) => {
    ok(res, await bookings.calculateCustomerSlots(req.auth!.id, req.body));
  }),
);
customerAppRouter.get(
  '/bookings',
  bookingRoute(async (req, res) => {
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const status = typeof req.query.status === 'string' ? (req.query.status as BookingStatus) : undefined;
    ok(res, await bookings.listCustomerBookings(req.auth!.id, { status, page, limit }));
  }),
);
customerAppRouter.get(
  '/bookings/:id',
  bookingRoute(async (req, res) => {
    ok(res, await bookings.getCustomerBooking(req.auth!.id, Number(req.params.id)));
  }),
);
customerAppRouter.post(
  '/bookings',
  validate(createBookingBody),
  bookingRoute(async (req, res) => {
    const result = await bookings.createCustomerBooking(req.auth!.id, req.body);
    ok(res, result, result.replayed ? 'Replayed' : 'Created', result.replayed ? 200 : 201);
  }),
);
customerAppRouter.patch(
  '/bookings/:id/cancel',
  validate(z.object({ reason: z.string().trim().max(500).optional() })),
  bookingRoute(async (req, res) => {
    ok(
      res,
      await bookings.cancelBooking(Number(req.params.id), {
        type: 'CUSTOMER',
        id: req.auth!.id,
        expectedCustomerId: req.auth!.id,
        source: 'CUSTOMER_APP',
        reason: req.body.reason,
      }),
      'Cancelled',
    );
  }),
);
