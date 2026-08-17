import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { ok } from '../../utils/http';
import { normalizeIndianMobile } from '../../utils/phone';
import { getHeroMe, refreshHero, sendHeroOtp, verifyHeroOtp } from './hero-auth.service';

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
  validate(z.object({ phone: phoneSchema, deviceId: z.string().max(120).optional() })),
  async (req, res, next) => {
    try {
      const result = await sendHeroOtp(req.body.phone, {
        ipAddress: req.ip,
        deviceId: req.body.deviceId,
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
      deviceId: z.string().max(120).optional(),
      referralCode: z.string().trim().max(20).optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      ok(
        res,
        await verifyHeroOtp(req.body.phone, req.body.otp, { referralCode: req.body.referralCode }),
        'Logged in',
      );
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
      ok(res, await refreshHero(req.body.refreshToken), 'Token refreshed');
    } catch (error) {
      next(error);
    }
  },
);

router.get('/me', authenticate(['hero']), async (req, res, next) => {
  try {
    ok(res, await getHeroMe(req.auth!.id));
  } catch (error) {
    next(error);
  }
});

export const heroAuthRouter = router;
