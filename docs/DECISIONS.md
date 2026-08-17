# Architecture Decision Records

## ADR-001 — Modular Express monolith, not Nest and not microservices

The rewrite already runs as one Node process with Prisma. Jiffit does not have traffic or team boundaries that justify Kafka or multiple deployables. Express + domain modules is enough.

## ADR-002 — Prisma + MySQL, Decimal money

Matches the rewrite schema (the live product model) and DigitalOcean MySQL. All money columns are `DECIMAL(10,2)`.

## ADR-003 — Keep rewrite API prefix `/api/v1`

Lets dashboard and apps migrate against a stable contract. Clean internals; stable URLs.

## ADR-004 — Capacity pool is the only live slot API

Three slot implementations in the rewrite caused drift. Customer booking and dashboard availability both use the pool.

## ADR-005 — ETA dispatch canonical, auto-dispatch fallback

ETA work is the valuable automation. Legacy nearest-hero remains behind `DISPATCH_FEATURE_ENABLED=false` for rollback.

## ADR-006 — Zoho Payments stays

Working provider in the rewrite. Do not switch to Razorpay because legacy used it.

## ADR-007 — Expo + TypeScript mobile apps

Reconstruction prompt requires RN/Expo. Flutter apps are the UX and API specification. Port behavior; do not wrap Flutter.

## ADR-008 — Brand split

Customer/Hero: Jiffit purple (`#7C3AED` / `#803BA3`). Dashboard: indigo ops console (`#4f46e5`). Recognizable product, clearer admin UI.

## ADR-009 — Legacy visits are historical

`tasks` become `LegacyBookingVisit`, never live `BookingAssignment`. Avoids 100k rows driving dispatch.

## ADR-011 — Catalog prices are authoritative for every actor

Dashboard cash bookings in the rewrite could accept client-supplied totals. The rebuild always prices from catalog (`Service.price` / variant `singlePrice` then `mrp`, plus tax). Clients cannot set payable totals.

## ADR-012 — Coins, coupons, payroll, support, live maps

Re-classified from legacy Jiffit and the 4-month rewrite:

| Area | Legacy | Rewrite | Rebuild decision |
|------|--------|---------|------------------|
| Jiffit Coins | `wallet_trn` + user wallet float | Full coins module, **disabled by default** (`coins.enabled=false`) | **DEFERRED.** Create-booking `coinsToRedeem` fails closed. Historical wallet rows import to `legacy_wallet_transactions` only — never spendable. |
| Coupons | `offers` (36 rows) | Coupon module + `couponCode` on booking | **DEFERRED.** Create-booking `couponCode` fails closed. Do not auto-publish legacy offers into live `Coupon`. |
| Payroll | Absent | HR payroll, incentives, penalties, payslips | **REQUIRED later, not v1 cutover.** Attendance/leaves are live. Salary/commission fields exist on Hero. Payslip engine stays out until HR asks to run a cycle. |
| Support chat | `messages` (935) | Support threads | **DEFERRED.** Schema has `SupportChatThread`. No live chat in v1 ops until a support owner is assigned. |
| Live map | `track_location` breadcrumbs | Dashboard live map + Google tiles | **IMPLEMENTED (positions).** Duty heroes with last ping are listed. Map tiles remain **BLOCKED BY CREDENTIAL** (`GOOGLE_MAPS_API_KEY`). Do not bulk-import legacy breadcrumbs. |

Do not copy rewrite coins/coupon/payroll/support modules until the matching product owner confirms they are still operated in production.


Dashboard cash bookings in the rewrite could accept client-supplied totals. The rebuild always prices from catalog (`Service.price` / variant `singlePrice` then `mrp`, plus tax). Clients cannot set payable totals.
