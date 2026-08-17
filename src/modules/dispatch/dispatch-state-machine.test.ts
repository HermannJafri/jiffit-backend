import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canDispatchBooking,
  comparePrimaryHeroCandidates,
  isDispatchReleaseDue,
  isOfferAcceptable,
  isPreviousRouteFeasible,
  nextRetryState,
} from './dispatch-state-machine';

describe('dispatch state machine', () => {
  it('treats the release instant as due', () => {
    const release = new Date('2026-07-14T11:48:30.000Z');
    assert.equal(isDispatchReleaseDue(release, new Date('2026-07-14T11:48:29.999Z')), false);
    assert.equal(isDispatchReleaseDue(release, new Date('2026-07-14T11:48:30.000Z')), true);
  });

  it('accepts live offers and rejects identity or expiry mismatches', () => {
    const base = {
      offerExpiresAt: new Date('2026-07-14T11:50:00.000Z'),
      expectedHeroId: 7,
      actualHeroId: 7,
      currentOfferId: 11,
      actualOfferId: 11,
    };
    assert.equal(isOfferAcceptable({ ...base, status: 'PENDING', databaseNow: new Date('2026-07-14T11:49:59.999Z') }), 'ACCEPT');
    assert.equal(isOfferAcceptable({ ...base, status: 'PENDING', databaseNow: base.offerExpiresAt }), 'REJECT');
    assert.equal(isOfferAcceptable({ ...base, status: 'PENDING', actualHeroId: 8, databaseNow: new Date('2026-07-14T11:49:00.000Z') }), 'REJECT');
    assert.equal(isOfferAcceptable({ ...base, status: 'ACCEPTED', databaseNow: new Date('2026-07-14T11:49:00.000Z') }), 'IDEMPOTENT');
  });

  it('escalates at the attempt cap', () => {
    assert.equal(nextRetryState(1, 5), 'RETRY_WAIT');
    assert.equal(nextRetryState(5, 5), 'ESCALATED');
  });

  it('ranks ETA then workload then rating', () => {
    const slower = { etaSeconds: 900, workload: 0, rating: 5, distanceMeters: 100, locationConfidence: 'HIGH' as const };
    const faster = { etaSeconds: 400, workload: 1, rating: 4, distanceMeters: 800, locationConfidence: 'MEDIUM' as const };
    assert.ok(comparePrimaryHeroCandidates(faster, slower) < 0);
  });

  it('checks previous-route cleanup feasibility', () => {
    const previousEnd = new Date('2026-07-14T10:00:00.000Z');
    const nextStart = new Date('2026-07-14T10:20:00.000Z');
    assert.equal(isPreviousRouteFeasible(previousEnd, 5 * 60, 10, nextStart), true);
    assert.equal(isPreviousRouteFeasible(previousEnd, 15 * 60, 10, nextStart), false);
  });

  it('does not dispatch unpaid online or package purchases', () => {
    assert.equal(canDispatchBooking({ isPackagePurchase: true, status: 'PENDING_ASSIGNMENT' }), false);
    assert.equal(
      canDispatchBooking({ isPackagePurchase: false, status: 'PENDING_ASSIGNMENT', paymentMethod: 'ONLINE', paymentStatus: 'PENDING' }),
      false,
    );
    assert.equal(
      canDispatchBooking({ isPackagePurchase: false, status: 'PENDING_ASSIGNMENT', paymentMethod: 'CASH', paymentStatus: 'UNPAID' }),
      true,
    );
  });
});
