# Trakt Bulk Manager (local-first)

A personal local web app for managing your own Trakt watchlist, ratings, and custom lists in bulk. Trakt remains the source of truth. No cloud service or third-party database is used.

## Current MVP

- Trakt device-code authentication (no client secret and no local OAuth callback URL).
- Fetch movie/show watchlists, ratings, and personal lists.
- Search and select visible movies/shows.
- Bulk set/remove ratings.
- Bulk add/remove movies or shows to/from a custom list.
- Download a paginated JSON backup of movie/show watchlists, ratings, movie/show watched history, and custom-list contents.
- Explicit confirmation before every bulk mutation.

## Requirements

- Node.js 20+
- npm 10+
- A Trakt API application and its Client ID: https://trakt.tv/oauth/applications

## Setup

1. Create a Trakt API application. Use the Client ID only; this app uses OAuth Device Code Flow.
2. Copy `server/.env.example` to `server/.env` and set `TRAKT_CLIENT_ID`.
3. From this folder run:

   ```bash
   npm install
   npm run dev
   ```

4. Open the local UI at http://127.0.0.1:5173.
5. Click **Connect Trakt**, open the verification URL, enter the displayed code, then click **I've authorized**.

The API server binds only to `127.0.0.1:8787`. Local token/session files are stored under `server/.data/` and should never be committed or shared. The token file is created with owner-only permissions where supported. Tokens are stored locally in plaintext in this MVP; use full-disk encryption and do not share the `.data` folder. OS-keychain encryption is a planned hardening step.

## Build

```bash
npm run build
```

## Security and scope

- Do not publish this app or expose its API port to your LAN or the internet.
- Do not commit `.env` or `.data/` files.
- The app uses Trakt's documented API; it does not scrape Trakt pages.
- This is an independent app and is not endorsed or certified by Trakt.
- Always export a fresh backup before large bulk changes.

## Known MVP limitations

- Library list fetching in the UI currently uses the first API page; the JSON backup fetches paginated data.
- The custom-list page shows list metadata; selecting items from a custom list and editing list metadata are planned next.
- Smart Lists, audit-log persistence, batch progress/retry UI, CSV export, and ratings/history pagination in the interactive UI are planned next.
- Test with a small selection before large bulk operations; API response shapes and rate limits can evolve.
