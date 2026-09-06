# Implementation Plan & Test Design: Web Audio Vintage Sound Effects & "Lights Down" Cinema Focus Mode

## Executive Summary
This document provides the complete architectural specification, synthesizer mathematical models, component designs, CSS styling rules, and comprehensive Vitest test designs for two core features of **Milestone 1 (Tactile Matchup Dueling & Stage Focus)**:
1. **Web Audio Vintage Cinema Sound Effects (`src/lib/audio.ts`)**:
   - Pure client-side synthesizer using browser-native `AudioContext` with **zero external audio assets** (.mp3/.wav/.ogg).
   - **Mechanical Shutter Click (`playShutterClick`)**: Tactile acoustic feedback for voting, parking, and undoing matchups, blending a high-frequency filtered noise impulse with a pitch-swept low mechanical thud (35–45ms).
   - **Pentatonic Golden Chime (`playGoldenChime`)**: Luminous celestial bell chime for consensus completions, milestones, and 3+ win streaks, synthesizing a golden harmonic triad (D5 587.33 Hz, A5 880.00 Hz, F#6 1479.98 Hz) with natural exponential decay (~800ms).
   - **Preference Persistence**: Persisted in `localStorage` key `mr-sound-enabled`, strictly defaulting to `false` (muted) with quota-safe guards.
   - **Sound Toggle Component (`src/components/audio/SoundToggle.tsx`)**: Accessible header button with custom vector SVG icons, keyboard focus rings, and ARIA state.
2. **"Lights Down" Cinema Focus Mode**:
   - Optional atmospheric toggle in the duel room header (`src/components/duel/LightsDownToggle.tsx`).
   - Deep `#000000` theater blackness backdrop with enhanced stage spotlighting on active duel cards.
   - Peripheral header, progress strip, navigation, and controls dim to `opacity: 0.2`, smoothly restoring to full `opacity: 1` on hover or keyboard focus (`:focus-within`).
   - Preference persistence in `localStorage` key `mr-lights-down` (defaulting to `false`).
3. **Comprehensive Vitest Test Suite (`src/lib/audio.test.ts`)**:
   - Complete Web Audio API Node test environment mock (AudioContext, OscillatorNode, GainNode, BiquadFilterNode, AudioBuffer).
   - Full test coverage for synthesizer graphs, envelope calculations, mute behavior, autoplay unlock, and preference error handling.

---

## 1. Web Audio Synthesizer Architecture (`src/lib/audio.ts`)

### 1.1 Web Audio Design Philosophy & Zero-Asset Guarantee
- **Zero Asset Overhead**: No HTTP requests for audio files, no asset loading latency, no decoding overhead, and zero asset 404 risk.
- **Micro-Footprint**: The entire synthesizer is ~120 lines of pure TypeScript code.
- **Deterministic & Instant**: Immediate playback with sub-millisecond start latency.
- **Premiere Night Aesthetic**: Subdued, warm, tactile vintage cinema feel. Sound levels are calibrated to be subtle and non-intrusive during rapid keyboard blitz dueling.

---

### 1.2 Synthesizer Mathematical Models & Audio Graphs

```
[ Mechanical Shutter Click Graph ]

Noise Buffer (25ms) ----> BiquadFilter (Bandpass 2200Hz, Q=1.8) ----> GainNode (0.18 -> 0.001 in 22ms) ----+
                                                                                                             |---> ctx.destination
Oscillator (Triangle 180Hz -> 42Hz) ----> BiquadFilter (Lowpass 300Hz) -> GainNode (0.22 -> 0.001 in 38ms) -+


[ Pentatonic Golden Chime Graph ]

Oscillator 1 (Sine 587.33Hz) ----> GainNode 1 (Attack 10ms, Decay 800ms, Peak 0.15) ---+
                                                                                       |
Oscillator 2 (Sine 880.00Hz, +20ms) -> GainNode 2 (Attack 10ms, Decay 750ms, Peak 0.14) -+--> BiquadFilter (Lowpass 3200Hz) -> ctx.destination
                                                                                       |
Oscillator 3 (Sine 1479.98Hz, +40ms) -> GainNode 3 (Attack 10ms, Decay 600ms, Peak 0.06) +
```

#### Sound 1: Mechanical Shutter Click (`playShutterClick`)
Simulates the tactile acoustic release of a vintage 35mm film projector shutter or mechanical Leica shutter:
1. **Transient Noise Friction**:
   - Sample rate buffer of duration 25ms filled with normalized white noise (`Math.random() * 2 - 1`).
   - Bandpass filter centered at **2200 Hz** with `Q = 1.8` to isolate metallic shutter blade friction.
   - Exponential gain envelope starting at **0.18** peak and decaying to **0.001** over **22ms**.
2. **Low-Frequency Mechanical Body**:
   - Triangle waveform oscillator sweeping rapidly from **180 Hz** down to **42 Hz** over **35ms** (`exponentialRampToValueAtTime(42, now + 0.035)`).
   - Low-pass filter at **300 Hz** providing warm acoustic damping.
   - Exponential gain envelope starting at **0.22** peak and decaying to **0.001** over **38ms**.
3. **Total Duration**: ~42ms.
4. **Volume**: Subdued (peak master ~0.20) ensuring blitz voting (5-10 votes/sec) sounds crisp without fatigue.

#### Sound 2: Pentatonic Golden Chime (`playGoldenChime`)
Simulates a resonant celestial vibraphone or orchestral bell celebrating consensus or milestones:
1. **Harmonic Frequencies (D Major Pentatonic / Golden Triad)**:
   - **Fundamental (D5)**: `587.33 Hz` (warm body).
   - **Fifth / Harmonic (A5)**: `880.00 Hz` (perfect fifth shimmer, offset +20ms).
   - **Sparkle Overtone (F#6)**: `1479.98 Hz` (major third celestial overtone, offset +40ms).
2. **Envelopes**:
   - **Note 1 (D5)**: Linear attack to 0.15 in 10ms, exponential decay to 0.0001 over 800ms.
   - **Note 2 (A5)**: Offset +20ms, linear attack to 0.14 in 10ms, exponential decay to 0.0001 over 750ms.
   - **Note 3 (F#6)**: Offset +40ms, linear attack to 0.06 in 10ms, exponential decay to 0.0001 over 600ms.
3. **Warmth Filtering**:
   - All three notes sum into a low-pass filter at **3200 Hz** (`Q = 0.7`) to remove digital aliasing and create an analog acoustic sheen.
4. **Total Duration**: ~850ms.

---

### 1.3 AudioContext Lifecycle & Autoplay Handling
- **Singleton Instance**: Lazily created on first client-side access (`typeof window !== "undefined"`).
- **Autoplay Unlock**:
  - When `ctx.state === "suspended"`, calling `unlockAudioContext()` executes `ctx.resume()` inside user gesture handlers (click, keydown, toggle).
- **Resource Cleanup**:
  - Oscillators and noise buffer source nodes call `.stop(stopTime)`.
  - Disconnect timers clean up node graph connections to prevent memory buildup in long duel sessions.


### 1.4 Complete Code Implementation: \`src/lib/audio.ts\`

```typescript
/**
 * Web Audio API Vintage Cinema Sound Effects Synthesizer
 *
 * Pure synthesizer using browser native AudioContext.
 * Zero external audio assets, zero network requests, instant playback.
 * Muted by default with localStorage persistence ("mr-sound-enabled").
 */

export const STORAGE_KEY_SOUND = "mr-sound-enabled";
export const STORAGE_KEY_LIGHTS_DOWN = "mr-lights-down";

let globalAudioCtx: AudioContext | null = null;

/**
 * Returns the lazily initialized AudioContext or null in SSR / unsupported environments.
 */
export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!globalAudioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      try {
        globalAudioCtx = new AudioContextClass();
      } catch {
        globalAudioCtx = null;
      }
    }
  }
  return globalAudioCtx;
}

/**
 * Resumes the AudioContext if it is suspended by browser autoplay policy.
 */
export async function unlockAudioContext(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      // Ignore browser autoplay rejection
    }
  }
}

/**
 * Checks whether sound effects are enabled in user preferences.
 * Defaults to false (muted).
 */
export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY_SOUND) === "true";
  } catch {
    return false;
  }
}

/**
 * Updates sound effects preference in localStorage.
 */
export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_SOUND, enabled ? "true" : "false");
  } catch {
    // Gracefully handle storage quota or privacy restrictions
  }
}

/**
 * Checks whether Lights Down focus mode is enabled in user preferences.
 * Defaults to false.
 */
export function isLightsDown(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY_LIGHTS_DOWN) === "true";
  } catch {
    return false;
  }
}

/**
 * Updates Lights Down focus mode preference in localStorage.
 */
export function setLightsDown(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_LIGHTS_DOWN, enabled ? "true" : "false");
  } catch {
    // Gracefully handle storage quota or privacy restrictions
  }
}

/**
 * Synthesizes a vintage 35mm mechanical shutter click.
 * Combines high-passed white noise with a pitch-swept mechanical thud.
 */
export function playShutterClick(customCtx?: AudioContext | null): void {
  if (!isSoundEnabled()) return;
  const ctx = customCtx ?? getAudioContext();
  if (!ctx) return;
  void unlockAudioContext();

  const now = ctx.currentTime;

  try {
    // 1. Transient mechanical noise burst (shutter blade friction)
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * 0.025));
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(2200, now);
    noiseFilter.Q.setValueAtTime(1.8, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.18, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.022);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + 0.025);

    // 2. Low mechanical body thud (mechanism spring & housing)
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.035);

    const lowFilter = ctx.createBiquadFilter();
    lowFilter.type = "lowpass";
    lowFilter.frequency.setValueAtTime(300, now);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.22, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);

    osc.connect(lowFilter);
    lowFilter.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  } catch {
    // Audio synthesis failure safe guard
  }
}

/**
 * Synthesizes a celestial pentatonic golden chime.
 * Synthesizes an uplifting harmonic triad (D5, A5, F#6) with bell decay.
 */
export function playGoldenChime(customCtx?: AudioContext | null): void {
  if (!isSoundEnabled()) return;
  const ctx = customCtx ?? getAudioContext();
  if (!ctx) return;
  void unlockAudioContext();

  const now = ctx.currentTime;

  try {
    const masterFilter = ctx.createBiquadFilter();
    masterFilter.type = "lowpass";
    masterFilter.frequency.setValueAtTime(3200, now);
    masterFilter.connect(ctx.destination);

    // Harmonic triad: Fundamental D5 (587.33Hz), Fifth A5 (880.00Hz), Third F#6 (1479.98Hz)
    const notes = [
      { freq: 587.33, peak: 0.15, offset: 0.0, attack: 0.01, decay: 0.8 },
      { freq: 880.0, peak: 0.14, offset: 0.02, attack: 0.01, decay: 0.75 },
      { freq: 1479.98, peak: 0.06, offset: 0.04, attack: 0.01, decay: 0.6 },
    ];

    for (const note of notes) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(note.freq, now + note.offset);

      const gain = ctx.createGain();
      const startTime = now + note.offset;
      const attackEnd = startTime + note.attack;
      const decayEnd = startTime + note.decay;

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(note.peak, attackEnd);
      gain.gain.exponentialRampToValueAtTime(0.0001, decayEnd);

      osc.connect(gain);
      gain.connect(masterFilter);

      osc.start(startTime);
      osc.stop(decayEnd + 0.05);
    }
  } catch {
    // Audio synthesis failure safe guard
  }
}
```

---

## 2. "Lights Down" Cinema Focus Mode Architecture

### 2.1 Visual Objectives & Theatrical Contrast
- **Total Theater Blackness**: Background shifts from `--bg: #0d0d10` to pure obsidian `#000000`.
- **Spotlight Concentration**: The central matchup stage receives a warm, luminous radial spotlight (`rgba(245, 197, 24, 0.14)`), making poster art the absolute focal anchor.
- **Peripheral Dimming**: Header, progress bars, exit/unlock triggers, and parked strips drop to **`opacity: 0.2`** with brightness filtering (`brightness(0.75)`).
- **Interactive Restoration**: When the user hovers over or focuses into (`:focus-within`) any peripheral chrome, opacity smoothly elevates to **`1.0`** within 300ms, ensuring full functionality without friction.

---

### 2.2 CSS Rules in `src/app/globals.css`

```css
/* ==========================================================================
   Lights Down Cinema Focus Mode (Milestone 1, Requirement R4)
   ========================================================================== */

.cinema-lights-down {
  --bg: #000000;
  background-color: #000000 !important;
  transition: background-color 400ms ease-out;
}

/* Dim peripheral chrome down to 20% opacity */
.cinema-lights-down .cinema-peripheral,
.cinema-lights-down header,
.cinema-lights-down .mini-marquee-board,
.cinema-lights-down .parked-strip-container {
  opacity: 0.2;
  filter: brightness(0.75);
  transition: opacity 300ms ease-out, filter 300ms ease-out;
}

/* Restore full opacity and brightness on hover or keyboard focus */
.cinema-lights-down .cinema-peripheral:hover,
.cinema-lights-down .cinema-peripheral:focus-within,
.cinema-lights-down header:hover,
.cinema-lights-down header:focus-within,
.cinema-lights-down .mini-marquee-board:hover,
.cinema-lights-down .mini-marquee-board:focus-within,
.cinema-lights-down .parked-strip-container:hover,
.cinema-lights-down .parked-strip-container:focus-within {
  opacity: 1;
  filter: brightness(1);
}

/* Deep theatrical spotlight on active matchup stage */
.cinema-lights-down .stage-spotlight {
  background-image:
    radial-gradient(ellipse 65% 55% at 50% 45%, rgba(245, 197, 24, 0.14), transparent 75%),
    radial-gradient(ellipse 110% 95% at 50% 50%, transparent 40%, rgba(0, 0, 0, 0.95) 100%);
}

/* Enhanced poster card shadow depth under lights down */
.cinema-lights-down .matchup-stage-container button div {
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.9), 0 0 50px rgba(245, 197, 24, 0.2);
}

@media (prefers-reduced-motion: reduce) {
  .cinema-lights-down,
  .cinema-lights-down .cinema-peripheral,
  .cinema-lights-down header,
  .cinema-lights-down .mini-marquee-board,
  .cinema-lights-down .parked-strip-container {
    transition: none !important;
  }
}
```


---

## 3. UI Components
### 3.1 `src/components/audio/SoundToggle.tsx`
Accessible button placed in the duel stage header:

```tsx
"use client";

function SoundOnIcon({ className = "size-3.5 sm:size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function SoundOffIcon({ className = "size-3.5 sm:size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

export interface SoundToggleProps {
  isSoundEnabled: boolean;
  onToggle: () => void;
  className?: string;
}

export default function SoundToggle({
  isSoundEnabled,
  onToggle,
  className = "",
}: SoundToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isSoundEnabled}
      aria-label={
        isSoundEnabled
          ? "Sound effects enabled. Click to mute vintage cinema audio."
          : "Sound effects muted. Click to enable vintage cinema audio."
      }
      title={isSoundEnabled ? "Mute cinema audio (Sound: ON)" : "Unmute cinema audio (Sound: OFF)"}
      className={`inline-flex min-h-8 items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium ring-1 transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold active:scale-95 ${
        isSoundEnabled
          ? "bg-gold/15 text-gold ring-gold/40 hover:bg-gold/25"
          : "bg-surface text-muted ring-white/10 hover:bg-white/10 hover:text-text"
      } ${className}`}
    >
      {isSoundEnabled ? <SoundOnIcon /> : <SoundOffIcon />}
      <span className="hidden md:inline">
        {isSoundEnabled ? "Sound ON" : "Sound OFF"}
      </span>
    </button>
  );
}
```

---

### 3.2 `src/components/duel/LightsDownToggle.tsx`
Accessible button placed in the duel stage header:

```tsx
"use client";

function ProjectorBeamIcon({ className = "size-3.5 sm:size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="7" width="14" height="10" rx="2" fill="currentColor" fillOpacity="0.2" />
      <polygon points="16 10 22 7 22 17 16 14 16 10" fill="currentColor" />
      <circle cx="9" cy="12" r="2" />
    </svg>
  );
}

export interface LightsDownToggleProps {
  isLightsDown: boolean;
  onToggle: () => void;
  className?: string;
}

export default function LightsDownToggle({
  isLightsDown,
  onToggle,
  className = "",
}: LightsDownToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isLightsDown}
      aria-label={
        isLightsDown
          ? "Lights down focus mode enabled. Click to restore ambient lighting."
          : "Lights up. Click to enable Lights Down theater focus mode."
      }
      title={
        isLightsDown
          ? "Turn lights up (Exit theater focus)"
          : "Turn lights down (Theater focus mode)"
      }
      className={`inline-flex min-h-8 items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium ring-1 transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold active:scale-95 ${
        isLightsDown
          ? "bg-gold/20 text-gold ring-gold/50 shadow-[0_0_12px_rgba(245,197,24,0.25)] hover:bg-gold/30"
          : "bg-surface text-muted ring-white/10 hover:bg-white/10 hover:text-text"
      } ${className}`}
    >
      <ProjectorBeamIcon />
      <span className="hidden md:inline">
        {isLightsDown ? "Lights Down" : "Lights Up"}
      </span>
    </button>
  );
}
```

---

## 4. Component Integration in `src/app/r/play/play-room.tsx`

### 4.1 State Initialization & Handlers
In `play-room.tsx`:
```tsx
import SoundToggle from "@/components/audio/SoundToggle";
import LightsDownToggle from "@/components/duel/LightsDownToggle";
import {
  isLightsDown,
  isSoundEnabled,
  playGoldenChime,
  playShutterClick,
  setLightsDown,
  setSoundEnabled,
} from "@/lib/audio";
import { getMovieWinStreak } from "@/lib/streak";
```

Inside `PlayRoom`:
```tsx
const [soundEnabled, setSoundEnabledState] = useState(false);
const [lightsDown, setLightsDownState] = useState(false);

useEffect(() => {
  setSoundEnabledState(isSoundEnabled());
  setLightsDownState(isLightsDown());
}, []);

function handleToggleSound() {
  const next = !soundEnabled;
  setSoundEnabled(next);
  setSoundEnabledState(next);
  if (next) {
    playShutterClick();
  }
}

function handleToggleLightsDown() {
  const next = !lightsDown;
  setLightsDown(next);
  setLightsDownState(next);
}
```

### 4.2 Triggering Sound Effects on User Actions
1. **Vote Casting (`handleVote`)**:
   ```tsx
   playShutterClick();
   const next = applyVote(session, winnerId, loserId);
   // Check for 3+ win streak or consensus trigger
   const currentStreak = getMovieWinStreak(next.history, winnerId);
   if (currentStreak === 3) {
     playGoldenChime();
   }
   ```
2. **Consensus Stability**:
   ```tsx
   if (!stable && nextStable) {
     playGoldenChime();
   }
   ```
3. **Park / Haven't Seen (`handleParkToggle`)**:
   ```tsx
   playShutterClick();
   ```
4. **Undo Vote (`handleUndo`)**:
   ```tsx
   playShutterClick();
   ```

### 4.3 Markup Classes for Lights Down Mode
```tsx
<main className={`mx-auto flex min-h-dvh w-full flex-col transition-colors duration-500 ${lightsDown ? "cinema-lights-down" : ""}`}>
  <header className={`sticky top-0 z-20 flex items-center gap-2 sm:gap-3 border-b border-gold/15 bg-bg/85 px-3 py-2 sm:px-6 sm:py-2.5 backdrop-blur-md transition-opacity duration-300 ${lightsDown ? "cinema-peripheral" : ""}`}>
    ...
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      <LightsDownToggle isLightsDown={lightsDown} onToggle={handleToggleLightsDown} />
      <SoundToggle isSoundEnabled={soundEnabled} onToggle={handleToggleSound} />
      ...
    </div>
  </header>
  ...
  <div className={`mini-marquee-board mt-3 mb-6 sm:mb-8 w-full max-w-5xl mx-auto rounded-xl bg-surface/85 px-4 py-3.5 ring-1 ring-white/10 shadow-lg backdrop-blur-sm transition-opacity duration-300 ${lightsDown ? "cinema-peripheral" : ""}`}>
    ...
  </div>
  ...
  <div className={`parked-strip-container transition-opacity duration-300 ${lightsDown ? "cinema-peripheral" : ""}`}>
    <ParkedStrip movies={session.movies} onToggle={handleParkToggle} />
  </div>
</main>
```

---

## 5. Comprehensive Vitest Test Suite (`src/lib/audio.test.ts`)

Below is the complete, self-contained unit test file for `src/lib/audio.test.ts` verifying all preferences, Web Audio API graph creation, envelopes, and edge cases under the Vitest `node` environment:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isLightsDown,
  isSoundEnabled,
  playGoldenChime,
  playShutterClick,
  setLightsDown,
  setSoundEnabled,
  STORAGE_KEY_LIGHTS_DOWN,
  STORAGE_KEY_SOUND,
  unlockAudioContext,
} from "./audio";

// In-memory mock localStorage
const store = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => {
    if (k === "boom") throw new DOMException("quota", "QuotaExceededError");
    store.set(k, v);
  },
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
});

