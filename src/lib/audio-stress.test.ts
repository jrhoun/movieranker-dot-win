import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  playGoldenChime,
  playShutterClick,
  setAudioContextForTesting,
  setSoundEnabled,
} from "./audio";

const store = new Map<string, string>();

function setupLocalStorageMock() {
  store.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
  });
}

describe("Audio Synthesis Resilience & Burst Stress Testing", () => {
  beforeEach(() => {
    setupLocalStorageMock();
    setSoundEnabled(true);
    setAudioContextForTesting(null);
  });

  it("handles 1,000 rapid consecutive shutter clicks without memory leaks or uncaught errors", () => {
    const mockCtx = {
      currentTime: 1.0,
      sampleRate: 44100,
      state: "running" as AudioContextState,
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
      createGain: vi.fn(() => ({
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      })),
      createOscillator: vi.fn(() => ({
        type: "triangle",
        frequency: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      })),
      createBiquadFilter: vi.fn(() => ({
        type: "bandpass",
        frequency: { setValueAtTime: vi.fn() },
        Q: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
      })),
      createBufferSource: vi.fn(() => ({
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      })),
      createBuffer: vi.fn((_c: number, length: number) => ({
        getChannelData: vi.fn(() => new Float32Array(length)),
      })),
    };

    expect(() => {
      for (let i = 0; i < 1000; i++) {
        playShutterClick(mockCtx as unknown as AudioContext);
      }
    }).not.toThrow();

    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(1000);
    expect(mockCtx.createBufferSource).toHaveBeenCalledTimes(1000);
  });

  it("gracefully swallows internal Web Audio API exceptions (e.g., closed context, invalid state)", () => {
    const brokenCtx = {
      currentTime: 1.0,
      sampleRate: 44100,
      state: "closed" as AudioContextState,
      destination: {},
      createGain: vi.fn(() => {
        throw new Error("InvalidStateError: AudioContext is closed");
      }),
      createOscillator: vi.fn(() => {
        throw new Error("InvalidStateError: AudioContext is closed");
      }),
      createBiquadFilter: vi.fn(() => {
        throw new Error("InvalidStateError: AudioContext is closed");
      }),
      createBufferSource: vi.fn(() => {
        throw new Error("InvalidStateError: AudioContext is closed");
      }),
      createBuffer: vi.fn(() => {
        throw new Error("InvalidStateError: AudioContext is closed");
      }),
    };

    expect(() => {
      playShutterClick(brokenCtx as unknown as AudioContext);
    }).not.toThrow();

    expect(() => {
      playGoldenChime(brokenCtx as unknown as AudioContext);
    }).not.toThrow();
  });
});
