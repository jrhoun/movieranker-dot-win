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

## Follow-up: hero fan reuses tonight's shortlist data (6855516)

The home hero's fanned posters now render the same server-resolved shortlist
movies as the strip (single `getTonightsShortlist()` + `getMovieById` pass in
`page.tsx`; no extra TMDB calls). Hero caption reads "TONIGHT'S THEME · <title>"
while the strip keeps its own header. If the fetch fails or returns no movies,
the hero falls back to the curated set in `hero-posters.ts` and the caption
hides. Verified: 117/117 tests, tsc/eslint clean, build passes.

## Curated Lock Mode (stage A) — 2026-08-24

Commits: `37f571e` feat: curated list schema + session fields; `92eeb07` feat: rank-this-list CTA + locked room mode.

- **Schema** (`schema.sql` bottom block + `upgrade-1.sql` §7): `ALTER TABLE lists ADD COLUMN IF NOT EXISTS theme_slug text;` and `curated boolean NOT NULL DEFAULT false`. Live DBs only need the two ALTERs — no `save_list` RPC re-run required.
- **Session**: `PlaySession` gains optional `themeSlug?: string | null` and `curated?: boolean`; existing flows untouched (undefined ≡ false).
- **CTA**: "Rank this list 🔒" gold button under the strip header in `home-client.tsx`. Seeds a session with EXACTLY the theme movies, titled by the theme, stamped `{themeSlug, curated: true}`. Honors the existing unfinished-session resume confirm ("Start fresh" seeds the theme when that was the entry point). Hero fan tap-to-add behavior unchanged. `page.tsx` now passes `themeSlug` through `TonightStrip`.
- **Room**: gold "🔒 Tonight's Shortlist" chip under the title when `session.themeSlug` is set; quiet "Unlock" control opens an inline confirm card ("Keep it locked" / "Unlock anyway"). Unlock sets `curated: false`, keeps `themeSlug` persisted for stage-B community stats, no re-lock. Verified the room exposes no add-movie affordances (no SearchPanel; ParkedStrip only parks) — lock is semantic + visible state.
- **Save/persist**: SaveGateSheet POST carries `themeSlug`/`curated` only when set. Route validation via new `parseThemeMeta` (`src/lib/lists-api.ts`): slug-safe ≤80 chars or null; `curated` non-boolean → 400; `curated` without `themeSlug` → 400. Persisted as a follow-up owner update after `save_list` (same pattern as visibility — avoids RPC signature change). Export JSON includes both fields automatically via `select("*,...")`.
- Verified: 231/231 tests green (session round-trip with new fields; route 400 cases incl. curated-without-slug), tsc clean, eslint clean, build passes.

Deferred to stage B: surfacing curated lists in theme community stats (data is already persisted), PATCH-path unlock propagation for resumed drafts.

## Stage B — Community Verdict stats + dual-path framing — 2026-08-24

Commits: `feat: community verdict stats`; `design: tray density pass`.

### Feature 1 — Community Verdict on themed list pages (`/l/[id]`)
- **Pure helpers** (`src/lib/theme-stats.ts`, tests in `theme-stats.test.ts`): `computeThemeStats(rooms)` derives everything app-side from one fetch of rooms + their movies. Per movie: `% ranked #1`, `% haven't seen` (parked-at-finish approximation via current parked flag), elo population stddev across rooms. Picks: most divisive (max stddev), undisputed champion (#1 in 100% of rooms AND present in >=2 rooms; deterministic tie-break by appearances then tmdbId, null on tie).
- **Deviation from spec**: per-movie denominators are presence-based (rooms containing the movie), not global room count — identical for locked rosters, honest for unlocked ones. Champion additionally requires >=2 appearances so a single-room movie can't win.
- **Page wiring** (`l/[id]/page.tsx`): when viewed done list has `theme_slug`, one query pulls all done lists sharing the slug with nested `list_movies(...)`; RLS keeps private rooms out. Renders: >=2 rooms → marquee-headed "Community Verdict" section (champion banner ring-gold/40, per-movie surface cards with gold #1 bars + dim-gold haven't-seen bars, mono percentages, "Most divisive" tag); exactly 1 room → quiet italic "First ranking of tonight's list — the verdict awaits more rooms."; 0 rooms → nothing. Static bar widths (no motion to kill under reduced-motion).
- **Tests**: 7 unit cases (percentage math incl. presence denominators + parked-with-rank-1, divisiveness ordering + null stddev below 2 rooms, champion detection incl. tie/no-champion/single-room, empty input).

### Dual-path framing (user-directed add-on, home shortlist section)
- Two anchor mini-cards lead into Tonight's Shortlist in `home-client.tsx`: "1 · Rank tonight's theme" (gold Bebas header, copy names tonight's title) → anchors `#rank-tonight` CTA; "2 · Or rank your own list" → anchors `#start` search panel. Pure `<a>` anchors — no new flow, doesn't compete with hero CTA. Stacks vertically under sm; hover/focus ring-gold.

### Feature 2 — Tray density pass (`CandidateTray.tsx`)
- Title input moved out of the expanded sheet into the always-visible bottom strip, capped at `max-w-56`, placeholder shortened to "List title…" (no more full-width sprawl). Participants condensed to input `w-full max-w-44 min-w-0` + "+ Add" pill in one form row.
- Two-zone strip: zone 1 = title + participants stacked under lg / inline at lg+; zone 2 = Start ranking CTA pinned right (`ml-auto`). At 390px everything wraps inside its column, no horizontal overflow.
- Helper line + removable participant chips now live in a wrap row under the strip (chips min-h tightened 11→9); expanded sheet keeps poster grid + clear-all with tightened paddings/gaps (pt-4→pt-3, mt-4→mt-3, gap-3→gap-2).
- Behavior preserved: Enter-to-add, chip removal, helper line, disabled Start tooltip, thumbnails scroll row untouched.

Verified: 238/238 tests green (incl. 7 new theme-stats cases), tsc clean, eslint clean, build passes. No network calls beyond localhost build/dev sanity; .env.local never read.

Deferred: PATCH-path unlock propagation (carried from stage A); verdict section shows parked-state approximation until finish-time snapshot exists.
