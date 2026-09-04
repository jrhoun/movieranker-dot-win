# Phase 0 Survey Report: Finale Celebration, Premiere Pass Graphic & Versus Comparison (R2)

**Explorer**: Explorer 2  
**Date**: 2026-09-02  
**Target Application**: `movieranker.win` (Next.js 16.3.2, React 19.2.8, Tailwind CSS v4, Supabase, Vitest 4.1.11)  
**Scope**: Requirements 2 (R2) — Finale & Celebration ("Curtain Call"), Exportable "Premiere Pass / Golden Ticket" Graphic, and Head-to-Head Comparison (`/compare/[a]/[b]`).

---

## 1. Executive Summary & Architecture Overview

The `movieranker.win` codebase possesses a clean, well-tested architecture with a clear separation between pure ranking mathematics (`src/lib/ranking.ts`, `src/lib/versus.ts`, `src/lib/session.ts`), client session management (`src/app/r/play/play-room.tsx`), and server-rendered presentation routes (`src/app/(site)/l/[id]/page.tsx`, `src/app/(site)/compare/[a]/[b]/page.tsx`).

Currently:
1. **Consensus & Celebration**: Stability detection uses a hysteresis-banded Elo convergence engine. When consensus is reached, the UI transitions to a "Consensus reached" podium view within a static `.bg-curtain` section. However, there is **no dynamic particle confetti, spotlight sweep, or curtain-drop animation**.
2. **Exportable Graphic / Golden Ticket**: Sharing currently only supports text URLs via clipboard, mailto, Threads, Bluesky, and `navigator.share` (`src/components/ShareButton.tsx`). There is **zero canvas, SVG-to-image, or PNG export functionality**.
3. **Head-to-Head Comparison (`/compare/[a]/[b]`)**: Full functional routes exist for `/compare`, `/compare/[a]`, and `/compare/[a]/[b]`. The compatibility scoring algorithm implements pairwise order concordance over shared films (Kendall-tau style), and identifies up to 5 "biggest arguments" sorted by rank difference $|\Delta|$. Opportunities exist to enrich the visual clash callouts, surface common ground, and optimize compatibility math.

---

## 2. Deep Dive: Finale & Celebration ("Curtain Call")

### 2.1 Stability & Consensus Detection Engine
The mathematical logic for detecting when pairwise dueling has produced a definitive, stable ranking lives in `src/lib/ranking.ts` and is integrated into `src/app/r/play/play-room.tsx`.

#### Key Constants & Helpers (`src/lib/ranking.ts`):
- `STABILITY_MIN_COMPARISONS = 3`: Every active movie must participate in at least 3 matchups before stability can fire.
- `STABLE_ORDER_TOLERANCE = 30`: Elo gap threshold below which adjacent movies are clustered into the same "tie-band".
- `HYSTERESIS = 15` (`STABLE_ORDER_TOLERANCE / 2`): Prevents boundary-hover oscillations from repeatedly resetting the stability counter.
- `stabilityVotesN(activeCount)`: Returns the required number of consecutive quiet votes (`Math.max(3, Math.min(6, Math.ceil(activeCount / 2)))`).
- `isStable(movies, votesSinceOrderChanged, significantOrderChangedAtLeastOnce)` (`ranking.ts:194-204`):
  ```ts
  export function isStable(
    movies: RankedMovie[],
    votesSinceOrderChanged: number,
    significantOrderChangedAtLeastOnce: boolean,
  ): boolean {
    const active = movies.filter((m) => !m.parked);
    if (active.length < 2) return false;
    if (votesSinceOrderChanged < stabilityVotesN(active.length)) return false;
    if (!significantOrderChangedAtLeastOnce) return false;
    return movies.every((m) => m.parked || m.comparisons >= STABILITY_MIN_COMPARISONS);
  }
  ```
- `isPodiumLocked(movies)` (`ranking.ts:208-215`): Early exit helper when top 3 active movies have $\ge 2$ comparisons and at least 20 Elo separation over rank 4.

