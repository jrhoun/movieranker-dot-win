# TEST_READY: movieranker.win — Theatrical & Community Enhancements

## Test Suite Overview

- **Test Framework**: Vitest v4.1.11 (Node environment)
- **Total Test Files**: 49
- **Total Tests Passing**: 809 (100% pass rate, 0 failures)
- **Execution Time**: ~1.7 seconds
- **Compilation & Build**: Next.js 16.3.2 Turbopack (`npm run build`) passing with 0 TypeScript / ESLint errors

---

## 4-Tier Test Architecture & Coverage Matrix

### Tier 1: Feature Specifications (`src/lib/e2e-theatrical.test.ts`)
| Feature | Target Module | Scope & Behavior Verified | Status | Tests |
|---------|---------------|---------------------------|:------:|:-----:|
| **F1** | `src/lib/keyboard.ts` | `vote_left`, `vote_right`, `park_candidate`, `undo` hotkeys; disabled on inputs/contenteditable/modals | PASS | 6 |
| **F2** | `src/lib/tmdb.ts`, `ranking.ts`, `session.ts` | TMDB taglines normalization, preservation across sessions, forking, and roulette | PASS | 5 |
| **F3** | `src/lib/audio.ts` | Web Audio mechanical shutter click (noise + 180Hz->42Hz) & golden chime (harmonic triad 587.33/880/1479.98Hz), mute default, localStorage persistence | PASS | 6 |
| **F4** | `src/lib/streak.ts` | Consecutive win streak traversal backwards, stops at first loss, ignores unrelated matches, 3+ gold laurel badge threshold | PASS | 6 |
| **F5** | `src/lib/audio.ts`, `LightsDownToggle.tsx` | "Lights Down" cinema focus mode state, storage persistence, corrupt value fallback, accessibility | PASS | 5 |
| **F6** | `CurtainCallCelebration.tsx`, `ranking.ts` | Theatrical confetti particle generation, spotlight sweep, stability consensus triggering, reduced motion fallback | PASS | 5 |
| **F7** | `src/lib/ticket-canvas.ts` | High-DPI 1200x675 retro cinema ticket rasterization, deterministic serial, date formatting, barcode, PNG blob export, clipboard copy & download | PASS | 6 |
| **F8** | `src/lib/versus.ts` | Pairwise order concordance (`agreementPct`), sharpest clash with tie-breakers, shared favorites, copy tiers, RLS gating rules | PASS | 5 |
| **F9** | `src/app/api/lists/[id]/upvote/route.ts` | GET/POST upvote endpoints, 401 unauthenticated response, toggle insert/delete with atomic counts, 403 draft guard, rate limiting | PASS | 5 |
| **F10** | `src/lib/trending.ts`, `triptych.ts` | Done/public list filtering, upvotes/recency sorting, profile handle mapping, final rank sorting, top 3 poster triptych | PASS | 5 |
| **F11** | `src/lib/fork.ts` | Pristine session clone, reset Elo (1000) & comparisons (0), parked reset, title prefixing (`"Re-rank: "`), local persistence | PASS | 5 |
| **F12** | `src/lib/curator-roulette.ts` | 6+ thematic micro-packs, unique positive TMDB IDs, slug lookup, excluded random sampling, seeded session launch | PASS | 5 |

### Tier 2: Boundary & Corner Cases (`src/lib/e2e-theatrical.test.ts`)
- **List Size Extremes**: Verified 0-item empty lists, 1-item single rosters, and 1,000-item rosters scaling smoothly under load without memory leaks or stack overflow.
- **Corrupted Storage & Quota Exceptions**: Verified resilience against invalid JSON in session storage, empty cache calls, and `QuotaExceededError` handling.
- **Extreme Rank Reversals & Disjoint Sets**: Verified 0% agreement on inverted lists, null agreement on 0 shared movies, and proper copy tier classification.
- **Form Input Focus Guard Matrices**: Verified full matrix of modifier keys (`Ctrl`, `Meta`, `Alt`, `Shift`) and form control elements (`input`, `textarea`, `select`, `contenteditable`, `isComposing`).

### Tier 3: Cross-Feature User Journeys (`src/lib/e2e-theatrical.test.ts`)
- **Workflow A (Fork to Premiere Pass Export)**: Forking a public trending list -> launching duel with keyboard controls -> scoring consecutive victories for a 4-win streak with gold laurel badge -> achieving consensus -> generating retro Premiere Pass ticket -> copying to system clipboard.
- **Workflow B (Curator Roulette to Head-to-Head Versus)**: Spinning Curator Roulette for "Film Noir Legends" -> enabling Lights Down focus mode and Web Audio sound effects -> playing pairwise duel tournament -> comparing results side-by-side with another critic list -> extracting sharpest rank clashes and shared favorites.

### Tier 4: Real-World Application Scenarios (`src/lib/e2e-theatrical.test.ts`)
- **Scenario 1 ("Oscar Snubs" Tournament)**: Full pairwise tournament simulation across *The Shawshank Redemption*, *Pulp Fiction*, *2001: A Space Odyssey*, *Taxi Driver*, and *Goodfellas*, validating Elo convergence, streak laurel qualification, and final podium placement.
- **Scenario 2 ("90s Cyberpunk" Speedrun)**: Testing rapid keyboard blitz voting, haven't seen candidate parking via Spacebar, and vote undo via 'Z' on *The Matrix*, *Ghost in the Shell*, and *Strange Days*.
- **Scenario 3 ("A24 Gems" Critics Confrontation)**: Simulating two film critics ranking 6 modern A24 masterworks, detecting sharpest rank disagreements (*Moonlight* #2 vs #6, *Hereditary* #3 vs #6), extracting mutual #1 favorite (*Everything Everywhere All at Once*), and computing 60% pairwise concordance.

---

## Verification Commands

To independently run and verify the entire test suite and build:

```bash
# 1. Run all unit, integration, stress, and E2E tests
npm test

# 2. Run clean production Next.js build
npm run build

# 3. Run ESLint check
npx eslint src/lib/e2e-theatrical.test.ts
```

All commands exit with code 0 and zero errors.
