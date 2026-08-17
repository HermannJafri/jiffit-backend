# Authentication and Permissions

## Customers

1. `POST /auth/customer/send-otp` — 10-digit Indian mobile, rate-limited.
2. `POST /auth/customer/verify-otp` — hashed OTP compare, issues access + refresh.
3. Profile completion / location onboarding in the customer app.
4. Refresh on 401; logout revokes refresh token.

OTP is stored hashed (`OTP_HASH_SECRET`). Lockouts and per-phone / per-IP limits come from `OtpChallenge` + `OtpSecurityState`. Production must not use master/test OTP unless an explicit temporary bridge flag is on.

Provider: **Fast2SMS**. Env: `FAST2SMS_*`.

## Heroes

Same OTP pattern on `/auth/hero/*`, plus:

- `deviceId` on verify
- Server-driven `onboardingStep` and `HeroStatus`
- FCM token + `HeroDevice`
- Blocked outcomes: inactive, blacklisted, suspended, deleted

Operational heroes: `VERIFIED` and active. Incomplete profiles cannot receive offers.

## Dashboard

- `POST /auth/dashboard/login` — username/password, bcrypt, optional selfie + lat/lng for attendance.
- Roles: `SUPER_ADMIN`, `ADMIN`, `HR`, `OPERATIONS`.
- Legacy imported roles (`AREA_MANAGER`, `SUPERVISOR`, `TELE_SALES_EXECUTIVE`) may exist as data but get no extra privileges until `/rules` assigns sections.
- Permissions are **route and tab keys** (`/bookings`, `/bookings#pending`), with hub → state → global cascade.
- `SUPER_ADMIN` bypasses checks and alone can edit `/rules`.
- City/hub scopes filter bookings, heroes, maps.

## Tokens

- Access JWT short-lived (`JWT_EXPIRES_IN`, default 15m).
- Refresh JWT longer (`JWT_REFRESH_EXPIRES_IN`, default 7d), stored hashed server-side.
- Separate secrets: `JWT_SECRET`, `JWT_REFRESH_SECRET`.
- Actor type encoded in claims so a customer token cannot call hero routes.

## IDOR

Every customer/hero query is scoped to `req.auth.id`. Dashboard queries are scoped by city/hub permissions. Booking ids are never trusted from the client without an ownership or permission check.