### 2.2 Consensus & Finished State Flow in `play-room.tsx`
In `src/app/r/play/play-room.tsx`:
1. **Active Voting Phase** (`pair !== null && !stable && !finished`):
   - Renders `MatchupStage` (`play-room.tsx:1001-1011`) within `bg-curtain-soft`.
   - Vote trigger (`handleVote`, lines 329-363): Updates Elo via `applyVote` (`src/lib/session.ts`), triggers `navigator.vibrate(10)` (if supported), applies directional hit/recoil CSS classes (`animate-hit-right`, `animate-recoil-left`, etc.), and swaps in the next pair after 260ms (optionally with `document.startViewTransition`).
2. **Consensus Reached Stage** (`stable && !sharpening && !finished`, lines 859-917):
   - Renders a section with `bg-curtain` and static `spotlight-glow`.
   - Displays `<Podium movies={active} />` (classic Olympic 2nd-left, 1st-center, 3rd-right with gold/silver/bronze rank numeral pills).
   - If `canSharpen` is true (pairs exist within `SHARPEN_COMFORT_GAP = 120`), offers `Sharpen close calls (+XP)` or `Finish`.
   - If `session.themeSlug` exists, renders `MarqueeConnectionGame`.
3. **Finished Stage** (`finished === true`, lines 801-843):
   - Renders `<RankedList movies={active} />` with final rank numbering and `+{active.length} XP Earned` badge.
   - Action buttons: "Save & finish" (`handleDirectSave("done")`), "Save & quit as draft" (`handleDirectSave("draft")`), and "Keep voting" (`setFinished(false)`).
   - Direct save sends POST/PATCH to `/api/lists` and redirects to `/l/[id]`.

### 2.3 Existing List Display Components
On `/l/[id]` (`src/app/(site)/l/[id]/page.tsx`):
- `ListViews` (`src/components/list/ListViews.tsx`): Toggleable between `StackedView` and `RowsView`.
- `StackedView` (`src/components/list/StackedView.tsx`): Top 3 displayed on stepped pedestals (gold/silver/bronze) under a radial blurred gold spotlight (`bg-gold/15 blur-3xl`), followed by a grid of "Honorable Mentions & Rest of List", followed by "Haven't seen" parked films.
- `RowsView` (`src/components/list/RowsView.tsx`): Linear list with large circular rank badges, TMDB poster cards, and comparison vote counters.
- `CommunityStatsGrid` (`src/app/(site)/l/[id]/page.tsx:314-384`): Undisputed champion / leading contender card, percentage ranked #1, percentage haven't seen, and most divisive movie indicator.

### 2.4 Gaps & Recommendations for "Curtain Call" Finale
1. **Dynamic Theatrical Animation**:
   - Currently, consensus triggers only `animate-celebrate` (200ms scale-in: `scale(0.94) -> scale(1)` in `globals.css:257-261`).
   - *Recommendation*: Introduce a dedicated lightweight **Curtain Call / Confetti Cannon component** (`CurtainCallCelebration.tsx` or canvas particle burst) that fires warm golden confetti (`#f5c518`, `#fff1b8`, `#f5a524`, `#d0d4dc`) and a sweeping overhead theater spotlight upon first reaching consensus or clicking "Finish".
   - Strict adherence to `prefers-reduced-motion`: When reduced motion is preferred, particles are suppressed and replaced with a static gold laurel celebratory banner.

---

## 3. Deep Dive: Exportable "Premiere Pass / Golden Ticket" Graphic

### 3.1 Current Sharing Architecture
`src/components/ShareButton.tsx` lines 1-161 provides a popover menu with:
- `copyLink()`: Uses `navigator.clipboard.writeText(url)`.
- Email mailto link.
- Social links: Threads and Bluesky compose intents.
- Native Share: `navigator.share({ title, url })`.

There is currently **no graphic generation or image export mechanism**.

