import { SFX_MAX_SECONDS, SFX_MIN_EDGE_MS, SFX_PEAK } from '../../config/audio';

/**
 * Procedural SFX synthesis in pure TypeScript (Decision 7): a recipe is
 * data, `renderSfx` turns it into mono Float32 samples. No WebAudio is
 * needed, so every sound is testable in node and renders the same for a
 * seed. Playback-time variety (pitch, gain) is added by the manager.
 */

export type SynthWave = 'sine' | 'square' | 'saw' | 'triangle' | 'noise';

export interface SynthFilter {
  readonly type: 'lowpass' | 'highpass' | 'bandpass';
  /** Cutoff (low/high pass) or centre (band pass), in Hz. */
  readonly freq: number;
  readonly q: number;
}

export interface SynthLayer {
  readonly wave: SynthWave;
  /**
   * Pitch glide in Hz, exponential from start to end over the layer. For
   * `noise` it is the cutoff of a gentle one-pole low-pass that colours
   * the noise (high values: bright; low: a dull rumble).
   */
  readonly freq: readonly [start: number, end: number];
  readonly attackMs: number;
  readonly decayMs: number;
  /** Level held after the decay, 0..1. */
  readonly sustain: number;
  readonly releaseMs: number;
  /** Total layer length including the release, in ms. */
  readonly durationMs: number;
  readonly filter?: SynthFilter;
  /** Sine phase modulation: modulator at freq × ratio, index `depth` (metallic / bell tones). */
  readonly fm?: { readonly ratio: number; readonly depth: number };
  readonly gain: number;
  /** Start offset within the sound, in ms (a second note of a chime). */
  readonly delayMs?: number;
}

export interface SynthRecipe {
  readonly layers: readonly SynthLayer[];
}

const TAU = Math.PI * 2;

/** Deterministic 32-bit PRNG (mulberry32), 0..1. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** PolyBLEP residual: smooths the jump of a naive saw / square (no harsh aliasing). */
function blep(t: number, dt: number): number {
  if (t < dt) {
    const x = t / dt;
    return x + x - x * x - 1;
  }
  if (t > 1 - dt) {
    const x = (t - 1) / dt;
    return x * x + x + x + 1;
  }
  return 0;
}

const frac = (x: number): number => x - Math.floor(x);

function oscillator(wave: Exclude<SynthWave, 'noise'>, phase: number, dt: number): number {
  const t = frac(phase);
  switch (wave) {
    case 'sine':
      return Math.sin(TAU * t);
    case 'triangle':
      return 4 * Math.abs(frac(t + 0.25) - 0.5) - 1;
    case 'saw':
      return 2 * t - 1 - blep(t, dt);
    case 'square':
      return (t < 0.5 ? 1 : -1) + blep(t, dt) - blep(frac(t + 0.5), dt);
  }
}

/** RBJ biquad, direct form I. */
class Biquad {
  private b0 = 1;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;
  private x1 = 0;
  private x2 = 0;
  private y1 = 0;
  private y2 = 0;

  constructor(f: SynthFilter, sampleRate: number) {
    const w0 = (TAU * Math.min(f.freq, sampleRate * 0.45)) / sampleRate;
    const cos = Math.cos(w0);
    const alpha = Math.sin(w0) / (2 * Math.max(0.1, f.q));
    const a0 = 1 + alpha;
    let b0: number;
    let b1: number;
    let b2: number;
    if (f.type === 'lowpass') {
      b0 = (1 - cos) / 2;
      b1 = 1 - cos;
      b2 = b0;
    } else if (f.type === 'highpass') {
      b0 = (1 + cos) / 2;
      b1 = -(1 + cos);
      b2 = b0;
    } else {
      b0 = alpha;
      b1 = 0;
      b2 = -alpha;
    }
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = (-2 * cos) / a0;
    this.a2 = (1 - alpha) / a0;
  }

