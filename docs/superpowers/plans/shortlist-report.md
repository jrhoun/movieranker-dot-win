# Shortlist Rotation & Community Theme Proposals — Report

Date: 2026-08-24 · Branch: master · Commits: `62c1f2c` (rotation), this one (proposals + admin)

## What shipped

### 1. Theme catalog (`src/lib/shortlist-themes.ts`)
12 curated code-data themes (no DB): "Movies That Are Secretly The Same Story",
"Best Hairpieces & Prosthetics", "One Location, Whole Movie", "Dads Having A Bad
One", "Rain Soaked Cinema", "Crimes Gone Stupid", "Longest Two Hours Of Your Life
(So Bad They're Great)", "Trains You'd Rather Not Miss", "Sequels That Beat The
Original", "Everyone Is Lying", "Deserts, Dust & Bad Decisions", "That House Was
A Mistake". Each carries 6–7 real TMDB ids curated from knowledge (no live API
validation per spec — a wrong id would surface as a missing/odd poster and can be
swapped in one line).

### 2. Deterministic rotation (`src/lib/shortlist.ts`)
- `daysSinceUtcEpoch(date)` — UTC-day counter, timezone-proof.
- `pickTonightsEntry(pool, dayIndex)` — modulo pick, negative-safe.
- `tonightsShortlist(proposals, date)` — pure: curated themes first, approved
  community proposals appended, picked by day.
- `getTonightsShortlist()` — async wrapper; approved proposals read from Supabase
  via anon client inside `unstable_cache` (revalidate 3600), degrading to
  curated-only on error or missing env (covers live DB before schema re-run).

### 3. Home integration
`page.tsx` became a thin server component: resolves tonight's theme + hydrates
movie details via new `tmdb.getMovieById(id)` (revalidate 86400, null on
failure/no poster art). The client strip moved to `(site)/home-client.tsx`
unchanged behavior-wise; header now shows kicker "Tonight's shortlist · rotates
daily", gold Bebas theme title, and the blurb. Posters remain tap-to-add
tray candidates with ✓ state. Strip hides itself if all detail fetches fail.

### 4. Community proposals
- **Schema** (`supabase/schema.sql` appended): `shortlist_proposals`
  (id text pk, proposer_id → auth.users, title, blurb, movie_ids jsonb, status
  check pending/approved/rejected, created_at). RLS: insert own, select own,
  public select of approved. New table — safe on existing DBs, but **must be
  re-run on the live DB** before proposals work.
- **POST `/api/proposals`**: auth required; validation in shared
  `src/lib/proposals-api.ts` (`parseProposal`: title ≤80 trimmed non-empty,
  blurb ≤200 optional, movieIds deduped ints, final length 6–8); nanoid id;
  stores `pending`.
- **Entry point** (chose `/u/me` list card — SaveGateSheet navigates away on
  success, so it has no lingering success state): done lists with ≥6 movies get
  a gold "Propose theme" button opening an inline form prefilled with the list
  title (top 8 movie ids submitted). `/u/me` now selects `tmdb_id`.
- **Admin**: GET/PATCH `/api/admin/proposals` gated by `isOwnerEmail`
  (case/space-insensitive compare to `OWNER_EMAIL`; unset = 404 silence).
  PATCH whitelists status to approved|rejected. Minimal unlinked `/admin`
  page lists pending proposals with Approve/Reject.

## Verification
- `npm test`: 117 passed (13 files) incl. new rotation-determinism,
  proposal-validation, owner-gate suites.
- `npx tsc --noEmit`: clean. `npx eslint src`: clean. `npm run build`: passes.

## Known limits (deliberate)
- Approved-proposal cache refreshes hourly (`unstable_cache`), so an approval
  may take up to ~1h to reach tonight's pool.
- Theme ids are knowledge-curated; if any poster looks wrong on prod, fix the id
  in `shortlist-themes.ts` (single-line change, cached a day).
