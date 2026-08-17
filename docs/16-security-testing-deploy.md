# Security, Testing, Deployment

## Security requirements

- JWT access + refresh; actor claim; hashed refresh rows
- OTP hashed at rest; rate limits; lockouts
- RBAC + ABAC on dashboard; IDOR checks on customer/hero
- Zod validation; no `any` at boundaries
- Uploads: size limits, MIME allow-list, Sharp processing, no client-chosen execution paths
- Zoho webhook HMAC + timestamp tolerance; amount match; attempt leases
- CORS from `ALLOWED_ORIGINS`
- Secrets only in env / App Platform
- Errors: generic 4xx/5xx to clients; details in logs
- Never trust client prices or status jumps

## Tests (minimum)

| Area | Status |
|------|--------|
| Auth OTP lockout / verify | NOT IMPLEMENTED |
| Permissions / IDOR | NOT IMPLEMENTED |
| Catalog pricing authority | NOT IMPLEMENTED |
| Booking create + invalid slot | NOT IMPLEMENTED |
| Booking transitions | NOT IMPLEMENTED |
| Capacity pool | NOT IMPLEMENTED |
| Hero eligibility / assign / reassign | NOT IMPLEMENTED |
| Payment webhook + duplicate + amount mismatch | NOT IMPLEMENTED |
| Cancel / cash convert | NOT IMPLEMENTED |
| Legacy mapping transforms | NOT IMPLEMENTED |

Runner: Node test runner or Vitest after scaffold. Test DB name: `jiffit_test`.

## Deployment (prepare, do not execute)

- New DigitalOcean App Platform services for backend and dashboard
- Do not replace existing production App Platform apps
- Existing Space reused
- Staging first: migrate dry-run, payments sandbox, OTP test mode off only when Fast2SMS is verified
- Mobile apps: EAS / store builds after API URL is known

### Suggested App Platform

| Component | Notes |
|-----------|--------|
| Backend | Node, `npm run build`, `npm start`, bind `PORT` |
| Dashboard | Next.js build, `JIFFIT_API_ORIGIN` = backend URL |
| MySQL | Managed MySQL 8; `DATABASE_URL` with explicit `connection_limit` |

Do not auto-deploy because a build succeeded.
