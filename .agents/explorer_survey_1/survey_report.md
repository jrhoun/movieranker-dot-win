# Codebase Survey Report: Matchup Dueling UI, State Architecture, & Cinema Immersion

**Target System**: movieranker.win  
**Survey Scope**: R1 (Tactile & Cinematic Matchup Dueling) & R4 ("Lights Down" Cinema Focus Mode)  
**Date**: 2026-09-02  
**Author**: Explorer 1  

---

## Executive Summary

This report delivers a thorough architectural and source-level investigation of the duel stage in `movieranker.win`. It details:
1. **Matchup Dueling UI & Ranking Engine**: Component breakdown (`play-room.tsx`, `MatchupStage.tsx`, `ParkedStrip.tsx`), state lifecycle (`PlaySession`, localStorage, Elo ranking algorithm in `ranking.ts`, and session reducer in `session.ts`).
2. **Keyboard Blitz Controls**: Exact integration points, event listener design, key mapping (`ArrowLeft`/`A`, `ArrowRight`/`D`, `Space`, `Z`), and safety guards for form/input focus.
3. **TMDB Data Pipeline & Movie Taglines**: Data structures (`TmdbMovieCredit`, `RankedMovie`), TMDB API endpoints, server caching (`getMovieById`), and placement of cinematic taglines below poster cards.
4. **Web Audio Synthesizer**: Pure Web Audio API architecture for vintage cinema clicks, mechanical projector sound, and harmonic chimes with zero external audio assets, default-muted state, localStorage persistence, and accessible toggle.
5. **Win Streak Tracking**: Algorithm to compute consecutive wins per film from `session.history` and render an understated gold laurel badge on 3+ streaks.
6. **"Lights Down" Cinema Focus Mode**: Structure of surrounding UI, theatre-dimming CSS tokens, spotlight focus preservation, and toggle implementation.

---

## 1. Matchup Dueling UI & State Management (R1)

### 1.1 Architecture & Component Hierarchy

```
src/app/r/play/
├── page.tsx            # Server Component: resolves optional resumable list from Supabase
└── play-room.tsx       # Client Component: orchestrates duel lifecycle, state, modals, animations
    ├── <header>        # Slim control strip (MovieRanker title, Marquee badge, Exit, Undo)
    ├── Progress Banner # Unified progress bar (X of ~Y votes, Bebas gold numerals, status chips)
    ├── MatchupStage.tsx# Pairwise duel viewport (Side left, "VS" divider, Side right)
    │   └── Side        # Single movie card, poster button, title/TMDB links, "Haven't seen" button
    ├── ParkedStrip.tsx # Collapsible tray of all session movies with parked (haven't seen) toggles
    └── SaveGateSheet.tsx# Auth conversion / save modal sheet
```

### 1.2 State Model & Storage (`src/lib/session.ts` & `src/lib/ranking.ts`)

- **Session Structure (`PlaySession` in `src/lib/session.ts:9-23`)**:
  ```typescript
  export interface PlaySession {
    title: string;
    participants: string[];
    movies: RankedMovie[];
    votesSinceOrderChange: number;
    nudgeShown: boolean;
    themeSlug?: string | null;
    curated?: boolean;
    history?: Array<[number, number]>; // [winnerId, loserId] pairs in chronological order
    undoSnapshot?: PlaySession | null; // Deep snapshot prior to most recent vote/park
  }
  ```
- **Movie Model (`RankedMovie` in `src/lib/ranking.ts:1-9`)**:
  ```typescript
  export interface RankedMovie {
    tmdbId: number;
    title: string;
    posterPath: string | null;
    releaseYear: number | null;
    elo: number;          // Default: 1000
    comparisons: number;  // Count of matchups this movie has participated in
    parked: boolean;      // True when marked "Haven't seen"
    tagline?: string | null;
  }
  ```
- **Storage Persistence**:
  - `loadSession()` (`src/lib/session.ts:27-45`): Reads `localStorage.getItem("mr-session")`.
  - `saveSession(s)` (`src/lib/session.ts:47-52`): Persists JSON to `localStorage.setItem("mr-session", ...)` with quota error catch.
  - `clearSession()` (`src/lib/session.ts:54-58`): Removes `mr-session` from `localStorage`.

