# Task 10 Report — Public list page `/l/[id]`

Commit: `705a90a` — `feat: public list page with stacked and rows views`
Branch: task worktree branch (merges back after review)

## What was built

| File | Purpose |
|---|---|
| `src/app/l/[id]/page.tsx` | Server component. Fetches list header + movies (`order final_rank asc, nulls last`). Owner detection via `supabase.auth.getUser()` vs `owner_id`. Drafts visible to owner only; everything else 404s. |
| `src/app/l/[id]/not-found.tsx` | Styled 404: gold "404", "This list doesn't exist (yet).", CTA link to `/`. Proper HTTP 404 status via Next's native `notFound()`. |
| `src/lib/list-view.ts` | Pure logic: `withRanks`, `splitPodium`, `podiumDisplayOrder`, row types. |
| `src/lib/list-view.test.ts` | 9 vitest cases covering rank fallback, podium/rest split (full/short/empty), display ordering. |
| `src/components/list/MoviePoster.tsx` | Shared poster: always `aspect-[2/3] object-cover`, title fallback when no art, lazy img. |
| `src/components/list/StackedView.tsx` | Podium top-3 (winner center + largest, `2nd · 1st · 3rd` order, gold mono numeral overlays, larger for #1) then numbered poster grid below. |
| `src/components/list/RowsView.tsx` | Rank numeral, small poster, title + year, muted comparisons line. |
| `src/components/list/ViewToggle.tsx` | Segmented control, `role="tablist"`, `aria-selected`, min-h-11 targets, focus-visible ring. |
| `src/components/list/ListViews.tsx` | Client wrapper: view state, `localStorage("mr-view")` persistence (read in async hop so SSR markup matches hydration), 200ms opacity crossfade with hidden view absolutely positioned so layout height follows the active view. |
| `src/components/ShareButton.tsx` | `navigator.share` first (AbortError = silent cancel), clipboard fallback with fixed-position toast (`role="status"`), error toast if clipboard denied. Timer cleanup on unmount. |
| `src/components/list/OwnerControls.tsx` | Owner-only section: inline edit of title/participants via PATCH `/api/lists/[id]` (cancel restores originals), delete with `window.confirm` then DELETE + redirect to `/u/me`. Busy states disable controls; failures surface a note. |

## Verification

- `npm test`: 51 passed (6 files), incl. new `list-view.test.ts`.
- `tsc --noEmit`: clean.
- `npm run build`: clean; `/l/[id]` listed as dynamic route.
- `npx eslint src`: clean.

## Design-rule compliance

- Posters always `aspect-[2/3] object-cover` in both views.
- All motion 150–250ms ease-out (`transition-opacity duration-200`, existing keyframe classes); repo-wide `prefers-reduced-motion` guard in globals.css zeroes them.
- Interactive targets min-h-11 (44px); `focus-visible:outline-accent` rings on all buttons/inputs.
- Full aria/state coverage on interactives: tablist semantics, aria-selected, sr-only real ranks (numerals decorative), role="status" toasts, disabled/busy states.
- No live network calls at build/test time; no .env access; no identity strings echoed (commit used flags from git-identity.txt silently).

## Deviations / concerns

1. **Comparisons line**: brief said "comparisons won" but schema only stores total `comparisons` (matchups played), not wins. Row shows "N head-to-heads" honestly; wins would need an elo-derived or new column later.
2. **Brief's temp `/dev` fixture route skipped**: pure logic is unit-tested instead and the views are plain props-in components; committing a throwaway route would just add deletion work. Trivial to add if visual fixtures are wanted later.
3. **Manual QA (logged-out view, mobile, 30-item scroll)** not performed — no live DB/network in this environment. Build + types + tests cover wiring; recommend one manual pass post-merge.
4. Extra file beyond the brief's list: `ListViews.tsx` (client shell needed because the page is a server component) and `MoviePoster.tsx` (shared poster frame).
