# Unresolved Items

| Item | Status | Notes |
|------|--------|-------|
| Push to HermannJafri GitHub repos | IMPLEMENTED | All four `main` branches pushed as `HermannJafri`. |
| Fresh old-production SQL dump | BLOCKED | Current dump is rehearsal only |
| Production Zoho / Fast2SMS / Firebase / Spaces / Maps credentials | REQUIRES CREDENTIAL | Names documented; values not copied |
| Customer self-reschedule | NOT IMPLEMENTED in rewrite | Do not invent |
| Automatic Zoho refunds | NOT IMPLEMENTED in rewrite | Audit-only first (`CUSTOMER_CANCELLED_REFUND_REQUIRED`) |
| Jiffit Coins / coupons on create | NOT IMPLEMENTED | Requests with `coinsToRedeem` or `couponCode` fail closed |
| Overtime fee quotes | PARTIAL | Slot math supports a rate; IncentivePlan lookup not wired |
| Marketing PWA website | LEGACY ONLY | Out of v1 mobile+dashboard rebuild |
| Neodove CRM | UNCERTAIN | Ask only if it still matters to sales |
| Dual Flutter vs Expo store listings | REQUIRES EXTERNAL SERVICE | New Expo apps need Firebase iOS/Android apps |
| Overnight shifts | Disabled in rewrite | Keep unless ops requests |
| Dashboard indigo vs purple | DECIDED | Indigo ops, purple mobile |
| Default hub per legacy city | NEEDS IMPLEMENTATION | Migration must create hubs |
| Invoice FY prefix continuation | OPEN | Preserve historical numbers; define next series before go-live |
