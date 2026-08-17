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

## ADR-010 — Zod at the HTTP boundary

Stricter than express-validator, one schema language, good TypeScript inference.
