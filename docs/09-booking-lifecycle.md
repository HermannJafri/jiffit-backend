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

- Customer cannot cancel `IN_PROGRESS` (not in the customer transition map).
- Paid online cancel after start OTP or `IN_PROGRESS` is blocked (`PAID_BOOKING_SERVICE_ALREADY_STARTED`).
- Paid online cancel before start OTP records `CUSTOMER_CANCELLED_REFUND_REQUIRED` — audit only until Zoho refunds are implemented.
- Cancel releases assignment, team, route reservation, and dispatch offers. No FCM in this milestone.

## Reschedule

The rewrite has **no first-class customer reschedule API**. Dashboard can update schedule fields or cancel+rebook. Rebuild: dashboard reschedule in v1; customer self-reschedule only if we add it explicitly later (do not invent it).

## Photos and OTP

- `startOtp` is generated at booking create for field jobs and is required later to enter `IN_PROGRESS`.
- After photo required to complete.
- Before photo required by hero app flow (preserve).

## Implemented APIs (this rebuild)

- `POST /api/v1/customer/me/booking-slots/calculate` — capacity pool (optional date; otherwise next 14 IST days / up to 4 dates with availability)
- `POST /api/v1/customer/me/bookings` — catalog-priced create, idempotent, slot re-check
- `GET /api/v1/customer/me/bookings` and `GET /api/v1/customer/me/bookings/:id`
- `PATCH /api/v1/customer/me/bookings/:id/cancel`
- `GET /api/v1/bookings` / `POST /api/v1/bookings` / `GET /api/v1/bookings/:id` / `PATCH /api/v1/bookings/:id/cancel`
- `GET /api/v1/bookings/slots/availability` and `/slots/service-availability` — same pool

Not in this milestone: Zoho PaymentOrder, dispatch, coins, coupons, package visit booking endpoint, customer self-reschedule.

## Historical imports

Rows that were NEW_BOOKING / PENDING_QUOTE / WORK_DONE / RUNNING / HOLD without a clean live mapping become `LEGACY_ARCHIVED` with `legacyOriginalStatus` preserved. Migration must **not** run auto-dispatch, OTP, FCM, or Zoho on these rows.
