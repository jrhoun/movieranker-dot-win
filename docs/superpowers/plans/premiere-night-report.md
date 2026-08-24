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
