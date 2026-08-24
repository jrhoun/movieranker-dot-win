# Dark-House Space & Usability Polish Report

Scope: DESIGN.md "Space & Usability Principles" applied to dark-house surfaces only
(curtain stage moments excluded — home hero, finalizing screen, login untouched).

## Changes

### 1. Home body below hero (`src/app/(site)/page.tsx`, `src/components/SearchPanel.tsx`)
- Removed a duplicated plain-text hero heading (`h1` + subtitle) that sat inside
  `<main>` directly below the curtain hero band. The page now has exactly one
  focal hero (the curtain one) and one `h1` — also fixes the duplicate-heading
  accessibility smell.
- Added `pt-6` to `<main>` so the search composition breathes below the curtain
  band instead of butting against it.
- SearchPanel root section grouped as a surface card
  (`rounded-lg bg-surface ring-1 ring-white/10`), making it the clear primary
  action inside the max-w-5xl container.
- Candidate tray verified: already a docked surface card (border-t + surface +
  blur) with quiet helper lines when empty ("Tap posters above…") — no empty-box
  void; no change needed.

### 2. List view `/l/[id]` (`src/components/list/OwnerControls.tsx`)
- Header block (title / participants / description / ShareButton) already forms
  one coherent group inside max-w container — no structural change.
- Owner controls quieted per "destructive/rare actions quieter": collapsed-state
  Edit/Delete changed from filled raised chips / red-outlined button to muted
  ghost buttons (muted text, hover reveal). 44px targets and focus rings kept;
  editing form unchanged.

### 3. Profile `/u/me` (`src/app/(site)/u/me/page.tsx`)
- Added a supporting metadata line under the h1 when lists exist
  ("N lists · M in progress") so the header doesn't float alone above the grid.
- Grid (gap-4, sm:grid-cols-2) and empty state already matched DESIGN.md
  (focal centered CTA in a surface card) — verified, no change.

### 4. Ranking room `/r/play` non-curtain chrome (`src/components/ParkedStrip.tsx`)
- Your-movies strip (ParkedStrip) docked to match the home CandidateTray
  language: border-top, surface/95 background, backdrop blur, safe-area padding.
  It now reads as one grouped bottom surface instead of floating posters on raw
  bg. Vote pair (MatchupStage) remains the dominant viewport-filling focal
  element; header bar, progress row, exit/nudge banners already grouped surface
  cards — verified, no change.

## Constraints honored
- No new colors, no motion changes, no layout framework rewrites — className /
  small structure edits only. All transitions remain existing 150–200ms ease-out.
- All interactive targets kept ≥44px (`min-h-11`) with focus-visible rings.

## Verification
- npm test: 96/96 passed (10 files)
- tsc --noEmit: clean
- eslint src: clean
- next build: passes

## Concerns
- The removed duplicate hero in `page.tsx` may have been intentional pre-curtain
  residue; visual check on staging recommended.
- ParkedStrip is now visually docked like CandidateTray; confirm the
  "Unsaved" pill (fixed bottom-right) still reads clearly over it.
