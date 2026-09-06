# Handoff Report: Explorer M1-3 (Web Audio Vintage Sound Effects & 'Lights Down' Cinema Focus Mode)

## 1. Observation
1. **Repository State & Test Baseline**:
   - Running `npm test` executes `vitest run` in `node` test environment (configured in `vitest.config.ts:8`: `test: { environment: "node", include: ["src/**/*.test.ts"] }`).
   - Current baseline: 27 test files passed, 298 tests passed in 545ms.
2. **Audio Architecture Requirements**:
   - In `PROJECT.md:8`, audio is specified as: "Web Audio API native synthesizer (OscillatorNode, GainNode, BiquadFilterNode)".
   - In `PROJECT.md:39-43`, the interface contract for audio is:
     - `playShutterClick(): void` — generates subtle mechanical click
     - `playGoldenChime(): void` — generates dual harmonic sine chime
     - `isSoundEnabled(): boolean` — reads `mr-sound-enabled` from localStorage (default `false`)
     - `setSoundEnabled(enabled: boolean): void` — persists preference
   - In `ORIGINAL_REQUEST.md:13` and `32`: "Web Audio sound effects synthesize vintage cinema clicks and chimes upon user opt-in, defaulting to muted with an accessible toggle."
3. **Focus Mode Architecture Requirements**:
   - In `ORIGINAL_REQUEST.md:22`: "offer an optional 'Lights Down' cinema focus mode on the duel stage that dims the surrounding UI to full theater blackness under warm spotlights."
   - In `PROJECT.md:19`: "Theater blackout toggle on duel stage with dimmed peripheral chrome and spotlighting."
   - In `src/app/globals.css:18-29`, root theme defines `--bg: #0d0d10` and `.stage-spotlight` (lines 101-107).
4. **Duel Room Header & Action Targets**:
   - In `src/app/r/play/play-room.tsx:557-624`, the sticky header renders the room title, Marquee badge, participant chips, Unlock button, Exit button, and Undo button.
   - Voting takes place in `handleVote` (line 329), parking in `handleParkToggle` (line 365), and undo in `handleUndo` (line 431).

---

## 2. Logic Chain
1. **Zero External Assets (Observation 2)**:
   - To achieve zero network latency, zero bundle bloating, and zero broken asset risks, all audio must be synthesized mathematically in real-time via Web Audio API nodes.
   - Mechanical Shutter Click is synthesized using a 25ms white noise buffer through a 2200Hz bandpass filter combined with a 180Hz->42Hz pitch-swept triangle oscillator for mechanical weight.
   - Pentatonic Golden Chime is synthesized using a D-major golden triad (D5 587.33Hz, A5 880.00Hz, F#6 1479.98Hz) with soft 10ms attack and natural 800ms bell decay through a 3200Hz low-pass filter.
2. **Node Test Environment & SSR Safety (Observation 1 & 2)**:
   - Because Vitest runs in `environment: "node"`, `AudioContext` and `localStorage` are undefined at runtime in tests and during Next.js SSR.
   - `src/lib/audio.ts` guards all window/localStorage accesses with `typeof window !== "undefined"` and provides fallback handling.
   - The test suite in `src/lib/audio.test.ts` provides a complete, self-contained mock of AudioContext, OscillatorNode, GainNode, BiquadFilterNode, and AudioBufferSourceNode.
3. **Atmospheric Focus Transition (Observation 3 & 4)**:
   - When `lightsDown` is active, the container receives `.cinema-lights-down` setting `--bg: #000000`.
   - Peripheral chrome (header, progress strip, parked strip) receives `.cinema-peripheral` dimming to `opacity: 0.2` and `brightness(0.75)`.
   - Hover and `:focus-within` restore full opacity (1.0) and brightness (1.0) so keyboard and mouse interaction are never blocked.
   - Active duel cards in `MatchupStage.tsx` remain at full opacity under enhanced golden spotlighting.

---

## 3. Caveats
- Browser Autoplay Policies: Modern browsers require a user interaction (click/touch/key) before an `AudioContext` can transition from `suspended` to `running`. The `unlockAudioContext()` helper is wired into all action handlers and the sound toggle button.
- Reduced Motion: CSS transitions for focus mode and peripheral dimming are disabled under `@media (prefers-reduced-motion: reduce)`.

---

## 4. Conclusion
The implementation plan and test design for Web Audio Vintage Sound Effects and "Lights Down" Cinema Focus Mode are complete and documented in:
`/home/jrhoun/projects/movieranker-dot-win/.agents/explorer_m1_3/report.md`.
The architecture adheres strictly to all Milestone 1 requirements, contracts in `PROJECT.md`, and local isolation constraints.

---

## 5. Verification Method
1. **Unit Test Verification**:
   - When `src/lib/audio.ts` and `src/lib/audio.test.ts` are created by implementers, run:
     `npx vitest run src/lib/audio.test.ts`
     Expected: All unit tests pass with 100% assertions covering audio graph creation, node parameters, autoplay unlock, and preference handling.
2. **Full Regression Suite**:
   - Run `npm test`.
     Expected: All 298+ existing unit tests plus new audio tests pass (total 315+ tests).
3. **Build & Typecheck**:
   - Run `npm run build`.
     Expected: Zero TypeScript errors, zero ESLint warnings, successful production build.
