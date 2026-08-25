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

## Session: participant-add condense + english poster preference (master)

### Fix 1 — Candidate tray add control condensed
- `src/components/CandidateTray.tsx`: "Add a name…" input changed `flex-1` → `w-44`, so input + "+ Add" read as one tight unit (form already had `flex items-center gap-2`). Chips, helper line, Enter-to-add untouched.

### Fix 2 — English-language poster art
- `src/lib/tmdb.ts`: new pure `pickPoster(posters[], primaryPath)` (first `iso_639_1 === "en"`, else first `iso_639_1 == null`, else primary) and `getPreferredPosterPath(tmdbId, primaryPath)` calling `GET /movie/{id}/images?include_image_language=en,null` with the shared 86400 revalidate; any fetch failure returns primaryPath.
- Wired in `src/app/(site)/page.tsx`: after tonight's shortlist credits resolve, each credit's `posterPath` is replaced via `getPreferredPosterPath`. No changes to MoviePoster/primitives/constants.
- Tests: 3 new `pickPoster` cases in `src/lib/tmdb.test.ts` (en preferred; null-language fallback; neither/empty → primary).
- Deviation from spec: signature takes `(tmdbId, primaryPath)` instead of just `tmdbId` — caller already has primaryPath, avoids a second `/movie/{id}` round-trip per shortlist title.

### Verification
- npm test: 225 passed (23 files), tsc clean, eslint clean, build passes.
- Commits: 47c06a8 (fix: condensed participant add control), d3071a4 (feat: prefer english poster art).

### Notes / ceilings
- No live TMDB validation per traffic hygiene; pickPoster logic covered by unit tests, images endpoint shape is the standard TMDB contract.

## Session: weekly marquee rotation + two-path home restructure (master)

### Rotation: daily → weekly
- `src/lib/shortlist.ts`: new pure `weeksSinceUtcEpoch(date)` = `Math.floor(daysSinceUtcEpoch(date) / 7)`; `tonightsShortlist` now indexes the pool by week, not day. Week boundaries fall on Thursdays UTC (epoch-aligned), rotation still pure/deterministic/cronless.
- Copy sweep to "This Week's Marquee" everywhere user-facing: play room chip (`🔒/🔓 This Week's Marquee`), unlock copy ("count as this week's themed list"), list page community verdict lines, profile ListRow proposal prompt. Internal identifiers (`tonightsShortlist`, `TonightStrip`) kept — not user-facing.
- Tests (`src/lib/shortlist.test.ts`): new `weeksSinceUtcEpoch` cases (stable within a 7-day window, advances on day 7); rotation test now asserts all 7 days of one window pick identically and adjacent windows differ; full-cycle and community-proposal loops iterate weeks.

