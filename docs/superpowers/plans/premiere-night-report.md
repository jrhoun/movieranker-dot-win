# Premiere Night Re-skin — Implementation Report

Date: 2026-08-24 · Branch: master · Scope: all surfaces per DESIGN.md "Premiere Night"

## Commits

| Hash | Message |
|------|---------|
| d22f105 | feat: bebas display face + gold tokens |
| d6761bf | feat: premiere night home hero |
| db69c85 | design: marquee headers + gold rank treatment |

## What shipped

1. **Fonts** (`src/app/layout.tsx`, `globals.css`): `Bebas_Neue` via next/font/google as `--font-bebas`, mapped through Tailwind v4 `@theme inline` (`--font-display`) → usable as `font-display`. Geist/Geist Mono untouched for body/stats.
2. **Gold token** (`globals.css`): `--gold: #f5c518` in `:root` + `--color-gold: var(--gold)` theme mapping → `text-gold` / `bg-gold` / `border-gold` / `ring-gold` utilities. Amber retained for all pre-existing uses; new CTAs, rank numerals, badges, ✦ dividers use gold.
3. **Home hero** (`src/app/(site)/page.tsx`, `src/lib/hero-posters.ts`): fanned row of 7 real TMDB posters (Godfather, Pulp Fiction, Alien, The Dark Knight (center), Matrix, Spirited Away, Inception) with tilts −8°..+8°, overlapping via negative margins, hover straighten + lift (200ms ease-out). Poster frames via shared `MoviePoster` primitive → guaranteed 2:3. Hero title is Bebas caps text-6xl→7xl flanked by gold ✦ dots on the existing surface scrim (contrast rule preserved); tagline below; new gold pill CTA ("Start ranking") anchors to the search panel (`#start`). Attribution comment lives in `hero-posters.ts`.
   - Tilt applied as a CSS variable (`--tilt` → `rotate-(--tilt)`) so the `hover:rotate-0` utility can win the cascade — an inline `style.rotate` would have overridden it.
4. **Marquee headers**: new shared `src/components/MarqueeHeading.tsx` — letterspaced Bebas caps h1 flanked by thin gold rules with ✦ dots. Applied to list page title and profile page header. Home has no additional section headings yet; component is ready when they appear.
5. **Rank numerals/badges**: `StackedView` RankBadge, `RowsView` rank numeral, play-room final-order numerals, and podium medal numerals switched from `font-mono text-accent` to `font-display text-gold`. Podium medal colors stay gold/silver/bronze (gold slot now uses the token). `ListCard` done-badge gets a subtle `ring-gold/50`.
6. **Spotlight glow**: `.spotlight-glow` utility in `globals.css` (radial rgba(245,197,24,.12)) behind home hero content and behind the finalizing podium (celebration curtain section made relative).
7. **Grain overlay**: untouched, still app-wide.

## Rules compliance

- Posters always 2:3 via `MoviePoster` primitive (hero row included).
- Motion 150–250ms ease-out only; global `prefers-reduced-motion` kill in globals.css zeroes transitions, so hero tilt/hover-straighten dies under reduced motion.
- No muted-on-curtain regressions: hero text/tagline remain on the surface scrim; podium card unchanged.
- Traffic hygiene: exactly one TMDB session (7 search requests), token read silently from .env.local, never printed; only `poster_path` values extracted and hardcoded.

## Verification

- `npx tsc --noEmit` — clean
- `npm run lint` (eslint) — clean
- `npm test` — 96/96 passed (10 files)
- `npm run build` — passes, all routes compile
- Compiled CSS spot-check: `#f5c518`, `--tilt` rotate utilities, `--font-bebas` present in build output.

## Skipped / deferred

- Profile empty-state poster watermark (spec item 7): optional by taste; existing empty-state card reads fine bare. Add a dimmed `MoviePoster` there if it ever feels empty.
- Login page marquee heading: not in scope list; curtain treatment already carries it.