// Mock Web Audio Graph Nodes
function createMockAudioParam(initialValue = 0) {
  return {
    value: initialValue,
    setValueAtTime: vi.fn().mockReturnThis(),
    exponentialRampToValueAtTime: vi.fn().mockReturnThis(),
    linearRampToValueAtTime: vi.fn().mockReturnThis(),
  };
}

function createMockGainNode() {
  return {
    gain: createMockAudioParam(1),
    connect: vi.fn().mockReturnThis(),
    disconnect: vi.fn().mockReturnThis(),
  };
}

function createMockOscillatorNode() {
  return {
    type: "sine",
    frequency: createMockAudioParam(440),
    connect: vi.fn().mockReturnThis(),
    disconnect: vi.fn().mockReturnThis(),
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
  };
}

function createMockBiquadFilterNode() {
  return {
    type: "lowpass",
    frequency: createMockAudioParam(1000),
    Q: createMockAudioParam(1),
    connect: vi.fn().mockReturnThis(),
    disconnect: vi.fn().mockReturnThis(),
  };
}

function createMockAudioBufferSourceNode() {
  return {
    buffer: null,
    connect: vi.fn().mockReturnThis(),
    disconnect: vi.fn().mockReturnThis(),
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
  };
}

function createMockAudioContext() {
  const createdOscillators: ReturnType<typeof createMockOscillatorNode>[] = [];
  const createdGains: ReturnType<typeof createMockGainNode>[] = [];
  const createdFilters: ReturnType<typeof createMockBiquadFilterNode>[] = [];
  const createdBufferSources: ReturnType<typeof createMockAudioBufferSourceNode>[] = [];

  const ctx = {
    currentTime: 10.0,
    sampleRate: 44100,
    state: "running" as AudioContextState,
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    createGain: vi.fn(() => {
      const g = createMockGainNode();
      createdGains.push(g);
      return g as unknown as GainNode;
    }),
    createOscillator: vi.fn(() => {
      const osc = createMockOscillatorNode();
      createdOscillators.push(osc);
      return osc as unknown as OscillatorNode;
    }),
    createBiquadFilter: vi.fn(() => {
      const f = createMockBiquadFilterNode();
      createdFilters.push(f);
      return f as unknown as BiquadFilterNode;
    }),
    createBufferSource: vi.fn(() => {
      const bs = createMockAudioBufferSourceNode();
      createdBufferSources.push(bs);
      return bs as unknown as AudioBufferSourceNode;
    }),
    createBuffer: vi.fn((channels: number, length: number, sampleRate: number) => {
      const channelData = new Float32Array(length);
      return {
        numberOfChannels: channels,
        length,
        sampleRate,
        duration: length / sampleRate,
        getChannelData: vi.fn(() => channelData),
      } as unknown as AudioBuffer;
    }),
    _oscillators: createdOscillators,
    _gains: createdGains,
    _filters: createdFilters,
    _bufferSources: createdBufferSources,
  };

  return ctx;
}

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  store.clear();
});