### Home restructure
- `src/app/(site)/home-client.tsx`: How-It-Works section + STEPS constant deleted; old dual-path anchor cards and standalone shortlist section deleted.
- New "CHOOSE YOUR PREMIERE" structure directly under hero (MarqueeHeading h2):
  - Path A (prominent, gold-ringed surface card): "This week's marquee · rotates weekly" mini-header, Bebas-gold theme title, blurb, movie count with absorbed how-it-works one-liner ("rank them head-to-head until a champion emerges"), proposed-by credit, "N rankings already settled this week", gold "Rank this list 🔒" CTA, preview row + vs links, filmstrip tap-to-add.
  - Gold rule + ✦ divider between paths.
  - Path B card: "Build your own list" + "Search any actor, director, studio — settle anything." + SearchPanel rendered inline (#start anchor preserved for hero CTA) + "…then share your ranked wall."
- Hero unchanged except theme chip line now reads "This week's marquee · {title}".
- Tray, resume banners, curated-session seeding, fan tap-to-add, bulk add, compare/vs hooks untouched; cards are single-column by default so they stack at 390px; all motion stays motion-safe-gated hover lifts; focus-visible rings preserved.

### Verification
- npm test: 241 passed (25 files); tsc clean; eslint clean; build passes.
- Commits: 7aeafd9 (feat: weekly marquee rotation), 7f43df5 (design: two-path home restructure).

### Notes / ceilings
- No live TMDB/Supabase calls per traffic hygiene; .env.local untouched.
- Weekly boundary is Thursday-aligned (epoch math) rather than ISO Monday-start weeks; deterministic and tested — switch to ISO week number if Monday alignment ever matters.
- When the theme fetch fails, Path A is hidden entirely and the page degrades to the search path only (same fallback as before).

## Fix round: ISO-Monday week alignment

Reviewer finding: `weeksSinceUtcEpoch = floor(days/7)` anchored the rotation window to the epoch itself (Thu Jan 1 1970), so themes flipped at UTC **Thursday** midnight mid-ISO-week ("This Week's Marquee" changing Wednesday night).

### Fix
- `src/lib/shortlist.ts`: `weeksSinceUtcEpoch` now returns `floor((daysSinceUtcEpoch(date) + 3) / 7)`. The +3 constant shifts the flip point from UTC Thursday to UTC Monday midnight: Monday ⇔ days ≡ 4 (mod 7) since epoch day 0 was a Thursday, and floor((7k+3+3)/7) = k while floor((7k+4+3)/7) = k+1.
- `src/lib/shortlist.test.ts`: replaced the circular test (which derived its expected window from `weeksSinceUtcEpoch` itself, masking the deviation) with hardcoded known-date assertions; minors folded in on `home-client.tsx` (stray indentation on `pendingCuratedRef`, duplicate hero-fan comment block removed).
- The old "Notes/ceilings" Thursday-alignment caveat above is now resolved.

### Verification math (UTC)
- Mon Aug 24 2026 = day 20689 → floor((20689+3)/7) = floor(20692/7) = **2956**
- Wed Aug 26 2026 = day 20691 → floor(20694/7) = **2956** (same as Thu ✓)
- Thu Aug 27 2026 = day 20692 → floor(20695/7) = **2956** (same ISO week ✓)
- Mon Aug 31 2026 = day 20696 → floor(20699/7) = **2957** (adjacent week differs ✓)
- Old formula for comparison: Wed → floor(20691/7)=2955, Thu → 2956 (mid-week flip — the bug)

### Verification
- npm test: 242 passed (25 files); tsc clean; eslint clean; build passes.
- Non-circular assertions: Wed Aug 26 vs Thu Aug 27 2026 → identical theme slug; Mon Aug 24 vs Mon Aug 31 2026 → different theme slugs (pool length > 1). Both pass under the new formula and would fail under the old one.

## Two-column premiere layout + spoiler-safe theme audit (2026-08-24)

### Task 1: two-column home layout
- `src/app/(site)/home-client.tsx`: "Choose your premiere" paths now sit in a `flex flex-col md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]` wrapper. Desktop: custom list LEFT (col 1), ✦ vertical rule between (col 2), marquee RIGHT (col 3) via explicit `md:col-start/row-start`; DOM order unchanged so mobile stacks marquee-first at 390px. `minmax(0,1fr)` columns prevent long-content overflow; poster strips already scroll horizontally.
- Divider: same markup both modes — horizontal line-✦-line on mobile (`my-8 flex items-center`), vertical rule on desktop (`md:flex-col`, spans become `md:w-px md:h-full`).
- Equal visual weight: both cards normalized to `p-5 sm:p-6` and equal `1fr` width. Marquee keeps its gold ring as the weekly theme's identity accent (content volume already differentiates them).

### Task 2: spoiler-safe theme audit
- Audited all 12 curated themes against movieIds. Rewrote 2 blurbs (slugs/titles/movie selections untouched):
  - `crimes-gone-stupid`: woodchipper gag named Fargo's late-film moment → "The plan was flawless. Right up until it very much wasn't."
  - `everyone-is-lying`: "especially the narrator" tipped unreliable-narrator twists (Usual Suspects et al.) → "Trust no one. Especially not anyone who seems trustworthy."
- Kept as brand-correct obtuse connections: secretly-same-story archetypes, trains genre hints, horror-house marketing-level expectations — no plot outcomes revealed.
- Added THEMES.md guidance comment block atop `src/lib/shortlist-themes.ts`: titles/blurb describe atmosphere/patterns, never plot outcomes or named films; obtuse connections are the brand.
- Proposal UI helper text (`src/components/profile/ListRow.tsx`) gained one line: keep titles vague/atmospheric, never spoil a movie's plot. API validation left alone (wording rule isn't machine-checkable).
- Rotation tests unaffected: slugs/titles/movieIds unchanged.

