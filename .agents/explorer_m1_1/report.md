# Implementation Plan & Test Design: Keyboard Blitz Navigation

## Executive Summary
This document specifies the technical design, lifecycle mechanics, safety guards, and comprehensive test suite for **Keyboard Blitz Navigation** on the duel stage in `src/app/r/play/play-room.tsx` (Milestone 1, Requirement R1).

Keyboard Blitz navigation enables rapid, tactile pairwise movie dueling through instant keyboard controls:
- **Left Vote**: `ArrowLeft` or `A` / `a` -> calls `handleVote(pair[0].tmdbId, pair[1].tmdbId)`
- **Right Vote**: `ArrowRight` or `D` / `d` -> calls `handleVote(pair[1].tmdbId, pair[0].tmdbId)`
- **Haven't Seen (Park Candidate)**: `Space` -> calls `handleParkToggle(pair[0].tmdbId, true)`
- **Undo Last Vote**: `Z` or `z` (or `Ctrl+Z` / `Cmd+Z`) -> calls `handleUndo()`

The system enforces strict focus safety guards (completely bypassing all hotkeys when typing in `<input>`, `<textarea>`, `<select>`, `[contenteditable]`) and state safety guards (bypassing hotkeys during active modals `exitOpen`, `unlockOpen`, `joinOpen`, `sheetStatus`, settling animations `settlingLoserId !== null`, finished state, or consensus views).

---

## 1. Architectural Architecture & Module Design

To maximize testability, separation of concerns, and clean React component code, we extract pure keyboard navigation resolution logic into `src/lib/keyboard.ts` while keeping the event listener lifecycle and action invocation in `src/app/r/play/play-room.tsx`.

### 1.1 Pure Helper: `src/lib/keyboard.ts`
The pure module defines:
1. `isEditableElement(target: EventTarget | null): boolean`
2. `isInputOrEditableFocused(): boolean`
3. `resolveBlitzAction(event: KeyboardEventLike, state: BlitzState): BlitzAction | null`

#### Type Definitions:
```ts
export type BlitzAction =
  | { type: "vote_left"; winnerId: number; loserId: number }
  | { type: "vote_right"; winnerId: number; loserId: number }
  | { type: "park_candidate"; tmdbId: number }
  | { type: "undo" };

export interface BlitzState {
  pair: [RankedMovie, RankedMovie] | null;
  canUndo: boolean;
  isSettling: boolean; // settlingLoserId !== null
  isFinished: boolean; // finished === true
  isConsensus: boolean; // stable && !sharpening
  isModalOpen: boolean; // exitOpen || unlockOpen || joinOpen || sheetStatus !== null
  activeMoviesCount: number; // active.length
}

export interface KeyboardEventLike {
  key: string;
  code?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  target?: EventTarget | null;
  defaultPrevented?: boolean;
}
```

### 1.2 Action Resolution Matrix

| Key / Sequence | Condition / Guards | Action Dispatched | Browser Default |
| :--- | :--- | :--- | :--- |
| `ArrowLeft`, `a`, `A`, `code: "KeyA"` | `!ctrlKey && !metaKey && !altKey`, `pair != null`, `!isSettling`, `!isModalOpen`, `!isConsensus`, `!isFinished`, `activeMoviesCount >= 2`, NOT editable | `{ type: "vote_left", winnerId: pair[0].tmdbId, loserId: pair[1].tmdbId }` | `preventDefault()` |
| `ArrowRight`, `d`, `D`, `code: "KeyD"` | `!ctrlKey && !metaKey && !altKey`, `pair != null`, `!isSettling`, `!isModalOpen`, `!isConsensus`, `!isFinished`, `activeMoviesCount >= 2`, NOT editable | `{ type: "vote_right", winnerId: pair[1].tmdbId, loserId: pair[0].tmdbId }` | `preventDefault()` |
| `Space`, `' '`, `code: "Space"` | `!ctrlKey && !metaKey && !altKey`, `pair != null`, `!isSettling`, `!isModalOpen`, `!isConsensus`, `!isFinished`, `activeMoviesCount >= 2`, NOT editable | `{ type: "park_candidate", tmdbId: pair[0].tmdbId }` | `preventDefault()` |
| `z`, `Z`, `code: "KeyZ"` (or `Ctrl+Z`, `Cmd+Z`) | `!altKey && !shiftKey`, `canUndo === true`, `!isSettling`, `!isModalOpen`, `!isFinished`, NOT editable | `{ type: "undo" }` | `preventDefault()` |
| `Ctrl+A`, `Cmd+A` | Any | `null` (Preserve browser "Select All") | Unmodified |
| `Ctrl+D`, `Cmd+D` | Any | `null` (Preserve browser "Bookmark") | Unmodified |
| `Shift+Ctrl+Z`, `Shift+Cmd+Z` | Any | `null` (Preserve browser "Redo") | Unmodified |
| Any key | Event target is `input`, `textarea`, `select`, or `contenteditable` | `null` (Safely bypassed) | Unmodified |
| Any key | `document.activeElement` is `input`, `textarea`, `select`, or `contenteditable` | `null` (Safely bypassed) | Unmodified |
| Any key | Modal open (`exitOpen`, `sheetStatus`, etc.) or settling (`settlingLoserId !== null`) | `null` (Bypassed) | Unmodified |

