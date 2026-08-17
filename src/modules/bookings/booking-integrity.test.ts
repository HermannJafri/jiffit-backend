import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertBookingTransition,
  BookingIntegrityError,
  fingerprintBookingRequest,
  generateBookingNumber,
} from './booking-integrity';

function expectCode(fn: () => unknown, code: string) {
  assert.throws(fn, (error: unknown) => error instanceof BookingIntegrityError && error.code === code);
}

describe('booking request fingerprint', () => {
  it('is stable across property order', () => {
    assert.equal(fingerprintBookingRequest({ b: 2, a: 1 }), fingerprintBookingRequest({ a: 1, b: 2 }));
  });

  it('changes when payload changes', () => {
    assert.notEqual(fingerprintBookingRequest({ total: 10 }), fingerprintBookingRequest({ total: 11 }));
  });

  it('excludes the idempotency key', () => {
    assert.equal(
      fingerprintBookingRequest({ idempotencyKey: 'one', a: 1 }),
      fingerprintBookingRequest({ idempotencyKey: 'two', a: 1 }),
    );
  });
});

describe('booking numbers', () => {
  it('are unique enough and human-readable', () => {
    const values = new Set(Array.from({ length: 200 }, () => generateBookingNumber()));
    assert.equal(values.size, 200);
    assert.match([...values][0], /^JB-\d{8}-\d{6}$/);
  });
});

describe('assertBookingTransition', () => {
  it('allows customer cancellation of assigned jobs', () => {
    assert.doesNotThrow(() => assertBookingTransition({ from: 'ASSIGNED', to: 'CANCELLED', actorType: 'CUSTOMER' }));
  });

  it('blocks customer assignment changes', () => {
    expectCode(
      () => assertBookingTransition({ from: 'PENDING_ASSIGNMENT', to: 'ASSIGNED', actorType: 'CUSTOMER' }),
      'BOOKING_INVALID_TRANSITION',
    );
  });

  it('allows the hero field lifecycle and rejects jumps', () => {
    assert.doesNotThrow(() => assertBookingTransition({ from: 'ASSIGNED', to: 'ACCEPTED', actorType: 'HERO' }));
    assert.doesNotThrow(() => assertBookingTransition({ from: 'ACCEPTED', to: 'ON_THE_WAY', actorType: 'HERO' }));
    assert.doesNotThrow(() => assertBookingTransition({ from: 'ON_THE_WAY', to: 'ARRIVED', actorType: 'HERO' }));
    assert.doesNotThrow(() => assertBookingTransition({ from: 'ARRIVED', to: 'IN_PROGRESS', actorType: 'HERO' }));
    assert.doesNotThrow(() => assertBookingTransition({ from: 'IN_PROGRESS', to: 'COMPLETED', actorType: 'HERO' }));
    expectCode(
      () => assertBookingTransition({ from: 'ASSIGNED', to: 'COMPLETED', actorType: 'HERO' }),
      'BOOKING_INVALID_TRANSITION',
    );
  });

  it('requires a dashboard reason', () => {
    expectCode(
      () => assertBookingTransition({ from: 'PENDING_ASSIGNMENT', to: 'ON_HOLD', actorType: 'DASHBOARD' }),
      'BOOKING_INVALID_TRANSITION',
    );
    assert.doesNotThrow(() =>
      assertBookingTransition({ from: 'PENDING_ASSIGNMENT', to: 'ON_HOLD', actorType: 'DASHBOARD', reason: 'Capacity review' }),
    );
  });

  it('treats cancelled, completed, and legacy archived as terminal', () => {
    expectCode(
      () => assertBookingTransition({ from: 'CANCELLED', to: 'PENDING_ASSIGNMENT', actorType: 'SYSTEM' }),
      'BOOKING_ALREADY_CANCELLED',
    );
    expectCode(
      () => assertBookingTransition({ from: 'COMPLETED', to: 'IN_PROGRESS', actorType: 'SYSTEM' }),
      'BOOKING_TERMINAL_STATE',
    );
    expectCode(
      () => assertBookingTransition({ from: 'LEGACY_ARCHIVED', to: 'PENDING_ASSIGNMENT', actorType: 'SYSTEM' }),
      'BOOKING_TERMINAL_STATE',
    );
  });

  it('requires refund evidence', () => {
    expectCode(
      () =>
        assertBookingTransition({
          from: 'COMPLETED',
          to: 'REFUNDED',
          actorType: 'DASHBOARD',
          reason: 'Refund approved',
        }),
      'BOOKING_INVALID_TRANSITION',
    );
    assert.doesNotThrow(() =>
      assertBookingTransition({
        from: 'COMPLETED',
        to: 'REFUNDED',
        actorType: 'DASHBOARD',
        reason: 'Refund approved',
        hasRefundEvidence: true,
      }),
    );
  });
});
