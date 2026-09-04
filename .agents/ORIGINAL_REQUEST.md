# Original User Request

## Initial Request — 2026-09-02T22:20:03Z

Enhance movieranker.win into an immersive, theatrical, and community-driven movie ranking destination with tactile dueling, celebratory sharing, and social list discovery (upvoting, trending, and forking), preserved entirely in the local development environment without pushing to origin.

Working directory: /home/jrhoun/projects/movieranker-dot-win
Integrity mode: benchmark

## Requirements

### R1. Tactile & Cinematic Matchup Dueling
Elevate the pairwise voting duel with keyboard blitz controls (Left/Right Arrow or A/D to vote, Space to mark "Haven't seen", Z to undo; bypassed when focusing inputs), TMDB movie taglines under posters for rich context, and subtle opt-in vintage cinema sound effects (Web Audio API, muted by default). Provide understated, classy visual feedback including an understated gold laurel badge for 3+ win streaks that preserves the Premiere Night aesthetic without frantic or hyperactive arcade clutter.

### R2. Shareable "Premiere Pass" & Celebration Finale
Provide a celebratory "Curtain Call" completion moment (spotlight drop / golden confetti) upon reaching consensus. Generate an exportable / 1-click copyable retro "Premiere Pass / Golden Ticket" graphic showing the #1 champion, top-ranked films, and user handle with perforated vintage cinema ticket aesthetics. Enhance head-to-head comparison (`/compare/[a]/[b]`) with cinematic taste compatibility scoring and callouts of the sharpest rank disagreements.

### R3. Community Discovery & Social Elements (Upvoting, Trending, Forking)
Introduce community-powered features allowing signed-in users to upvote public lists (with persistent toggle and count), display "Trending & Popular Showcases" on the homepage alongside the weekly marquee, and provide a prominent "Fork & Re-rank" button on all public lists allowing any visitor (guest or authenticated) to immediately launch a new duel session with that list's films.

### R4. Lobby Immersion & "Roll the Reel" Instant Start
Provide an instant-start "Roll the Reel" (Curator Roulette) selector on the homepage to launch curated thematic micro-packs in one click, and offer an optional "Lights Down" cinema focus mode on the duel stage that dims the surrounding UI to full theater blackness under warm spotlights.

### R5. Local Isolation & Quality Guardrails
All changes, database migrations, and features must run strictly within the local environment. Do not push any commits or branches to remote origin. Existing test suites must continue passing (298+ tests), and new features must include automated Vitest tests.

## Acceptance Criteria

### Dueling & Keyboard Controls
- [ ] Keyboard navigation (`ArrowLeft` / `A`, `ArrowRight` / `D`, `Space` for Haven't seen, `Z` for Undo) casts votes instantaneously during active matchups and is safely disabled when typing inside input/form fields.
- [ ] When available from TMDB, movie taglines render cleanly below poster cards.
- [ ] Web Audio sound effects synthesize vintage cinema clicks and chimes upon user opt-in, defaulting to muted with an accessible toggle.
- [ ] Movies winning 3+ consecutive matchups display a subtle gold laurel streak indicator without jarring animations.

### Sharing & Finale
- [ ] Reaching ranking consensus or finalizing a list triggers a theatrical celebration and presents a visual "Premiere Pass / Golden Ticket" card.
- [ ] The Premiere Pass can be copied or downloaded as an image for sharing.
- [ ] Comparison views calculate and display a compatibility score and explicitly highlight the largest rank disagreement.

### Community Features
- [ ] Authenticated users can toggle upvotes on public completed lists; unauthenticated users are prompted to sign in when attempting to upvote.
- [ ] Public lists display current upvote counts and owner attribution.
- [ ] Homepage showcases trending community lists alongside the deterministic weekly marquee.
- [ ] "Fork & Re-rank" button on public lists populates a fresh ranking session with the exact movie candidates and navigates to the voting room.

### Verification & Stability
- [ ] `npm test` runs and all unit/integration tests pass.
- [ ] `npm run build` completes with zero TypeScript or ESLint errors.
- [ ] Git remote origin is untouched (no `git push`).
