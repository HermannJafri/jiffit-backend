# Legacy apply (isolated staging)

- Source: `jiffit_legacy_source`
- Target: `jiffit_migration_target`
- Complete: **YES**
- Side effects: none (FCM/OTP/Zoho/SMS/payment requests/dispatch are not called)
- Target database triggers: 0
- Failed records: 18
- Data-quality warnings retained: 62

| Entity | Source | Target | Difference | Reason |
|--------|-------:|-------:|-----------:|--------|
| cities | 4 | 4 | 0 | All legacy cities imported with inactive-safe default hubs. |
| legacy admins | 96 | 96 | 0 | Imported disabled with an unknown random password and mandatory reset; no legacy credentials reused. |
| customers | 26562 | 26559 | -3 | Difference is invalid or duplicate phone identities listed in failed records. |
| heroes | 759 | 744 | -15 | Difference is invalid or duplicate phone identities listed in failed records. |
| addresses | 14757 | 14757 | 0 | All rows retained in the historical address table; unresolved customer links remain null. |
| bookings/orders | 17894 | 17894 | 0 | Invalid coordinates are retained raw and excluded only from typed latitude/longitude. |
| tasks/visits | 102546 | 102546 | 0 | 0 source order references are unmatched but rows are retained with null booking_id. |
| wallet | 91735 | 91735 | 0 | Historical-only; never included in spendable balances. |
| invoices | 10509 | 10509 | 0 | 0 source order references are unmatched but snapshots are retained. |
| payments | 0 | 0 | 0 | The legacy payments table is empty; order, invoice, and wallet financial history is reconciled separately. |
| catalog tags | 145 | 0 | -145 | Intentionally not activated: legacy tag hierarchy does not map safely to the reconstructed live catalog. |
| catalog vendor rates | 466 | 0 | -466 | Intentionally not activated: preserved in the source dump as catalog reconstruction reference. |

## Relationship reconciliation

- Addresses: 14737 linked; 20 unlinked. Unlinked rows retain legacy_user_id and source_address_id.
- Bookings: 17862 linked; 32 unlinked. Unlinked rows retain legacy_order_id and denormalized customer identity.
- Visits: 102546 linked; 0 unlinked. Every row retains legacy_order_id and source_task_id.
- Wallet/customer: 91728 linked; 7 unlinked. Every row retains source_trn_id plus legacy order/task/driver identifiers.
- Wallet/hero: 639 legacy driver references unmatched. Unmatched attribution retains legacy_driver_id.
- Invoices: 10509 linked; 0 unlinked. Every row retains source_invoice_id and legacy_order_id.

## Financial reconciliation

- Wallet SUM(amount): source 25141260.79; target 25141260.79; difference 0.
- Orders payable total (effective): source 33859559; target 33859559.
- Invoices payable total: source 16662708.48; target 16662708.48.
- All monetary field differences: 0.

## Side-effect safety

- Operational rows created: {"activeLegacyAdmins":0,"bookingDispatches":0,"dispatchOutboxEvents":0,"pushNotificationLogs":0,"otpChallenges":0,"paymentOrders":0}.
- The importer uses direct database writes only; it never invokes SMS, FCM, Zoho, payment, notification, or dispatch services.

## Intentionally excluded source tables

- `banners`: 21 rows — Excluded from activation pending editorial review; source remains in the immutable dump
- `blog_authors`: 2 rows — Excluded with legacy editorial content; no operational dependency
- `blog_cats`: 5 rows — Excluded with legacy editorial content; no operational dependency
- `blogs`: 13 rows — Excluded from activation pending editorial review
- `courses`: 1 rows — Excluded: no active course rows or target operational dependency
- `currency`: 2 rows — Excluded: replaced by application currency configuration
- `faqs`: 13 rows — Excluded from activation pending editorial review
- `language`: 1 rows — Excluded: replaced by application language configuration
- `messages`: 934 rows — Excluded: legacy support messages are not part of the v1 support cutover
- `migrations`: 1 rows — Excluded: legacy framework migration metadata is not business data
- `offers`: 35 rows — Excluded: expired/legacy promotion rules must not become active coupons
- `orderstats`: 10 rows — Excluded: derived status lookup replaced by the target booking-status enum
- `pages`: 13 rows — Excluded from activation pending editorial review
- `permission_role`: 116 rows — Excluded: legacy authorization model is incompatible with target RBAC
- `permissions`: 46 rows — Excluded: legacy authorization model is incompatible with target RBAC
- `roles`: 5 rows — Excluded: legacy authorization model is incompatible with target RBAC
- `settings`: 45 rows — Do not migrate secrets
- `slots`: 6 rows — Historical label only; live slots are capacity pool
- `tags`: 145 rows — Excluded from live activation: legacy hierarchy is only a catalog reconstruction reference
- `testimonials`: 10 rows — Excluded from activation pending editorial review
- `track_location`: 3214 rows — Excluded: stale high-volume location telemetry is not operational state and carries privacy risk
- `vendor_photos`: 3 rows — Excluded: orphaned legacy vendor media reference with no live vendor target
- `vendor_rates`: 466 rows — Excluded from live activation: rates require explicit product review and mapping to the reconstructed catalog
- `vendor_tags`: 2753 rows — Excluded: legacy vendor/catalog join is retained only as reconstruction reference
- `vendor_types`: 2 rows — Excluded: legacy vendor taxonomy is not used by the target operating model
- `vpushes`: 13190 rows — Excluded: historical push queue must never be replayed

Live dispatch was not run. Imported non-terminal orders are `LEGACY_ARCHIVED`; historical wallet and invoices remain read-only shadow data.
