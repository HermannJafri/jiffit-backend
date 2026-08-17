import crypto from 'crypto';

export function isPaymentMockEnabled(nodeEnv: string, explicitFlag: boolean): boolean {
  return explicitFlag && (nodeEnv === 'development' || nodeEnv === 'test');
}

export type TrustedZohoPaymentMethod = 'UPI' | 'CARD';

function candidate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return normalized || null;
}

export function normalizeZohoPaymentMethod(value: unknown): TrustedZohoPaymentMethod | null {
  const normalized = candidate(value);
  if (!normalized) return null;
  if (normalized === 'upi' || normalized === 'upi_intent' || normalized === 'upi_collect') return 'UPI';
  if (['card', 'credit_card', 'debit_card', 'creditcard', 'debitcard'].includes(normalized)) return 'CARD';
  return null;
}

export function money(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function quoteHashForBooking(
  booking: {
    id: number;
    payableTotal: unknown;
    subtotal: unknown;
    taxTotal: unknown;
    coinsRedeemed: number;
    coinsDiscount: unknown;
    overtimeFeeAmount: unknown;
    items: Array<{
      serviceId: number | null;
      serviceVariantId: number | null;
      quantity: number;
      unitPrice: unknown;
      taxAmount: unknown;
      totalAmount: unknown;
    }>;
  },
  currency = 'INR',
): { snapshot: Record<string, unknown>; quoteHash: string; expectedAmount: number } {
  const snapshot = {
    bookingId: booking.id,
    currency,
    subtotal: money(booking.subtotal),
    taxTotal: money(booking.taxTotal),
    coinsRedeemed: booking.coinsRedeemed,
    coinsDiscount: money(booking.coinsDiscount),
    overtimeFeeAmount: money(booking.overtimeFeeAmount),
    expectedAmount: money(booking.payableTotal),
    items: booking.items.map((item) => ({
      serviceId: item.serviceId,
      serviceVariantId: item.serviceVariantId,
      quantity: item.quantity,
      unitPrice: money(item.unitPrice),
      taxAmount: money(item.taxAmount),
      totalAmount: money(item.totalAmount),
    })),
  };
  return {
    snapshot,
    expectedAmount: snapshot.expectedAmount,
    quoteHash: crypto.createHash('sha256').update(stableJson(snapshot)).digest('hex'),
  };
}

export type ZohoSignatureVerification =
  | { valid: true; timestamp: number }
  | { valid: false; reason: 'MISSING' | 'MALFORMED' | 'STALE' | 'MISMATCH' | 'CONFIGURATION' };

function safeEqualHex(left: string, right: string): boolean {
  if (!/^[a-f0-9]+$/i.test(left) || !/^[a-f0-9]+$/i.test(right)) return false;
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function verifyZohoWebhookSignature(
  rawBody: Buffer | undefined,
  signatureHeader: unknown,
  options: { signingKey?: string; toleranceSeconds?: number; nowMs?: number } = {},
): ZohoSignatureVerification {
  const signingKey = options.signingKey ?? '';
  const toleranceSeconds = options.toleranceSeconds ?? 300;
  const nowMs = options.nowMs ?? Date.now();
  if (!signingKey) return { valid: false, reason: 'CONFIGURATION' };
  if (!rawBody || typeof signatureHeader !== 'string' || !signatureHeader.trim()) {
    return { valid: false, reason: 'MISSING' };
  }
  const values = new Map<string, string[]>();
  for (const part of signatureHeader.split(',')) {
    const index = part.indexOf('=');
    if (index <= 0) return { valid: false, reason: 'MALFORMED' };
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!key || !value) return { valid: false, reason: 'MALFORMED' };
    values.set(key, [...(values.get(key) ?? []), value]);
  }
  const timestamps = values.get('t') ?? [];
  const signatures = values.get('v') ?? [];
  if (timestamps.length !== 1 || signatures.length < 1) return { valid: false, reason: 'MALFORMED' };
  if (!/^\d{13}$/.test(timestamps[0]!)) return { valid: false, reason: 'MALFORMED' };
  const timestamp = Number(timestamps[0]);
  if (!Number.isSafeInteger(timestamp)) return { valid: false, reason: 'MALFORMED' };
  if (Math.abs(nowMs - timestamp) > toleranceSeconds * 1000) return { valid: false, reason: 'STALE' };
  const signedData = Buffer.concat([Buffer.from(`${timestamps[0]}.`, 'utf8'), rawBody]);
  const expected = crypto.createHmac('sha256', signingKey).update(signedData).digest('hex');
  return signatures.some((signature) => safeEqualHex(signature, expected))
    ? { valid: true, timestamp }
    : { valid: false, reason: 'MISMATCH' };
}
