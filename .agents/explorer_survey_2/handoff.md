# Handoff Report — Explorer 2 (Phase 0 Survey: R2 Finale, Premiere Pass & Versus)

## 1. Observation
1. **Convergence / Stability Engine**:
   - `src/lib/ranking.ts:13-18`, `124-204`: `stabilityVotesN(activeCount)` calculates size-scaled quiet streak requirements. `isStable()` requires (a) active movies $\ge 2$, (b) consecutive quiet votes $\ge \text{stabilityVotesN}$, (c) prior field differentiation (`significantOrderChangedAtLeastOnce`), and (d) every active movie has $\ge \text{STABILITY\_MIN\_COMPARISONS} (3)$ comparisons.
   - `src/app/r/play/play-room.tsx:859-917`: When `stable && !sharpening`, the room displays `<Podium movies={active} />` inside a `<section className="relative overflow-hidden bg-curtain ...">` with `<div aria-hidden="true" className="spotlight-glow ...">`.
   - `src/app/globals.css:257-261`: `.animate-celebrate` is a basic 200ms scale-in (`scale(0.94) -> scale(1)`). No particle confetti or dynamic theater spotlight exists in the codebase.
2. **Current Sharing & List Views**:
   - `src/components/ShareButton.tsx:1-161`: Provides "Copy link" (`navigator.clipboard.writeText(url)`), mailto, Threads, Bluesky, and `navigator.share`. No image, canvas, or graphic export exists.
   - `src/app/(site)/l/[id]/page.tsx:1-385`: Renders list header, `ListViews` (`StackedView` and `RowsView`), `MarqueeConnectionGame`, and `CommunityStatsGrid`.
3. **Head-to-Head Comparison (`/compare/[a]/[b]`)**:
   - `src/app/(site)/compare/page.tsx:1-37` and `compare-client.tsx:1-136`: Entry hub allowing users to paste two links or select from their own finished lists.
   - `src/app/(site)/compare/[a]/[b]/page.tsx:1-302`: Fetches both lists and `list_movies` from Supabase, checks `canCompare`, and invokes `computeVersus()`.
   - `src/lib/versus.ts:96-121`: `computeVersus()` calculates concordance percentage:
     ```ts
     for (let i = 0; i < shared.length; i++) {
       for (let j = i + 1; j < shared.length; j++) {
         pairs++;
         if ((shared[i].rankA - shared[j].rankA) * (shared[i].rankB - shared[j].rankB) > 0)
           agrees++;
       }
     }
     ```
     `agreementPct = pairs === 0 ? null : Math.round((agrees / pairs) * 100)`.
     `biggestArguments = [...shared].sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta)).slice(0, 5)`.
4. **Existing Test Suite**:
   - Running `npm test` executes Vitest v4.1.11, passing 27 test files and 298 tests in ~574ms.

---

## 2. Logic Chain
1. From Observation 1, stability detection is robust, performant, and empirically verified, but the transition to consensus lacks the theatrical "Curtain Call" climax (confetti particle burst, dynamic spotlight sweep) specified in requirement R2.
2. From Observation 2, `ShareButton` currently only operates on textual URLs. Generating a perforated vintage cinema ticket ("Premiere Pass / Golden Ticket") requires:
   - A React preview component (`PremierePassCard.tsx`) for crisp on-screen rendering.
   - A pure HTML5 Canvas drawing module (`src/lib/ticket-canvas.ts`) capable of rasterizing the ticket into a high-DPI PNG blob.
   - Integration with `navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])` for 1-click clipboard copy and `URL.createObjectURL` for direct download.
3. From Observation 3, the comparison pipeline (`/compare`, `/compare/[a]`, `/compare/[a]/[b]`, `src/lib/versus.ts`) already computes Kendall-tau concordance and identifies rank differences. To satisfy R2's comparison enhancements:
   - Visual callouts for the sharpest rank disagreements should highlight the #1 biggest collision (largest $|\Delta|$) with rich before/after rank contexts.
   - Shared common ground (mutual high rankings) should be prominently highlighted alongside disagreements.

---

## 3. Caveats
1. **Clipboard API Support**: While `navigator.clipboard.write` with `ClipboardItem` is widely supported on modern browsers over HTTPS/localhost, older browsers or non-secure contexts may reject image blobs; a graceful fallback to PNG download is essential.
2. **TMDB Poster CORS**: In HTML5 Canvas, drawing external images requires `crossOrigin = "anonymous"`. TMDB CDN sets `Access-Control-Allow-Origin: *`, but network interruptions or ad blockers may prevent image loading. The canvas exporter must provide an instant typographic fallback so ticket generation never throws an unhandled error.
3. **Reduced Motion**: All new celebratory animations (confetti, spotlight sweep) must strictly check and respect `prefers-reduced-motion: reduce`.

---

## 4. Conclusion
The codebase is ready for implementing Requirement R2 without structural rewrites or database migrations:
1. **Finale ("Curtain Call")**: Add a lightweight golden confetti cannon and spotlight animation trigger inside `play-room.tsx` upon consensus.
2. **Premiere Pass**: Implement a pure HTML5 2D canvas generator (`src/lib/ticket-canvas.ts`) and React preview card with 1-click PNG clipboard copy and download capabilities.
3. **Versus Comparison**: Enhance `/compare/[a]/[b]` with dedicated "Biggest Collision" callouts and mutual common ground highlights.

---

## 5. Verification Method
- **Run Unit Tests**: `npm test` to verify that all 298 existing tests pass.
- **Inspect Key Files**:
  - `src/lib/ranking.ts` (lines 124-204)
  - `src/app/r/play/play-room.tsx` (lines 859-917)
  - `src/components/ShareButton.tsx` (lines 1-161)
  - `src/lib/versus.ts` (lines 1-122)
  - `src/app/(site)/compare/[a]/[b]/page.tsx` (lines 1-302)
- **Detailed Survey Report**: Refer to `/home/jrhoun/projects/movieranker-dot-win/.agents/explorer_survey_2/survey_report.md`.
