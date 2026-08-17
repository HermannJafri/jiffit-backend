# Legacy MySQL Database

**Dump:** `C:\Users\herma\Downloads\Backup\old-jiffit-latest.sql`  
**DB name:** `jiffit_app`  
**Size:** ~121 MB  
**Server:** MariaDB 11.2.6  
**Dumped:** 2026-08-02 17:26:23  
**Tables:** 44  
**Declared foreign keys:** 3 (all on unused vendor tables)

This dump is for **understanding, mapping, dry-run testing**. Final production migration must wait for a **fresh** old-production dump.

## Volumes

| Entity | Approx rows |
|--------|-------------|
| tasks | 102,546 |
| wallet_trn | 91,735 |
| users | 27,321 (customers ~26,562, heroes ~759) |
| orders | 17,894 |
| address | ~14,757 |
| invoices | 10,509 |
| vendor_rates | 466 |
| tags | 145 |
| payments | 0 |
| vendors / vendor_orders | 0 |

Cities: Patna (active), Ranchi, Lucknow, Delhi (inactive in dump).

## Order statuses (`orderstats`)

| ID | Name | Count |
|----|------|-------|
| 1 | NEW_BOOKING | 152 |
| 2 | PENDING_QUOTE | 297 |
| 3 | VENDOR_ASSIGNED | 0 |
| 4 | WORK_DONE | 43 |
| 5 | RUNNING | 204 |
| 6 | OUT_FOR_DELIVERY | 0 |
| 7 | CANCELED | 6,915 |
| 8 | HOLD | 335 |
| 10 | COMPLETED | 9,948 |

## Task statuses

COMPLETED 79,518 · CANCELLED 18,231 · FAILED 3,932 · CONFIRMED 785 · IN_PROGRESS 79

`trans_type`: SU (subscription) vs ST (standard).

## Money types (unsafe — do not copy)

Mix of `int`, `float(10,2)`, `varchar` prices. New schema uses `DECIMAL(10,2)` everywhere. Historical amounts must be copied as stored, not recalculated.

## Media

Relative paths such as `uploads/YYYY/MM/{ts}.jpg`, not CDN URLs. ~81k task photos. New Jiffit must keep existing public URLs when they already work (DigitalOcean Space / current host). Do not bulk re-upload.

## Implicit relationships

Almost no FKs. Application joins:

- `orders.user_id` → customers
- `orders.delivery_agent` / `tasks.driver_id` → heroes (can diverge)
- `orders.items[].id` → `vendor_rates.id`
- `address.user_id` → users
- `tags.parent_id` → tags
- `wallet_trn.order_id` stored as varchar

## V2 staging dumps

`jiffit-v2-staging-backup.sql` is the **Prisma rewrite schema**, not migrated production history. Treat it as schema confirmation for the four-month rewrite, not as a data source.