  process(x: number): number {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

/** Envelope level of sample `i` of a layer `n` samples long (attack, decay, sustain, release; all in samples). */
function envelope(i: number, n: number, a: number, d: number, sustain: number, r: number): number {
  let env: number;
  if (i < a) env = i / a;
  else if (i < a + d) {
    const x = 1 - (i - a) / d;
    // Cubic fall: a percussive, near-exponential decay.
    env = sustain + (1 - sustain) * x * x * x;
  } else env = sustain;
  const relStart = n - r;
  if (i >= relStart) {
    const x = (n - i) / r;
    env *= x * x;
  }
  return env;
}

function renderLayer(out: Float32Array, layer: SynthLayer, sampleRate: number, rand: () => number): void {
  const ms = sampleRate / 1000;
  const start = Math.round((layer.delayMs ?? 0) * ms);
  const n = Math.min(Math.round(layer.durationMs * ms), out.length - start);
  if (n <= 0) return;
  const edge = SFX_MIN_EDGE_MS * ms;
  const a = Math.max(edge, layer.attackMs * ms);
  const d = Math.max(1, layer.decayMs * ms);
  const r = Math.min(n, Math.max(edge, layer.releaseMs * ms));
  const sustain = Math.min(1, Math.max(0, layer.sustain));
  const f0 = Math.max(1, layer.freq[0]);
  const glide = Math.pow(Math.max(1, layer.freq[1]) / f0, 1 / n);
  const filter = layer.filter ? new Biquad(layer.filter, sampleRate) : null;
  const nyquist = sampleRate / 2;
  let f = f0;
  let phase = 0;
  let modPhase = 0;
  let colour = 0;
  for (let i = 0; i < n; i++) {
    let s: number;
    if (layer.wave === 'noise') {
      // One-pole low-pass at f, with a gain that keeps the level roughly even across cutoffs.
      const fc = Math.min(f, nyquist);
      const k = 1 - Math.exp((-TAU * fc) / sampleRate);
      colour += k * (rand() * 2 - 1 - colour);
      s = colour * Math.min(4, Math.sqrt(nyquist / Math.max(fc, 20)));
    } else {
      const dt = f / sampleRate;
      const pm = layer.fm ? layer.fm.depth * Math.sin(TAU * modPhase) / TAU : 0;
      s = oscillator(layer.wave, phase + pm, dt);
      phase = frac(phase + dt);
      if (layer.fm) modPhase = frac(modPhase + dt * layer.fm.ratio);
    }
    s *= envelope(i, n, a, d, sustain, r) * layer.gain;
    if (filter) s = filter.process(s);
    out[start + i]! += s;
    f *= glide;
  }
}

/**
 * Renders `recipe` to mono samples at `sampleRate`. Deterministic for a
 * seed; at most SFX_MAX_SECONDS long; the sample peak never exceeds
 * SFX_PEAK (a louder render is scaled down), and both ends fade to
 * silence so playback never clicks.
 */
export function renderSfx(recipe: SynthRecipe, sampleRate: number, seed: number): Float32Array<ArrayBuffer> {
  const endMs = recipe.layers.reduce((m, l) => Math.max(m, (l.delayMs ?? 0) + l.durationMs), 0);
  const length = Math.max(1, Math.min(Math.floor(SFX_MAX_SECONDS * sampleRate), Math.ceil((endMs * sampleRate) / 1000)));
  const out = new Float32Array(length);
  const rand = mulberry32(seed);
  for (const layer of recipe.layers) renderLayer(out, layer, sampleRate, rand);
  // Edge fades: filter ringing or a cut layer never leaves a step at either end.
  const fade = Math.min(Math.floor(length / 2), Math.ceil((SFX_MIN_EDGE_MS * sampleRate) / 1000));
  for (let i = 0; i < fade; i++) {
    const k = i / fade;
    out[i]! *= k;
    out[length - 1 - i]! *= k;
  }
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  if (peak > SFX_PEAK) {
    // A hair under the peak: Float32 rounding must not land above it.
    const scale = (SFX_PEAK * 0.999) / peak;
    for (let i = 0; i < length; i++) out[i]! *= scale;
  }
  return out;
}
