# Codex handoff

This file records the stability, security, and UI changes made on 2026-06-06.
The core visual language, classics dataset, scene templates, and existing backup files
were preserved so Claude Code can continue from the current implementation.

## Stability and security changes

- The API now creates the authoritative Asia/Shanghai date context on the server.
- Request validation and a basic per-instance rate limit were added to `/api/ask`.
- SSE responses disable proxy buffering; the browser parser now buffers partial events.
- Dynamic question and model text is escaped before insertion through `innerHTML`.
- The iframe uses a version query to avoid stale `shenshu.html` caches.
- The static 2025 quick question was changed to "今年".
- The vector schema is consistently documented as 2048 dimensions.
- Anonymous conversation read/write policies were removed from the base schema.
- ESLint was aligned with Next.js 16 and now passes.

## UI changes

- Added two background modes at the top left:
  - `實時`: anchors the symbolic sky rotation to the current local time.
  - `靈境`: keeps the original free-running atmospheric animation.
- `實時` is symbolic time alignment, not an astronomical ephemeris or an accurate
  real-world star map. Do not describe it as precise astronomy without adding a real
  astronomy calculation library/API.
- Added `簡要` and `深度` answer modes. The selected `responseMode` is sent to
  `/api/ask`; brief mode uses a shorter prompt instruction and lower token limit.
- Sky and response mode choices are stored in `localStorage`.
- The displayed date/time now refreshes every minute instead of only on page load.
- Added ray-cast click feedback for visible stars, mansions, Beidou, and planets.
- Suggestion parsing now also recognizes Chinese numbering such as `第一，第二`.
- Renamed the lower-left SVG label from `日晷` to `十二時辰儀`.
- The iframe cache key is currently `/shenshu.html?v=20260606-2`.

Most of this UI remains in `public/shenshu.html`; avoid broad rewrites unless the
single-file implementation is intentionally being migrated.

## Supabase status

The existing Supabase project was updated successfully in the SQL Editor on
2026-06-06 with:

```sql
alter table conversations enable row level security;
drop policy if exists "conv_insert" on conversations;
drop policy if exists "conv_read" on conversations;
```

The editor returned `Success. No rows returned`. No additional execution is required
for the current database. `scripts/secure-conversations.sql` is retained for applying
the same change to another environment.

## Backups

Pre-change copies are in `codex-backups/`. They are intentionally outside `public/` so
the old HTML cannot be served.

## Remaining notes

- The rate limiter is in memory and applies per server instance. Use a shared limiter
  such as Upstash before high-traffic production deployment.
- `npm audit` still reports transitive vulnerabilities in the unused `ai` dependency
  and in the current Next.js dependency tree. No forced major upgrade was applied.
- `public/shenshu.html` remains a large single-file application. It was not refactored
  to avoid disrupting the current visual implementation.
- The current working directory does not contain a `.git` repository, so there is no
  Codex commit to preserve or revert.

## Verification

- `npm run lint` passes.
- `npm run build` passes with Next.js 16.2.7.
- Inline JavaScript in `public/shenshu.html` passes syntax validation.
- Browser verification on `http://localhost:3000` confirmed both mode groups switch
  correctly and persist after reload.