## Concerns

- None blocking. Note: `MarqueeHeading` renders rules that flex-shrink around long list titles; verified acceptable at narrow widths via break-words behavior, but eyeball a very long real-world list title after deploy.

## Hero posters are real candidates (40d6b20)

- `hero-posters.ts`: added hardcoded `tmdbId` + `releaseYear` per entry; exported `HERO_CANDIDATES` mapped to the same `TmdbMovieCredit` shape search results use.
- Home hero: each fan poster is now a button (full poster hit area ≥44px, gold focus-visible ring, existing hover straighten+lift kept). Click toggles the movie in/out of the candidate tray via the same state flow as search picks; `aria-pressed` reflects in-tray status, `aria-label` = "Add <title> to your ranking", native tooltip covers "already on your list — tap to remove". Removed the old `aria-hidden` from the fan list.
- Tray empty-state copy updated to "Tap a poster up top — or search below — to build your list."
- Motion: all transitions are 200ms ease-out Tailwind classes, killed globally by the existing `prefers-reduced-motion` block in globals.css.
- No pure logic extracted beyond a constant mapping (no new unit test needed); no live TMDB calls added.

## Design Iteration v1 — Nav Header + How It Works (2026-08-24)

Feedback addressed: (1) plain top nav, (2) home page lacks a first-timer explainer.

### Commits

| Hash | Message |
|------|---------|
| c9925e0 | design: premiere nav header |
| 5fbfc6e | feat: how it works section |

### What shipped

