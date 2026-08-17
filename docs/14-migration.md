# Legacy Migration

## Principles

- Repeatable, observable, testable, safe
- `--dry-run` never writes the destination
- Never silently drop records — log source table, id, reason, values, possible resolution
- Machine-readable JSON report + human-readable Markdown/summary
- **No live side effects:** no FCM, OTP, Zoho, SMS, auto-dispatch
- Preserve media URLs as stored
- Preserve money amounts as stored
- Fresh production dump later; current dump is for design and rehearsal

## High-level map

| Legacy | New |
|--------|-----|
| users role=0 | customers (`legacyUserId`) |
| users role=1 | heroes (`legacyUserId`) |
| admin | dashboard_users |
| address | customer_addresses |
| orders | bookings (`legacyOrderId`) |
| orders.items JSON | booking_items (frozen name/price) |
| tags | service_categories / service_groups |
| vendor_rates | services / service_variants |
| tasks | legacy_booking_visits (not live dispatch) |
| wallet_trn | legacy_wallet_transactions + optional customer wallet opening balances |
| invoices | invoices / legacy_invoice_snapshots |
| slots | historical label on booking; live slots are capacity pool |
| cities | cities (+ default hub) |
| offers | coupons |
| track_location | do not bulk-import breadcrumbs unless needed; live location is rewrite pipeline |
| settings secrets | **do not migrate** |

## Order status map

| Legacy | New |
|--------|-----|
| 10 COMPLETED | COMPLETED |
| 7 CANCELED | CANCELLED |
| 2 PENDING_QUOTE / 1 NEW_BOOKING / 5 RUNNING / 8 HOLD / 4 WORK_DONE | LEGACY_ARCHIVED + `legacyOriginalStatus` |
| 3 VENDOR_ASSIGNED | ASSIGNED only if a hero id is present and job is not historical-complete; else LEGACY_ARCHIVED |

Ambiguous rows fail the record in the report rather than guess.

## Dry-run checks

- Record counts per entity
- Duplicate phones / emails
- Missing city / customer / hero references
- JSON items that do not parse
- Money parse failures
- Unmapped status / payment method
- Orphan tasks (task.order_id missing)

## Reconciliation (required)

```text
Legacy Customers / Migrated / Failed
Legacy Heroes / Migrated / Failed
Legacy Bookings / Migrated / Failed
Legacy Tasks / Migrated visits / Failed
Legacy Invoices / Migrated / Failed
Legacy wallet_trn count + SUM(amount) vs migrated count + SUM(amount)
```

Finance reconciles **count and amount**, not count alone.

## Rehearsal CLI (this rebuild)

```bash
npm run migrate:legacy
```

Reads `LEGACY_SQL_DUMP` or `C:\Users\herma\Downloads\Backup\old-jiffit-latest.sql`, inventories INSERT statements, writes `docs/migration-reports/legacy-dry-run.{json,md}`. Apply mode is blocked until an isolated staging MySQL is confirmed. No FCM/OTP/Zoho/SMS/dispatch.

1. Preserve untouched backup of the fresh dump
2. Restore in an isolated migration environment
3. Dry-run
4. Fix mappings
5. Staging apply
6. Reconcile counts and money
7. Validate media URLs
8. Verify dashboard / customer / hero history
9. Plan production cutover

Never import an untested dump into the new production database.

## Tooling location

`jiffit-backend/scripts/migration/` (to be implemented). CLI: `npm run migrate:legacy -- --dry-run` then `--apply`.
