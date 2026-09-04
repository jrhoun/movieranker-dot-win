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
  if (!globalAudioCtx) {
    const AudioContextClass =
      (typeof window !== "undefined" &&
        (window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)) ||
      (typeof AudioContext !== "undefined" ? AudioContext : null);
    if (AudioContextClass) {
      try {
        globalAudioCtx = new (AudioContextClass as unknown as { new (): AudioContext })();
      } catch {
        globalAudioCtx = null;
      }
    }
  }
  return globalAudioCtx;
}

/**
 * For testing purposes only: resets or sets the global AudioContext instance.
 */
export function setAudioContextForTesting(ctx: AudioContext | null): void {
  globalAudioCtx = ctx;
}

/**
 * Resumes the AudioContext if it is suspended by browser autoplay policy.
 */
export async function unlockAudioContext(customCtx?: AudioContext | null): Promise<void> {
  const ctx = customCtx ?? getAudioContext();
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
  try {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY_SOUND) === "true";
  } catch {
    return false;
  }
}

/**
 * Updates sound effects preference in localStorage.
 */
export function setSoundEnabled(enabled: boolean): void {
  try {
    if (typeof localStorage === "undefined") return;
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
  try {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY_LIGHTS_DOWN) === "true";
  } catch {
    return false;
  }
}

/**
 * Updates Lights Down focus mode preference in localStorage.
 */
export function setLightsDown(enabled: boolean): void {
  try {
    if (typeof localStorage === "undefined") return;
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
  void unlockAudioContext(ctx);

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
  void unlockAudioContext(ctx);

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
