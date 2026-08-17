import axios from 'axios';
import { env } from '../../config/env';
import { AppError } from '../../utils/http';
import { logger } from '../../utils/logger';

export async function createZohoPaymentLink(input: {
  amount: number;
  currency: string;
  reference: string;
  description: string;
}): Promise<{ paymentLinkId: string; checkoutUrl: string; expiresAt: Date | null }> {
  if (!env.ZOHO_PAYMENTS_ENABLED || !env.ZOHO_PAYMENTS_ACCOUNT_ID || !env.ZOHO_PAYMENTS_API_KEY) {
    throw new AppError(503, 'Zoho Payments is not configured', 'ZOHO_NOT_CONFIGURED');
  }
  try {
    const response = await axios.post(
      `${env.ZOHO_PAYMENTS_BASE_URL}/paymentlinks`,
      {
        amount: input.amount,
        currency: input.currency,
        reference_id: input.reference,
        description: input.description,
        expires_in: 30,
        payment_methods: env.ZOHO_PAYMENTS_ALLOWED_METHODS.split(',').map((item) => item.trim()),
      },
      {
        timeout: env.ZOHO_PAYMENTS_HTTP_TIMEOUT_MS,
        headers: {
          Authorization: `Zoho-oauthtoken ${env.ZOHO_PAYMENTS_API_KEY}`,
          'X-com-zoho-payments-organizationid': env.ZOHO_PAYMENTS_ACCOUNT_ID,
        },
      },
    );
    const link = response.data?.payment_links ?? response.data?.payment_link ?? response.data;
    return {
      paymentLinkId: String(link.payment_link_id ?? link.id),
      checkoutUrl: String(link.url ?? link.checkout_url),
      expiresAt: link.expires_at ? new Date(link.expires_at) : null,
    };
  } catch (error) {
    logger.error('zoho_payment_link_failed', error);
    throw new AppError(502, 'Zoho did not create a payment link', 'ZOHO_LINK_FAILED');
  }
}