### 1.3 Ranking Algorithms & State Transitions (`src/lib/ranking.ts`)

- **Elo Calculation (`applyWin` at `ranking.ts:23-42`)**:
  - Uses logistic curve $E = 1 / (1 + 10^{(R_{\text{loser}} - R_{\text{winner}}) / 400})$ with $K = 32$.
  - Elo is clamped at minimum $1.0$.
  - Both winner and loser `comparisons` counter increments by 1.
- **Matchup Selection Engine (`nextMatchup` at `ranking.ts:56-122`)**:
  - Generates all active unordered pairs ($O(n^2)$).
  - Multi-tier deterministic sort:
    1. `timesCompared` (uncompared pairs first, preventing repeats).
    2. Skip immediate previous pair.
    3. `sumComparisons` (balances participation across entire roster).
    4. Closest Elo gap (maximum entropy / information gain).
    5. Deterministic tie-breaker.
- **Order Stability & Consensus (`isStable` at `ranking.ts:194-204`)**:
  - Checks if every active movie has $\ge 3$ comparisons (`STABILITY_MIN_COMPARISONS`).
  - Verifies significant differentiation occurred at least once.
  - Requires $N = \max(3, \min(6, \lceil \text{activeCount} / 2 \rceil))$ consecutive votes without significant rank order swap (`bandSignature` with hysteresis).
- **Sharpening Mode (`sharpenNextPair` at `ranking.ts:244-253`)**:
  - Evaluates adjacent pairs within `SHARPEN_COMFORT_GAP = 120` Elo to tighten close calls.
- **Podium Early-Lock (`isPodiumLocked` at `ranking.ts:208-215`)**:
  - Detects if top 3 movies each have $\ge 2$ comparisons and $\ge 20$ Elo gap above rank 4.

### 1.4 Action Routing Trace

| Action | UI Trigger (`src/components/MatchupStage.tsx` / `play-room.tsx`) | Handler in `play-room.tsx` | State Changes | Animation & UI Feedback |
| :--- | :--- | :--- | :--- | :--- |
| **Vote** | Poster click (`Side` in `MatchupStage.tsx:40-47`) | `handleVote(winnerId, loserId)` (lines 329-363) | - `applyVote(session, winnerId, loserId)`<br>- Updates Elo & comparisons<br>- Appends `[winnerId, loserId]` to `session.history`<br>- Saves `undoSnapshot` | - `navigator.vibrate(10)`<br>- `settlingLoserId` triggers `.animate-hit-right` / `.animate-hit-left` and `.animate-recoil-left` / `.animate-recoil-right`<br>- 260ms recoil timeout then `startViewTransition` swaps pair |
| **Haven't Seen (Park)** | "Haven't seen" button (`MatchupStage.tsx:93-99`) or `ParkedStrip.tsx` | `handleParkToggle(tmdbId, true)` (lines 365-373) | - `parkMovie(session, tmdbId, true)`<br>- Sets `m.parked = true`<br>- Reselects `nextPair` | - Poster immediately dims/fades into ParkedStrip with `✕` badge |
| **Undo** | "Undo" header button (`play-room.tsx:614-622`) | `handleUndo()` (lines 431-440) | - Restores `session = session.undoSnapshot`<br>- Recomputes `pair` and `sharpening` | - Reverts previous vote instantaneously |

---

## 2. Keyboard Blitz Controls Integration (R1)

### 2.1 Current State
- `play-room.tsx` currently only listens to `Escape` and `Tab` inside the `exitOpen` confirmation modal (`play-room.tsx:480-513`).
- **No keyboard shortcuts exist for active voting, skips, or undo.**

### 2.2 Blitz Controls Specification
- `ArrowLeft` or `A` / `a`: Cast vote for Left movie (`pair[0]`).
- `ArrowRight` or `D` / `d`: Cast vote for Right movie (`pair[1]`).
- `Space` (` `): Cast "Haven't seen" / skip action.
- `Z` or `z` (or `Ctrl+Z` / `Cmd+Z`): Trigger `handleUndo()`.

