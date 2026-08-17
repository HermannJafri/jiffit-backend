# Booking Lifecycle

Canonical transitions (actor-scoped). Invalid transitions must fail closed.

```text
DRAFT → PENDING_PAYMENT | PENDING_ASSIGNMENT | CANCELLED
PENDING_PAYMENT → PENDING_ASSIGNMENT | CANCELLED
PENDING_ASSIGNMENT → ASSIGNED | ON_HOLD | CANCELLED
ON_HOLD → PENDING_ASSIGNMENT | ASSIGNED | CANCELLED
ASSIGNED → ACCEPTED | PENDING_ASSIGNMENT | ON_HOLD | CANCELLED
ACCEPTED → ON_THE_WAY | PENDING_ASSIGNMENT | CANCELLED
ON_THE_WAY → ARRIVED → IN_PROGRESS → COMPLETED
COMPLETED → REFUNDED (ops / payment audit)
CANCELLED / REFUNDED / LEGACY_ARCHIVED are terminal
```

## Creation rules

- Server loads catalog prices, tax, duration, worker count.
- Hub must offer the service and contain the address (radius).
- Slot must still be free in the capacity pool at commit time.
- Online unpaid bookings do **not** enter dispatch.
- Package **purchase** bookings complete after payment and activate entitlements; they are not field jobs.
- Package **visit** bookings consume an entitlement and dispatch like a single job.

## Cancellation

- Customer cannot cancel after `ARRIVED` / `IN_PROGRESS`.
- Paid online cancel before start OTP → refund-pending audit (no silent gateway refund until that flow is implemented and tested).
- Cancel releases assignment, team, route reservation, dispatch offers. No FCM to “new offer” for the cancelled job.

## Reschedule

The rewrite has **no first-class customer reschedule API**. Dashboard can update schedule fields or cancel+rebook. Rebuild: dashboard reschedule in v1; customer self-reschedule only if we add it explicitly later (do not invent it).

## Photos and OTP

- `startOtp` required to enter `IN_PROGRESS`.
- After photo required to complete.
- Before photo required by hero app flow (preserve).

## Historical imports

Rows that were NEW_BOOKING / PENDING_QUOTE / WORK_DONE / RUNNING / HOLD without a clean live mapping become `LEGACY_ARCHIVED` with `legacyOriginalStatus` preserved. Migration must **not** run auto-dispatch, OTP, FCM, or Zoho on these rows.
