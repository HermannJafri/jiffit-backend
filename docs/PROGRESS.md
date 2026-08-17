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
| Booking engine | NOT IMPLEMENTED |
| Scheduling / capacity | NOT IMPLEMENTED |
| Hero assignment / ETA dispatch | NOT IMPLEMENTED |
| Zoho payments | NOT IMPLEMENTED |
| Notifications / FCM | NOT IMPLEMENTED |
| Dashboard | PARTIALLY IMPLEMENTED (scaffold + login page + brand tokens) |
| Customer Expo app | PARTIALLY IMPLEMENTED (scaffold + copied assets) |
| Hero Expo app | PARTIALLY IMPLEMENTED (scaffold + copied assets) |
| Migration tooling | NOT IMPLEMENTED (mapping documented; CLI not built) |

---

## WHAT HAS BEEN TESTED

- Backend `tsc` clean
- Unit tests: Indian mobile normalize, production OTP safety, hero auth gating, slugify, haversine hub picker
- Prisma client generate
- Initial MySQL migration SQL generated from schema (`prisma/migrations/20260817000000_init`)
- Next.js dashboard production build (scaffold)
- All four GitHub `main` branches pushed as `HermannJafri`

Not yet: live MySQL, Fast2SMS, Zoho, FCM, Expo runtime, Next production build.

---

## WHAT IS CURRENTLY BEING WORKED ON

Next: booking creation + canonical capacity-pool slots, then dispatch.

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

Follow the development order in `docs/08-target-architecture.md`:

1. Backend foundation + auth
2. Geography + catalog + customer addresses
3. Booking + slot pool
4. Dispatch / assignment
5. Payments
7. Notifications
8. Dashboard
9. Customer Expo app
10. Hero Expo app
11. Migration tooling
12. Tests, UX polish, deployment prep, handover

---

## WHAT SHOULD HAPPEN NEXT

1. Point `DATABASE_URL` at a local/staging MySQL 8 database and run `npx prisma migrate deploy` + `npm run db:seed`.
2. Implement booking create + capacity-pool slots.
3. Do **not** deploy. Do **not** push to GitLab. Remotes are GitHub only.

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
