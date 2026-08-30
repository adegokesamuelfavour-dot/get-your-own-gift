# Consent-based Location Sharing System

This is a small Express + SQLite application for legitimate meeting coordination. A recipient receives a unique link, opens it, and must explicitly grant browser geolocation permission. The server stores the latest coordinates for that link. The owner can retrieve locations from the admin API.

## Run locally

1. Install Node.js 18+.
2. In this folder run `npm install`.
3. Set an admin key:
   - Windows PowerShell: `$env:ADMIN_KEY="replace-with-a-long-random-secret"`
   - macOS/Linux: `export ADMIN_KEY="replace-with-a-long-random-secret"`
4. Run `npm start`.
5. Open `http://localhost:3000`.

## Create a link
Enter the admin key and expiration period. The generated `/share/<token>` URL can be sent to the meeting guest.

## Read submitted locations
Call `GET /api/admin/shares` with header `x-admin-key: YOUR_ADMIN_KEY`. Each record contains `lat`, `lng`, `accuracy`, and `updated_at` when the guest has consented and submitted a location.

## Deployment
Deploy the folder to any Node.js host that supports persistent disk (because SQLite stores `locations.db`). Set `ADMIN_KEY` as a server-side environment variable. Use HTTPS in production because browsers generally require a secure context for geolocation.

## Privacy
Only collect location when the recipient explicitly grants browser permission. Keep links short-lived and do not expose the admin key in client-side code or public repositories.
