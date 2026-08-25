# Profile Era v0 — Implementation Report

Branch `master`. Commits:

- `a09082b` feat: gamification scaffold (levels/unlocks)
- `6ab14a4` feat: list + profile visibility controls
- `24befe2` design: profile stats header

## What shipped

### 1. Gamification scaffold (`src/lib/gamification.ts`, pure, unit-tested)
- `LEVELS`: Usher 0 → Film Buff 25 → Critic 75 → Projectionist 200 → Commissioner 500.
- `UNLOCKS`: Gold rank numerals (list-style, Lv2), Curtain avatar frame (avatar-frame, Lv3), Velvet profile theme (profile-theme, Lv4), Marquee title flair (title-flair, Lv5).
- `levelFor(xp)`, `xpProgress(xp) -> {level,title,current,next,progress01}`, `unlockedAt(level) -> {unlocked, locked}`.
- XP derivation: `totalMoviesRanked(lists)` = sum of movie counts across owned lists. Derived from existing data; **no new tracking tables**.

### 2. Visibility
- `supabase/schema.sql`: new column
  `visibility text not null default 'unlisted' check (in ('unlisted','public','private'))`.
- RLS: "anyone reads done lists" / "anyone reads done movies" now require
  `status = 'done' AND visibility in ('unlisted','public')`. Private done lists are owner-only even when finished; the owner sees everything via the existing "owner all" policy.
- POST/PATCH `/api/lists` accept optional `visibility` (enum-validated via `parseVisibility`, default `'unlisted'`). POST sets it with a follow-up owner update after the `save_list` RPC so **live DBs do not need a re-run of the RPC**.
- Profile toggle stored in auth `user_metadata.profile_visibility` (`'public'|'private'`, default `'private'`) via `supabase.auth.updateUser`; control labeled "Public profile page (coming with handles)" in a Visibility section on `/u/me`.

### 3. `/u/me` profile upgrade (Export/Delete section and grid preserved)
- Stats header above the grid: movies ranked (sum across owned lists), lists made, current level title + Bebas gold level numeral + XP progress bar (eased width transition, disabled under `prefers-reduced-motion`).
- Unlockables teaser row: one card per UNLOCKS entry — unlocked cards gold-tinted with ✓, locked cards dimmed showing "Unlocks at \<Level title\>".
- Per-list visibility selector in each ListCard's owner controls (Unlisted/Public/Private segmented control, one-line explanation in each button's `title` attr), persisted via PATCH.

## Deliberately NOT built (per scope)
- `/u/<handle>` public profile pages.
- Badge achievements (First Premiere, Marathoner, etc.).
- Emoji reactions on list entries.

## Deployment reminder
**Live databases must run the migration**: execute item 3 at the bottom of `supabase/upgrade-1.sql` (also mirrored as comments at the bottom of `schema.sql`) in the Supabase SQL editor — the ALTER adding `lists.visibility` plus drop/recreate of the two read policies. Until run, existing DBs keep working (column defaults server-side only after ALTER; API writes to `visibility` will error until then).

## Verification
- `npm test`: 16 files, 144 tests passed (new: gamification catalog/math tests, parseVisibility enum tests).
- `npx tsc --noEmit`: clean. `npm run lint`: clean. `npm run build`: passes.
- DESIGN.md rules held: stats band is a dark-house surface card with gold accents/Bebas display type; no curtain gradient behind dense content; reduced-motion respected.
