# Newer Four-Month Rewrite

The rewrite is the **functional specification** for live product behavior. It is not copied file-for-file.

## Stack

| App | Actual stack |
|-----|----------------|
| Backend | Node.js, TypeScript, Express 5, Prisma 5, MySQL, Socket.IO 4 |
| Dashboard | Next.js 16, React 19, Ant Design 6, Tailwind 4, TanStack Query, Zustand |
| Customer | **Flutter** (Riverpod, go_router, Dio) |
| Hero | **Flutter** (same family + native booking-alert plugin) |

API prefix: `/api/v1`. Health: `/health`.

## Clients

1. Customer app — phone OTP JWT
2. Hero app — phone OTP JWT, onboarding + verification gates
3. Dashboard — username/password JWT, RBAC + route/tab permissions, city/hub scopes

## Catalog

```text
ServiceCategory
  └── ServiceGroup (tree)
        └── Service (duration, workerCount, tax)
              └── ServiceVariant (one-time + subscription prices, visits, validity)
HubServiceAvailability (hub ↔ service)
```

## Geography

`State → City → Hub` with `serviceRadiusMeters`. This is the rewrite's replacement for legacy city-only ops.

## Booking creation (canonical)

Customer path (`createCustomerBooking`):

1. Authoritative catalog pricing (client prices ignored for online).
2. Hub + service availability from address lat/lng.
3. Package purchase vs package visit vs single booking.
4. Slot check via **capacity pool** (`getPoolSlotAvailability`).
5. Overtime fee if the job spills past shift end.
6. Optional Jiffit Coins.
7. Online → `PENDING_PAYMENT` + `PaymentOrder`. Cash / package visit → `PENDING_ASSIGNMENT` + dispatch.

Dashboard create-booking is the same pricing/slot rules with walk-in customer fields.

Idempotency: unique `(idempotencyScope, idempotencyKey)` plus request fingerprint.

## Dual systems to collapse in the rebuild

| Area | Rewrite reality | Rebuild decision |
|------|-----------------|------------------|
| Slots | Capacity pool + legacy TimeSlot + 30-min generator | **Capacity pool is canonical** |
| Dispatch | Legacy nearest-hero auto-assign **and** ETA scheduled dispatch | **ETA dispatch is canonical**; legacy auto-assign is a feature-flag fallback |
| Payments | Legacy `Payment` rows + modern `PaymentOrder`/`PaymentAttempt` | **PaymentOrder ledger is source of truth**; keep a compatibility `Payment` view only if migration needs it |

## Hero job lifecycle

`ASSIGNED → ACCEPTED → ON_THE_WAY → ARRIVED → IN_PROGRESS → COMPLETED`

Gates:

- Start requires **start OTP**
- Complete requires **after photo**
- Online payment cannot be marked paid by the hero (gateway only)
- Multi-worker jobs wait for team readiness

## Payments

**Zoho Payments (India)** — UPI + card. Cash at completion. Mock pay only in non-prod when enabled.

Webhook: HMAC-verified inbox → amount/currency/env/reference checks → booking `PENDING_PAYMENT → PENDING_ASSIGNMENT` and `paymentStatus=PAID`.

Cash conversion from pending online is allowed only after refreshing provider state and confirming unpaid.

Refunds: no automatic Zoho refund in cancel path; paid-online cancel before start OTP writes **refund-pending audit**.

## Dashboard operator work

Bookings (status tabs, assign, cancel, invoice, map, slots, dispatch control plane), heroes (verify, live map, work, job roles), customers, cash collection, capacity groups, HR (leaves, attendance, payroll, incentives, penalties), catalog, geography, settings CMS, support chat, shop, social, FAQs, rules.

Brand: ops console **indigo** `#4f46e5` / `#6366f1`. Customer/hero remain **Jiffit purple** `#7C3AED` / `#803BA3`.

## Flutter customer flows to preserve

Splash video → OTP → location → home catalog → cart → slots → cash/Zoho checkout → booking detail (cancel, convert to cash, rate, invoice, live hero map) → wallet, packages, referrals, support.

## Flutter hero flows to preserve

OTP → onboarding (language, name, job role, city, hub, vehicle, earnings) → verification pending → home duty/attendance → booking offer (full-screen alert) → accept/decline → navigate → geofenced arrived → start OTP → before photo → after photo → cash or Zoho QR → complete. Also team, leaves, shop, social, training, certificates, incentives.

## External services (keep)

| Service | Use |
|---------|-----|
| Zoho Payments | Online checkout |
| Fast2SMS | OTP |
| Firebase Admin | FCM |
| DigitalOcean Spaces | Media (existing Space is production data) |
| Google Maps | Directions, geocode, live maps |
| Socket.IO | Booking/hero/dashboard realtime |
