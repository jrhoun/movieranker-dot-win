import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isLightsDown,
  isSoundEnabled,
  playGoldenChime,
  playShutterClick,
  setAudioContextForTesting,
  setLightsDown,
  setSoundEnabled,
  STORAGE_KEY_LIGHTS_DOWN,
  STORAGE_KEY_SOUND,
  unlockAudioContext,
} from "./audio";

// In-memory mock localStorage
const store = new Map<string, string>();

function setupLocalStorageMock() {
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
  });
}

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
  setupLocalStorageMock();
  setAudioContextForTesting(null);
  vi.clearAllMocks();
});

afterEach(() => {
  store.clear();
  setAudioContextForTesting(null);
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
    expect(osc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(
      42,
      mockCtx.currentTime + 0.035
    );
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
    expect(osc2.frequency.setValueAtTime).toHaveBeenCalledWith(
      880.0,
      mockCtx.currentTime + 0.02
    );

    expect(osc3.type).toBe("sine");
    expect(osc3.frequency.setValueAtTime).toHaveBeenCalledWith(
      1479.98,
      mockCtx.currentTime + 0.04
    );

    // Verifies 3 corresponding gain envelopes with attack/decay
    expect(mockCtx.createGain).toHaveBeenCalledTimes(3);
  });

  it("resumes AudioContext if suspended when unlocking", async () => {
    const mockCtx = createMockAudioContext();
    mockCtx.state = "suspended";

    await unlockAudioContext(mockCtx as unknown as AudioContext);
    expect(mockCtx.resume).toHaveBeenCalled();
  });
});
