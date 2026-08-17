# Source Inventory

All existing Jiffit trees are **reference only**. New work lives only under `C:\Users\herma\Downloads\Jiffit-Proj-Cursor`.

## New repositories (writable)

| App | Local path | GitHub remote |
|-----|------------|---------------|
| Backend | `C:\Users\herma\Downloads\Jiffit-Proj-Cursor\jiffit-backend` | `https://github.com/HermannJafri/jiffit-backend.git` |
| Dashboard | `C:\Users\herma\Downloads\Jiffit-Proj-Cursor\jiffit-dashboard` | `https://github.com/HermannJafri/jiffit-dashboard.git` |
| Customer | `C:\Users\herma\Downloads\Jiffit-Proj-Cursor\jiffit-customer-app` | `https://github.com/HermannJafri/jiffit-customer-app.git` |
| Hero | `C:\Users\herma\Downloads\Jiffit-Proj-Cursor\jiffit-hero-app` | `https://github.com/HermannJafri/jiffit-hero-app.git` |

## Read-only reference

| Role | Path | Notes |
|------|------|-------|
| Legacy app | `C:\Users\herma\Downloads\Jiffit-old\jiffit.in` | Laravel 6 monolith |
| Legacy dump | `C:\Users\herma\Downloads\Backup\old-jiffit-latest.sql` | MariaDB `jiffit_app`, ~121 MB, 2026-08-02 |
| V2 staging dump | `C:\Users\herma\Downloads\Backup\jiffit-v2-staging-backup.sql` | Prisma rewrite schema, almost empty |
| Newer backend | `C:\Users\herma\Downloads\Jiffit-Project\jiffit-backend` | Express 5 + Prisma + MySQL |
| Newer dashboard | `C:\Users\herma\Downloads\Jiffit-Project\jiffit-dashboard-next` | Next.js 16 + Ant Design |
| Newer customer | `C:\Users\herma\Downloads\Jiffit-Project\jiffit-customer-app` | **Flutter**, not Expo |
| Newer hero | `C:\Users\herma\Downloads\Jiffit-Project\jiffit-hero-app` | **Flutter**, not Expo |

## Do not copy from reference projects

- `.git`
- `node_modules`, `vendor`, `.dart_tool`, `build`, `dist`, `.next`
- Real `.env` values, Firebase private keys, payment secrets
- GitLab remotes, `.gitlab-ci.yml` as a deployment target

Reusable assets (logos, splash video, sounds, service icons) may be copied into the new apps. Originals stay untouched.

## Technology correction

The reconstruction prompt specifies React Native + Expo for both mobile apps. The four-month rewrite implemented **Flutter**. The rebuild follows the prompt (Expo + TypeScript) and treats the Flutter apps as the **functional specification**, not as code to paste.
