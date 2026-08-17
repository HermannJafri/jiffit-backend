import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateOfferReleaseAt, calculateReminderAt, canonicalBookingWindow, legacyIndiaInstant } from './dispatch-time';

describe('dispatch time', () => {
  it('maps 6 PM IST to 12:30 UTC and reminder to 5:45 PM IST', () => {
    const date = new Date('2026-07-14T00:00:00.000Z');
    const start = legacyIndiaInstant(date, '18:00');
    assert.equal(start?.toISOString(), '2026-07-14T12:30:00.000Z');
    assert.equal(calculateReminderAt(start!, 15).toISOString(), '2026-07-14T12:15:00.000Z');
  });

  it('subtracts ETA plus configured buffers from scheduled start', () => {
    const scheduledStartAt = new Date('2026-07-14T12:30:00.000Z');
    const release = calculateOfferReleaseAt({
      scheduledStartAt,
      routeEtaSeconds: 25 * 60,
      acceptanceWindowSeconds: 90,
      reassignmentBufferMinutes: 5,
      arrivalBufferMinutes: 10,
    });
    assert.equal(release.toISOString(), '2026-07-14T11:48:30.000Z');
  });

  it('rejects inverted windows', () => {
    const start = new Date('2026-07-14T12:30:00.000Z');
    const end = new Date('2026-07-14T13:30:00.000Z');
    assert.deepEqual(canonicalBookingWindow({ slotStartAt: start, slotEndAt: end }), {
      start,
      end,
      usedLegacyFallback: false,
    });
    assert.throws(() => canonicalBookingWindow({ slotStartAt: end, slotEndAt: start }), /after scheduled start/);
  });
});