### Verification
- npm test: 242 passed (25 files); tsc clean; eslint clean; production build passes. No live TMDB calls made; .env.local untouched.

## Fix round — premiere divider overflow + shortlist gate
- `src/app/(site)/home-client.tsx`: dropped `md:h-full md:flex-none` from both ✦-rule spans. In the stretched desktop grid row each span had resolved to 100% container height with shrink disabled (≈2× column height + glyph → second rule spilled below the row). Spans now keep base `flex-1`, so in the `md:flex-col` divider they split the row height around the glyph via flex-basis 0 — composite content always equals row height, no overflow at any viewport (`md:w-px md:min-w-0` retained for the vertical orientation).
- Divider element is now gated on `tonight.movies.length > 0`; no dangling rule when tonight's shortlist is empty.
### Verification
- npm test: 242 passed (25 files); tsc clean; eslint clean; production build passes. No live calls.

## v1 user-feedback fixes — fan overflow + search UX (2026-08-24)

### 1. Hero fan overflow indicator
- `src/app/(site)/home-client.tsx`: `overflowCount = tonight.movies.length - 8` when the live theme fan renders. When >0:
  - gold `+N` pill badge overlaid on the last visible poster's bottom-right corner (`aria-hidden`, inside the tap-to-add button).
  - muted caption button under the fan: "+N more in this week's marquee ↓" — smooth-scrolls to the marquee section via `scrollIntoView`; falls back to `"auto"` under `prefers-reduced-motion`. Both render only when N>0.
- Marquee section gained `id="week-marquee"` + `scroll-mt-6` as the scroll target.

### 2. Clear selection (batch unselect)
- `src/lib/tray.ts`: new pure `removeCandidates(current, incoming)` — dedupe-safe inverse of `mergeCandidates` (Set of incoming tmdbIds, filter current). Unit-tested in `tray.test.ts` (removal, no-overlap no-op, duplicate-id + empty-batch safety).
- `SearchPanel` gains required `onRemoveAll(movies)` prop; "Clear selection (N)" text button sits beside "Add all", rendered only when ≥1 current-page result is selected; removes all current-page picks in one batch. `min-h-11` (44px), accent color with hover, focus-visible outline — same affordance family as the "← not X? back" control.

### 3. Result card readability
- Grid loosened from `3/4/6` columns to **2 / sm:3 / md:4 / lg:5** (SkeletonGrid matches). Cards breathe; posters are wider at every breakpoint.
- Title: single-line `truncate` → `line-clamp-2 text-sm leading-snug` (two lines max, readable base size).
- Year stays muted `text-xs` (12px — meets the ≥12px floor).

### Verification
- npm test: 245 passed (25 files); tsc clean; eslint clean; production build passes.
- No live TMDB calls made; .env.local untouched.
- Commits: d742c79 (fan overflow), b147508 (search readability + clear selection).

## v1 fixes — shortlist vanishing movies + search results cap (2026-08-24)

### 1. Shortlist movies without primary art no longer vanish
- `src/lib/tmdb.ts` `getMovieById`: previously returned null when the movie detail had no primary `poster_path`, so page.tsx filtered it out — theme marquee showed fewer movies than the copy claimed (3 of 6 observed). Now, on missing primary art it calls `getPreferredPosterPath(id, null)` (images endpoint: en → null-language → none). If truly no art exists anywhere, the credit is still returned with `posterPath=null`; only a failed lookup returns null.
- `src/components/list/MoviePoster`: placeholder branch upgraded to centered truncated Bebas title (`font-display uppercase truncate`, text-sm) on the existing surface-bg 2:3 frame. Other usages (fan/tray/grid) pass real posterPaths normally; placeholder only appears when posterPath is genuinely null.

