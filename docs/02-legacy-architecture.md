# Legacy Jiffit Architecture

**Source:** `C:\Users\herma\Downloads\Jiffit-old\jiffit.in` (read-only)

## Product

On-demand doorstep **car and home cleaning**, originally Patna-focused, later also Ranchi / Lucknow / Delhi in the dump. Brand: **Jiffit**. Field staff: **Hero**.

## Stack

| Layer | Reality |
|--------|---------|
| Backend | PHP Laravel 6 |
| UI | Blade + jQuery + Bootstrap 4 (AdminLTE-style backoffice) |
| DB | MySQL / MariaDB via Eloquent (no migrations in the snapshot) |
| Customer surface | Public website + PWA |
| Admin | `/backoffice/*` session auth |
| Hero | Mobile API `/api/vapi/*` |
| Payments | Razorpay (primary), POD/cash/UPI recorded on orders |
| SMS / WhatsApp | MSG91, Fast2SMS OTP path |
| Push | FCM via `vpushes` queue |
| Maps | Google Maps keys in settings |

## Surfaces

```text
Browser PWA  ──► Laravel web routes (catalog, checkout, account)
Admin        ──► /backoffice/* + permission middleware
Hero app     ──► /api/vapi/*  (token = user id; API key middleware disabled)
Cron         ──► process:push | orders:status | orders:lowbal
```

## Domain naming (legacy)

Legacy names do **not** match the business language used in the rewrite.

| Business concept | Legacy |
|------------------|--------|
| Customer | `users.role = 0` |
| Hero | `users.role = 1` |
| Booking | `orders` |
| Line items | `orders.items` JSON |
| Service category | `tags` |
| Priced SKU / package | `vendor_rates` |
| Visit / wash day | `tasks` |
| Wallet ledger | `wallet_trn` on the **order**, not a customer wallet |
| Time window | `slots` (6 coarse windows) |
| Geography | `cities` only — no hubs |

## Booking workflow (legacy)

1. City in session → browse services / subscription packages.
2. Cookie cart (`store_id`, optional subscription).
3. Checkout: name, mobile, date/slot, address. GST 5%. Min order ₹250.
4. Create `orders` status `1` (NEW_BOOKING), pay_status `Awaiting`, POD or Razorpay.
5. Admin **Transit** assigns `delivery_agent`, status `2`, inserts `tasks` `CONFIRMED`.
6. Hero: `CONFIRMED → ARRIVED → COMPLETED|FAILED` with required `task_photo`.
7. Subscriptions: daily generated tasks; wallet burn per completed/failed visit.

There is **no** automated nearest-hero dispatch, capacity pool, or ETA scheduling in legacy.

## Payments (legacy)

- Methods in data: POD (~87%), Razorpay, CASH, UPI, OTHER.
- Structured `payments` table is **empty**. Money lives on `orders` + `wallet_trn` + `invoices`.
- Subscription invoices credit `orders.wallet`; tasks debit it.
- PhonePe appears in config but is not a live path in the code reviewed.

## What legacy does not have

- Hubs / service radius
- Capacity planning
- Automatic assignment
- Start OTP
- Before/after as a first-class booking gate (task photo only)
- Hero incentives / penalties as entities
- Separate customer vs hero identity tables
- Zoho Payments

## Brand (legacy)

- Theme: `#803ba3` with `#6c4578`
- PWA name: Jiffit
- Logos under `public/images/` and settings-driven `SITE_LOGO`

## Security debt (do not reproduce)

- Hero token is the user id
- API key middleware commented out
- Secrets hardcoded in PHP and in `settings`
- Weak IDOR surface on several admin/customer paths
