import { describe, expect, it } from 'vitest';
import { UNIT_FRAMES } from '../../iso/art/units';
import type { Entity } from '../components';
import { unitAnimFrame } from './unitAnim';

const walker = (moving: boolean): Entity => ({
  id: 1,
  movable: { speed: 2, path: moving ? [{ tx: 1, ty: 0 }] : [], progress: 0.2, facing: 'E' },
});

describe('unitAnimFrame', () => {
  it('alternates walk frames while moving', () => {
    const frames = new Set([0, 170, 340].map((t) => unitAnimFrame(walker(true), t).frame));
    expect(frames).toEqual(new Set([UNIT_FRAMES.walkA, UNIT_FRAMES.walkB]));
  });

  it('shows the attack frame right after a swing', () => {
    const e: Entity = {
      ...walker(false),
      attackIntent: { targetId: 2 },
      attacker: { meleeAtk: 1, pierceAtk: 0, bonusVsCavalry: 0, range: 1, cooldownMs: 1000, cooldownRemaining: 950 },
    };
    expect(unitAnimFrame(e, 0).frame).toBe(UNIT_FRAMES.attack);
    e.attacker!.cooldownRemaining = 400;
    expect(unitAnimFrame(e, 0).frame).toBe(UNIT_FRAMES.idle);
  });

  it('idles with a tiny bob when doing nothing', () => {
    const r = unitAnimFrame(walker(false), 1234);
    expect(r.frame).toBe(UNIT_FRAMES.idle);
    expect(r.bob).toBeGreaterThanOrEqual(0);
    expect(r.bob).toBeLessThan(1);
  });
});
