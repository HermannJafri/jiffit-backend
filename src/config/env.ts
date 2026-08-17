import dotenv from 'dotenv';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { assertProductionOtpSafety as assertOtp, isMasterOtpEnabled as masterEnabled } from './otp-safety';

dotenv.config();

const bool = (fallback: boolean) =>
  z
    .enum(['true', 'false', ''])
    .optional()
    .transform((value) => (value === undefined || value === '' ? fallback : value === 'true'));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  OTP_TEST_MODE_ENABLED: bool(false),
  ALLOW_MASTER_OTP_TEMPORARILY: bool(false),
  MASTER_OTP: z.string().optional().default(''),
  OTP_HASH_SECRET: z.string().optional().default(''),
  TEAM_INVITATION_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  FAST2SMS_API_KEY: z.string().optional().default(''),
  FAST2SMS_ENABLED: bool(false),
  FAST2SMS_BASE_URL: z.string().default('https://www.fast2sms.com/dev/bulkV2'),
  FAST2SMS_OTP_ROUTE: z.string().default('otp'),
  FAST2SMS_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  DISPATCH_ACCEPTANCE_WINDOW_SECONDS: z.coerce.number().int().positive().default(90),
  DISPATCH_REASSIGNMENT_BUFFER_MINUTES: z.coerce.number().int().positive().default(5),
  DISPATCH_CLEANUP_PREP_BUFFER_MINUTES: z.coerce.number().int().positive().default(10),
  DISPATCH_FINAL_REMINDER_MINUTES: z.coerce.number().int().positive().default(15),
  DISPATCH_LOCATION_FRESHNESS_SECONDS: z.coerce.number().int().positive().default(120),
  DISPATCH_POLL_INTERVAL_SECONDS: z.coerce.number().int().min(5).default(30),
  DISPATCH_LEASE_SECONDS: z.coerce.number().int().min(10).default(60),
  DISPATCH_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  DISPATCH_MIN_NOTICE_MINUTES: z.coerce.number().int().min(0).default(1),
  DISPATCH_FEATURE_ENABLED: bool(false),
  DISPATCH_SHADOW_MODE: bool(true),
  DISPATCH_TEST_BOOKING_PREFIX: z.string().optional().default(''),
  HERO_LOCATION_DUTY_STALE_SECONDS: z.coerce.number().int().min(120).default(600),
  HERO_LOCATION_ACTIVE_STALE_SECONDS: z.coerce.number().int().min(15).default(45),
  HERO_LOCATION_DUTY_MIN_INTERVAL_SECONDS: z.coerce.number().int().min(10).default(30),
  HERO_LOCATION_ACTIVE_MIN_INTERVAL_SECONDS: z.coerce.number().int().min(1).default(3),
  HERO_LOCATION_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  FIREBASE_PROJECT_ID: z.string().optional().default(''),
  FIREBASE_PRIVATE_KEY: z.string().optional().default(''),
  FIREBASE_CLIENT_EMAIL: z.string().optional().default(''),
  DO_SPACES_KEY: z.string().optional().default(''),
  DO_SPACES_SECRET: z.string().optional().default(''),
  DO_SPACES_ENDPOINT: z.string().optional().default(''),
  DO_SPACES_BUCKET: z.string().optional().default(''),
  DO_SPACES_REGION: z.string().optional().default(''),
  DO_SPACES_CDN_URL: z.string().optional().default(''),
  GOOGLE_MAPS_API_KEY: z.string().optional().default(''),
  ZOHO_PAYMENTS_ENABLED: bool(false),
  ZOHO_PAYMENTS_ENVIRONMENT: z.enum(['SANDBOX', 'LIVE']).default('SANDBOX'),
  ZOHO_PAYMENTS_BASE_URL: z.string().default('https://paymentssandbox.zoho.in/api/v1'),
  ZOHO_PAYMENTS_ACCOUNTS_URL: z.string().default('https://accounts.zoho.in'),
  ZOHO_PAYMENTS_ACCOUNT_ID: z.string().optional().default(''),
  ZOHO_PAYMENTS_API_KEY: z.string().optional().default(''),
  ZOHO_PAYMENTS_WEBHOOK_SIGNING_KEY: z.string().optional().default(''),
  ZOHO_PAYMENTS_RETURN_SIGNING_KEY: z.string().optional().default(''),
  ZOHO_PAYMENTS_CLIENT_ID: z.string().optional().default(''),
  ZOHO_PAYMENTS_CLIENT_SECRET: z.string().optional().default(''),
  ZOHO_PAYMENTS_REFRESH_TOKEN: z.string().optional().default(''),
  ZOHO_PAYMENTS_RETURN_URL: z.string().optional().default(''),
  ZOHO_PAYMENTS_CURRENCY: z.string().default('INR'),
  ZOHO_PAYMENTS_ALLOWED_METHODS: z.string().default('upi,card'),
  ZOHO_PAYMENTS_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS: z.coerce.number().int().positive().default(300),
  ZOHO_PAYMENTS_HTTP_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  ZOHO_PAYMENTS_RECONCILIATION_ENABLED: bool(false),
  ZOHO_PAYMENTS_RECONCILIATION_INTERVAL_SECONDS: z.coerce.number().int().positive().default(60),
  PAYMENT_MOCK_ENABLED: bool(false),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
  throw new Error(`Invalid environment: ${issues}`);
}

export const env = {
  ...parsed.data,
  OTP_HASH_SECRET: parsed.data.OTP_HASH_SECRET || parsed.data.JWT_SECRET,
  ALLOWED_ORIGINS: parsed.data.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
  isProd: () => parsed.data.NODE_ENV === 'production',
  isDev: () => parsed.data.NODE_ENV !== 'production',
};

export function isMasterOtpEnabled(): boolean {
  return masterEnabled(env.NODE_ENV, env.MASTER_OTP, env.ALLOW_MASTER_OTP_TEMPORARILY);
}

export function assertProductionOtpSafety(): void {
  assertOtp(
    env.NODE_ENV,
    env.MASTER_OTP,
    env.OTP_TEST_MODE_ENABLED,
    env.ALLOW_MASTER_OTP_TEMPORARILY,
    (message) => logger.warn(message),
  );
}
