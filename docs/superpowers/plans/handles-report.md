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
