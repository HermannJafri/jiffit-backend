import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import crypto from 'crypto';
import {
  isPaymentMockEnabled,
  normalizeZohoPaymentMethod,
  quoteHashForBooking,
  verifyZohoWebhookSignature,
} from './payment-crypto';

describe('payment helpers', () => {
  it('never enables mock pay in production', () => {
    assert.equal(isPaymentMockEnabled('production', true), false);
    assert.equal(isPaymentMockEnabled('development', true), true);
    assert.equal(isPaymentMockEnabled('development', false), false);
  });

  it('maps only trusted Zoho methods', () => {
    assert.equal(normalizeZohoPaymentMethod('upi_intent'), 'UPI');
    assert.equal(normalizeZohoPaymentMethod('debit_card'), 'CARD');
    assert.equal(normalizeZohoPaymentMethod('netbanking'), null);
  });

  it('hashes quotes independently of object key order', () => {
    const booking = {
      id: 1,
      payableTotal: 499,
      subtotal: 499,
      taxTotal: 0,
      coinsRedeemed: 0,
      coinsDiscount: 0,
      overtimeFeeAmount: 0,
      items: [{ serviceId: 9, serviceVariantId: null, quantity: 1, unitPrice: 499, taxAmount: 0, totalAmount: 499 }],
    };
    assert.equal(quoteHashForBooking(booking).quoteHash, quoteHashForBooking({ ...booking, items: [...booking.items] }).quoteHash);
  });

  it('accepts a valid Zoho HMAC header and rejects tampering', () => {
    const key = 'webhook-secret';
    const body = Buffer.from('{"event_id":"evt_1"}');
    const timestamp = '1710000000000';
    const signature = crypto.createHmac('sha256', key).update(Buffer.concat([Buffer.from(`${timestamp}.`), body])).digest('hex');
    const ok = verifyZohoWebhookSignature(body, `t=${timestamp},v=${signature}`, {
      signingKey: key,
      toleranceSeconds: 10 ** 9,
      nowMs: Number(timestamp),
    });
    assert.equal(ok.valid, true);
    const bad = verifyZohoWebhookSignature(body, `t=${timestamp},v=${'ab'.repeat(32)}`, {
      signingKey: key,
      toleranceSeconds: 10 ** 9,
      nowMs: Number(timestamp),
    });
    assert.equal(bad.valid, false);
  });
});
