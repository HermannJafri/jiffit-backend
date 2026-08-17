import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error';
import { ingestZohoWebhook } from './modules/payments/payment.service';
import { apiRouter } from './routes';
import { ok } from './utils/http';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(
    cors({
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
    }),
  );
  app.post(
    '/api/v1/payments/zoho/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res, next) => {
      try {
        const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));
        ok(res, await ingestZohoWebhook(body, req.header('x-zoho-webhook-signature') ?? req.header('X-Zoho-Webhook-Signature')));
      } catch (error) {
        next(error);
      }
    },
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      service: 'jiffit-backend',
      environment: env.NODE_ENV,
      time: new Date().toISOString(),
    });
  });

  app.use('/api/v1', apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