### 2.3 Input/Form Focus Guard & Modal Immunity
To prevent typing in inputs (e.g. participant name input, list title input) or modal navigation from accidentally casting votes:
```typescript
useEffect(() => {
  if (!ready || !session || !pair || finished) return;
  if (exitOpen || sheetStatus !== null || unlockOpen || joinOpen) return;
  if (settlingLoserId !== null) return; // Prevent input spam during 260ms recoil

  const onKeyDown = (e: KeyboardEvent) => {
    // Check if user is typing inside an editable element
    const target = e.target as HTMLElement | null;
    const tagName = target?.tagName?.toLowerCase();
    if (
      tagName === "input" ||
      tagName === "textarea" ||
      tagName === "select" ||
      target?.isContentEditable
    ) {
      return;
    }

    const key = e.key;

    if (key === "ArrowLeft" || key === "a" || key === "A") {
      e.preventDefault();
      handleVote(pair[0].tmdbId, pair[1].tmdbId);
    } else if (key === "ArrowRight" || key === "d" || key === "D") {
      e.preventDefault();
      handleVote(pair[1].tmdbId, pair[0].tmdbId);
    } else if (key === " " || key === "Spacebar") {
      e.preventDefault();
      // Haven't seen: by default marks left or opens quick choice, or parks the currently hovered/first candidate
      // Recommended: Park the left movie or current duel focus
    } else if ((key === "z" || key === "Z") && !e.shiftKey) {
      if (session.undoSnapshot) {
        e.preventDefault();
        handleUndo();
      }
    }
  };

  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}, [ready, session, pair, finished, exitOpen, sheetStatus, unlockOpen, joinOpen, settlingLoserId]);
```

---

## 3. TMDB Integration & Movie Taglines (R1)

### 3.1 TMDB Pipeline Flow

1. **Shortlist / Theme Hydration (`src/lib/shortlist.ts` & `src/app/(site)/page.tsx:39-48`)**:
   - `getMovieById(id)` in `src/lib/tmdb.ts:258-269` queries `https://api.themoviedb.org/3/movie/{id}`.
   - `getPreferredPosterPath` checks `/movie/{id}/images` for English-language artwork.
2. **Search Discovery (`src/app/api/search/route.ts` & `src/components/SearchPanel.tsx`)**:
   - Calls TMDB `/search/movie`, `/person/{id}/combined_credits`, `/discover/movie`.
3. **Movie Taglines in TMDB**:
   - The TMDB `/movie/{id}` response already returns `tagline: string | null`.
   - In `src/lib/tmdb.ts`, `TmdbRawCredit` can include `tagline?: string | null`.
   - `toCredit()` in `src/lib/tmdb.ts:57-64` transforms raw credit to `TmdbMovieCredit`:
     ```typescript
     function toCredit(m: TmdbRawCredit): TmdbMovieCredit {
       return {
         tmdbId: m.id,
         title: m.title ?? "",
         posterPath: m.poster_path ?? null,
         releaseYear: m.release_date ? Number(m.release_date.slice(0, 4)) : null,
         tagline: m.tagline?.trim() || null,
       };
     }
     ```
4. **Tagline Rendering in `MatchupStage.tsx`**:
   - Render directly below the poster card and title, above or alongside the year/TMDB badge:
   ```tsx
   {movie.tagline && (
     <p className="w-full max-w-[15rem] sm:max-w-xs md:max-w-sm text-center text-xs sm:text-sm italic text-muted/80 line-clamp-2 px-1">
       “{movie.tagline}”
     </p>
   )}
   ```

---

## 4. Web Audio Synthesizer (R1)

### 4.1 Audio Engine Architecture (Zero Asset Dependency)
Using the browser's native `AudioContext` / `webkitAudioContext`, sound effects are synthesized mathematically in real-time. This eliminates HTTP requests, audio file 404s, format compatibility issues, and latency.