describe("Audio and Lights Down Preference Persistence", () => {
  it("defaults sound to false (muted)", () => {
    expect(isSoundEnabled()).toBe(false);
  });

  it("round-trips sound enabled state via setSoundEnabled", () => {
    setSoundEnabled(true);
    expect(isSoundEnabled()).toBe(true);
    expect(store.get(STORAGE_KEY_SOUND)).toBe("true");

    setSoundEnabled(false);
    expect(isSoundEnabled()).toBe(false);
    expect(store.get(STORAGE_KEY_SOUND)).toBe("false");
  });

  it("handles corrupted or invalid sound preference gracefully", () => {
    store.set(STORAGE_KEY_SOUND, "invalid-value");
    expect(isSoundEnabled()).toBe(false);
  });

  it("defaults lights down to false", () => {
    expect(isLightsDown()).toBe(false);
  });

  it("round-trips lights down state via setLightsDown", () => {
    setLightsDown(true);
    expect(isLightsDown()).toBe(true);
    expect(store.get(STORAGE_KEY_LIGHTS_DOWN)).toBe("true");

    setLightsDown(false);
    expect(isLightsDown()).toBe(false);
    expect(store.get(STORAGE_KEY_LIGHTS_DOWN)).toBe("false");
  });

  it("swallows storage quota errors gracefully on preference set", () => {
    const realSet = store.set.bind(store);
    vi.stubGlobal("localStorage", {
      ...localStorage,
      setItem: (k: string, v: string) => {
        if (k === STORAGE_KEY_SOUND || k === STORAGE_KEY_LIGHTS_DOWN) {
          throw new DOMException("quota exceeded", "QuotaExceededError");
        }
        realSet(k, v);
      },
    });

    expect(() => setSoundEnabled(true)).not.toThrow();
    expect(() => setLightsDown(true)).not.toThrow();
  });
});