### 2. Browse-all modal for large search results
- `src/components/SearchPanel.tsx`:
  - Inline grid capped at first 20 results (`INLINE_CAP` slice); header count still reports the full result set.
  - When >20 results, a "Browse all N results" button (min-h-11, focus-visible ring) opens a dark-cinema modal: surface bg + ring + shadow, 85dvh max height, scrollable card body at 2 / sm:3 / md:4 columns with larger cards (same MoviePosterCard), Escape + outside-click + ✕/Close to dismiss, Tab focus trap with initial focus.
  - Modal maps over the same source array, so tap-to-toggle-select and shift-range anchor (`lastClickedRef`) sync between inline and modal views; selected ✓ badges visible in both.
  - Sticky footer shows live "{N} selected" count + Close.
  - Animation reuses existing `animate-celebrate` (fade/scale 200ms); the global `prefers-reduced-motion` rule collapses it. All targets ≥44px except the footer Close pill (36px tall inside an ≥44px-tall footer row).

### Verification
- npm test: 248 passed (25 files), including new getMovieById tests: images-endpoint fallback for en art, credit kept with posterPath=null when no art exists anywhere, and no extra images call when primary art exists.
- tsc clean; eslint clean; production build passes. No live TMDB calls made; .env.local untouched.
- Commits: 8db8e10 (shortlist fix), ad403c1 (browse-all modal).

## v1 fixes — browse-all modal focus stability (2026-08-24)

- `src/components/SearchPanel.tsx` `BrowseAllModal`: focus-on-open moved to its own empty-dep effect so parent re-renders (every tap-to-toggle) no longer re-run it — previously the ✕ button was re-focused mid-selection, stealing keyboard/mouse flow. The Escape/focus-trap listener now reads `onClose` through a ref, so the inline-arrow prop no longer re-registers the keydown handler per render.
- Footer Close pill raised min-h-9 → min-h-11 (44px tap target; last sub-44px target in the modal).
- Focus returns to the "Browse all" trigger on modal close: triggering element captured on mount, restored in the mount effect's cleanup (covers ✕, footer Close, overlay click, and Escape).

### Verification
- npm test: 248 passed (25 files); tsc clean; eslint clean; production build passes. No live TMDB calls; .env.local untouched.

## v1 fix round — browse-all usability + winner animation (2026-08-24)

### 1. Browse-all modal unusable — diagnosis + fix
- Diagnosis: panel height was already bounded (`max-h-[85dvh]`, flex column, `overflow-y-auto` body from ad403c1/742dc05), so the residual "can't see most posters" gap is scroll affordance: the default scrollbar thumb is near-invisible on #17171c and overlay scrollbars hide until scrolled, leaving no visible cue that the grid scrolls.
- Fix: new `.thin-scrollbar` utility in globals.css (thin track, light rgba(236,236,241,.35) thumb, Firefox `scrollbar-color` + WebKit rules) applied to the modal body. Header (title row + filter input) and footer (N selected + Close) are static flex siblings of the scrolling grid, so they stay pinned while posters scroll.

### 2. In-modal search filter
- New pure helper `src/lib/search-filter.ts` (`filterByTitle`: case-insensitive title substring, whitespace-trimmed; empty query = all). Tested in `search-filter.test.ts`.
- Modal header gains a "Filter by title…" input with an inline ✕ clear button (shown only when active); body renders the filtered subset over the same source array, so shift+click range anchors stay exact via `movies.indexOf(mv)`. Empty-filter state shows a muted "No results match" line. All results render unfiltered when the query is empty, so native Ctrl+F covers the full set.

### 3. Unlock help text (/r/play curated mode)
- Muted helper line added directly under the 🔒 chip row, visible before any click: "Tonight's list is locked to its themed movies. Unlocking lets you add any other movie — but it leaves This Week's Marquee."
- The confirm card already repeats the consequence ("…this ranking will no longer count as this week's themed list.") — unchanged.

