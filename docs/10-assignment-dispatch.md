# Assignment and Dispatch

## Canonical: ETA scheduled dispatch

Enabled with `DISPATCH_FEATURE_ENABLED=true`.

Durable `BookingDispatch` per booking.

**Offer release time**

```text
scheduledStart − (routeEta + acceptanceWindow + reassignmentBuffer + arrivalBuffer)
```

**Eligibility (primary hero)**

- Same city, VERIFIED, active, not blacklisted
- Skill / job-role match
- Reachable (FCM)
- Not on leave / holiday conflict
- On duty at release/accept (unless manual dashboard assign)
- No booking/route conflict
- Previous/following route feasible with cleanup buffer
- Arrival feasible from resolved origin

**Ranking:** ETA seconds → workload → rating → distance → location confidence.

**States:** `PLANNED → PREFLIGHT_READY → OFFER_PENDING → RETRY_WAIT | HERO_ACCEPTED | … | ESCALATED | FAILED | CANCELLED`

Mechanics to preserve: DB leases, offer expiry, retry/escalate, outbox → FCM/socket, multi-worker participants, dashboard force/reassign/manual-select with audited reason.

## Fallback: legacy auto-dispatch

`DISPATCH_FEATURE_ENABLED=false` (rewrite default during rollout).

- Only `PENDING_ASSIGNMENT`, not package purchases
- Cash always; online only if `paymentStatus=PAID`
- Same calendar day IST
- Rank haversine (live / check-in / home / hub) then rating
- Must be on duty
- Socket + FCM alert, ~60s TTL
- Minute cron expires stale alerts and reassigns
- Attempt counter; escalate to operations after cap

Shadow mode may run ETA preflight while still assigning via legacy. Useful in staging; not a production default.

## Manual dashboard assign

Payment eligibility + same eligibility service with reason `MANUAL`. If the hero is busy, booking goes `ON_HOLD`.
