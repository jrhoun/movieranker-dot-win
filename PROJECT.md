# Project: movieranker.win — Theatrical & Community Enhancements

## Architecture & Technology Stack
- **Framework**: Next.js 16.3.2 (App Router, Turbopack, React 19 Server & Client Components)
- **Styling**: Tailwind CSS v4, custom vintage cinema typography (Bebas Neue, Playfair Display, Outfit)
- **Database & Auth**: Supabase PostgreSQL with RLS, `@supabase/ssr`
- **State & Storage**: Client `localStorage` for `PlaySession` persistence and audio/theme preferences
- **Audio**: Web Audio API native synthesizer (OscillatorNode, GainNode, BiquadFilterNode)
- **Graphics**: Pure HTML5 2D Canvas rendering for high-DPI "Premiere Pass" golden ticket rasterization
- **Testing**: Vitest v4.1.11 (`node` environment) with comprehensive unit/integration test suites

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Keyboard Blitz Controls | Instant voting with `ArrowLeft`/`A`, `ArrowRight`/`D`, `Space` for haven't seen, `Z` for undo, guarded against input/form fields | M1 | R1 |
| 2 | TMDB Movie Taglines | Expose `tagline` in TMDB pipelines and render below posters in italic Premiere styling | M1 | R1 |
| 3 | Web Audio Vintage Sound Effects | Synthesize mechanical shutter clicks and harmonic golden chimes via Web Audio API, muted by default with UI toggle | M1 | R1 |
| 4 | Win Streak Laurel Badges | Calculate 3+ consecutive duel wins from session history and display understated gold laurel indicator | M1 | R1 |
| 5 | "Lights Down" Cinema Focus Mode | Theater blackout toggle on duel stage with dimmed peripheral chrome and spotlighting | M1 | R4 |
| 6 | "Curtain Call" Finale Celebration | Theatrical confetti particle burst and spotlight reveal upon reaching stability consensus | M2 | R2 |
| 7 | Shareable Premiere Pass Graphic | High-DPI retro perforated cinema ticket generator with 1-click PNG clipboard copy and download | M2 | R2 |
| 8 | Compare Compatibility & Disagreements | Enhanced `/compare/[a]/[b]` with compatibility score and sharpest disagreement / common ground callouts | M2 | R2 |
| 9 | Community Upvoting System | Supabase migration for `list_upvotes`, `/api/lists/[id]/upvote` toggle endpoint, client toggle with sign-in prompt | M3 | R3 |
| 10 | Trending & Popular Showcases | Query and display top community lists by upvotes/recency on the homepage | M3 | R3 |
| 11 | "Fork & Re-rank" Button | 1-click clone and re-rank action on public lists, creating a clean session and launching the duel room | M3 | R3 |
| 12 | Curator Roulette ("Roll the Reel") | Thematic micro-packs (90s Cyberpunk, A24 Gems, Noir Classics, Oscar Snubs, etc.) with spinning reel launcher | M3 | R4 |
| 13 | E2E Testing & Quality Guardrails | Comprehensive Vitest suites covering Tiers 1-4 + Tier 5 adversarial checks, 0 build errors, local isolation | M4 | R5 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Tactile Matchup Dueling & Stage Focus | Features 1, 2, 3, 4, 5 (Keyboard blitz, Taglines, Audio Synth, Streaks, Focus mode) | none | DONE |
| M2 | Shareable Premiere Pass & Compare | Features 6, 7, 8 (Curtain Call confetti, Ticket canvas, Compare callouts) | none | DONE |
| M3 | Community Social & Discovery | Features 9, 10, 11, 12 (Upvoting, Trending showcase, Fork & Re-rank, Curator Roulette) | none | DONE |
| M4 | E2E Testing Suite & Quality Verification | Feature 13 (Tiers 1-5 test suites, full regression verification, zero build errors) | M1, M2, M3 | DONE |

## Interface Contracts
### Matchup Dueling & Audio (`M1`)
- `src/lib/audio.ts`:
  - `playShutterClick(): void` — generates subtle mechanical click
  - `playGoldenChime(): void` — generates dual harmonic sine chime
  - `isSoundEnabled(): boolean` — reads `mr-sound-enabled` from localStorage (default `false`)
  - `setSoundEnabled(enabled: boolean): void` — persists preference
- `src/lib/ranking.ts` & `src/lib/session.ts`:
  - `RankedMovie.tagline?: string | null`
  - `getMovieWinStreak(history: Array<[number, number]>, tmdbId: number): number` — calculates current consecutive wins

### Premiere Pass & Compare (`M2`)
- `src/lib/ticket-canvas.ts`:
  - `generatePremierePassCanvas(options: TicketRenderOptions): Promise<HTMLCanvasElement>`
  - `exportPremierePassBlob(options: TicketRenderOptions): Promise<Blob>`
  - `copyPremierePassToClipboard(options: TicketRenderOptions): Promise<boolean>`
- `src/lib/versus.ts`:
  - `computeVersus(listA, listB)` returning enhanced payload with `biggestDisagreement` and `commonFavorites`

### Community Upvoting & Forking (`M3`)
- `src/app/api/lists/[id]/upvote/route.ts`:
  - `GET`: returns `{ upvotesCount: number, hasUpvoted: boolean }`
  - `POST`: toggles upvote for authenticated user, returns updated `{ upvotesCount: number, hasUpvoted: boolean }`, returns 401 for guests
- `src/lib/curator-roulette.ts`:
  - `CURATOR_MICRO_PACKS`: Array of `{ id, title, blurb, genre, movieIds, accentColor }`
  - `getRandomMicroPack(): CuratorMicroPack`
- `src/lib/fork.ts`:
  - `createForkSession(list: ListWithMovies): PlaySession`

## Code Layout
- `src/lib/audio.ts` — Web Audio API cinema synthesizer
- `src/lib/streak.ts` — Win streak calculation pure helpers
- `src/lib/ticket-canvas.ts` — HTML5 2D Canvas vintage cinema ticket generator
- `src/lib/curator-roulette.ts` — Thematic micro-packs & roulette selection engine
- `src/lib/fork.ts` — Fork & re-rank session initializer
- `src/components/audio/SoundToggle.tsx` — Sound toggle button
- `src/components/duel/LightsDownToggle.tsx` — Cinema focus mode toggle
- `src/components/share/PremierePassCard.tsx` — Premiere pass visual preview card
- `src/components/celebration/CurtainCallCelebration.tsx` — Golden confetti & spotlight drop
- `src/components/community/UpvoteButton.tsx` — Upvote button with persistent state
- `src/components/community/ForkButton.tsx` — Fork & re-rank button
- `src/components/roulette/CuratorRoulette.tsx` — Spinning reel micro-pack selector
- `src/app/api/lists/[id]/upvote/route.ts` — Upvote API endpoint
- `supabase/migrations/20260902_list_upvotes.sql` — SQL migration for upvotes