1. **Site header** (`src/components/SiteHeader.tsx` + new `src/components/NavLink.tsx`): wordmark is now `✦ MOVIERANKER` in Bebas caps (`font-display text-xl tracking-widest`) with gold ✦; bar switched to `bg-bg/70 backdrop-blur border-b border-gold/20` so it sits over the hero curtain; links are Geist `text-sm uppercase tracking-wide` with gold-text + gold underline (decoration-2, offset-4) on hover, 200ms ease-out; sign out keeps link styling but quieter as a bordered pill (`border-white/15`, muted → text hover). All targets ≥44px (`min-h-11`), focus-visible gold rings preserved, auth-aware logic untouched. Active-page indicator via new 12-line client `NavLink` (`aria-current="page"` on `/u/me`) — server components can't read pathname, hence the one small client leaf.
2. **How It Works** (`src/app/(site)/page.tsx`): marquee-headed section after the tray inside `<main>` (above the tray's reserved pb-72 clearance). Reuses shared `MarqueeHeading` — gained an optional `as?: "h1" | "h2"` prop (default h1) so the section heading is a proper h2 without duplicating classes. Three numbered surface cards (`bg-surface ring-1 ring-white/10 rounded-lg`) in `grid gap-4 sm:grid-cols-3`: gold Bebas numerals 01/02/03, emoji icons with `role="img"` + labels (🔍/⚔️/🏆 — playful brand per DESIGN.md), Bebas h3 titles, muted body copy. Hover lift `-translate-y-0.5` gated behind `motion-safe:` so reduced-motion users get zero movement (belt-and-suspenders on top of the global reduce override). Reassurance line below in muted: "No account needed to play — sign up only to save your masterpiece."

### Rules compliance

- Motion budget: only the two specified 200ms ease-out transitions added; lift is motion-safe-gated.
- Contrast: gold #f5c518 and text/muted on bg/surface unchanged from token values already in use; no muted-on-curtain usage introduced.
- Traffic hygiene: no network calls made; .env.local never read or printed; no live TMDB requests (no imagery added).
- "On scroll stays slim": header was already slim (py-1.5); kept slim, no scroll JS needed.

### Verification

- `npx tsc --noEmit` — clean
- `npm run lint` — clean
- `npm test` — 96/96 passed (10 files)
- `npm run build` — passes, all routes compile

### Concerns

- Emoji icons (🔍/⚔️/🏆) render platform-native rather than brand-styled; swapped for inline SVGs if they ever look off on Windows.
- Header remains non-sticky (as before). If "on scroll" ever means sticky, add `sticky top-0 z-20` to the `<header>` — one class.

## Round: Letterboxd-pattern richness, bulk selection, expandable tray

Commits: `2658ef1` design: letterboxd-inspired home richness · `79cbafb` feat: bulk add to candidate tray · `879051a` feat: expandable candidate tray

### Improvement 1 — Home richness
- Hero fan dimmed to `opacity-85` at rest (full on hover) so the Bebas headline stays dominant; fan now uses `FAN_POSTERS` = first 8 of the lineup.
- Curated poster set extended 7 → 12 (Fight Club, LOTR: Fellowship, Parasite, Whiplash, Interstellar — hand-written TMDB paths, zero live API calls).
- New "Tonight's Shortlist" section below How-It-Works: marquee heading + horizontally scrollable filmstrip of all 12 posters (uniform 2:3, w-24/w-32, hover lift). Doubles as quick-add: taps route through the same tray toggle as the hero fan, with gold ✓ badge + year tint when selected.

### Improvement 2 — Bulk selection
- Search results grid gains a header row with result count and a secondary "Add all N" button (disabled once every result is already in the tray); bulk merge goes through the new dedupe-safe `mergeCandidates()` helper (`src/lib/tray.ts`, title-sorted like single adds).
- `MoviePosterCard` now shows added state: gold ring + ✓ badge overlay; tap toggles add/remove (`aria-pressed`, label flips Add/Remove, title tooltip explains). Individual taps unchanged in behavior except tap-again now removes, per spec.

### Improvement 3 — Expandable tray
- Collapsed bar: Bebas count ("7 selected"), horizontal 48px-wide 2:3 thumbnail strip with remove-× on each thumb (whole thumb ≥44px hit area), chevron toggle (`aria-expanded`/`aria-controls`), Start-ranking button always visible.
- Expanded sheet opens upward via the grid-template-rows `0fr→1fr` trick (200ms ease-out; globals.css reduced-motion kill-switch flattens it). Content is `inert` while collapsed so it leaves the tab order. Sheet holds a responsive grid (3/4/6 cols ≈96–160px posters), titles, per-item "× Remove" buttons (≥44px), Clear-all with two-tap confirm (resets on blur/remove).
- Participant input fixes folded in: placeholder "Add a name… e.g. Sarah", helper line "Just first names — no emails needed.", comma-separated batch entry via `parseParticipantNames()`, visible "+ Add" submit button (Enter still works), chips stay in the collapsed bar so they're legible in both states.

### Verification
- `npm test` 102 passed (11 files; +6 new for mergeCandidates/parseParticipantNames), `tsc --noEmit` clean, eslint clean, `next build` passes. Each commit typechecks standalone (commit-1 content verified via keep-index stash before committing).

### Concerns
- The five new TMDB poster paths are from memory; if any 404s, MoviePoster's fallback renders the title — spot-check visually and swap the path.
- Session title moved into the expanded sheet (collapsed bar kept minimal); default "Movie ranking" still applies if never set.
- MarqueeHeading gained an "h3" option (tray sheet header) — additive only.

## Iteration: Premiere marquee title + irreverent tagline (2026-08-24, commit 14ffb06)

**Scope.** Home hero wordmark + tagline only (src/app/(site)/page.tsx, src/app/globals.css).

**Title treatment.**
- Bebas caps, fluid size `clamp(2.5rem, 11vw, 6rem)` (~text-8xl ceiling on wide screens; 11vw keeps "movieranker.win" on 375px phones without mid-word overflow).
- Gold treatment: gradient clipped to glyphs (`.marquee-gold` — #9a7500→#f5c518→#fff1b8→#f5c518→#b3860a sweep at 105deg) over a subtle `drop-shadow(0_2px_2px_rgba(0,0,0,.45))` for depth. Chose background-clip:text over layered 3D stack: reads as backlit marquee plastic rather than sticker chrome, and is one class instead of four text-shadow layers.
- One-shot shimmer: `marquee-shimmer` keyframes animate background-position once per load, 2s ease-out, fill both. The existing global `prefers-reduced-motion` rule (duration 0.01ms, iteration 1) already collapses it to the instant final state — no extra override needed.
- Bulbs: ✦ flanking retained, now sized at 0.35em so they scale with the clamp instead of competing with it.
- Letter flicker: skipped per spec's doubt clause — a single-letter flicker next to a one-shot shimmer read as broken, not charming.

**Tagline.** Replaced "Settle it once and for all." with two beats: line 1 Geist medium `text-text`, line 2 `text-muted` with gold underline (`decoration-gold decoration-2 underline-offset-4`) on "One list at a time."

**Composition.** Scrim padding py-4→py-5 (+px on sm), tagline gap widened, poster fan pushed to mt-10/sm:mt-12 so the larger title breathes without pushing posters below the fold.

**Verification.** vitest 102/102 passed (11 files); tsc --noEmit clean; eslint clean; next build succeeded.

**Motion budget.** Only the one-shot shimmer added; reduced-motion kills it via the pre-existing global rule.

## Iteration: Hollywood searchlights + bigger tagline (2026-08-24)

**Scope.** Home hero only (src/app/(site)/home-client.tsx, src/app/globals.css); DESIGN.md Motion amendment.

**Tagline scale.** Both beats bumped ~2 Tailwind steps: beat 1 "Settling the best movies of all time." → `text-xl sm:text-2xl` Geist medium `text-text`; beat 2 "One list at a time." → `text-lg sm:text-xl` `text-muted`, gold underline (`decoration-gold decoration-2 underline-offset-4`) unchanged. Mobile stays balanced via responsive pairs; both sit on the scrim card so contrast over curtain folds is unchanged.

**Searchlight beams.** New `.searchlights` utility in globals.css: two pseudo-element shafts anchored bottom-left/right (-18% inset), each a clip-path wedge (narrow 38–62% at base, full width at top) filled with a gold linear-gradient (rgba(245,197,24,.13) core → transparent 78%), blur(35px), rotated ±16deg from bottom-center origin so the beams cross behind the marquee wordmark. Drift: ±4deg ease-in-out infinite alternate over 22s (left) / 19s (right) — differing durations give counter-phase without extra keyframes. Rendered as a decorative `aria-hidden` div inside the hero header before the content wrapper, so it paints below title/scrim/posters with no z-index juggling.

**Reduced motion.** The pre-existing global rule (duration .01ms + iteration-count 1, no forwards fill) ends both loops instantly → beams render static at base rotation. No new override needed.

**Motion budget.** DESIGN.md Motion section amended per directive: slow ambient atmosphere loops (>10s period) permitted; all loops still die under prefers-reduced-motion; single-beat celebration rule stands.

**Verification.** vitest 117/117 passed (13 files); tsc --noEmit clean; eslint clean; next build passes (first attempt hit the running dev server's lock — unrelated).

**Concerns.**
- Beam alpha (.09–.13) chosen blind against the fold gradients; if posters read washed out on real hardware, drop to .06/.08.
- Beams are clipped by the header's overflow-hidden; on very short viewports the crossing point may sit below the fold line — visual-only, no layout impact.

## Follow-up: hero fan showcases tonight's themed shortlist (6855516)

**Change.** The hero's fanned posters now render tonight's shortlist movies
(server-fetched in `page.tsx`, same data as the strip below How-It-Works) — the
hero is a live preview of the daily rotation. Fan mechanics preserved:
overlapping tilt spread (-8..8deg, linear across N posters), hover
straighten+lift (200ms ease-out), tap-to-add-to-tray with aria-pressed,
2:3 posters via MoviePoster. Middle poster carries top z-index.

**Fallback.** Empty/failed shortlist → existing curated `FAN_POSTERS` set with
its hand-tuned tilts (`hero-posters.ts` stays the fallback data module).
`page.tsx` also try/catches the shortlist/TMDB fetch so a failure degrades to
the fallback instead of erroring the home page.

**Caption.** Gold Bebas caps line under the fan: "TONIGHT'S THEME · <title>"
(only when live). Complements — does not duplicate — the strip's "Tonight's
shortlist · rotates daily" header below.

**Verification.** vitest 117/117 passed; tsc --noEmit clean; eslint clean;
next build passes. No tests referenced the old constant-driven fan.

**Concerns.**
- Linear tilt spread across variable-length fans replaces the hand-tuned
  per-poster angles; if an 8-poster fan looks mechanically even on real
  hardware, hand-tune again.
- FAN_POSTERS slice caps the fan at 8 posters; themes longer than 8 only fan
  their first 8 (strip still shows all).

---

## v1 User-Feedback Fixes (2026-08-24)

Four fixes from first-user feedback, all on `master`, DESIGN.md hard rules intact.

### 1. Hero lighting balance — `fix: hero lighting balance` (93feac7)

**Layer math (composite bottom→top on the `<header class="bg-curtain">`):**
1. `.bg-curtain` background stack (first listed paints on top): valence shadow
   (dark top 35%) over warm upper-center ambient over velvet folds; plus
   `box-shadow: inset 0 0 120px rgba(0,0,0,.55)` darkening extreme edges/corners.
2. `.spotlight-glow` child div — now TWO layers: tight
   `radial-gradient(circle at 50% 30%, rgba(245,197,24,.16), transparent 55%)`
   ringed on the marquee title, over the original wide
   `ellipse 60% 55% at 50% 35%, .12` band glow.
3. `.searchlights` wedges paint above the glow but were rebalanced so they no
   longer fight it: core alpha halved (`.13→.06`, mid `.09→.04`), blur raised
   (`35→50px`), width narrowed (`55%→45%`).

**Root cause of the inversion:** the left wedge sat at `left:-18%` rotated
`-16deg`; with `transform-origin: bottom center`, negative rotation moves a
wedge's top *away* from center — both beams leaned outward, brightening the
lower/outer corners while the valence shadow darkened center-top. Fix flips the
base rotations to `+14deg` / `-14deg` (and drift keyframes to ±2° inward) so the
shafts converge behind the title. Composite now reads: darkest at extreme
edges/corners (valence + inset shadow + narrowed beams off the corners),
brightest ring around title/tagline (stacked spotlight circle + wide ellipse +
converged beam overlap near 50% x). Reduced-motion behavior unchanged (static
base rotation).

### 2. Studio search disambiguation — `fix: studio search disambiguation` (e495dae)

Pure helper `rankCompanies(results, query)` in `tmdb.ts`: dedupes by
case-insensitive name preferring higher TMDB `popularity` when present, then
stable-sorts exact case-insensitive matches to the front. Applied inside
`searchCompany`; `shapeCredits`/movie paths untouched. SearchPanel company pills
now render an origin_country chip (when TMDB supplies it) plus "Production
company" sub-line. 3 new unit tests in `tmdb.test.ts`.

### 3. Shift-range multi-select — `feat: shift-range multi-select` (b1f2578)

Pure `rangeIndices(a, b)` in `tray.ts` (inclusive, order-agnostic) + 3 unit
tests in `tray.test.ts`. SearchPanel tracks last-clicked index via ref (reset on
new result set); shift+click adds every unpicked movie in the inclusive range;
plain click still toggles single; "Add all" unchanged. `MoviePosterCard`'s
`onSelect` now passes the click event through. Keyboard range-select alternative
explicitly out of scope this round.

### 4. Search intro copy — `design: search intro copy` (764d658)

One muted line directly above the mode tabs:
"Search any actor, director, studio, or movie — tap posters to build tonight's
list." (`text-sm text-muted` per DESIGN.md.)

### Verification

vitest 123/123 passed (was 114; +6 new tests across two suites); tsc --noEmit
clean; eslint clean; next build passes. No live TMDB calls made; `.env.local`
never read or printed.

### Concerns

- Beam convergence is reasoned from CSS transform math, not visually verified on
  real hardware; if the crossing point sits too high/low behind the marquee,
  nudge base rotation angles (currently ±14deg).
- Shift+click anchors to result-list position, not identity; if results reorder
  between clicks (they don't while debounced fetch is idle, and anchor resets on
  each new search) ranges could surprise — currently impossible by construction.
- TMDB `/search/company` may omit `popularity`; dedupe then keeps the first
  occurrence per name (TMDB order), which for A24 puts the major entry first via
  the exact-match float anyway.

## Design iteration: identity dropdown + profile density pass (2026-08-24, branch master)

Commits: f62333945d61931d51ddd94769b98e7d70184dc1 (design: identity dropdown nav), 3f82ea1a24f585afecd4f55753fdb0f2a72228c0 (design: profile density pass).

### Header → identity dropdown
- New `src/components/IdentityDropdown.tsx` (client): gold ✦ `@handle` Bebas trigger with chevron; panel = surface bg, gold ring, shadow, 200ms ease-out fade/scale-in (motion-reduce kills it), closes on outside pointer-down/Escape (Escape refocuses trigger), ArrowDown/ArrowUp cycles menu items, all items min-h-11 with gold focus-visible rings. Items: Profile → /u/<handle> when public else /u/me, My Lists → /u/me, separator, Sign out (server action passed as prop — documented Next pattern).
- `SiteHeader.tsx`: signed out unchanged (gold sign-in). Signed in without handle: plain "My Lists" link. Signed in with handle: dropdown only ("My lists"/"My profile" links + separate quiet Sign out pill deleted).
- Copy: pre-claim header link and dropdown item now "My Lists" (matches page heading); privacy page's "from My Lists" already consistent.

### /u/me density pass
- Stats section kept but tightened (p-6→p-4, level numeral 6xl→5xl, reduced gaps).
- Unlockables + achievements moved OUT of the stats card into a side-by-side pair (`sm:grid-cols-2`) above the list rows, re-rendered as compact pill chips (✓ name for earned; title tooltips carry the full description/unlock-rank text that was inline).
- Lists grid → single-column rows via new `src/components/profile/ListRow.tsx`: leading poster at true 2:3 (w-11, MoviePoster reuse) · truncated title · Draft/Done badge · date · native `<select>` visibility chip (replaces the 3-button radiogroup, same PATCH endpoint) · Resume/View, Propose (hidden <sm to keep one line), Delete. Hover raise (-translate-y-0.5 + gold ring tint), motion-reduce safe. Propose-theme form expands under its row, logic unchanged.
- Empty state ("trophy shelf") preserved above the rows branch.
- AccountSection collapsed into a native `<details>` disclosure (summary styled marquee-caps; Export/Delete flow untouched inside).

### Verification
- tsc --noEmit clean; eslint clean; vitest 185/185 across 21 files; next build passes (all routes compile).
- ClaimHandleCard.tsx, handles.ts, /api/profile untouched per coordination note; git status scoped before each commit.

### Notes / ceilings
- Row visibility control is a native select styled as a chip — OS renders the option list; swap for a custom popover only if contrast complaints arrive.
- Achievements/unlockable descriptions now live in tooltips (title attr) — touch users lose the long text; acceptable for v1 info-only strips.
- 8+ lists visible at 1440px depends on viewport height (~800px fits stats pair + ~7–9 rows); further compression would mean shrinking below 44px targets.
