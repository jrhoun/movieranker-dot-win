# Orchestration Master Plan

## Objectives
Enhance movieranker.win into an immersive, theatrical, and community-driven movie ranking destination satisfying:
- R1: Tactile & Cinematic Matchup Dueling (ArrowLeft/A, ArrowRight/D, Space, Z; input focus guard; TMDB taglines; opt-in Web Audio vintage clicks/chimes muted by default; 3+ win streak gold laurel badge)
- R2: Shareable Premiere Pass & Celebration Finale (Curtain Call spotlight/confetti; retro perforated Premiere Pass graphic download/copy; /compare/[a]/[b] compatibility scoring + sharpest disagreement callout)
- R3: Community Discovery & Social Elements (Upvoting public lists with persistent toggle/count for authenticated users; sign-in prompt for guests; Trending & Popular Showcases on homepage; Fork & Re-rank button)
- R4: Lobby Immersion & "Roll the Reel" Instant Start (Curator Roulette selector on homepage for thematic micro-packs; optional "Lights Down" cinema focus mode on duel stage)
- R5: Local Isolation & Quality Guardrails (local development only, no git push; 298+ existing tests pass + new Vitest tests + clean build)

## Execution Stages
1. **Stage 0: Codebase Survey (3 Explorers)**
   - Explorer 1: Matchup dueling, keyboard events, voting state/hooks, TMDB data pipeline & poster display, audio synthesizer design.
   - Explorer 2: List completion/finale flow, ticket graphic generator (HTML5 Canvas/SVG), compare route `/compare/[a]/[b]`, taste compatibility algorithm.
   - Explorer 3: Database schema/migrations, public lists API, upvoting persistence/auth, homepage showcases (Trending/Marquee), Fork & Re-rank, Curator Roulette micro-packs, Lights Down theme.
2. **Stage 1: PROJECT.md & Milestone Architecture**
   - Synthesize survey findings into `PROJECT.md` with complete Feature Inventory, Milestones, Interface Contracts, and Code Layout.
3. **Stage 2: Milestone Iteration Loops**
   - Run Explorer -> Worker -> Reviewer -> Challenger -> Auditor cycles for each milestone.
4. **Stage 3: Comprehensive E2E Testing Track**
   - Tiers 1-4 validation + Tier 5 adversarial testing.
5. **Stage 4: Final Verification & Hand-off**
