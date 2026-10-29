import { describe, expect, it } from 'vitest';
import { wheelPan, wheelIntent, wheelZoomFactor } from './wheelIntent';

const wheel = (o: Partial<{ deltaX: number; deltaY: number; deltaMode: number; ctrlKey: boolean }>) => ({
  deltaX: 0,
  deltaY: 0,
  deltaMode: 0,
  ctrlKey: false,
  ...o,
});

describe('wheelIntent', () => {
  it('a pinch (ctrlKey wheel) always zooms, whatever the mode', () => {
    const pinch = wheel({ deltaY: -2.4, ctrlKey: true });
    for (const mode of ['auto', 'zoom', 'pan'] as const) expect(wheelIntent(pinch, mode)).toBe('zoom');
  });

  it('a Mac trackpad two-finger swipe pans in auto', () => {
    expect(wheelIntent(wheel({ deltaX: 3, deltaY: 1.5 }), 'auto')).toBe('pan');
    expect(wheelIntent(wheel({ deltaX: 0, deltaY: 1.5 }), 'auto')).toBe('pan');
    expect(wheelIntent(wheel({ deltaX: -6, deltaY: 0 }), 'auto')).toBe('pan');
  });

  it('a Windows mouse notch (deltaY 100, pixel mode) zooms in auto', () => {
    expect(wheelIntent(wheel({ deltaY: 100 }), 'auto')).toBe('zoom');
    expect(wheelIntent(wheel({ deltaY: -100 }), 'auto')).toBe('zoom');
    expect(wheelIntent(wheel({ deltaY: 120 }), 'auto')).toBe('zoom');
  });

  it('a line-mode wheel (Firefox mouse) zooms in auto', () => {
    expect(wheelIntent(wheel({ deltaY: 3, deltaMode: 1 }), 'auto')).toBe('zoom');
  });

  it('known ambiguity: a Mac mouse notch (deltaY 4, pixel mode, no deltaX) reads as a trackpad in auto', () => {
    // Indistinguishable from a slow trackpad swipe; such a player picks the 'zoom' mode in the settings.
    expect(wheelIntent(wheel({ deltaY: 4 }), 'auto')).toBe('pan');
    expect(wheelIntent(wheel({ deltaY: 4 }), 'zoom')).toBe('zoom');
  });

  it('the forced modes win over the guess (but not over a pinch)', () => {
    expect(wheelIntent(wheel({ deltaX: 3, deltaY: 1.5 }), 'zoom')).toBe('zoom');
    expect(wheelIntent(wheel({ deltaY: 100 }), 'pan')).toBe('pan');
  });
});

describe('wheel amounts', () => {
  it('a pinch zooms by exp(-deltaY * 0.01)', () => {
    expect(wheelZoomFactor(wheel({ deltaY: -5, ctrlKey: true }))).toBeCloseTo(Math.exp(0.05));
    expect(wheelZoomFactor(wheel({ deltaY: 8, ctrlKey: true }))).toBeCloseTo(Math.exp(-0.08));
  });

  it('a mouse notch is one 1.1 step, never more', () => {
    expect(wheelZoomFactor(wheel({ deltaY: 100 }))).toBeCloseTo(1 / 1.1);
    expect(wheelZoomFactor(wheel({ deltaY: -100 }))).toBeCloseTo(1.1);
    expect(wheelZoomFactor(wheel({ deltaY: 3, deltaMode: 1 }))).toBeCloseTo(1 / 1.1);
  });

  it('a pan moves by the delta over the zoom', () => {
    expect(wheelPan(wheel({ deltaX: 3, deltaY: 1.5 }), 1.5)).toEqual({ dx: 2, dy: 1 });
    expect(wheelPan(wheel({ deltaY: 3, deltaMode: 1 }), 1)).toEqual({ dx: 0, dy: 48 });
  });
});