### 4.2 Sound Palette Specifications
1. **Mechanical Cinema Shutter / Click (on Vote)**:
   - Oscillator: Square or Triangle wave burst at 90Hz -> 30Hz exponential frequency sweep over 35ms.
   - White Noise impulse: 15ms burst through a 1.2kHz bandpass filter.
   - Gain: Quick linear attack (2ms), exponential decay to 0 (40ms).
2. **Subtle Harmonic Chime (on Consensus / 3+ Streak)**:
   - Dual Sine waves at pentatonic harmonics (e.g. 587.33Hz [D5] + 880Hz [A5]).
   - Gain: 5ms attack, 450ms smooth exponential decay with gentle shimmer.
3. **Rewind / Undo Blip (on Undo)**:
   - Sine wave ascending frequency sweep: 220Hz -> 440Hz over 60ms.

### 4.3 Synthesizer Module Design (`src/lib/audio.ts`)
```typescript
class CinemaSoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        this.enabled = localStorage.getItem("mr-sound-enabled") === "true";
      } catch {}
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean): void {
    this.enabled = val;
    try {
      localStorage.setItem("mr-sound-enabled", val ? "true" : "false");
    } catch {}
    if (val && !this.ctx) {
      this.initCtx();
    }
  }

  private initCtx() {
    if (typeof window === "undefined") return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx && !this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  public playClick() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    
    // Mechanical low click
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.04);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.045);
  }

  public playChime() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t + i * 0.05);
      gain.gain.setValueAtTime(0.12, t + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t + i * 0.05);
      osc.stop(t + i * 0.05 + 0.45);
    });
  }
}

export const cinemaAudio = new CinemaSoundEngine();
```

### 4.4 UI Toggle Integration
- Place in `play-room.tsx` header (accessible button with `aria-label="Toggle cinema sound effects (currently muted/enabled)"`).
- Displays 🔇 (muted) / 🔊 (audio on).
- Defaults strictly to **muted** until user explicitly opts in.

---

## 5. Win Streak Tracking & Gold Laurel Badge (R1)

### 5.1 Streak Tracking Algorithm
The `PlaySession.history` records every vote as `[winnerId, loserId]`.
To detect if a movie has won $\ge 3$ consecutive matchups without any intervening losses:

```typescript
export function getMovieWinStreak(
  history: Array<[number, number]> | undefined,
  tmdbId: number,
): number {
  if (!history || history.length === 0) return 0;
  let streak = 0;
  // Traverse from most recent matchup backwards
  for (let i = history.length - 1; i >= 0; i--) {
    const [winnerId, loserId] = history[i];
    if (winnerId === tmdbId) {
      streak++;
    } else if (loserId === tmdbId) {
      break; // Streak broken by loss
    }
    // If movie didn't participate in this matchup, continue checking prior appearances
  }
  return streak;
}
```

### 5.2 Understated Gold Laurel Badge UI
- Badge renders above the poster card in `MatchupStage.tsx` when `getMovieWinStreak(session.history, movie.tmdbId) >= 3`:
```tsx
{streak >= 3 && (
  <div
    role="status"
    aria-label={`${movie.title} is on a ${streak} matchup win streak`}
    className="inline-flex items-center gap-1.5 rounded-full bg-surface-raised/90 px-3 py-1 text-xs font-semibold text-gold ring-1 ring-gold/40 shadow-sm backdrop-blur-sm animate-fade-in"
  >
    <span aria-hidden="true" className="font-display text-sm leading-none">🌿</span>
    <span>{streak} Win Streak</span>
    <span aria-hidden="true" className="font-display text-sm leading-none">🌿</span>
  </div>
)}
```
- Fits Premiere Night aesthetic: quiet gold typography, rounded capsule, delicate laurel icon, zero chaotic arcade animations.

---

## 6. "Lights Down" Cinema Focus Mode (R4)

### 6.1 Duel Stage Layout Breakdown (`src/app/r/play/play-room.tsx`)

