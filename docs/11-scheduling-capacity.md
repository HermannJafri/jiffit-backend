# Scheduling and Capacity

## Canonical slot source: capacity pool

`getPoolSlotAvailability` (rewrite: `daily-capacity/slot-pool.service.ts`) is the customer-facing slot calculator.

Rules to preserve:

1. Resolve nearest hub in radius that offers the service.
2. Capacity group for that hub + service group.
3. Daily hero pools per shift from `BookingCapacityDaily` / schedules.
4. Same-day after shift start: clamp pool to **actual check-ins**.
5. Buffer minutes from settings (`booking.bufferMinutes`).
6. Duration from catalog (service + variant) including worker count.
7. Overtime quoted from `IncentivePlan(OVERTIME)` when the job spills past shift end.
8. Timezone: IST (`+05:30`). Persist `slotStartAt` / `slotEndAt` as DateTime.

## Deprecated for live booking

- Coarse `TimeSlot` rows (07–09 AM style) — keep table for display/history if needed.
- Independent 30-minute generator with lead time — do not expose as a second customer API.

Dashboard may still show a slot availability board derived from the **same pool**.

## Capacity ops

- Capacity groups: hubs + service groups + hero pools
- Weekly grid of daily headcount
- Cron: unreserved booking → plan sync
- Cron: capacity vs attendance → excess bookings `ON_HOLD` + notify

Overnight schedules are intentionally day-shift only in the rewrite. Keep that unless ops asks otherwise.
