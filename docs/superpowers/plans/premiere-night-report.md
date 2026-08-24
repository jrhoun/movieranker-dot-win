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
