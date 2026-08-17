import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  clampSameDayHeroPool,
  generateRangeSlots,
  heroesLocked,
  isDayShiftWindow,
  nextIstDates,
  timeToMin,
} from './slot-pool-core';

describe('day-shift windows', () => {
  it('rejects overnight shifts', () => {
    assert.equal(isDayShiftWindow('09:30', '18:30'), true);
    assert.equal(isDayShiftWindow('22:00', '06:00'), false);
  });
});

describe('heroesLocked', () => {
  it('counts overlapping jobs plus buffer', () => {
    const start = Date.parse('2026-08-17T04:00:00.000Z');
    const bookings = [{ workerCount: 2, slotStartMs: start, slotEndMs: start + 60 * 60_000 }];
    const locked = heroesLocked(start + 60 * 60_000, start + 90 * 60_000, bookings, 15);
    assert.equal(locked, 2);
  });

  it('does not lock after buffer has elapsed', () => {
    const start = Date.parse('2026-08-17T04:00:00.000Z');
    const bookings = [{ workerCount: 1, slotStartMs: start, slotEndMs: start + 60 * 60_000 }];
    const locked = heroesLocked(start + 80 * 60_000, start + 140 * 60_000, bookings, 15);
    assert.equal(locked, 0);
  });
});

describe('generateRangeSlots', () => {
  it('marks a slot unavailable when the pool is exhausted', () => {
    const baseDateMs = Date.parse('2026-08-17T00:00:00+05:30');
    const slots = generateRangeSlots({
      fromMin: timeToMin('10:00'),
      toMin: timeToMin('14:00'),
      shiftName: 'General',
      heroPool: 1,
      durationMinutes: 60,
      workerCount: 1,
      activeBookings: [
        {
          workerCount: 1,
          slotStartMs: baseDateMs + timeToMin('10:00') * 60_000,
          slotEndMs: baseDateMs + timeToMin('11:00') * 60_000,
        },
      ],
      baseDateMs,
      bufferMinutes: 15,
    });
    const ten = slots.find((slot) => slot.time === '10:00');
    assert.equal(ten?.available, false);
    const elevenThirty = slots.find((slot) => slot.time === '11:30');
    assert.equal(elevenThirty?.available, true);
  });

  it('quotes overtime only when a rate is configured', () => {
    const baseDateMs = Date.parse('2026-08-17T00:00:00+05:30');
    const withoutRate = generateRangeSlots({
      fromMin: timeToMin('17:30'),
      toMin: timeToMin('18:00'),
      shiftName: 'General',
      heroPool: 2,
      durationMinutes: 60,
      workerCount: 1,
      activeBookings: [],
      baseDateMs,
      bufferMinutes: 15,
    });
    assert.equal(withoutRate.some((slot) => slot.time === '17:30'), false);

    const withRate = generateRangeSlots({
      fromMin: timeToMin('17:30'),
      toMin: timeToMin('18:00'),
      shiftName: 'General',
      heroPool: 2,
      durationMinutes: 60,
      workerCount: 1,
      activeBookings: [],
      baseDateMs,
      bufferMinutes: 15,
      overtimeRatePerHour: 100,
    });
    const last = withRate.find((slot) => slot.time === '17:45');
    assert.ok(last);
    assert.equal(last?.overtimeMinutes, 45);
    assert.equal(last?.overtimeFeeAmount, 75);
  });
});

describe('clampSameDayHeroPool', () => {
  it('keeps planned capacity before shift start and clamps after check-in', () => {
    assert.equal(clampSameDayHeroPool(5, '09:30', timeToMin('08:00'), 1), 5);
    assert.equal(clampSameDayHeroPool(5, '09:30', timeToMin('10:00'), 2), 2);
  });
});

describe('nextIstDates', () => {
  it('returns consecutive calendar dates from an IST instant', () => {
    const dates = nextIstDates(3, new Date('2026-08-17T00:30:00.000Z'));
    assert.deepEqual(dates, ['2026-08-17', '2026-08-18', '2026-08-19']);
  });
});