### 3.2 Design Specification: Retro "Premiere Pass / Golden Ticket"
The Premiere Pass should evoke a vintage perforated cinema ticket stub from the golden age of Hollywood, branded with the MovieRanker "Premiere Night" aesthetic.

#### Visual Elements:
1. **Ticket Geometry & Borders**:
   - Dimensions: Standard high-resolution sharing aspect ratio (e.g. 1200 × 630 px horizontal banner or 1080 × 1350 px / 1200 × 1200 px vertical card).
   - Notched/scalloped ticket borders (circular cutouts along left/right edge or perforated dashed dividing line separating the "ADMIT ONE" stub from the ranking body).
   - Ornate vintage borders: Double gold stroke rules with corner ✦ starburst ornaments.
2. **Color Palette (DESIGN.md Tokens)**:
   - Background: Dark theater velvet / deep black lacquer (`#0d0d10` to `#1a0008` gradient) with subtle vintage texture/grain.
   - Text & Accents: Premiere Gold (`#f5c518`), Warm Amber (`#f5a524`), Champagne Cream (`#fff1b8`), Slate Muted (`#8b8b94`), Pure White (`#ffffff`).
3. **Typography**:
   - Header / Marquee: `Bebas Neue` uppercase letterspaced ("✦ MOVIERANKER PREMIERE PASS ✦" / "OFFICIAL RANKING CONSENSUS").
   - Serial Number: Vintage monospace numbering (e.g. `№ MR-88219`, `ADMIT ONE · CINEMA VERITÉ`).
   - Movie Titles: Crisp serif/display header for the #1 Champion; clean sans for top 5 films.
