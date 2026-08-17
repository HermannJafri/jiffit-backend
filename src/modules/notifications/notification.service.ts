import { logger } from '../../utils/logger';
import { env } from '../../config/env';

export async function enqueueDispatchNotification(input: {
  heroId: number;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<void> {
  logger.info('notification_enqueued', {
    heroId: input.heroId,
    title: input.title,
    fcmConfigured: Boolean(env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY),
  });
}

export async function sendPushToToken(token: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
    logger.info('fcm_skipped_unconfigured', { title });
    return;
  }
  logger.info('fcm_send_placeholder', { tokenSuffix: token.slice(-6), title, data });
}
