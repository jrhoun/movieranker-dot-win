# E2E Test Infra: movieranker.win Theatrical Enhancements

## Test Philosophy
- Opaque-box, requirement-driven.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinations + Workload Testing.

## Feature Inventory & Test Coverage Goals
| # | Feature | Source | Tier 1 (Specs) | Tier 2 (Boundaries) | Tier 3 (Interactions) | Tier 4 (Workloads) |
|---|---------|--------|:--------------:|:-------------------:|:---------------------:|:------------------:|
| 1 | Keyboard Blitz Navigation | R1 | 5 | 5 | ✓ | ✓ |
| 2 | TMDB Movie Taglines | R1 | 5 | 5 | ✓ | ✓ |
| 3 | Web Audio Vintage Sound Synth | R1 | 5 | 5 | ✓ | ✓ |
| 4 | Win Streak Laurel Badges | R1 | 5 | 5 | ✓ | ✓ |
| 5 | "Lights Down" Cinema Focus Mode | R4 | 5 | 5 | ✓ | ✓ |
| 6 | Curtain Call Celebration | R2 | 5 | 5 | ✓ | ✓ |
| 7 | Shareable Premiere Pass Graphic | R2 | 5 | 5 | ✓ | ✓ |
| 8 | Compare Compatibility & Disagreements | R2 | 5 | 5 | ✓ | ✓ |
| 9 | Community Upvoting System | R3 | 5 | 5 | ✓ | ✓ |
| 10 | Trending & Popular Showcases | R3 | 5 | 5 | ✓ | ✓ |
| 11 | Fork & Re-rank Button | R3 | 5 | 5 | ✓ | ✓ |
| 12 | Curator Roulette Micro-Packs | R4 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- Framework: Vitest (`npm test`)
- Unit/Integration test patterns in `src/**/*.test.ts`
- E2E & Component simulation test suites
- Target: Maintain 100% pass on existing 298 tests while expanding with new suites.
