# Old vs Newer — Capability Comparison

Classification: LEGACY ONLY · NEWER ONLY · BOTH · CHANGED · IMPROVED · PARTIAL · DEPRECATED · UNCERTAIN

| Capability | Classification | Decision for rebuild |
|------------|----------------|----------------------|
| OTP customer login | BOTH (legacy web, newer app) | Keep newer OTP security (hashed OTP, lockouts) |
| Password hero login | LEGACY ONLY | **Deprecated.** Hero uses OTP like the rewrite |
| Admin username/password | BOTH | Keep rewrite RBAC + city/hub scopes |
| City-scoped catalog | BOTH | Keep; add hubs from rewrite |
| Hubs + radius | NEWER ONLY | Keep |
| Hierarchical catalog (category/group/service/variant) | NEWER (legacy: tags + vendor_rates) | Keep rewrite catalog |
| Subscription packages + visit burn | BOTH (different models) | Keep rewrite `CustomerServicePackage` + visit bookings; migrate legacy wallet-burn history as `LegacyBookingVisit` + wallet txs |
| Manual admin assignment | BOTH | Keep |
| Auto nearest-hero dispatch | NEWER ONLY | Keep as **fallback flag** |
| ETA / route-aware dispatch | NEWER ONLY | **Canonical** |
| Capacity groups / daily headcount | NEWER ONLY | Keep; canonical slot source |
| Coarse 6 time windows | LEGACY (newer still has TimeSlot rows) | Keep labels for history; live booking uses exact `slotStartAt`/`slotEndAt` |
| Razorpay | LEGACY ONLY (plus unused PhonePe config) | **Do not revive** unless a business owner later requires it. Rebuild uses **Zoho** |
| Zoho Payments | NEWER ONLY | Keep |
| POD / cash | BOTH | Keep cash + cash-collection settlement |
| Order-level subscription wallet | LEGACY ONLY | Map to customer wallet + package entitlements; preserve ledger amounts |
| Jiffit Coins | NEWER ONLY | Keep |
| Start OTP + before/after photos | NEWER ONLY | Keep |
| Hero live location / live map | PARTIAL (legacy track_location) | Keep rewrite location pipeline |
| Hero attendance / leaves / payroll | NEWER ONLY | Keep |
| Incentives / penalties | NEWER ONLY | Keep |
| CMS (blogs, FAQs, banners) | BOTH | Keep rewrite settings/CMS; legacy CMS → `LegacyContentItem` |
| PWA website booking | LEGACY ONLY | **Not in v1 of rebuild.** Customer Expo app is the customer surface. Revisit a marketing site later |
| Vendor marketplace | DEPRECATED (empty tables) | Drop |
| Neodove CRM webhook | LEGACY ONLY | UNCERTAIN — do not silently drop; document as optional later |
| WordPress blog sync | LEGACY ONLY | Drop unless content is still needed; blogs exist in customer app from settings |
| Multi-worker / team jobs | NEWER ONLY | Keep |
| Support chat | NEWER ONLY | Keep |
| Shop / training / certificates | NEWER ONLY | Keep |
| Invoice numbering `JIFFIT/FY/` | LEGACY | Preserve historical invoice numbers; new invoices continue a documented series |

## Brand

| Surface | Color | Decision |
|---------|-------|----------|
| Legacy web / hero | `#803ba3` | Customer + Hero apps keep this family |
| Customer Flutter | `#7C3AED` | Same purple family — use as customer primary |
| Dashboard rewrite | `#4f46e5` indigo | Keep for ops console (clearer hierarchy). Do not re-purple the dashboard |

## What must not be discarded

- Legacy financial history (orders, invoices, wallet_trn amounts)
- Legacy task photos / media URLs
- Rewrite booking integrity + Zoho attempt leases + webhook inbox
- Rewrite capacity pool + ETA dispatch math
- Rewrite OTP lockouts
- Hero offer UX (sound, full-screen, accept window)
