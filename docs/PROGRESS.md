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

---

## WHAT HAS BEEN IMPLEMENTED AND TESTED LOCALLY

Local MySQL 8.0.46 (`MySQL80`) with dedicated `jiffit_dev`. Dashboard login `admin` / `ChangeMeNow!123` (DEV ONLY).

| Area | Status |
|------|--------|
| Live API integration (`npm run test:integration`) | **INTEGRATION_OK** — cash job complete, mock pay + duplicate reject, cancel, leave, cash settle |
| Prisma migrate + seed on `jiffit_dev` | TESTED |
| Dashboard / Expo apps pointed at `http://localhost:5000` | ENV WIRED |
| Live map positions API + dashboard table | IMPLEMENTED (Google tiles BLOCKED BY CREDENTIAL) |
| Isolated dump restore `jiffit_legacy_source` | RESTORED |
| Migration apply to `jiffit_migration_target` | **REHEARSAL VERIFIED** — clean apply + count/financial reconciliation complete |

---

## WHAT IS BLOCKED

| Item | Why |
|------|-----|
| Isolated DigitalOcean staging | No `doctl` and no `DIGITALOCEAN_ACCESS_TOKEN` in this environment; live apps/databases cannot be listed or created |
| Production OTP / FCM / Maps / Zoho / Spaces | Credentials the rebuild must not copy; not required for staging visual testing |
| Final production migration | Needs a **fresh** dump from old production |
| Firebase / Google Services JSON for mobile | Manual |
| App signing / store listings | Manual |

---

## WHAT SHOULD HAPPEN NEXT

1. Supply a DigitalOcean API token so a **new** App Platform app and **new** Managed MySQL cluster can be created. See `docs/18-staging-deployment.md`.
2. Do **not** reuse `jiffit-backend-v2-igply.ondigitalocean.app` or cluster `jiffit-v2-db-staging-do-user-25050266-0`.
3. After staging exists: import `jiffit_migration_target`, seed admin + a small live catalog, then verify Dashboard/Customer/Hero against that API.
4. Do **not** deploy to production. Do **not** push to GitLab. Remotes are GitHub only.

Latest rehearsal: 17,894 orders, 102,546 visits, 91,735 wallet rows, and 10,509 invoices imported. All required row counts and monetary totals reconcile; see `docs/migration-reports/legacy-apply.md`.

---

## GIT SAFETY

Allowed remotes:

```text
https://github.com/HermannJafri/jiffit-backend.git
https://github.com/HermannJafri/jiffit-dashboard.git
https://github.com/HermannJafri/jiffit-customer-app.git
https://github.com/HermannJafri/jiffit-hero-app.git
```

Reference projects under `Jiffit-old` and `Jiffit-Project` remain read-only.
