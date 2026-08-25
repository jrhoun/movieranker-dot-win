# Handles: storage, claim flow, availability API — report

Branch `master`. Scope: profiles table + handle helpers (commit 1), claim flow + APIs + UI migration (commit 2). Public `/u/[handle]` page deliberately NOT built (next task).

## What shipped

### Database
- `supabase/schema.sql`: canonical `profiles` block — `id uuid pk -> auth.users(id) on delete cascade`, unique `handle`, `visibility in ('private','public')` default private, RLS with "read any" select policy and "write own" all policy (`auth.uid() = id`). Migration comment notes it's a new table, safe on existing DBs.
- `supabase/upgrade-1.sql`: section "4. Profile handles", same statements with `create table if not exists`.

### Handle rules (`src/lib/handles.ts`)
Pure helpers: `normalizeHandle` (lowercase+trim), `isValidHandle` (`/^[a-z0-9_-]{3,20}$/`), `isReserved` (17-name RESERVED set), plus `checkHandle` composing them into `{ok, handle}|{ok:false, reason:"invalid"|"reserved"}` for the two routes.

### API (all auth-gated, POST/PATCH rate-limited via `LIMITS.profile` = 10/min)
- `GET /api/profile` → `{handle: string|null, visibility}` (no row → null/private default); 401 unauthenticated.
- `POST /api/profile {handle}` → normalizes/validates (400 invalid/reserved), upserts keyed on `id` with `onConflict:"id"` so existing visibility is never touched; unique violation `23505` → 409 "that handle is taken"; happy path 201.
- `PATCH /api/profile {visibility}` → update-only via `.update().eq("id").select("id").maybeSingle()`; empty result → 409 `{error:"claim a handle first"}` (no temp-handle row creation, per spec).
- `GET /api/profile/availability?handle=` → `{available:boolean, reason?}`; reason ∈ invalid/reserved/taken.

### UI migration
- `/u/me` server component now reads `profiles.handle,visibility` instead of `user_metadata.profile_visibility` (grep confirms zero remaining references to the old key).
- New `ClaimHandleCard` client component above stats when unclaimed: Bebas gold "CLAIM YOUR HANDLE" header, input with 300ms-debounced live availability check, rules hint, per-state messages (available/reserved/taken/unreachable), gold Claim button → POST → `router.refresh()`.
- `ProfileVisibilityToggle` now PATCHes `/api/profile`; disabled-with-message until handle claimed; 409 renders "Claim a handle first." as an alert.
- SiteHeader untouched (spec item 5: keep "My lists" as-is this task).

## Verification
- `npm test`: 171 passed / 20 files (new: handles.test.ts, api/profile/route.test.ts covering 401/400-reserved+invalid/409-taken/happy-upsert/PATCH-no-row, availability route tests).
- `npx tsc --noEmit`: clean. `npm run lint`: clean. `next build`: passes; both routes registered.

## Concerns / deferred
- Availability endpoint is auth-gated; if a public signup form ever needs it, drop the 401 gate.
- Rate limiter remains in-memory per instance (existing documented ceiling).
- No data migration of old `user_metadata.profile_visibility` values: anyone who had set public there must flip the toggle again after claiming a handle. Accepted because visibility was inert until now (no profile page existed to expose).

## Review (stage 1)
Spec ✅ / Approved. Deferred minors: Claim button uses --accent not literal gold (DESIGN.md-consistent); "coming with handles" toggle copy goes stale when handles ship — Stage 2 to fix; truncated third minor in reviewer output accepted as cosmetic.

## Stage 2 — public profile pages

### Built
- `/u/[handle]` server component (`src/app/(site)/u/[handle]/page.tsx`): handle normalized lowercase before lookup; missing row OR `visibility!=='public'` → styled `not-found.tsx` ("This profile is private or doesn't exist."). Public view: Bebas `@<handle>` marquee + ✦ rule, joined month/year (UTC), stats band (movies ranked, public list count, rank title) all derived ONLY from `visibility='public'` + `status='done'` lists; card grid links `/l/<id>` with poster triptych (MoviePoster + surface fillers); empty state "No public rankings yet." Unlisted lists are link-accessible but excluded from the profile per spec. Unlockables stay on /u/me.
- Pure shaping in `src/lib/public-profile.ts` (`shapePublicProfile`): filters to public+done again inside the helper as defense-in-depth at the trust boundary, sums movies, derives level via existing `levelFor`. Tests in `src/lib/public-profile.test.ts` cover unlisted/draft/private exclusion from both cards and counts, XP/level math, UTC date shaping, empty input.

