# Scheduling and Capacity

## Canonical slot source: capacity pool

`getPoolSlotAvailability` (`src/modules/daily-capacity/slot-pool.service.ts`) is the only live slot calculator.

Customer `POST /api/v1/customer/me/booking-slots/calculate` and dashboard `GET /api/v1/bookings/slots/availability` both call it. If the customer omits a date, the API scans the next 14 IST days and returns up to 4 dates that still have available pool slots.

Rules preserved:

1. Resolve nearest hub in radius that offers the service.
2. Capacity group for that hub + service.
3. Daily hero pools per shift from `BookingCapacityDaily` (global day-shift schedules with pool 0 if none configured).
4. Same-day after shift start: clamp pool to **actual check-ins**.
5. Buffer minutes from `app_settings.booking.bufferMinutes` (default 15).
6. Duration from catalog (variant then service), **quantity multiplies time**.
7. Overtime quotes from `IncentivePlan(OVERTIME)`: hub-scoped plan first, then state-scoped. In-shift only if no plan exists.
8. Timezone: IST (`+05:30`). Persist `slotStartAt` / `slotEndAt` as DateTime.
9. First bookable slot is shift start + 30 minutes; same-day minimum advance is 60 minutes; 15-minute grid; no overnight spill.

## Deprecated for live booking

- Coarse `TimeSlot` rows (07–09 AM style) — keep table for display/history if needed.
- Independent 30-minute generator with lead time — do not expose as a second customer API.

Dashboard may still show a slot availability board derived from the **same pool**.

## Capacity ops

- Capacity groups: hubs + service groups + hero pools
- Weekly grid of daily headcount
- Cron: unreserved booking → plan sync
- Cron: capacity vs attendance → excess bookings `ON_HOLD` + notify

## Implemented APIs (this rebuild)

- `GET/POST /api/v1/capacity/schedules` — day-shift windows only
- `GET/POST /api/v1/capacity/groups`, `PATCH /groups/:id/toggle`
- `GET/PUT /api/v1/capacity/daily` — planned hero counts that drive the slot pool

Overnight schedules are intentionally day-shift only in the rewrite. Keep that unless ops asks otherwise.
