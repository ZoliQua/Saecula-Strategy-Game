import { describe, expect, it } from 'vitest';
import { ageUpDelays, joinsAgeUpWave, rippleOrigin } from './ageUpSchedule';

const timing = { staggerMs: 200, maxSpreadMs: 1000 };

describe('ageUpDelays', () => {
  it('starts with the building nearest the origin and ripples outwards', () => {
    const out = ageUpDelays(
      [
        { item: 'far', tx: 20, ty: 20 },
        { item: 'tc', tx: 10, ty: 10 },
        { item: 'near', tx: 12, ty: 10 },
      ],
      { tx: 10, ty: 10 },
      timing,
    );
    expect(out).toEqual([
      { item: 'tc', delayMs: 0 },
      { item: 'near', delayMs: 200 },
      { item: 'far', delayMs: 400 },
    ]);
  });

  it('compresses the stagger so the whole wave fits in maxSpreadMs', () => {
    const targets = Array.from({ length: 11 }, (_, i) => ({ item: i, tx: i, ty: 0 }));
    const out = ageUpDelays(targets, { tx: 0, ty: 0 }, timing);
    expect(out[out.length - 1]?.delayMs).toBe(1000);
    expect(out[1]?.delayMs).toBe(100);
  });

  it('keeps input order for equal distances and handles a lone building', () => {
    expect(ageUpDelays([{ item: 'a', tx: 1, ty: 0 }, { item: 'b', tx: 0, ty: 1 }], { tx: 0, ty: 0 }, timing).map((d) => d.item)).toEqual(['a', 'b']);
    expect(ageUpDelays([{ item: 'x', tx: 5, ty: 5 }], { tx: 0, ty: 0 }, timing)).toEqual([{ item: 'x', delayMs: 0 }]);
    expect(ageUpDelays([], { tx: 0, ty: 0 }, timing)).toEqual([]);
  });
});

describe('rippleOrigin', () => {
  it('prefers the town centre, else the centroid', () => {
    const targets = [
      { item: 'house', tx: 0, ty: 0 },
      { item: 'tc', tx: 6, ty: 4 },
    ];
    expect(rippleOrigin(targets, (i) => i === 'tc')).toEqual({ tx: 6, ty: 4 });
    expect(rippleOrigin(targets, () => false)).toEqual({ tx: 3, ty: 2 });
  });
});

describe('joinsAgeUpWave', () => {
  const b = (type: string, extra: object = {}) => ({ building: { type }, ...extra }) as unknown as Parameters<typeof joinsAgeUpWave>[0];
  it('takes finished age-styled buildings, not walls, dying buildings or construction sites (they already show a scaffold)', () => {
    expect(joinsAgeUpWave(b('house'))).toBe(true);
    expect(joinsAgeUpWave(b('wall'))).toBe(false);
    expect(joinsAgeUpWave(b('house', { dying: { atMs: 0 } }))).toBe(false);
    expect(joinsAgeUpWave(b('house', { underConstruction: { totalTime: 25, elapsed: 3 } }))).toBe(false);
  });
});
