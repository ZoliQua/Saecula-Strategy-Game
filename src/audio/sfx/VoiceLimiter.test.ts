import { describe, expect, it } from 'vitest';
import { SFX_GLOBAL_VOICES } from '../../config/audio';
import { SFX_CATALOGUE } from './catalogue';
import { VoiceLimiter } from './VoiceLimiter';

const open = { maxVoices: 4, minIntervalMs: 0 };

describe('VoiceLimiter', () => {
  it('200 sword_hit requests in one ms → ≤ maxVoices played', () => {
    const limiter = new VoiceLimiter(SFX_GLOBAL_VOICES);
    const rule = SFX_CATALOGUE.sword_hit;
    let played = 0;
    for (let i = 0; i < 200; i++) if (limiter.request('sword_hit', 0.5, 1000, rule) !== null) played++;
    expect(played).toBeLessThanOrEqual(rule.maxVoices);
    expect(limiter.active).toBeLessThanOrEqual(rule.maxVoices);
  });

  it('minInterval drops a repeat', () => {
    const limiter = new VoiceLimiter(24);
    const rule = { maxVoices: 4, minIntervalMs: 50 };
    expect(limiter.request('unit_die', 1, 0, rule)).not.toBeNull();
    expect(limiter.request('unit_die', 1, 30, rule)).toBeNull();
    expect(limiter.request('unit_die', 1, 50, rule)).not.toBeNull();
    // Another key is not throttled by it.
    expect(limiter.request('sword_hit', 1, 51, rule)).not.toBeNull();
  });

  it('global cap 24 holds across keys', () => {
    const limiter = new VoiceLimiter(24);
    const keys = ['sword_hit', 'arrow_shot', 'musket_shot', 'unit_die', 'gather_wood', 'gather_gold', 'gather_food', 'cannon_shot'] as const;
    let played = 0;
    for (let i = 0; i < 400; i++) {
      const key = keys[i % keys.length]!;
      if (limiter.request(key, 0.2 + (i % 7) * 0.1, i, open) !== null) played++;
      expect(limiter.active).toBeLessThanOrEqual(24);
    }
    expect(played).toBeGreaterThan(24);
    expect(limiter.active).toBe(24);
  });

  it('at the global cap a request quieter than every active voice is dropped, a louder one replaces the quietest', () => {
    const evicted: number[] = [];
    const limiter = new VoiceLimiter(2, (id) => evicted.push(id));
    const a = limiter.request('sword_hit', 0.5, 0, open);
    const b = limiter.request('arrow_shot', 0.3, 1, open);
    expect(limiter.request('unit_die', 0.2, 2, open)).toBeNull();
    expect(limiter.request('unit_die', 0.9, 3, open)).not.toBeNull();
    expect(evicted).toEqual([b]);
    expect(limiter.active).toBe(2);
    expect(a).not.toBeNull();
  });

  it('louder request steals the oldest voice of its key', () => {
    const evicted: number[] = [];
    const limiter = new VoiceLimiter(24, (id) => evicted.push(id));
    const rule = { maxVoices: 2, minIntervalMs: 0 };
    const first = limiter.request('sword_hit', 0.4, 0, rule);
    limiter.request('sword_hit', 0.4, 1, rule);
    expect(limiter.request('sword_hit', 0.3, 2, rule)).toBeNull();
    const loud = limiter.request('sword_hit', 0.8, 3, rule);
    expect(loud).not.toBeNull();
    expect(evicted).toEqual([first]);
    expect(limiter.active).toBe(2);
  });

  it('release frees a voice', () => {
    const limiter = new VoiceLimiter(1);
    const id = limiter.request('ui_click', 1, 0, open)!;
    expect(limiter.request('ui_error', 0.5, 1, open)).toBeNull();
    limiter.release(id);
    expect(limiter.active).toBe(0);
    expect(limiter.request('ui_error', 0.5, 2, open)).not.toBeNull();
    // Releasing an unknown id is harmless.
    limiter.release(999);
    expect(limiter.active).toBe(1);
  });
});
