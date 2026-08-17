# Jiffit Rebuild — Progress

This file is the continuation point for any developer or Cursor session.

Last updated: 2026-08-17

GitHub remotes verified and pushed as `HermannJafri`.

---

## WHAT HAS BEEN ANALYZED

All reference sources were inspected **read-only**. Nothing in those trees was modified.

| Source | Path | Status |
|--------|------|--------|
| Legacy application | `C:\Users\herma\Downloads\Jiffit-old\jiffit.in` | ANALYZED |
| Legacy MySQL dump | `C:\Users\herma\Downloads\Backup\old-jiffit-latest.sql` (~121 MB, 2026-08-02) | ANALYZED |
| V2 staging dumps | `C:\Users\herma\Downloads\Backup\jiffit-v2-staging-backup*.sql` | ANALYZED (schema only, almost no production data) |
| Newer backend | `C:\Users\herma\Downloads\Jiffit-Project\jiffit-backend` | ANALYZED |
| Newer dashboard | `C:\Users\herma\Downloads\Jiffit-Project\jiffit-dashboard-next` | ANALYZED |
| Newer customer app | `C:\Users\herma\Downloads\Jiffit-Project\jiffit-customer-app` | ANALYZED |
| Newer hero app | `C:\Users\herma\Downloads\Jiffit-Project\jiffit-hero-app` | ANALYZED |

Product understanding is sufficient to design the clean architecture and begin implementation.

---

## WHAT HAS BEEN DOCUMENTED

Backend `docs/` holds cross-platform architecture, database, migration, security, and ops documentation.

Application-specific workflow docs live in:

- `jiffit-dashboard/docs/`
- `jiffit-customer-app/docs/`
- `jiffit-hero-app/docs/`

See `docs/00-index.md` for the full index.

---

## WHAT HAS BEEN IMPLEMENTED

| Area | Status |
|------|--------|
| Four GitHub-backed repositories initialized | IMPLEMENTED |
| Documentation baseline | IMPLEMENTED |
| Backend foundation (Express + TS + Prisma schema + `/health`) | IMPLEMENTED / TESTED (unit tests for phone, OTP safety, hero gating) |
| Authentication (dashboard password, customer/hero OTP, JWT refresh) | IMPLEMENTED / PARTIALLY TESTED (needs MySQL for integration) |
| Service catalog | IMPLEMENTED / PARTIALLY TESTED (needs MySQL for API integration) |
| Public hub-scoped catalog | IMPLEMENTED / TESTED (haversine hub picker unit tests) |
| Customer addresses | IMPLEMENTED / PARTIALLY TESTED (needs MySQL) |
| Geography (states/cities/hubs) | IMPLEMENTED / PARTIALLY TESTED (needs MySQL) |
| Booking engine | IMPLEMENTED / PARTIALLY TESTED (unit tests; needs MySQL for API integration) |
| Scheduling / capacity | IMPLEMENTED / PARTIALLY TESTED (pool core unit-tested; overtime IncentivePlan lookup wired) |
| Hero assignment / ETA dispatch | IMPLEMENTED / PARTIALLY TESTED (unit tests; live Google ETA BLOCKED BY CREDENTIAL; FCM enqueue only) |
| Capacity groups / daily pools | IMPLEMENTED AND TESTED (CRUD + slot pool already using these tables) |
| Zoho payments | IMPLEMENTED — LIVE VERIFICATION BLOCKED BY CREDENTIAL (HMAC, quote hash, webhook, mock pay, provider client) |
| Notifications / FCM | IMPLEMENTED — LIVE VERIFICATION BLOCKED BY CREDENTIAL (enqueue + skip without Firebase) |
| DigitalOcean Spaces uploads | IMPLEMENTED — LIVE VERIFICATION BLOCKED BY CREDENTIAL |
| Dashboard | IMPLEMENTED / PARTIALLY TESTED (`next build` succeeded; live API needs MySQL) |
| Customer Expo app | IMPLEMENTED / PARTIALLY TESTED (typecheck; live OTP BLOCKED BY CREDENTIAL) |
| Hero Expo app | IMPLEMENTED / PARTIALLY TESTED (typecheck; Spaces live upload BLOCKED BY CREDENTIAL) |
| Migration tooling | IMPLEMENTED / PARTIALLY TESTED (dump inventory dry-run; apply blocked until staging MySQL) |

---

## WHAT HAS BEEN TESTED

- Backend `tsc` clean
- Unit tests: 50 passing (dispatch time/state, Zoho HMAC, quote hash, mock-pay policy, plus prior suites)
- Prisma client generate
- Initial MySQL migration SQL generated from schema (`prisma/migrations/20260817000000_init`)
- Next.js dashboard production build (scaffold)
- All four GitHub `main` branches pushed as `HermannJafri`

Not yet: live MySQL, Fast2SMS, Zoho, FCM, Expo runtime, Next production build.

---

## WHAT IS CURRENTLY BEING WORKED ON

Exact next task: add Dashboard HR screens (attendance/leaves) once those APIs exist, then run the stack against local MySQL.

---

## WHAT IS BLOCKED

| Item | Why |
|------|-----|
| Production OTP / FCM / Maps / Zoho / Spaces | Requires credentials the rebuild must not copy from reference `.env` files |
| Final production migration | Requires a **fresh** dump from old production Jiffit (current dump is for design/test only) |
| Firebase / Google Services JSON for mobile | Manual configuration; see `docs/15-environment-assets.md` |
| App signing / store listings | Manual |

---

## WHAT REMAINS

Core reconstruction of Backend, Dashboard, Customer, Hero, Zoho architecture, Spaces architecture, FCM enqueue, and migration dry-run is in place.

Still remaining before a production cutover:

- Live MySQL integration tests
- Credential-gated live verification (Zoho, FCM, Maps, Spaces, OTP)
- Dashboard HR/payroll/support/live map polish
- Expo camera, maps navigation, and native offer ringing
- Migration apply + financial reconciliation on isolated staging MySQL
- Fresh production dump for cutover

---

## WHAT SHOULD HAPPEN NEXT

1. Point `DATABASE_URL` at a local/staging MySQL 8 database and run `npx prisma migrate deploy` + `npm run db:seed`.
2. Run `npm run migrate:legacy` against the rehearsal dump, then apply only on isolated staging MySQL.
3. Supply Zoho / Firebase / Maps / Spaces credentials for live verification.
4. Do **not** deploy. Do **not** push to GitLab. Remotes are GitHub only.

---

## GIT SAFETY

Allowed remotes:

```text
https://github.com/HermannJafri/jiffit-backend.git
https://github.com/HermannJafri/jiffit-dashboard.git
https://github.com/HermannJafri/jiffit-customer-app.git
https://github.com/HermannJafri/jiffit-hero-app.git
```

Reference projects under `Jiffit-old` and `Jiffit-Project` remain read-only. Their GitLab remotes must never be used.
