# Environment, Assets, Manual Configuration

Never commit real secrets. Inspect reference `.env` only to learn **names**.

## Backend `.env.example` (required vs optional)

| Variable | App | Purpose | Required |
|----------|-----|---------|----------|
| `NODE_ENV` | backend | development/test/production | yes |
| `PORT` | backend | HTTP port | yes |
| `DATABASE_URL` | backend | MySQL + Prisma pool params | yes |
| `JWT_SECRET` | backend | Access tokens | yes |
| `JWT_EXPIRES_IN` | backend | Access TTL | yes |
| `JWT_REFRESH_SECRET` | backend | Refresh tokens | yes |
| `JWT_REFRESH_EXPIRES_IN` | backend | Refresh TTL | yes |
| `OTP_HASH_SECRET` | backend | Hash OTPs | yes in prod |
| `OTP_TEST_MODE_ENABLED` | backend | Return/accept test OTP | no (off in prod) |
| `ALLOW_MASTER_OTP_TEMPORARILY` | backend | Emergency bridge | no |
| `MASTER_OTP` | backend | Only with bridge flag | no |
| `FAST2SMS_API_KEY` | backend | OTP SMS | yes for real OTP |
| `FAST2SMS_ENABLED` | backend | Toggle SMS | yes |
| `FAST2SMS_BASE_URL` | backend | Provider URL | yes if SMS on |
| `FAST2SMS_OTP_ROUTE` | backend | Fast2SMS route | yes if SMS on |
| `FAST2SMS_TIMEOUT_MS` | backend | HTTP timeout | no |
| `FIREBASE_PROJECT_ID` | backend | FCM | yes for push |
| `FIREBASE_PRIVATE_KEY` | backend | FCM | yes for push |
| `FIREBASE_CLIENT_EMAIL` | backend | FCM | yes for push |
| `DO_SPACES_KEY` | backend | Existing Space | yes for uploads |
| `DO_SPACES_SECRET` | backend | Existing Space | yes for uploads |
| `DO_SPACES_ENDPOINT` | backend | e.g. nyc3.digitaloceanspaces.com | yes for uploads |
| `DO_SPACES_BUCKET` | backend | Space name | yes for uploads |
| `DO_SPACES_REGION` | backend | Region | optional |
| `DO_SPACES_CDN_URL` | backend | Public CDN base | optional |
| `GOOGLE_MAPS_API_KEY` | backend | Directions/geocode | yes for ETA |
| `ZOHO_PAYMENTS_*` | backend | Online payments | yes for online pay |
| `PAYMENT_MOCK_ENABLED` | backend | Dev mock | no |
| `DISPATCH_*` | backend | ETA dispatch knobs | defaults ok |
| `HERO_LOCATION_*` | backend | Stale/min interval | defaults ok |
| `ALLOWED_ORIGINS` | backend | CORS | yes |

Zoho names must match the rewrite so the same production account can be attached later: `ZOHO_PAYMENTS_ACCOUNT_ID`, `API_KEY`, `WEBHOOK_SIGNING_KEY`, `RETURN_SIGNING_KEY`, `CLIENT_ID`, `CLIENT_SECRET`, `REFRESH_TOKEN`, `RETURN_URL`, `ENVIRONMENT`, `BASE_URL`, `ACCOUNTS_URL`, `CURRENCY`, `ALLOWED_METHODS`.

## Dashboard

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Axios base, typically `/api/v1` |
| `JIFFIT_API_ORIGIN` | Next rewrite target for `/api/*` |
| `NEXT_PUBLIC_UPLOAD_API_BASE_URL` | Optional direct upload origin |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.IO origin |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Browser Maps |

## Customer / Hero Expo

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_API_BASE_URL` | API origin including `/api/v1` |
| `EXPO_PUBLIC_SOCKET_URL` | Socket origin |
| `EXPO_PUBLIC_GOOGLE_MAPS_KEY` | Maps (or native config) |

Android Maps metadata key name: `com.google.android.geo.API_KEY`.

## Firebase / native files (MANUAL)

| What | Why | Expected filename | Destination | How to verify |
|------|-----|-------------------|-------------|---------------|
| Android Google services | FCM | `google-services.json` | `jiffit-customer-app/android/app/` and `jiffit-hero-app/android/app/` | App starts; debug log shows Firebase init |
| iOS Google services | FCM | `GoogleService-Info.plist` | `ios/` of each app | Same |
| Android package | Store / FCM | n/a | Customer `com.jiffit.jiffit_customer_app`, Hero `com.jiffit.jiffit_hero_app` unless product changes them | Matches Firebase apps |
| Signing keystores | Release builds | `*.jks` / `*.keystore` | **not in git** | `eas build` / local release |

## Assets copied into the new apps

Originals remain in the Flutter reference trees. Copied (not moved):

| Asset | Expected filename | Destination | Format | Purpose | Status |
|-------|-------------------|-------------|--------|---------|--------|
| Jiffit logo (customer) | `jiffit-logo.png` | `jiffit-customer-app/assets/images/jiffit-logo.png` | PNG | Splash, auth | COPIED |
| Customer splash video | `splash.mp4` | `jiffit-customer-app/assets/splash/splash.mp4` | MP4 | Splash | COPIED (renamed from `spalshvideo.mp4`) |
| Customer app icons | as named | `jiffit-customer-app/assets/icons/app-icon/` | PNG | Launcher | COPIED |
| Service icons | as named | `jiffit-customer-app/assets/icons/jiffit-services/` | PNG | Catalog | COPIED |
| Hero logo | `JiffitLogo.png` | `jiffit-hero-app/assets/images/JiffitLogo.png` | PNG | Splash, auth | COPIED |
| Hero app icon | `JiffitAppIcon.png` | `jiffit-hero-app/assets/images/JiffitAppIcon.png` | PNG | Launcher | COPIED |
| Hero alert sounds | `*.mp3` | `jiffit-hero-app/assets/sounds/` | MP3 | Booking offer | COPIED |

Still manual: Firebase `google-services.json`, `GoogleService-Info.plist`, and signing keystores.

Dashboard has **no** image logo in `public/` — wordmark “Jiffit” is text. Optional: add `jiffit-logo.png` later if desired.

## DigitalOcean Spaces

Existing Space is production media. New backend uses the **same bucket** via env. Do not migrate objects. New keys should not overwrite old keys.

## How to verify env

1. Backend `/health` returns ok without hitting paid providers.
2. `GET /payments/zoho/readiness` (once implemented) reports configured vs missing **names**, never secret values.
3. OTP in development with `OTP_TEST_MODE_ENABLED=true` does not need Fast2SMS.
