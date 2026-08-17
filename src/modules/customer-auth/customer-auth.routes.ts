import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AppError, ok } from '../../utils/http';
import { normalizeIndianMobile } from '../../utils/phone';
import { getCustomerMe, refreshCustomer, sendCustomerOtp, verifyCustomerOtp } from './customer-auth.service';

const router = Router();

const phoneSchema = z.string().transform((value, ctx) => {
  const phone = normalizeIndianMobile(value);
  if (!phone) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid 10-digit Indian mobile number' });
    return z.NEVER;
  }
  return phone;
});

router.post(
  '/send-otp',
  validate(
    z.object({
      phone: phoneSchema,
      mode: z.enum(['login', 'signup']).optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const result = await sendCustomerOtp(req.body.phone, {
        ipAddress: req.ip,
        deviceId: typeof req.headers['x-device-id'] === 'string' ? req.headers['x-device-id'] : undefined,
      });
      ok(res, result, 'OTP sent');
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/verify-otp',
  validate(
    z.object({
      phone: phoneSchema,
      otp: z.string().regex(/^\d{6}$/),
      mode: z.enum(['login', 'signup']).optional(),
      whatsappOptIn: z.boolean().optional(),
      referralCode: z.string().trim().max(20).optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const result = await verifyCustomerOtp(req.body.phone, req.body.otp, {
        whatsappOptIn: req.body.whatsappOptIn,
        referralCode: req.body.referralCode,
      });
      ok(res, result, 'Logged in');
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/refresh',
  validate(z.object({ refreshToken: z.string().min(1) })),
  async (req, res, next) => {
    try {
      ok(res, await refreshCustomer(req.body.refreshToken), 'Token refreshed');
    } catch (error) {
      next(error);
    }
  },
);

router.get('/me', authenticate(['customer']), async (req, res, next) => {
  try {
    if (!req.auth) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
    ok(res, await getCustomerMe(req.auth.id));
  } catch (error) {
    next(error);
  }
});

export const customerAuthRouter = router;
