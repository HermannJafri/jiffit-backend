import { Router } from 'express';
import { z } from 'zod';
import { asyncRoute } from '../../middleware/async';
import { authenticate } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { ok } from '../../utils/http';
import * as payments from './payment.service';
import { env } from '../../config/env';
import { isPaymentMockEnabled } from './payment-crypto';

export const paymentRouter = Router();

paymentRouter.post(
  '/customer/bookings/:id/zoho-payment-link',
  authenticate(['customer']),
  asyncRoute(async (req, res) => {
    ok(res, await payments.createCheckoutForBooking(req.auth!.id, Number(req.params.id)), 'Payment link ready');
  }),
);

paymentRouter.post(
  '/customer/bookings/:id/mock-payment',
  authenticate(['customer']),
  asyncRoute(async (req, res) => {
    ok(res, await payments.mockPayBooking(req.auth!.id, Number(req.params.id)), 'Paid');
  }),
);

paymentRouter.get(
  '/mock-enabled',
  authenticate(['dashboard']),
  asyncRoute(async (_req, res) => {
    ok(res, { enabled: isPaymentMockEnabled(env.NODE_ENV, env.PAYMENT_MOCK_ENABLED) });
  }),
);

paymentRouter.post(
  '/cash-collection/settle',
  authenticate(['dashboard']),
  requireRoles('SUPER_ADMIN', 'ADMIN', 'OPERATIONS'),
  validate(z.object({ bookingId: z.number().int().positive() })),
  asyncRoute(async (req, res) => {
    const { prisma } = await import('../../config/database');
    const booking = await prisma.booking.update({
      where: { id: req.body.bookingId },
      data: { cashSettled: true, cashSettledAt: new Date(), cashSettledById: req.auth!.id },
    });
    ok(res, booking, 'Cash settled');
  }),
);