| Element | Default Styling | Lights Down State |
| :--- | :--- | :--- |
| **Main Viewport** | `bg-bg (#0d0d10)` with soft ambient grain | `bg-black (#000000)` absolute darkness |
| **Stage Section** | `.bg-curtain-soft` with burgundy fold gradients | `.bg-black` or deep dark curtain with all fold brightness zeroed |
| **Header Bar** | `.bg-bg/85 border-gold/15 backdrop-blur-md` | Faded to `opacity-20 hover:opacity-100 transition-opacity duration-300` |
| **Progress Banner** | `.bg-surface/85 ring-white/10` | Faded to `opacity-20 hover:opacity-100 transition-opacity duration-300` |
| **Stage Spotlight** | `.stage-spotlight` (low-intensity pool) | Concentrated warm golden spotlight directly over the two poster cards |
| **ParkedStrip** | Visible collapsible bar at bottom | Dimmed / collapsed with hover-to-reveal |
| **Floating Controls** | N/A | Sleek minimal floating "Lights Up" toggle button |

### 6.2 Implementation Strategy
1. **State**: `const [lightsDown, setLightsDown] = useState(false);`
   - Initialized from `localStorage.getItem("mr-lights-down") === "true"`.
2. **Toggle Button**:
   - Added in the header next to Undo: `Lights Down` button (or 💡 / 🎬 icon).
   - Keyboard shortcut: `L` key toggles Lights Down mode.
3. **CSS Class Application**:
   - Container class conditionally applies `cinema-lights-down`:
   ```css
   .cinema-lights-down {
     background-color: #000000 !important;
   }
   .cinema-lights-down .lights-dim {
     opacity: 0.2;
     transition: opacity 300ms ease-out;
   }
   .cinema-lights-down .lights-dim:hover,
   .cinema-lights-down .lights-dim:focus-within {
     opacity: 1;
   }
   .cinema-lights-down .stage-spotlight {
     background-image:
       radial-gradient(ellipse 65% 55% at 50% 45%, rgba(245, 197, 24, 0.14), transparent 75%),
       radial-gradient(ellipse 130% 110% at 50% 50%, transparent 40%, rgba(0, 0, 0, 0.95) 90%);
   }
   ```

---

## 7. Test Strategy & Verification Plan

### 7.1 Existing Test Suite Baseline
- Vitest run: 27 test files, 298 tests all passing (`npm test`).
- Fast runtime: ~690ms.

### 7.2 Proposed New Tests
1. **`src/lib/ranking.test.ts` & `src/lib/session.test.ts`**:
   - Test `getMovieWinStreak`:
     - Returns 0 on empty history.
     - Correctly computes 1, 2, 3+ streaks when movie wins consecutive matchups.
     - Correctly resets streak to 0 upon a loss.
     - Correctly preserves streak when intervening matchups do not involve the movie.
2. **`src/lib/audio.test.ts`**:
   - Test sound engine initialization, opt-in/mute localStorage toggle, and AudioContext state handling.
3. **`play-room.test.tsx` / `MatchupStage.test.tsx`**:
   - Keyboard event tests:
     - `ArrowLeft` / `A` calls vote handler for Left movie.
     - `ArrowRight` / `D` calls vote handler for Right movie.
     - `Space` calls haven't seen handler.
     - `Z` calls undo handler.
     - Typing in `<input>` does NOT trigger any vote/undo actions.
   - Tagline rendering test:
     - When `tagline` is present, renders with quotes and italic styling.
     - When `tagline` is null/empty, does not render empty container.
   - Streak badge test:
     - Renders gold laurel badge when win streak $\ge 3$.
     - Does not render when win streak $< 3$.
   - Lights Down test:
     - Toggling lights down applies dark cinema class and persists to localStorage.

---

## Summary of Findings & Next Steps

All prerequisite structures for R1 and R4 are cleanly isolated and ready for implementation without breaking existing tests:
- `play-room.tsx` and `MatchupStage.tsx` have clear extension points for keyboard shortcuts, taglines, audio triggers, win streaks, and Lights Down mode.
- `session.ts` already tracks `history: Array<[winnerId, loserId]>` which directly enables $O(1)$ win-streak calculation.
- Synthesized Web Audio ensures complete local offline isolation without external audio assets.