---

## 2. Component Integration in `src/app/r/play/play-room.tsx`

### 2.1 State & Handlers
`play-room.tsx` already contains:
- `handleVote(winnerId: number, loserId: number)` (line 329)
- `handleParkToggle(tmdbId: number, toParked: boolean)` (line 365)
- `handleUndo()` (line 431)

### 2.2 Event Listener Lifecycle
A dedicated `useEffect` hook in `play-room.tsx`:
```tsx
useEffect(() => {
  // Modal states that disable blitz voting
  const isModalOpen = exitOpen || unlockOpen || joinOpen || sheetStatus !== null;
  const isConsensus = stable && !sharpening;
  const activeCount = session?.movies.filter((m) => !m.parked).length ?? 0;

  const blitzState: BlitzState = {
    pair,
    canUndo: !!session?.undoSnapshot && settlingLoserId === null,
    isSettling: settlingLoserId !== null,
    isFinished: finished,
    isConsensus,
    isModalOpen,
    activeMoviesCount: activeCount,
  };

  const onKeyDown = (e: KeyboardEvent) => {
    // 1. Guard against IME / composition
    if (e.isComposing) return;

    // 2. Resolve action via pure helper
    const action = resolveBlitzAction(e, blitzState);
    if (!action) return;

    // 3. Prevent browser default scrolling or action
    e.preventDefault();

    // 4. Dispatch action
    switch (action.type) {
      case "vote_left":
        handleVote(action.winnerId, action.loserId);
        break;
      case "vote_right":
        handleVote(action.winnerId, action.loserId);
        break;
      case "park_candidate":
        handleParkToggle(action.tmdbId, true);
        break;
      case "undo":
        handleUndo();
        break;
    }
  };

  window.addEventListener("keydown", onKeyDown);
  return () => {
    window.removeEventListener("keydown", onKeyDown);
  };
}, [
  pair,
  session,
  settlingLoserId,
  finished,
  stable,
  sharpening,
  exitOpen,
  unlockOpen,
  joinOpen,
  sheetStatus,
]);
```

### 2.3 Focus and Input Guard Implementation
In `src/lib/keyboard.ts`:
```ts
export function isEditableElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") {
    return true;
  }
  if (target.isContentEditable) {
    return true;
  }
  const attr = target.getAttribute("contenteditable");
  if (attr !== null && attr !== "false") {
    return true;
  }
  return false;
}

export function isInputOrEditableFocused(): boolean {
  if (typeof document === "undefined") return false;
  return isEditableElement(document.activeElement);
}
```

---

## 3. UI Accessibility & Visual Cues

### 3.1 ARIA Attributes
In `src/components/MatchupStage.tsx`:
- Left Poster Button: `aria-keyshortcuts="ArrowLeft A"`
- Right Poster Button: `aria-keyshortcuts="ArrowRight D"`
- Haven't Seen Button: `aria-keyshortcuts="Space"`
In `src/app/r/play/play-room.tsx`:
- Undo Button: `aria-keyshortcuts="z"`

### 3.2 Understated Visual Badges (Premiere Aesthetic)
In `src/components/MatchupStage.tsx`, render understated keyboard shortcut hints on desktop:
- Left card: `<kbd className="hidden sm:inline-block rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-gold/80 border border-gold/20">A / ←</kbd>`
- Right card: `<kbd className="hidden sm:inline-block rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-gold/80 border border-gold/20">D / →</kbd>`
- Space hint next to Haven't Seen button or on hover.

