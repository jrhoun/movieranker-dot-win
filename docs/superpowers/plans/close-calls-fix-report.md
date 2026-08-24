# Close-Calls Progress Fix — Report

Branch: `feat/v1` · Commit: see git log · Message: `fix: honest close-call progress display`

## Finding 1: staleness bug — NONE

Traced every path feeding the count:

- `remainingVotes = estimateRemainingVotes(active)` (`src/app/r/play/play-room.tsx`) is
  recomputed on **every render** — it is plain body code, not memoized state.
- `active` is a `useMemo` keyed on `[session]`, and `session` is replaced wholesale by
  `setSession(next)` in `handleVote` on every vote, so the memo invalidates each vote.
- No component or module stores the count into state anywhere (grep for
  `estimateRemainingVotes` / `useMemo` / `useState<` confirms the only memo is `active`).

Conclusion: the "18 close calls left" number was updating correctly; it just barely moves
because one vote shifts an elo gap ~16–32 points against a 120-point comfort band. The bug
was semantic, not stale.

## Finding 2: honest resolved-vs-initial progress — FIXED

Changes:

1. `src/lib/ranking.ts`
   - Extracted `countClosePairs(order)` — raw adjacent-pairs-within-comfort-band count,
     no vote-estimate floor. `estimateRemainingVotes` now derives from it (identical math).
   - Added pure `closeCallProgress(current, initial)`:
     - `current > 0` → `"N of M matchups still too close to call"`
     - `current <= 0` → `"No close calls left — ready to finish."`
2. `src/app/r/play/play-room.tsx`
   - `initialClosePairs` captured once via render-phase state init the first time the room
     is stable (covers both the stable screen and the sharpen/vote view afterwards).
   - Vote-view status line shows the fraction once a baseline exists (pre-stability keeps
     the old `~N close calls left` estimate).
   - Stable screen paragraph now reads `<fraction> — Sharpen settles them one at a time.`,
     with the existing Finish-now button and zero-state message unchanged.
   - A vote that nets zero resolutions simply holds the fraction steady — no fake motion.

## Verification

- `npm test`: 9 files, 83 tests passed (new tests for `countClosePairs` incl. all-equal
  19-movie field → 18 pairs, and `closeCallProgress` fraction + zero cases).
- `npx tsc --noEmit`: clean.
- `npx eslint src`: clean (initial ref-during-render approach rejected by
  `react-hooks/refs`; replaced with the React-endorsed render-phase state adjustment).
- `npm run build`: passes.
- Dark-cinema tokens, motion budget, ≥44px targets untouched. No live API calls;
  `.env.local` never read.
