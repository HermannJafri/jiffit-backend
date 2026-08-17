# Target Architecture

## Goal

```text
Legacy business + data
+ four-month rewrite features (especially booking/dispatch/payments)
+ cleaner code
+ Expo customer/hero apps
+ safe migration
= production-quality Jiffit
```

## Applications

| App | Tech | Repo |
|-----|------|------|
| Backend | Node.js, TypeScript, Express 5, Prisma, MySQL | `jiffit-backend` |
| Dashboard | Next.js (App Router), TypeScript, Ant Design, Tailwind | `jiffit-dashboard` |
| Customer | React Native, Expo, TypeScript | `jiffit-customer-app` |
| Hero | React Native, Expo, TypeScript | `jiffit-hero-app` |

Four independent Git repositories. No monorepo tooling required.

## Backend shape (simple modular monolith)

```text
src/
  server.ts          HTTP + Socket.IO + cron
  app.ts             Express app
  config/            env, logger
  middleware/        auth, rbac, validate, error
  modules/           one folder per domain
  services/          jwt, otp, sms, storage, fcm, maps
  realtime/
  utils/
prisma/
scripts/migration/   dry-run + apply + reports
```

Not used unless a later requirement forces them: Kafka, microservices, CQRS, extra event buses.

In-process cron + pollers are enough (matching the rewrite). Socket.IO stays in-process with the API.

## ORM

**Prisma + MySQL.** The rewrite schema already models the live product and legacy mapping. The rebuild adopts that schema as the starting point, then implements services cleanly (Zod validation, smaller modules, one slot path, one dispatch path).

## Validation

**Zod** at HTTP boundaries. Domain services receive typed input. Prisma Decimal for money. Clients never supply payable totals for online bookings.

## Auth

| Actor | Method |
|-------|--------|
| Customer | Phone OTP → JWT access + refresh |
| Hero | Phone OTP → JWT; gated by `HeroStatus` / onboarding |
| Dashboard | Username + password → JWT; optional selfie/geo for attendance |

## Canonical runtime flows

### Customer booking

```text
OTP → catalog (hub-scoped) → address → slot pool → create booking
  ONLINE → PaymentOrder → Zoho link → webhook PAID → PENDING_ASSIGNMENT → dispatch
  CASH   → PENDING_ASSIGNMENT → dispatch
```

### Hero job

```text
Offer (FCM + socket) → accept/decline
  → on-the-way (live location)
  → arrived (geofence)
  → start OTP
  → before photo → work → after photo
  → complete (cash collect or already PAID)
```

### Dashboard

Ops console: bookings, dispatch, live map, cash settle, catalog, HR, settings.

## API

Versioned under `/api/v1`. Compatibility with rewrite paths is a goal so Expo apps and the new dashboard can land incrementally. Path names should match the rewrite unless a path is clearly wrong.

## Media

Existing DigitalOcean Space is **persistent production data**.

- Historical URLs: keep as stored.
- New uploads: predictable keys (`customers/{id}/...`, `bookings/{id}/before.jpg`, …) via env-configured Space.
- Never delete/rename/move existing objects.

## Deployment (later, not now)

New DigitalOcean App Platform services for backend and dashboard. Mobile apps point at the new API when ready. Do not modify existing production App Platform apps.
