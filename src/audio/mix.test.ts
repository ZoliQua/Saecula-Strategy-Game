import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type Settings } from '../ui/settings';
import { channelGain, positionalGain, stereoPan, tileDistance } from './mix';

const settings = (patch: Partial<Settings['volume']>, muted = false): Settings => ({
  ...DEFAULT_SETTINGS,
  muted,
  volume: { ...DEFAULT_SETTINGS.volume, ...patch },
});

describe('positionalGain', () => {
  it('positionalGain 0→1, 2→1, 6→0.5, 10→0, 15→0', () => {
    expect(positionalGain(0)).toBe(1);
    expect(positionalGain(2)).toBe(1);
    expect(positionalGain(6)).toBeCloseTo(0.5);
    expect(positionalGain(10)).toBe(0);
    expect(positionalGain(15)).toBe(0);
  });
});

describe('channelGain', () => {
  it('channelGain muted → 0', () => {
    for (const ch of ['master', 'music', 'sfx', 'notifications'] as const) {
      expect(channelGain(settings({ master: 100, [ch]: 100 }, true), ch)).toBe(0);
    }
  });

  it('channelGain master 100 sfx 50 → 0.25', () => {
    expect(channelGain(settings({ master: 100, sfx: 50 }), 'sfx')).toBeCloseTo(0.25);
  });

  it('master alone is squared, and scales the other channels', () => {
    expect(channelGain(settings({ master: 50 }), 'master')).toBeCloseTo(0.25);
    expect(channelGain(settings({ master: 50, music: 100 }), 'music')).toBeCloseTo(0.25);
    expect(channelGain(settings({ master: 0, notifications: 100 }), 'notifications')).toBe(0);
  });
});

describe('tile helpers', () => {
  it('distance is Euclidean and the pan follows the iso screen x, clamped', () => {
    expect(tileDistance({ tx: 0, ty: 0 }, { tx: 3, ty: 4 })).toBe(5);
    expect(stereoPan({ tx: 10, ty: 10 }, { tx: 10, ty: 10 })).toBe(0);
    expect(stereoPan({ tx: 13, ty: 10 }, { tx: 10, ty: 10 })).toBeGreaterThan(0);
    expect(stereoPan({ tx: 10, ty: 13 }, { tx: 10, ty: 10 })).toBeLessThan(0);
    expect(stereoPan({ tx: 100, ty: 0 }, { tx: 0, ty: 0 })).toBeCloseTo(0.6);
  });
});
