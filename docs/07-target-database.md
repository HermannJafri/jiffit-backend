# Target Database

MySQL 8 via Prisma. Money is always `DECIMAL(10,2)`. Never `float`.

The starting schema is the rewrite Prisma schema (copied into `prisma/schema.prisma`) because it already:

- splits customers / heroes / dashboard users
- models booking + items + status history
- models Zoho payment orders/attempts/webhooks
- models hubs, capacity, dispatch
- isolates legacy visits, wallet txs, content, invoice snapshots
- uses `legacy_*` fields on bookings

## Traceability

Keep / add:

| Record | Traceability |
|--------|----------------|
| Customer | `legacyUserId` (users.id where role=0) |
| Hero | `legacyUserId` (users.id where role=1) |
| Address | `legacyAddressId` |
| Booking | `legacyOrderId`, `legacyOriginalStatus`, `creationSource` |
| Visit | `LegacyBookingVisit.legacyTaskId` |
| Payment/wallet | `LegacyWalletTransaction.legacyId` |
| Catalog | map `tags` / `vendor_rates` ids during migration (mapping tables in migration reports) |

## Core entities

```text
State → City → Hub
DashboardUser (+ city/hub scopes, roles)
Customer → CustomerAddress
Hero → skills, docs, devices, attendance, location
ServiceCategory → ServiceGroup → Service → ServiceVariant
Booking → BookingItem
         → BookingStatusHistory
         → BookingAssignment
         → BookingDispatch (+ offers, outbox)
         → PaymentOrder → PaymentAttempt
         → Invoice
CustomerServicePackage (purchase vs visit)
BookingCapacityGroup + daily headcount
```

## Status machines (live)

See `09-booking-lifecycle.md`. Historical legacy statuses that cannot map cleanly become `LEGACY_ARCHIVED` plus `legacyOriginalStatus`.

## Indexes

Preserve rewrite indexes on booking status, city, customer, hero, slot times, payment references. Add unique constraints for migration ids where a 1:1 import exists.

## What we will not do

- Recreate the vendor marketplace tables
- Store prices as varchar
- Let migrated history mutate through live dispatch/payment side effects
