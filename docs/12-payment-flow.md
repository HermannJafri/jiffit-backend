# Payment Flow

Provider: **Zoho Payments (India)**. Methods: UPI + card (`ZOHO_PAYMENTS_ALLOWED_METHODS`). Do not replace with another gateway for convenience.

## Online happy path

```text
Create booking (PENDING_PAYMENT, paymentMethod=ONLINE)
  → ensurePaymentOrderForBooking (quote hash of authoritative amounts)
Customer or hero requests Zoho link
  → reservePaymentAttempt (row lock, reuse active link, creation lease)
  → Zoho create payment link
  → AWAITING_CUSTOMER
Customer pays
  → POST /payments/zoho/webhook (raw body, HMAC)
  → PaymentWebhookEvent inbox
  → applyProviderObservation(PAID)
       amount / currency / env / reference checks
       Booking: PENDING_PAYMENT → PENDING_ASSIGNMENT, paymentStatus=PAID
       Package purchase → COMPLETED + activate packages
  → planOrDispatchBooking + capacity sync
```

Reconciliation poller retries pending links. Webhook inbox can replay.

## Cash

- Cash bookings dispatch immediately.
- Hero complete with `paymentMethod: CASH` leaves company-owed cash until `/cash-collection/settle`.
- Convert pending online → cash only after provider refresh proves unpaid; cancel attempts first.

## Safety

- Client cannot set payable total.
- Duplicate attempts superseded.
- Webhook signature + timestamp tolerance.
- Mock pay only if `PAYMENT_MOCK_ENABLED` and not production.
- Credentials only in env. Never commit live Zoho secrets.
- Same production Zoho account may later point at this API; keep field names compatible.

## Refunds

Status: **NOT IMPLEMENTED as a provider call** in the rewrite. Rebuild keeps refund-pending audit first. Automatic Zoho refund is a later, tested feature.

## Legacy money

POD/Razorpay history migrates as historical `Payment` / wallet rows. Do not create Zoho links for imported bookings. Do not change stored amounts.