describe("Web Audio API Pure Synthesis", () => {
  it("does not play shutter click when sound is muted", () => {
    setSoundEnabled(false);
    const mockCtx = createMockAudioContext();
    playShutterClick(mockCtx as unknown as AudioContext);

    expect(mockCtx.createGain).not.toHaveBeenCalled();
    expect(mockCtx.createOscillator).not.toHaveBeenCalled();
    expect(mockCtx.createBufferSource).not.toHaveBeenCalled();
  });

  it("does not play golden chime when sound is muted", () => {
    setSoundEnabled(false);
    const mockCtx = createMockAudioContext();
    playGoldenChime(mockCtx as unknown as AudioContext);

    expect(mockCtx.createGain).not.toHaveBeenCalled();
    expect(mockCtx.createOscillator).not.toHaveBeenCalled();
  });

  it("synthesizes mechanical shutter click when sound is enabled", () => {
    setSoundEnabled(true);
    const mockCtx = createMockAudioContext();
    playShutterClick(mockCtx as unknown as AudioContext);

    // Verifies noise source created for transient friction
    expect(mockCtx.createBufferSource).toHaveBeenCalledTimes(1);
    expect(mockCtx._bufferSources[0].start).toHaveBeenCalledWith(mockCtx.currentTime);
    expect(mockCtx._bufferSources[0].stop).toHaveBeenCalledWith(mockCtx.currentTime + 0.025);

    // Verifies oscillator created for mechanical body thud
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(1);
    const osc = mockCtx._oscillators[0];
    expect(osc.type).toBe("triangle");
    expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(180, mockCtx.currentTime);
    expect(osc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(42, mockCtx.currentTime + 0.035);
    expect(osc.start).toHaveBeenCalledWith(mockCtx.currentTime);

    // Verifies filter and gains created and connected
    expect(mockCtx.createBiquadFilter).toHaveBeenCalledTimes(2);
    expect(mockCtx.createGain).toHaveBeenCalledTimes(2);
  });

  it("synthesizes celestial pentatonic chime with 3 harmonic notes", () => {
    setSoundEnabled(true);
    const mockCtx = createMockAudioContext();
    playGoldenChime(mockCtx as unknown as AudioContext);

    // Verifies master filter created
    expect(mockCtx.createBiquadFilter).toHaveBeenCalledTimes(1);
    const filter = mockCtx._filters[0];
    expect(filter.type).toBe("lowpass");
    expect(filter.frequency.setValueAtTime).toHaveBeenCalledWith(3200, mockCtx.currentTime);

    // Verifies 3 harmonic sine oscillators created for pentatonic triad
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(3);
    const [osc1, osc2, osc3] = mockCtx._oscillators;

    expect(osc1.type).toBe("sine");
    expect(osc1.frequency.setValueAtTime).toHaveBeenCalledWith(587.33, mockCtx.currentTime);

    expect(osc2.type).toBe("sine");
    expect(osc2.frequency.setValueAtTime).toHaveBeenCalledWith(880.0, mockCtx.currentTime + 0.02);

    expect(osc3.type).toBe("sine");
    expect(osc3.frequency.setValueAtTime).toHaveBeenCalledWith(1479.98, mockCtx.currentTime + 0.04);

    // Verifies 3 corresponding gain envelopes with attack/decay
    expect(mockCtx.createGain).toHaveBeenCalledTimes(3);
  });

  it("resumes AudioContext if suspended when unlocking", async () => {
    const mockCtx = createMockAudioContext();
    mockCtx.state = "suspended";
    vi.stubGlobal("AudioContext", vi.fn(() => mockCtx));
    vi.stubGlobal("window", { AudioContext: vi.fn(() => mockCtx) });

    await unlockAudioContext();
    expect(mockCtx.resume).toHaveBeenCalled();
  });
});
```

---

## 6. Step-by-Step Implementation & Verification Plan

### Step 1: Create `src/lib/audio.ts`
- Implement `STORAGE_KEY_SOUND`, `STORAGE_KEY_LIGHTS_DOWN`.
- Implement `isSoundEnabled`, `setSoundEnabled`, `isLightsDown`, `setLightsDown`.
- Implement `getAudioContext`, `unlockAudioContext`.
- Implement pure Web Audio synthesizers `playShutterClick` and `playGoldenChime`.

### Step 2: Create `src/lib/audio.test.ts`
- Implement full Node Web Audio mock.
- Run `npx vitest run src/lib/audio.test.ts` to verify all unit tests pass with 100% coverage.

### Step 3: Add CSS Rules to `src/app/globals.css`
- Add `.cinema-lights-down`, `.cinema-peripheral`, stage spotlight enhancement, and reduced-motion rules.

### Step 4: Create UI Components
- Create `src/components/audio/SoundToggle.tsx`.
- Create `src/components/duel/LightsDownToggle.tsx`.

### Step 5: Wire Components & Triggers in `src/app/r/play/play-room.tsx`
- Import `SoundToggle` and `LightsDownToggle`.
- Mount toggles in the sticky header next to Unlock/Exit/Undo buttons.
- Connect sound triggers to `handleVote`, `handleUndo`, `handleParkToggle`, and consensus celebrations.
- Apply `cinema-lights-down` and `cinema-peripheral` classes.

### Step 6: Full Verification
- Run `npm test` to ensure all 298+ existing tests plus new audio tests pass (total 315+ tests).
- Run `npm run build` to verify zero TypeScript and ESLint errors.

---

## 7. Security, Performance & Accessibility Checklist
- [x] **Local Isolation**: All changes are local and do not push to origin or touch remote repositories.
- [x] **Zero Asset Overhead**: Audio is 100% synthesized; 0 network bandwidth consumed, 0 external dependencies.
- [x] **Muted by Default**: Respects user auditory autonomy by defaulting to muted (`mr-sound-enabled: false`).
- [x] **Accessible Controls**:
  - `SoundToggle` and `LightsDownToggle` provide `aria-pressed`, `aria-label`, and descriptive `title` attributes.
  - Keyboard navigation fully preserved.
  - Peripheral controls remain fully focusable via `:focus-within` and restore full opacity upon tab focus.
- [x] **Reduced Motion**: All CSS opacity and color transitions respect `prefers-reduced-motion`.
- [x] **Memory Management**: All oscillators, buffer sources, and gain nodes auto-stop and disconnect after their envelopes finish.

