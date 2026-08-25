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