### 4. Links → buttons + winner animation
(a) Text-style controls converted to DESIGN.md surface buttons (surface bg / raised hover, ring-white/10, min-h-11 ≥44px): the Unlock toggle (was a bare underlined text link), "Finish now →", and "Keep voting". Exit/Join/Undo/etc. were already styled buttons.
(b) Vote settle upgrade in MatchupStage + globals.css:
- Loser side: `.loser-bop` = scale 1→0.94→1 bop (~180ms) chained into `.loser-dim` fade to 25% opacity (~200ms, forwards), replacing the old translate/fade.
- Winner side poster frame: `.winner-gold-pulse` (~250ms gold box-shadow pulse, single beat).
- Settle timer in play-room bumped 220ms → 400ms so the full sequence completes before the next matchup swaps in.
- Reduced motion: explicit media override kills both animations; loser is instantly at 25% opacity, no bop/pulse.

### Verification
- npm test: 251 passed (26 files, incl. new search-filter tests); tsc clean; eslint clean; production build passes.
- Traffic hygiene: no live calls made; .env.local untouched.
- Commits: 01eb2e5 (fix: browse-all modal usability), 108d274 (feat: winner bop animation + room button polish).

## Engine tuning + room readability round (2026-08-24)

User complaints from a real 6-movie themed session: "i'm ranking the same movies against each other over and over" and "it feels like a LOT of votes for just 6 movies and the progress bar indicates only like 70%".

### Diagnosis (measured BEFORE any change)

Extended the existing seeded sim harness (85% favorite consistency, engine pairing) to small rosters, 8 seeds each. Budget = ⌈n·log₂n⌉·2.

| n | budget | votes-to-stable range | over budget |
|---|--------|----------------------|-------------|
| 4 | 16 | 17–53 | 8/8 |
| 6 | 32 | 61–127 | 8/8 |
| 8 | 48 | 80–240 | 8/8 |
| 12 | 88 | 54–873 | 6/8 |
| 16 | 128 | 75–1674 | 7/8 |
| 20 | 174 | 38–66 | 0/8 |

Root causes found by instrumentation, in order of impact:

1. **Band-signature churn** (dominant sink at every size): `recordMatchupResult` flagged ANY signature change as significant, including split/merge of tie-bands caused by gaps hovering AT the 30-point tolerance boundary. A pair oscillating around gap≈30 resets the quiet streak forever on alternating wins. This is what produced the 800–1700-vote outliers at n=12–16.
2. **Immediate rematch**: after a vote the same two closest-rated least-compared movies could be re-picked.
3. **Over-scaled quiet streak for tiny rosters**: 6 quiet votes demanded of a 4-movie party list tuned on n=12–20.

### Fixes (commits fd2f44f / 55d5467 / design commit)

- **Anti-repeat matchup rule** (`nextMatchup(movies, previousPair)`): the exact previous matchup is excluded when any alternative exists in the least-compared tier; falls back to the wider roster if that tier IS the previous pair; unavoidable 2-movie rematch still returns. Wired through `selectNextPair` → play-room vote/park handlers. Deterministic tie-breaks preserved byte-for-byte when no exclusion passed.
- **Band hysteresis** (`recordMatchupResult`): after-signature computed with sticky thresholds — a merged pair splits only past tol+15, a split pair re-merges only under tol−15. Boundary-hover flips stop resetting settling. This collapsed large-n variance too (no more 1000+ outliers).
- **Size-scaled quiet streak** (`stabilityVotesN(activeCount)` = max(3, min(6, ⌈n/2⌉))): small rosters owe fewer consecutive quiet votes; n≥12 unchanged at 6.
- **Progress honesty**: measured `estimateRemainingVotes` (= closePairs×2, claiming 6–14 votes left) vs actual sharpen work to zero close pairs: 40–550 votes at n=4–8 — it systematically under-counts because every adjacent gap sits inside Sharpen's comfort band (120) at K=32 spread rates, which is exactly why the old done/(done+est) bar asymptoted near ~70%. Fix: bar now measures votes cast vs empirically expected consensus (`expectedConsensusVotes(n)` = ⌈n·log₂n⌉, matching r5 sim medians within ±10%), capped at 99% until stability actually fires. The "~N close calls left" text keeps its close-pair meaning.

