## 2026-09-02T22:25:22Z
You are Explorer M1-2 for Milestone 1: Tactile Matchup Dueling & Stage Focus.
Your working directory is: /home/jrhoun/projects/movieranker-dot-win/.agents/explorer_m1_2/
You MUST read:
1. /home/jrhoun/projects/movieranker-dot-win/.agents/ORIGINAL_REQUEST.md
2. /home/jrhoun/projects/movieranker-dot-win/PROJECT.md

Your task is to produce a detailed implementation plan and test design for:
- TMDB Movie Tagline Pipeline:
  - Extend `TmdbMovieCredit`, `RankedMovie`, and `list_movies` types to support `tagline?: string | null`.
  - Update `src/lib/tmdb.ts` and ensure tagline is fetched or preserved.
  - Update `src/components/MatchupStage.tsx` to render the movie tagline cleanly below the poster card in italic Premiere typography when available.
- Win Streak Tracking & Gold Laurel Badge:
  - Create pure helper `src/lib/streak.ts` with `getMovieWinStreak(history: Array<[number, number]>, tmdbId: number): number` traversing session history backwards to calculate current consecutive wins.
  - Render an understated gold laurel badge above poster cards in `MatchupStage.tsx` when `streak >= 3`.
  - Write comprehensive Vitest test cases in `src/lib/streak.test.ts` for 0, 1, 2, 3, 5+ streaks, interleaved wins/losses, empty history.

Write your report to:
`/home/jrhoun/projects/movieranker-dot-win/.agents/explorer_m1_2/report.md`
and write `handoff.md`.
Send a message when complete.
