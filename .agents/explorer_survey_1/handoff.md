# Handoff Report: Matchup Dueling UI & Cinema Focus Mode Survey

**Author**: Explorer 1  
**Working Directory**: `/home/jrhoun/projects/movieranker-dot-win/.agents/explorer_survey_1`  
**Report Artifact**: `/home/jrhoun/projects/movieranker-dot-win/.agents/explorer_survey_1/survey_report.md`  
**Scope**: R1 (Tactile & Cinematic Matchup Dueling) & R4 ("Lights Down" Cinema Focus Mode)  
**Date**: 2026-09-02  

---

## 1. Observation

1. **Duel Stage & State Architecture**:
   - `src/app/r/play/play-room.tsx` (lines 121-1043) is the client duel orchestrator. State `session: PlaySession` is initialized via `loadSession()` (`src/lib/session.ts:27-45`) or server draft `initial: ResumedList`.
   - `PlaySession` in `src/lib/session.ts:9-23` tracks `history?: Array<[number, number]>` and `undoSnapshot?: PlaySession | null`.
   - `applyVote` in `src/lib/session.ts:89-103` updates Elo ratings via `recordMatchupResult` (`src/lib/ranking.ts:160-185`) and appends `[winnerId, loserId]` to `session.history`.
   - Votes trigger a 260ms recoil animation (`settlingLoserId` in `play-room.tsx:347-362`, `.animate-hit-right` / `.animate-recoil-left` in `src/app/globals.css:190-233`) before swapping pairs via `startViewTransition` or `selectNextPair`.

2. **Keyboard Event Handling**:
   - `play-room.tsx` lines 480-513 currently only listen to `Escape` and `Tab` for the exit confirmation modal.
   - There are **no active keyboard shortcuts** for voting (`ArrowLeft`/`A`, `ArrowRight`/`D`), skips (`Space`), or undo (`Z`).

3. **TMDB Integration & Movie Tagline Pipeline**:
   - `src/lib/tmdb.ts:258-269` defines `getMovieById(id)` which calls TMDB `/movie/{id}`. TMDB native payload contains `tagline: string | null`.
   - `TmdbRawCredit` (`src/lib/tmdb.ts:30-39`), `TmdbMovieCredit` (`src/lib/tmdb.ts:21-26`), and `RankedMovie` (`src/lib/ranking.ts:1-9`) currently do not expose `tagline`.
   - `src/components/MatchupStage.tsx:69-92` renders the movie title and year/TMDB link below the poster button, with available space for a tagline block.

4. **Audio Synthesizer & Preferences**:
   - No audio playback or Web Audio synthesizer currently exists in the project.
   - Browser Web Audio API (`AudioContext`) can generate mechanical shutter clicks (square/triangle burst + noise impulse) and pentatonic harmonic chimes (dual sine waves) with 0 external sound files.

5. **Win Streaks & Laurel Badges**:
   - `session.history` holds chronological `[winnerId, loserId]` records.
   - No streak calculation or badge UI exists in `MatchupStage.tsx` yet.

6. **"Lights Down" Cinema Focus Mode**:
   - The duel stage is composed of: header (`play-room.tsx:557-624`), progress banner (`play-room.tsx:924-1000`), stage section (`play-room.tsx:921-1012`), and parked strip (`play-room.tsx:1015-1017`).
   - No focus mode / dimming state currently exists.

7. **Test Suite Baseline**:
   - `npm test` executes Vitest across 27 test files, passing 298/298 tests in ~690ms.

---

## 2. Logic Chain

1. **Keyboard Controls Safety**:
   - *Observation*: Keyboard blitz navigation must not fire when the user interacts with input fields (such as participant names, list titles, search bars, or modal dialogs).
   - *Inference*: Attaching a global `window.addEventListener("keydown", ...)` inside a `useEffect` on `play-room.tsx` guarded with `target.tagName !== "INPUT" && target.tagName !== "TEXTAREA" && !target.isContentEditable && !exitOpen && !sheetStatus && settlingLoserId === null` guarantees zero accidental votes and instant response during active dueling.

2. **Tagline Storage & Presentation**:
   - *Observation*: TMDB `/movie/{id}` supplies `tagline`, and `getMovieById` runs server-side during theme hydration.
   - *Inference*: Adding optional `tagline?: string | null` to `TmdbMovieCredit`, `RankedMovie`, and `list_movies` preserves full backward compatibility with existing drafts while enabling `MatchupStage.tsx` to display the tagline in italic Premiere typography under poster cards.

3. **Offline-First Web Audio Architecture**:
   - *Observation*: Network requests for external MP3/WAV assets introduce latency, loading race conditions, and asset 404 risks.
   - *Inference*: A standalone synthesizer module `src/lib/audio.ts` using native `AudioContext` nodes (OscillatorNode, GainNode, BiquadFilterNode) generates high-fidelity vintage clicks and golden chimes on-demand with 0 external dependencies. Setting default state to `muted` with localStorage key `mr-sound-enabled` satisfies all requirements and browser autoplay policies.

4. **Win Streak Derivation**:
   - *Observation*: `session.history` preserves the exact sequence of pairwise decisions.
   - *Inference*: A pure function `getMovieWinStreak(history, tmdbId)` traversing `history` in reverse from the latest matchup computes the exact consecutive win count in $O(k)$ time where $k \le \text{comparisons}$. When `streak >= 3`, rendering an understated gold laurel badge in `MatchupStage.tsx` satisfies the acceptance criteria without state bloating.

5. **"Lights Down" Cinema Immersion**:
   - *Observation*: The duel stage contains several distinct UI zones in `play-room.tsx`.
   - *Inference*: Toggling a `cinema-lights-down` class on the duel container sets the viewport to pure black (`#000000`), dims peripheral chrome (`opacity: 0.2`), and focuses stage spotlight intensity directly over the two competing poster cards.

---

## 3. Caveats

1. **Space Key Action Selection**: Spacebar is designated for "Haven't seen" (skipping). In pairwise dueling, there are two movies on screen. The implementation plan should specify whether Space marks the left card, the right card, or opens a quick skip confirmation. Recommended: Park the first active card or provide distinct key combos (e.g. `Space` skips/parks Left, or Space parks the hovered/focused candidate).
2. **TMDB Rate Limits & Search Taglines**: While `/movie/{id}` returns `tagline`, bulk search endpoints (`/search/movie`) do not include taglines in TMDB's compact result set. Movie search candidates may initially have `tagline: null` unless fetched via `/movie/{id}` on selection.
3. **Browser AudioContext Policy**: Modern browsers require user interaction before `AudioContext` can produce sound. The sound engine must initialize/resume context on the first user click/keypress.

---

## 4. Conclusion

The existing architecture in `src/app/r/play/play-room.tsx`, `src/lib/ranking.ts`, `src/lib/session.ts`, and `src/components/MatchupStage.tsx` provides clean, decoupled integration points for all R1 and R4 requirements. All enhancements can be implemented incrementally with zero regression to the existing 298 unit and integration tests.

---

## 5. Verification Method

1. **Run unit tests**:
   ```bash
   npm test
   ```
2. **Build and lint check**:
   ```bash
   npm run build
   npm run lint
   ```
3. **Inspect primary source files**:
   - `src/app/r/play/play-room.tsx`
   - `src/components/MatchupStage.tsx`
   - `src/lib/ranking.ts`
   - `src/lib/session.ts`
   - `src/lib/tmdb.ts`
   - `src/app/globals.css`
4. **Survey Artifact Inspection**:
   - View `/home/jrhoun/projects/movieranker-dot-win/.agents/explorer_survey_1/survey_report.md`