### Sim numbers AFTER (8-seed sweep, same harness + anti-repeat mirroring play-room)

| n | budget | range | over |
|---|--------|-------|------|
| 4 | 16 | 11–24 (median 15) | 3/8 |
| 6 | 32 | 10–19 | 0/8 |
| 8 | 48 | 21–47 | 0/8 |
| 12 | 88 | 41–54 | 0/8 |
| 16 | 128 | 55–77 | 0/8 |
| 20 | 174 | 47–100 | 0/8 |

Committed harness (deterministic seeds): n=4→14, n=6→20, n=8→25, n=12→49, n=16→56, n=20→75 — all inside budget.

### Room readability pass (design commit)

TV-distance legibility per DESIGN.md, class-only: room title text-lg/sm:2xl → text-xl/sm:3xl; participant line xs/sm → sm/base; progress bar h-1.5 → h-2; progress/status line xs/sm → sm/base (vote feedback readable from couch); MatchupStage movie titles lg/sm:2xl → xl/sm:3xl and year xs/sm → sm/base; VS mark bumped one step. No palette/layout/motion changes; all touch targets stay ≥44px.

### Verification

- npm test: 260 passed (26 files), incl. new anti-repeat unit tests, scaled-streak contract tests, expectedConsensusVotes tests, and sim assertions extended to n=4/6/8.
- tsc clean; eslint clean; production build passes. No live TMDB calls made; .env.local untouched.

### Concerns

- n=4 tail: 3/8 swept seeds exceed budget 16 (max 24). Median hits budget; budget 16 ≈ theoretical floor (comparisons gate + differentiation + streak), so this is close to irreducible without weakening evidence gates further.
- Hysteresis makes differentiation slightly stricter (split needs gap>45 instead of >30); offset by the smaller streak so net effect is faster AND more stable convergence.
- Sharpen phase remains genuinely long (optional by design; UI never promises completion).

---

## Round: fix — modal poster loading reliability (2025, master @ 7236d81)

**Symptom.** Browse-all modal posters mostly invisible. DOM measurement ruled out layout (122 cards, no overlap); root cause was image loading: modal open fired 100+ concurrent TMDB CDN requests (many lazy-loaded inside a fresh scroll container), stalling frames.

**Changes** (`src/components/SearchPanel.tsx`, `src/components/MoviePosterCard.tsx`):

1. **Eager load in modal**: `MoviePosterCard` gained optional `eager` prop (default false → native `loading="lazy"` preserved in inline grid). BrowseAllModal passes `eager`.
2. **Smaller variant for grid density**: optional `sizeVariant` prop (`"w342" | "w185"`, default `"w342"`). Modal passes `"w185"` — ~170px-wide 3-4 col cards get half the bytes; 2:3 aspect and behavior unchanged.
3. **Progressive batch render**: modal renders 30 at a time with a "Show more (N remaining)" button appended to the grid; filter changes reset the count to 30. Chose button over IntersectionObserver sentinel — simplest correct approach, and it's keyboard/screen-reader friendly by construction.
4. **Skeleton state verified**: container already paints `bg-surface` frame; `alt=""` suppresses broken-image icon flash. No change needed.

**Verification.** tsc clean; eslint clean; vitest 260/260 pass (26 files); production build passes. No live TMDB calls made; .env.local untouched.

**Concerns**

- Eager + w185 means the first batch still fires 30 concurrent requests on modal open; acceptable (browsers queue per-host), but if stalls recur the next lever is staggering or a true virtualized list.
- "Show more" is a manual affordance rather than auto-loading on scroll — deliberate trade for simplicity; revisit if users report not finding results past batch 1.