4. **Ranking Content**:
   - **#1 Champion Feature**: Prominent title in shimmering gold, release year, and laurel wreath badge or #1 ribbon.
   - **Top Podium / Top 5 Rankings**: List of runners-up (#2 through #5) with rank numerals.
   - **Attribution & Metadata**: List title, creator handle (`@handle` or participant names), date formatted (e.g., "SEPTEMBER 2026"), and site watermark (`movieranker.win`).

### 3.3 Technical Rendering Strategy: HTML5 Canvas vs SVG
| Feature | HTML5 Canvas (2D Context) | SVG + Canvas Rasterization | DOM-to-Canvas (html2canvas) |
|---|---|---|---|
| **Speed & Weight** | Extremely fast, 0 kB extra libraries | Fast, 0 kB extra libraries | Heavy (~150 kB), prone to layout bugs |
| **Cross-browser rendering** | 100% deterministic pixel-level drawing | Excellent, but font loading quirks in SVG `foreignObject` | Unreliable with Tailwind v4 `@theme` |
| **Exportability** | Direct `canvas.toBlob("image/png")` | Draw SVG to `Image`, then `canvas.toBlob` | Renders to canvas |
| **Recommendation** | **Primary Choice (HTML5 Canvas)** | Excellent for in-DOM vector preview | Avoid |

#### Recommended Implementation Blueprint:
1. **Interactive DOM Preview Card**: A React component (`PremierePassCard.tsx`) rendering the ticket using Tailwind classes and SVG perforation notches, accessible directly on `/l/[id]` and inside a preview modal.
2. **High-DPI Canvas Exporter Utility (`src/lib/ticket-canvas.ts`)**:
   - Creates an offscreen canvas at 2x resolution (e.g., $1200 \times 675$ or $1080 \times 1350$).
   - Awaits font readiness: `await document.fonts.load('bold 36px "Bebas Neue"')`.
   - Draws vintage ticket frame, scalloped edge cutouts, decorative rules, gold gradients, text, and optional poster art thumbnail.
   - Supports CORS image rendering with TMDB posters (`img.crossOrigin = "anonymous"`), with immediate fallback to a gold typography plaque if an image fails to load.
3. **1-Click Actions**:
   - **Clipboard Copy**:
     ```ts
     canvas.toBlob(async (blob) => {
       if (!blob) throw new Error("Canvas export failed");
       if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
         await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
       }
     }, "image/png");
     ```
   - **Direct Download**:
     ```ts
     const url = URL.createObjectURL(blob);
     const a = document.createElement("a");
     a.href = url;
     a.download = `premiere-pass-${slugify(title)}.png`;
     a.click();
     URL.revokeObjectURL(url);
     ```

---

## 4. Deep Dive: Head-to-Head Comparison (`/compare/[a]/[b]`)

### 4.1 Route & Access Architecture
The comparison sub-system is located at:
- `/compare` (`src/app/(site)/compare/page.tsx` & `compare-client.tsx`): Entry hub where users can paste two URLs/IDs or pick from their own finished lists.
- `/compare/[a]` (`src/app/(site)/compare/[a]/page.tsx`): Intermediate picker page taking list `a` as anchor.
- `/compare/[a]/[b]` (`src/app/(site)/compare/[a]/[b]/page.tsx`): Main comparison presentation page.
- `CompareModal` (`src/components/list/CompareModal.tsx`): Modal accessible from any `/l/[id]` header to launch a comparison against that list.

#### Data Fetching & Authorization (`/compare/[a]/[b]/page.tsx:150-204`):
- Fetches both lists using `supabase.from("lists").select("id,title,status,visibility,owner_id").in("id", [a, b])`.
- Fetches list movies: `supabase.from("list_movies").select("list_id,tmdb_id,title,poster_path,final_rank").in("list_id", [a, b])`.
- Access Control (`canCompare` in `src/lib/versus.ts:70-80`):
  ```ts
  export function canCompare(
    row: { status: string; visibility: string | null; ownerId: string },
    viewerId: string | null,
  ): boolean {
    return (
      row.status === "done" &&
      (row.visibility === "public" ||
        row.visibility === "unlisted" ||
        row.ownerId === viewerId)
    );
  }
  ```
  If either list is missing, in draft mode, or private to another user, Next.js `notFound()` is raised.

### 4.2 Compatibility Scoring Algorithm Analysis (`src/lib/versus.ts`)
The mathematical engine is pure and isolated in `src/lib/versus.ts`.

#### Current Concordance Calculation (`versus.ts:96-121`):
```ts
export function computeVersus(a: VersusEntry[], b: VersusEntry[]): VersusResult {
  const { shared, onlyInA, onlyInB } = intersect(a, b);

  let pairs = 0;
  let agrees = 0;
  for (let i = 0; i < shared.length; i++) {
    for (let j = i + 1; j < shared.length; j++) {
      pairs++;
      if ((shared[i].rankA - shared[j].rankA) * (shared[i].rankB - shared[j].rankB) > 0)
        agrees++;
    }
  }

  return {
    shared,
    agreementPct: pairs === 0 ? null : Math.round((agrees / pairs) * 100),
    biggestArguments: [...shared]
      .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
      .slice(0, 5),
    onlyInA,
    onlyInB,
  };
}
```

#### Analytical Observations:
1. **Mathematical Foundation**:
   - `agreementPct` calculates the **fraction of concordant pairs** $C / (C + D)$ over all shared pairs $\binom{k}{2}$.
   - This directly maps to Kendall's rank correlation $\tau = \frac{C - D}{C + D}$, via the linear normalization $\text{Score} = \frac{\tau + 1}{2} \times 100\%$.
   - Ranges cleanly from 0% (total inverse ranking) to 100% (identical ordering).
2. **Current Tier Copy (`versus.ts:58-63`)**:
   - $\ge 90\%$: "Basically twins"
   - $\ge 70\%$: "Mostly aligned"
   - $\ge 50\%$: "Spicy differences"
   - $< 50\%$: "Opposite ends of the couch"
3. **Edge Cases**:
   - When `shared.length < 2`, `pairs === 0`, yielding `agreementPct = null`.
   - The UI displays "No overlap" ("These rankings share nothing — nothing to argue about… yet.").
   - If `shared.length === 1`, there is 1 shared film, but relative order cannot be computed.
4. **Disagreement Detection**:
   - `delta = rankB - rankA`.
   - `biggestArguments` selects the top 5 films by $|\Delta|$ descending.
   - `/compare/[a]/[b]/page.tsx:253-272` lists these with `DeltaBadge` (`+N ↑` or `-N ↓`).

### 4.3 Proposed Visual & Algorithmic Enhancements for Comparison
1. **Top Clash Feature Card ("Sharpest Disagreement")**:
   - Highlight the #1 single largest rank disagreement with a dramatic visual callout: e.g. "🥊 Biggest Cinematic Collision: User A ranked *The Dark Knight* #1, but User B ranked it #9 (Δ 8 positions)".
2. **Common Ground / Shared Champion Callout**:
   - Highlight mutual top favorites (e.g. "✦ Shared Masterpiece: Both ranked *Pulp Fiction* in the Top 3").
3. **Taste Compatibility Gauge**:
   - Radial or meter gauge styled with gold glowing ring displaying the percentage with cinematic tier descriptor.

---

## 5. Existing Tests & Verification Inventory

### 5.1 Test Suite Status
- Test runner: `vitest run` (Vitest 4.1.11).
- Total test files: **27 test files**.
- Total tests: **298 unit & integration tests**, all currently passing (`100% pass rate`).

### 5.2 Relevant Existing Test Suites
- `src/lib/ranking.test.ts`: 577 lines covering `applyWin`, `nextMatchup`, `anti-repeat`, `recordMatchupResult`, `isStable`, `expectedConsensusVotes`, `estimateRemainingVotes`, `countClosePairs`, `sharpenNextPair`, `finalizeRanks`, Spearman property tests, and simulation harnesses for $n=4, 6, 8, 12, 16, 20$.
- `src/lib/versus.test.ts`: 131 lines covering `computeVersus` (full agreement, full reversal, partial agreement, edge cases, largest arguments sorting), `compatibilityTier`, `canCompare`, and `extractListId`.
- `src/app/(site)/l/[id]/page.test.ts`: Tests list page queries, RLS scoping, and visibility filtering for themed rooms.
- `src/lib/list-view.test.ts`: Tests `splitPodium`, `podiumDisplayOrder`, and row rankings.

---

## 6. Implementation Recommendations for Next Phases

| Component / Feature | Target Path | Key Implementation Details |
|---|---|---|
| **Curtain Call Celebration** | `src/components/CurtainCallCelebration.tsx` | Golden confetti particle burst (`canvas-confetti` style zero-dependency canvas or pure CSS particles) + dynamic spotlight animation on consensus / list finish; respects `prefers-reduced-motion`. |
| **Premiere Pass Preview Card** | `src/components/PremierePassCard.tsx` | Visual vintage ticket stub with notched perforation edges, gold borders, Bebas Neue headings, #1 champion spotlight, top films, date, and user handle. |
| **Canvas Graphic Exporter** | `src/lib/ticket-canvas.ts` | Pure 2D canvas drawing routine rendering 2x retina ticket PNG, supporting `document.fonts.ready`, CORS poster images with typographic fallback. |
| **1-Click Copy & Download** | `src/components/ShareButton.tsx` & `src/components/PremierePassModal.tsx` | Integrated into share menu and `/l/[id]` page with `navigator.clipboard.write([new ClipboardItem(...)])` and direct PNG download. |
| **Sharpest Disagreement Callout** | `src/app/(site)/compare/[a]/[b]/page.tsx` | Visual clash highlight card for top $|\Delta|$ film + shared common ground highlight. |
| **New Unit Tests** | `src/lib/ticket-canvas.test.ts`, `src/lib/versus.test.ts` | Vitest suites verifying ticket generation data formatting, compatibility scoring edge cases, and disagreement identification. |