### Wiring
- `/u/me`: "View public profile →" link under the toggle when claimed; enabled → `/u/<handle>`, disabled span with title "Set your profile to public first" while private. Toggle now calls `router.refresh()` after a successful PATCH so the link state follows live visibility changes without a reload.
- `SiteHeader`: signed-in users with a claimed handle get "My profile" → `/u/<handle>` alongside "My lists"; no handle → header unchanged. One extra `profiles.select(handle)` query for signed-in users only.
- Stale stage-1 copy fixed: toggle heading now "Public profile", helper reads "Your profile lives at movieranker.win/u/<handle> — set to Public to make it visible." (handle interpolated when known); radio tooltip present tense.

### Verification
- `npm test`: 175 passed / 21 files (new: public-profile.test.ts).
- `npx tsc --noEmit`: clean. `npx eslint src`: clean. `next build`: passes; `/u/[handle]` registered.

### Commits
- `81fed87` feat: public profile pages
- `b91462f` design: header + toggle wiring

### Concerns / deferred
- Profile lookup is exact-match on the normalized (lowercase) handle; URLs like `/u/CinePhile_99` work because the page normalizes params before querying.
- Public-profile card grid is a small inline server component rather than reusing owner `ListCard` (which carries delete/visibility controls); if a third consumer appears, extract a shared read-only card.
- Header gains one profiles query per request for signed-in users — negligible now; revisit if header perf ever shows up in metrics.

### Fix round (public profile)
- `/u/[handle]` list_movies join now ordered (`final_rank` asc nulls-last, `elo` desc, mirroring `/u/me`) so showcase cards show top-ranked movies instead of PostgREST's unspecified join order.
- Misleading comments reworded: page comment now states profiles RLS is read-any and the gate is the JS `notFound()` check; `public-profile.ts` ponytail comment now states the query does NOT scope to public+done and the JS filter IS the guarantee.
- `decodeURIComponent(raw)` wrapped in try/catch (App Router params arrive percent-encoded, so the decode is kept): malformed input like `/u/%zz` falls back to the raw string → lookup miss → styled 404 instead of a 500.
- Verified: npm test 175 passed / 21 files; tsc clean; eslint clean; next build passes.

### Derivable achievements round (v1 final stretch)
- `src/lib/gamification.ts`: added `ACHIEVEMENTS` catalog (`first_premiere` / `marathoner` / `centurion`) with typed `AchievementStats` input and `evaluateAchievements(stats)` — pure derivation from existing list data (done-list count + ranked-movie total); no awards table, no event hooks. Matches the LEVELS/UNLOCKS catalog pattern.
- `/u/me`: "Achievements" strip appended inside the stats section below the unlockables teaser (kept as-is). Three badge cards: gold ring + ✓ when unlocked, dimmed with description hint when locked. Stats feed: `doneLists = cards.filter(status==="done").length`, `moviesRanked = progress.current`.
- `/u/[handle]`: unlocked achievements only, as small gold-ringed pill badges under the stats row. `doneLists = cards.length` — safe because `shapePublicProfile` already filters to `status=done && visibility=public`, so private/unlisted lists never leak into counts.
- Tests: boundary cases in `gamification.test.ts` — exactly-at-threshold unlocks (1 done list, 10 done lists, 100 movies), one-below stays locked, empty stats all locked, all-unlocked past thresholds.

### Verification
- `npm test`: 179 passed / 21 files. `npx tsc --noEmit`: clean. `npm run lint`: clean. `next build`: passes.

### Commit
- `6720b1e` feat: derivable achievements on profiles

### Concerns / deferred
- Achievements are monotonic by construction (counts only grow), so pure derivation is lossless; any future achievement needing history (e.g. Contrarian, Time Capsule) will need real persistence — do not extend this pattern to those.
- Public profile counts derive from public done lists only, so a user's badge can differ between /u/me and their public page if they keep private/unlisted done lists — intended privacy scoping.

## Hardening round: permanent, abuse-resistant claims

