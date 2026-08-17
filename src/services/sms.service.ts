import axios from 'axios';
import { env, isMasterOtpEnabled } from '../config/env';
import { logger } from '../utils/logger';
import { normalizeIndianMobile } from '../utils/phone';

export async function deliverSmsOtp(phone: string, otp: string): Promise<boolean> {
  if (isMasterOtpEnabled() || (env.isDev() && env.OTP_TEST_MODE_ENABLED)) {
    logger.info('OTP delivery simulated', { phone: `******${phone.slice(-4)}` });
    return true;
  }

  if (!env.FAST2SMS_ENABLED) {
    logger.warn('Fast2SMS disabled; OTP not sent');
    return false;
  }
  if (!env.FAST2SMS_API_KEY.trim()) {
    logger.error('FAST2SMS_API_KEY missing');
    return false;
  }
  const mobile = normalizeIndianMobile(phone);
  if (!mobile) return false;

  try {
    const response = await axios.get(env.FAST2SMS_BASE_URL, {
      timeout: env.FAST2SMS_TIMEOUT_MS,
      params: {
        authorization: env.FAST2SMS_API_KEY,
        route: env.FAST2SMS_OTP_ROUTE,
        variables_values: otp,
        numbers: mobile,
      },
    });
    const payload = response.data as { return?: boolean };
    return payload.return === true;
  } catch (error) {
    logger.error('Fast2SMS delivery failed', error instanceof Error ? error.message : error);
    return false;
  }
}
