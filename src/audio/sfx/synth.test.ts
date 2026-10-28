import { describe, expect, it } from 'vitest';
import { SFX_MAX_BYTES } from '../../config/audio';
import { SFX_CATALOGUE, SFX_KEYS } from './catalogue';
import { renderSfx, SfxRenderer, type SynthRecipe } from './synth';

const rms = (s: Float32Array): number => Math.sqrt(s.reduce((a, v) => a + v * v, 0) / s.length);
const peak = (s: Float32Array): number => s.reduce((a, v) => Math.max(a, Math.abs(v)), 0);

describe('renderSfx', () => {
  it('every catalogue recipe renders non-silent (RMS > 0.01), peak ≤ 0.98, length ≤ 1.5 s at 44 100 Hz', () => {
    for (const key of SFX_KEYS) {
      const s = renderSfx(SFX_CATALOGUE[key].recipe, 44_100, 7);
      expect(rms(s), key).toBeGreaterThan(0.01);
      expect(peak(s), key).toBeLessThanOrEqual(0.98);
      expect(s.length, key).toBeLessThanOrEqual(44_100 * 1.5);
      expect(s.every(Number.isFinite), key).toBe(true);
    }
  });

  it('same seed → identical samples', () => {
    for (const key of SFX_KEYS) {
      const a = renderSfx(SFX_CATALOGUE[key].recipe, 44_100, 42);
      const b = renderSfx(SFX_CATALOGUE[key].recipe, 44_100, 42);
      expect(a, key).toEqual(b);
    }
  });

  it('catalogue total bytes at 48 kHz ≤ SFX_MAX_BYTES', () => {
    const bytes = SFX_KEYS.reduce((sum, key) => sum + renderSfx(SFX_CATALOGUE[key].recipe, 48_000, 1).byteLength, 0);
    expect(bytes).toBeLessThanOrEqual(SFX_MAX_BYTES);
  });

  it('starts and ends at silence (no clicks)', () => {
    for (const key of SFX_KEYS) {
      const s = renderSfx(SFX_CATALOGUE[key].recipe, 44_100, 3);
      expect(Math.abs(s[0] ?? 1), key).toBeLessThan(0.02);
      expect(Math.abs(s[s.length - 1] ?? 1), key).toBeLessThan(0.02);
    }
  });

  it('a loud recipe is scaled down to the peak and an over-long one is cut at 1.5 s', () => {
    const loud: SynthRecipe = {
      layers: [
        { wave: 'square', freq: [220, 220], attackMs: 2, decayMs: 0, sustain: 1, releaseMs: 10, durationMs: 4000, gain: 4 },
      ],
    };
    const s = renderSfx(loud, 8000, 1);
    expect(s.length).toBe(8000 * 1.5);
    expect(peak(s)).toBeLessThanOrEqual(0.98);
  });

  it('a different seed changes a noise layer', () => {
    const noise: SynthRecipe = {
      layers: [{ wave: 'noise', freq: [4000, 4000], attackMs: 2, decayMs: 50, sustain: 0, releaseMs: 10, durationMs: 80, gain: 0.5 }],
    };
    expect(renderSfx(noise, 8000, 1)).not.toEqual(renderSfx(noise, 8000, 2));
  });
});

describe('SfxRenderer', () => {
  it('a chunked render is identical to renderSfx for every recipe', () => {
    for (const key of SFX_KEYS) {
      const whole = renderSfx(SFX_CATALOGUE[key].recipe, 48_000, 11);
      const r = new SfxRenderer(SFX_CATALOGUE[key].recipe, 48_000, 11, 1237);
      let steps = 0;
      while (!r.step()) steps++;
      expect(r.samples, key).toEqual(whole);
      expect(r.step()).toBe(true);
      if (whole.length > 1237 * 2) expect(steps, key).toBeGreaterThan(1);
    }
  });
});