### Vulgarity filter (`src/lib/handles.ts`)
- `PROFANITY_BLOCKLIST`: ~24 obvious English vulgar terms. Checked via substring matching after leetspeak folding (`0->o, 1->i, 3->e, 4->a, 5->s, 7->t, @->a, $->s`) so `sh1t`, `b17ch`, `a$$hole`, `@sshole` all reject.
- `isProfane(handle) -> boolean`; wired into `checkHandle` BEFORE the shape regex so symbol-leet spellings report reason `"profane"` (accurate rejection) instead of generic `"invalid"`. New `HandleCheck` reason value; POST /api/profile maps it to "handle contains inappropriate language"; availability endpoint passes it through; claim UI shows it live as the user types. Tests cover plain terms, clean handles, leetspeak variants, and vulgar substrings inside longer handles.
- ponytail ceiling noted in source: blocklist catches obvious cases only; user reports + admin review cover the rest.

### Two-step confirmed claim (`ClaimHandleCard.tsx`)
- When the availability check passes, an inline confirmation panel replaces the hint area: "⚠ Handles are permanent and cannot be changed." / "Claiming u/<handle> locks it to your account forever." + [Confirm: Claim u/<handle>] (gold primary) + [Go back] (quiet). Only Confirm fires the POST; "Go back" hides the panel until the handle is edited (re-showable via a quiet "Claim u/<handle>" link).
- Success replaces the ENTIRE card with static Bebas-gold "@<handle> · claimed" — no edit affordance anywhere (local mirror state covers the window before `router.refresh()` swaps in the server-rendered chip).
- New explicit 429 feedback: "Too many claim attempts — try again in an hour."

### Claimed display (/u/me)
- Users who already claimed see a static "@<handle> · claimed" chip under the stats header (Bebas gold), no edit link, plus one-line muted note "Handles are permanent." to set expectations.

### Retry spacing (`src/lib/rate-limit.ts`, POST /api/profile)
- New `LIMITS.claimHandle` entry: 5/hour per user on its own key (`claimHandle:<userId>`); PATCH visibility keeps the existing 10/min `profile` limit.
- Attempt-based by construction: the limiter runs BEFORE body parse/validation, so failed AND successful claims burn budget — brute-force enumeration of handle variants is expensive. Route test proves 5 failing attempts then a 429 with Retry-After.
- qa-checklist.md item 48 updated with the new constants and rationale.

### FUTURE HOOK: handle changes = paid microtransaction (payment provider TBD)
Handles are deliberately locked after first claim. Changing a handle should become a **microtransaction** (small one-off charge, e.g. rename token) once payments exist — provider not chosen yet (Stripe/Lemon Squeezy/etc.). The permanence lock makes this a clean upsell moment: the confirmation screen is exactly where a future "change your handle for $X" affordance slots in, and users have already been told the choice is forever. Until then there is intentionally NO handle-change path anywhere (UI, API, or DB). When building it: reuse `checkHandle` + `LIMITS.claimHandle`, add a payment webhook before the upsert, and never allow reclaiming a released handle within a cooldown window to prevent handle-squatting flips.

### Verification
- `npm test`: 185 passed / 21 files (new: isProfane/checkHandle profanity cases incl. leetspeak + substrings; limiter attempt-counting test). `npx tsc --noEmit`: clean. `npx eslint src`: clean (one fix: setState-in-effect replaced with setState-during-render adjustment pattern). `next build`: passes.

### Commits
- `<commit-1>` feat: vulgarity filter for handles
- `<commit-2>` feat: permanent handle claim flow

## PROFILE SHOWCASE CURATION (v1)

Steam-style "pick what to feature": users pin up to 3 unlocked achievements and one featured public done ranking; the public profile renders both with gold treatment above auto-derived content. No curation -> current behavior unchanged.

### Storage (`supabase/schema.sql` + `upgrade-1.sql` §5)
- `profiles.showcase jsonb NOT NULL DEFAULT '{}'`, shape `{ achievementKeys: string[] (max 3, catalog keys), favoriteListId: text|null }`. Shape validated app-side (jsonb keeps the DB dumb); canonical block updated + append-only section for existing DBs.

### API (PATCH /api/profile)
- Accepts optional `showcase` partial alongside `visibility`; server merges against the stored row so a partial patch never clobbers the other field (`mergeShowcase` in `src/lib/public-profile.ts`). 400 on: non-object payload, invalid/duplicate/non-catalog keys, >3 keys, wrong favoriteListId types.
- Trust boundary: favoriteListId must resolve to an OWNED list with `status='done' AND visibility='public'` — checked in SQL before persisting, else 400 "featured ranking must be one of your public finished lists". Existing rate-limit entry (`profile`, 10/min) covers showcase PATCHes.