---

## 4. Comprehensive Unit Test Suite Design

The unit test file `src/lib/keyboard.test.ts` will verify all actions, edge cases, and safety guards.

### 4.1 Test Cases Matrix

```ts
import { describe, expect, it } from "vitest";
import {
  isEditableElement,
  resolveBlitzAction,
  type BlitzState,
  type KeyboardEventLike,
} from "./keyboard";
import type { RankedMovie } from "./ranking";

const movieA: RankedMovie = {
  tmdbId: 101,
  title: "Inception",
  posterPath: "/inception.jpg",
  releaseYear: 2010,
  elo: 1200,
  comparisons: 5,
  parked: false,
};

const movieB: RankedMovie = {
  tmdbId: 102,
  title: "Interstellar",
  posterPath: "/interstellar.jpg",
  releaseYear: 2014,
  elo: 1180,
  comparisons: 4,
  parked: false,
};

const defaultState: BlitzState = {
  pair: [movieA, movieB],
  canUndo: true,
  isSettling: false,
  isFinished: false,
  isConsensus: false,
  isModalOpen: false,
  activeMoviesCount: 2,
};
```

#### Test Group 1: Left / Right Vote Hotkeys
1. `ArrowLeft` resolves to `vote_left` with `winnerId: 101, loserId: 102`.
2. `a` and `A` resolve to `vote_left` with `winnerId: 101, loserId: 102`.
3. `ArrowRight` resolves to `vote_right` with `winnerId: 102, loserId: 101`.
4. `d` and `D` resolve to `vote_right` with `winnerId: 102, loserId: 101`.

#### Test Group 2: Space / Haven't Seen Hotkey
1. `Space` / `' '` resolves to `park_candidate` with `tmdbId: 101`.
2. `code: "Space"` resolves to `park_candidate` with `tmdbId: 101`.

#### Test Group 3: Undo Hotkey
1. `z` and `Z` resolve to `undo` when `canUndo: true`.
2. `Ctrl+Z` and `Cmd+Z` resolve to `undo` when `canUndo: true`.
3. `z` resolves to `null` when `canUndo: false`.
4. `Shift+Ctrl+Z` and `Shift+Cmd+Z` (Redo) resolve to `null`.

#### Test Group 4: Modifier Protections (Non-interference with Browser Shortcuts)
1. `Ctrl+A` / `Cmd+A` (Select All) returns `null`.
2. `Ctrl+D` / `Cmd+D` (Bookmark) returns `null`.
3. `Alt+ArrowLeft` (Browser Back) returns `null`.
4. `Alt+ArrowRight` (Browser Forward) returns `null`.

#### Test Group 5: Focus Safety Guards
1. Target is `HTMLInputElement` (`<input>`) -> returns `null`.
2. Target is `HTMLTextAreaElement` (`<textarea>`) -> returns `null`.
3. Target is `HTMLSelectElement` (`<select>`) -> returns `null`.
4. Target has `isContentEditable: true` or `contenteditable="true"` -> returns `null`.

#### Test Group 6: Modal & UI State Guards
1. `isModalOpen: true` (`exitOpen`, `unlockOpen`, `joinOpen`, or `sheetStatus`) -> all hotkeys return `null`.
2. `isSettling: true` (`settlingLoserId !== null`) -> all hotkeys return `null`.
3. `isFinished: true` -> all hotkeys return `null`.
4. `isConsensus: true` (`stable && !sharpening`) -> all hotkeys return `null`.
5. `pair: null` -> all hotkeys return `null`.
6. `activeMoviesCount < 2` -> all hotkeys return `null`.

---

## 5. Verification & Validation Steps

1. **Unit Tests**: Run `npx vitest run src/lib/keyboard.test.ts` to verify all 20+ test cases pass.
2. **Full Regression**: Run `npm test` to verify all existing 298 tests continue to pass (total 318+ tests).
3. **Build Check**: Run `npm run build` to ensure 0 TypeScript or compilation errors.
4. **Manual Validation**:
   - In duel room, press `ArrowLeft` / `A` -> votes left card.
   - Press `ArrowRight` / `D` -> votes right card.
   - Press `Space` -> marks left candidate as haven't seen.
   - Press `Z` -> undos previous action.
   - Open Join form or Exit dialog -> typing letters `a`, `d`, `z`, space does not trigger duel votes.
