# Legacy dump dry-run

- Dump: `C:\Users\herma\Downloads\Backup\old-jiffit-latest.sql`
- Generated: 2026-08-17T02:36:00.804Z
- Side effects suppressed: FCM/OTP/Zoho/SMS/dispatch
- Missing required tables: none

| Table | Inserts | Est. rows | Target | Notes |
|-------|---------|-----------|--------|-------|
| address | 3 | 14760 | customer_addresses | Preserve lat/lng and city |
| admin | 1 | 97 | dashboard_users | Ops users; passwords must be reset |
| banners | 1 | 22 | skip_unmapped | No mapping yet — log and do not drop silently |
| blog_authors | 1 | 3 | skip_unmapped | No mapping yet — log and do not drop silently |
| blog_cats | 1 | 6 | skip_unmapped | No mapping yet — log and do not drop silently |
| blogs | 1 | 14 | skip_unmapped | No mapping yet — log and do not drop silently |
| cities | 1 | 5 | cities | Need a default hub per city |
| courses | 1 | 2 | skip_unmapped | No mapping yet — log and do not drop silently |
| currency | 1 | 3 | skip_unmapped | No mapping yet — log and do not drop silently |
| faqs | 1 | 14 | skip_unmapped | No mapping yet — log and do not drop silently |
| invoices | 10 | 10519 | invoices | Preserve amounts; FY prefix continuation is a manual decision |
| language | 1 | 2 | skip_unmapped | No mapping yet — log and do not drop silently |
| messages | 1 | 935 | skip_unmapped | No mapping yet — log and do not drop silently |
| migrations | 1 | 2 | skip_unmapped | No mapping yet — log and do not drop silently |
| offers | 1 | 36 | coupons | If still valid; else archive |
| orders | 20 | 17914 | bookings | legacyOrderId; items JSON → booking_items; status map to LEGACY_ARCHIVED unless completed/cancelled |
| orderstats | 1 | 11 | skip_unmapped | No mapping yet — log and do not drop silently |
| pages | 1 | 14 | skip_unmapped | No mapping yet — log and do not drop silently |
| permission_role | 1 | 117 | skip_unmapped | No mapping yet — log and do not drop silently |
| permissions | 1 | 47 | skip_unmapped | No mapping yet — log and do not drop silently |
| roles | 1 | 6 | skip_unmapped | No mapping yet — log and do not drop silently |
| settings | 1 | 46 | skip_secrets | Do not migrate secrets |
| slots | 1 | 7 | skip_unmapped | Historical label only; live slots are capacity pool |
| tags | 1 | 146 | service_categories | Plus service_groups as needed |
| tasks | 68 | 102614 | legacy_booking_visits | Never live assignment |
| testimonials | 1 | 11 | skip_unmapped | No mapping yet — log and do not drop silently |
| track_location | 1 | 3215 | skip_unmapped | Do not bulk-import breadcrumbs |
| users | 9 | 27330 | customers | Split by role: 0 customers, 1 heroes (legacyUserId) |
| vendor_photos | 1 | 4 | skip_unmapped | No mapping yet — log and do not drop silently |
| vendor_rates | 1 | 467 | services | Catalog reconstruction reference |
| vendor_tags | 1 | 2754 | skip_unmapped | No mapping yet — log and do not drop silently |
| vendor_types | 1 | 3 | skip_unmapped | No mapping yet — log and do not drop silently |
| vpushes | 4 | 13194 | skip_unmapped | No mapping yet — log and do not drop silently |
| wallet_trn | 10 | 91745 | legacy_wallet_transactions | Reconcile SUM(amount) |

Apply to a live database is intentionally blocked until staging MySQL is confirmed.
