# Staging deployment (rebuild)

Status: **BLOCKED on a DigitalOcean API token.** No cloud resources have been created or modified.

This document is the isolated staging plan for visual and end-to-end testing of the reconstructed Jiffit. It is **not** production cutover.

## What was inspected

| Source | Finding |
|--------|---------|
| This rebuild (`jiffit-backend`, dashboard, Expo apps) | No App Platform spec, no `doctl`, no DigitalOcean token in the environment |
| Rebuild docs (`06-target-architecture.md`, `16-security-testing-deploy.md`) | New App Platform services are required; existing production apps must not be replaced |
| Rewrite reference (read-only) | Existing V2 App Platform backend `jiffit-backend-v2-igply.ondigitalocean.app` |
| Rewrite reference (read-only) | Existing managed MySQL cluster `jiffit-v2-db-staging-do-user-25050266-0` with databases `jiffit_v2_staging` and `old_import_staging` |
| Local rebuild `.env` | Spaces / Zoho / FCM / Maps / Fast2SMS are empty; OTP test mode and payment mock are on |
| GitHub remotes | All four rebuild repos push to `HermannJafri/*` on GitHub only |

`doctl` is not installed. `DIGITALOCEAN_ACCESS_TOKEN` is not set. Live DigitalOcean apps, databases, firewalls, and Spaces therefore cannot be listed or created from this session.

## Do not touch

These existing resources stay unmodified:

- Old Jiffit production application and production MySQL
- Existing V2 App Platform app `jiffit-backend-v2-igply.ondigitalocean.app`
- Existing managed cluster `jiffit-v2-db-staging-do-user-25050266-0`
- Databases `jiffit_v2_staging`, `old_import_staging`, `defaultdb`, and any production schema
- Existing DigitalOcean Space objects (no delete / rename / overwrite)
- GitLab remotes

## Safest staging topology

Create **new** named resources only. Do not attach the rebuild to the V2 staging cluster.

| Resource | Proposed name | Purpose |
|----------|---------------|---------|
| App Platform app | `jiffit-rebuild-staging` | Isolated rebuild hosting |
| Backend service | `jiffit-rebuild-staging-api` | Node 20, `npm run build` then `npm start`, bind `PORT` |
| Dashboard service | `jiffit-rebuild-staging-dashboard` | Next.js, rewrite `/api/*` to the new backend |
| Managed MySQL 8 cluster | `jiffit-rebuild-staging-db` | New cluster, not the V2 cluster |
| Logical database | `jiffit_rebuild_staging` | Prisma target; trusted-host name must not match production/V2 names |
| Trusted hosts | `*.ondigitalocean.app` for the new app only | CORS / dashboard origin |

Customer and Hero apps are Expo (no web export yet). They should point `EXPO_PUBLIC_API_BASE_URL` at the new HTTPS API and be tested with Expo Go / a local `expo start`. They are **not** deployed onto the existing production App Platform apps.

## Database plan

1. Create the new cluster and empty database `jiffit_rebuild_staging`.
2. Restrict inbound access to App Platform + this workstation (for migrate/import).
3. Set `DATABASE_URL` with `ssl-mode=REQUIRED` and `connection_limit=10`.
4. Run `npx prisma migrate deploy` against that URL only.
5. Import the verified local rehearsal database `jiffit_migration_target` (not the original SQL dump, not production).
6. Run `npm run db:seed` on staging. Seed is additive: it creates dashboard user `admin` if missing and does not wipe imported rows.
7. Seed a small **live** catalog + capacity pool + one verified test hero. Historical import intentionally skipped live `tags` / `vendor_rates`, so new booking/slot flows need this operational fixture in addition to migrated history.

Never point `DATABASE_URL` at `jiffit_v2_staging`, `old_import_staging`, or production.

## Side-effect configuration (required)

Staging must **not** use `NODE_ENV=production`, because OTP test mode and payment mock are forbidden there.

| Variable | Staging value | Reason |
|----------|---------------|--------|
| `NODE_ENV` | `development` | Allows OTP test mode and mock pay; App Platform default `production` would block visual OTP testing |
| `OTP_TEST_MODE_ENABLED` | `true` | Customer/Hero login without Fast2SMS |
| `FAST2SMS_ENABLED` | `false` | No real SMS |
| `PAYMENT_MOCK_ENABLED` | `true` | Online pay without Zoho |
| `ZOHO_PAYMENTS_ENABLED` | `false` | No Zoho calls |
| `FIREBASE_*` | empty | No FCM |
| `DO_SPACES_*` | empty | No writes to the production Space |
| `GOOGLE_MAPS_API_KEY` | empty until provided | Maps tiles/ETA stay blocked by credential |
| `DISPATCH_FEATURE_ENABLED` | `true` | Assignment/offer testing |
| `ALLOWED_ORIGINS` | staging dashboard origin | CORS |

JWT secrets must be new staging values, not copied from production or the rewrite.

## App wiring

- Dashboard: `JIFFIT_API_ORIGIN=https://<new-api-host>`
- Customer: `EXPO_PUBLIC_API_BASE_URL=https://<new-api-host>/api/v1`
- Hero: `EXPO_PUBLIC_API_BASE_URL=https://<new-api-host>/api/v1`

Dashboard already proxies `/api/:path*` to `JIFFIT_API_ORIGIN`. CORS must also allow the dashboard origin for browser calls that do not go through the rewrite (Socket.IO).

## Verification after deploy (do not skip)

1. `GET https://<api>/health` returns `environment: development`.
2. Dashboard login `admin` / `ChangeMeNow!123`, then change password if `mustResetPassword` is set.
3. Dashboard lists migrated customers, bookings (`LEGACY-*`), heroes, and historical visits/invoices/wallet where those screens exist.
4. Customer OTP in test mode, browse seeded catalog, create a **new** cash booking, view it.
5. Hero OTP, check-in, receive/accept offer or dashboard assign, progress job status.
6. Confirm staging MySQL row counts still match the rehearsal import for orders/visits/wallet/invoices, plus the small operational seed.
7. Confirm `booking_dispatches` / `dispatch_outbox_events` / `push_notification_logs` / `otp_challenges` / `payment_orders` are not filled by the historical import.

## Blocker

To create the isolated resources above, provide a DigitalOcean personal access token with permission to:

- list existing Apps and Managed Databases (so production/V2 can be identified and skipped)
- create a **new** App Platform app
- create a **new** Managed MySQL cluster
- connect GitHub `HermannJafri/jiffit-backend` and `HermannJafri/jiffit-dashboard`

Do **not** provide production database passwords, Spaces keys, Zoho live keys, or Fast2SMS keys unless we later need uploads/maps/payments. Staging visual testing does not require them.

Paste the token in chat or set `DIGITALOCEAN_ACCESS_TOKEN` in this environment, then ask to continue. No production-affecting change will be made.