### Owner UI (/u/me)
- New `ShowcaseCard` (client) replaces the static achievements chip list: unlocked chips are toggle buttons (`aria-pressed`) pinning max 3; locked ones dimmed/disabled with explanatory titles; optimistic PATCH with revert + inline error on failure.
- New `ShowcaseLists` (client wrapper) owns the single-favorite rule across rows: starring a new ListRow unstars the old, optimistic with revert. ListRow gained an optional ★ button — enabled only when the row is done+public (mirrors the server preconditions), disabled-with-title otherwise (drafts/unlisted).

### Public render (/u/[handle])
- Pinned achievements sort FIRST and get distinct treatment (larger chip, ring-2 ring-gold, soft glow, ★ prefix); auto-derived ones keep the existing style after them.
- favoriteListId renders as a full-width "✦ Featured ranking" card pinned above the grid: ring-2 gold, spotlight shadow, marquee tag + thin gold rule. Pulled OUT of the regular grid to avoid duplication.
- Privacy by construction: shapePublicProfile filters to public done lists before the featured lookup, so a list that later goes private/unlisted silently drops out (no special casing needed).

### Verification
- `npm test`: 195 passed / 21 files (new: merge/parse validation incl. max-3, invalid+duplicate keys, type errors; route tests incl. >3 rejection, non-owned list id 400, merge-persistence happy path, claim-first 409). `npx tsc --noEmit`: clean. `npx eslint src`: clean. `next build`: passes. Test mock upgraded to per-table rows + write/read resolution so the showcase pre-read doesn't collide with update results.
- Traffic hygiene: no live calls made; no .env.local reads. DB change NOT applied anywhere yet — run upgrade-1.sql §5 manually.

### Commits
- `77622d2` feat: profile showcase storage + api
- `3b5338c` design: showcase curation ui

---

# Real Participants (#5) — participant attributions via invite links

**Date:** 2026-08-24 · **Status:** built on master · **Commits:** `f3fb946`, `c3f1afe`

## Database
- New `participant_attributions` (schema.sql canonical block + upgrade-1.sql §6): `list_id` FK cascade, `display_name`, `user_id` FK cascade, `unique (list_id, user_id)`.
- RLS mirrors the lists read policy: INSERT requires `auth.uid() = user_id` AND the list is owner-readable OR done+unlisted/public (link-readable); SELECT uses the same list-readability EXISTS; DELETE own rows only. No ALTERs — brand-new table.
- **Live DBs need a manual re-run: execute upgrade-1.sql §6** in the Supabase SQL editor.

## API (/api/lists/[id]/participants/claim)
- GET → `{ claimed, displayName? }` for the signed-in caller (RLS-scoped).
- POST `{ displayName }`: 401 unauth; 404 when the list isn't RLS-readable; 400 on non-string/blank/>40-char names; case-insensitive match binds to the existing participant spelling, no match APPENDS to `lists.participants`; unique violation → 409 `{ error: "already participating" }`. Insert happens BEFORE the participants append so an already-claimed user never mutates the array. Rate-limited (`claimParticipant`, 10/min/user).
- DELETE removes only the caller's own attribution row; the name stays on the list.

## Room wiring (/r/play?id=…)
- Signed-in viewer on a resumed draft gets a "Join as participant" banner (probe effect: profile handle prefill + GET claimed check). POST success shows their chip immediately with a gold person marker; errors surface inline. Anonymous/local sessions untouched.

## Rendering
- Shared `chipParticipants()` (src/lib/participants.ts) + `<ParticipantChips>` component: attributed names get a subtle person icon; links to `/u/<handle>` only for `visibility='public'` profiles (server-side lookup at render).
- /l/[id] "Ranked by" line now renders chips; /u/me ListRows and /u/[handle] cards gained a compact "With …" participant line with the same markers/links.

## Export
- `/api/account/export` embeds `participant_attributions(*)` alongside `list_movies`.

## Verification
- `npm test`: 205 passed / 22 files (new claim-route tests: happy match w/o append, mismatch append, 409 already-participating + no append on violation, 401, 404, 400 name validation, DELETE scoping, GET claimed/unclaimed; export test asserts attributions ride along). `tsc --noEmit` clean, `eslint` clean, `next build` passes (route listed as ƒ dynamic).
- Traffic hygiene: no live calls beyond local builds/tests; .env.local untouched.

## Concerns / follow-ups
- Attribution display names aren't kept in sync if the owner later edits/removes a participant chip (name edit leaves the old display_name binding until re-claim).
- The room banner appears even mid-ranking of someone else's draft by design (link-shared); no notification exists yet — joining is purely self-serve.
