# Notifications, Location, Hubs

## Push (FCM)

Firebase Admin. Project used by rewrite apps: `jiffit-v2` (new apps will need their own google-services files — see `15-environment-assets.md`).

Hero: `BOOKING_ALERT` / `BOOKING_OFFER`, `BOOKING_FINAL_REMINDER`, `BOOKING_TEAM_REQUEST`.  
Customer: booking status, package expiry.

Migration and historical imports must **not** send FCM.

## Realtime (Socket.IO)

Rooms: `dashboard`, `hero:{id}`, `customer:{id}`, `booking-tracking:{id}`, city/hub location rooms.

JWT on the socket handshake. Events from the rewrite to preserve: booking status/dispatch, hero location, support typing/messages, live map duty changes.

## SMS

OTP via Fast2SMS only at first. Do not send booking SMS during migration. Legacy MSG91/WhatsApp templates are not required for v1 unless ops later asks.

## Geography

`State → City → Hub`. Hub has lat/lng and `serviceRadiusMeters`. Catalog availability is hub-scoped.

Legacy had cities only. Migration: map `orders.city_id` / `users.city` to City; create default hub(s) per city if missing.

## Hero location

REST duty ingest + socket heartbeat while on an active job. Stale thresholds from env (`HERO_LOCATION_*`). Dashboard live map is permission-scoped.

## Maps

Google Maps Directions for ETA (haversine fallback). Geocode / reverse-geocode endpoints for both apps. Key: `GOOGLE_MAPS_API_KEY` (server) and public Maps key on dashboard/mobile.
