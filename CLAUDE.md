# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` — runs `node index.js`. Listens on `process.env.PORT || 5000`.
- `npm test` — runs `node test.js`, but `test.js` does not exist in the repo, so this currently fails.
- Node engine pinned to `24.x` (`package.json#engines`).
- No build, lint, or formatter is configured.

Required environment variables for any DB/FTP-touching endpoint:
- `HOSTGATOR_PWAD` — shared password for the HostGator MySQL DB **and** the HostGator FTP account (`chitwofo` @ `gator4255.hostgator.com`, DB `chitwofo_playlist`).
- `EDIT_PWAD` — gate password posted in request bodies for any mutation (`add`/`edit`/`delete`).

## Architecture

This is a single-process Express app that serves a portfolio of small static "mini-apps" plus three MySQL-backed JSON APIs. Almost everything lives in one file — [index.js](index.js).

### Top-level surface

- `/` and `/chi` render EJS pages from [views/pages](views/) using partials in [views/partials](views/partials/). The `/chi` page is the navigation hub and is fed the link list from [menu.js](menu.js); when adding a new sub-app, update both `menu.js` and the `express.static` mount in `index.js`.
- Each entry in `menu.js` corresponds to a directory mounted as static assets at the matching URL: `albums`, `playlist`, `itunes100`, `bbb`, `citadels`, `m-combinations`, `mafia-random-number`, `mafia-random-card`. These are independent self-contained client apps (vanilla JS, Vue, or React-via-CDN) that the Express server only hosts — they call back into the JSON APIs below.

### JSON APIs (all in [index.js](index.js))

- `POST /api/albums` — `body: { action, ... }`, actions `list` / `delete`. Used by the albums client for read/delete only.
- `POST /api/albums-new` — multipart form (`formidable`). Actions `list` / `add` / `edit` / `delete`. The `add`/`edit` paths optionally FTP a cover image to `/public_html/albums-covers/` on HostGator before writing the DB row. Cover filename is `${year}_${month}_${Date.now()}`.
- `POST /api/playlist` — large switch on `action`: `current`, `latest`, `prev`, `next`, `top100`, `top10artists`, `upload`, `delete`. Reads/writes three tables: `songs`, `playlist`, `bonuses`.
- `POST /upload-new` — generic FTP upload endpoint that pushes whatever file is posted to `/public_html/albums-covers/` under its original filename. Rendered by [views/pages/upload.ejs](views/pages/upload.ejs) at `/upload-file`.
- `GET /cool` — returns a `cool-ascii-faces` string. No reason to touch.

### Playlist domain model (important when editing the `/api/playlist` handler)

- The `upload` action parses a plain-text "Playlist" dump split into three blocks A/B/C with fixed sizes/offsets/scores: `A_COUNT=9 A_OFFSET=4 A_SCORE=47`, `B_COUNT=10 B_OFFSET=16 B_SCORE=28`, `C_COUNT=6 C_OFFSET=29 C_SCORE=23`. A leading `*` in a song line marks it as new (sets `songs.date_appear`). The header line at index 1 is parsed by `getPlaylistDate` and expects the format `"Playlist DD Month YYYY"` after a fixed 8-character prefix.
- `top100` and `top10artists` lazily seed a per-year row set into `bonuses` via `check_bonus` (12 rows with month-end cutoffs and a hardcoded bonus schedule). Leap years extend February's cutoff via `isLeapYear`.
- The `upload` and `delete` actions chain multiple async `con.query` calls without using promises — flow control is via callback nesting and a shared `count_inserted` counter in the closure. Be careful: there is a known bug where the inner callback shadows the outer `res` variable (`con.query(ins_query, (err, res) => { ... res.end(...) })`), so error responses inside `insertPlaylistItem` will not actually reach the HTTP response.
- All queries are built by string interpolation. Treat any change here as security-sensitive: input is escaped only for `'` in the albums handler (`replaceAll("'", "''")`) and not at all in the playlist handler.

### Deployment

- [vercel.json](vercel.json) declares a build for `api/index.js`, but the actual entry point is `./index.js` at the repo root and there is no `api/` directory. The Vercel config is stale relative to the current layout — surface this when a deploy is being attempted rather than silently "fixing" one side. The app still runs locally and on Heroku-style platforms via `npm start`.
- All outbound integrations (MySQL, FTP) point at `gator4255.hostgator.com`. There is no local/dev DB; running endpoints that hit MySQL or FTP requires real HostGator credentials.

### Sub-app conventions

The static sub-apps under `albums/`, `playlist/`, `itunes100/`, etc., are each their own world (different frameworks, different build artifacts checked in directly — e.g. `albums/` ships a CRA `static/` build, `playlist/` ships hand-written Vue 2 + vendored libs). Don't try to unify them. When a change is scoped to one sub-app, stay inside that directory; the only cross-cutting wiring is the static mount + `menu.js` entry.
