import { describe, expect, it } from 'vitest';
import { ANIM_FRAMES, frameIndex, headingSlot, sheetLayout, unitAnims } from '../../iso/art/units/layout';
import type { Direction } from '../../types';
import type { Entity } from '../components';
import { attackFrame, DYING_MS, dyingAlpha, unitAnimState } from './unitAnim';

const unit = (moving: boolean, facing: Direction = 'E'): Entity => ({
  id: 1,
  unit: { unitType: 'swordsman' },
  movable: { speed: 2.475, path: moving ? [{ tx: 1, ty: 0 }] : [], progress: 0.2, facing },
});

describe('unitAnimState', () => {
  it('walks through all six frames, at a pace tied to speed', () => {
    const e = unit(true);
    const frames = new Set<number>();
    for (let t = 0; t < 1000; t += 10) {
      const s = unitAnimState(e, t);
      expect(s.anim).toBe('walk');
      frames.add(s.i);
    }
    expect(frames).toEqual(new Set([0, 1, 2, 3, 4, 5]));
    // Twice the speed → the cycle comes round twice as fast.
    e.id = 0;
    const slow = unitAnimState(e, 100).i;
    e.movable!.speed *= 2;
    expect(unitAnimState(e, 50).i).toBe(slow);
  });

  it('keeps the movable heading', () => {
    expect(unitAnimState(unit(true, 'NW'), 0).heading).toBe('NW');
    expect(unitAnimState(unit(false, 'S'), 0).heading).toBe('S');
  });

  it('plays the swing right after a blow and winds up before the next', () => {
    expect(attackFrame(1000, 1000)).toBe(2);
    expect(attackFrame(1000, 850)).toBe(3);
    expect(attackFrame(1000, 700)).toBe(4);
    expect(attackFrame(1000, 500)).toBe(4);
    expect(attackFrame(1000, 250)).toBe(0);
    expect(attackFrame(1000, 100)).toBe(1);
    const e: Entity = {
      ...unit(false),
      attackIntent: { targetId: 2 },
      attacker: { meleeAtk: 1, pierceAtk: 0, bonusVsCavalry: 0, range: 1, cooldownMs: 1000, cooldownRemaining: 990 },
    };
    expect(unitAnimState(e, 0)).toMatchObject({ anim: 'attack', i: 2 });
  });

  it('swings the tool while gathering', () => {
    const e: Entity = {
      ...unit(false),
      gatherer: { carryingType: 'wood', carrying: 2, capacity: 10, gatherRate: 1, targetNodeId: 5, dropoffId: undefined },
    };
    const frames = new Set([0, 150, 300, 450].map((t) => unitAnimState(e, t).i));
    expect(unitAnimState(e, 0).anim).toBe('work');
    expect(frames.size).toBe(ANIM_FRAMES.work);
  });

  it('plays the death fall once and holds the last frame', () => {
    const e: Entity = { ...unit(true), dying: { ttlMs: DYING_MS } };
    const seq = [DYING_MS, 800, 650, 500, 300, 10].map((ttl) => {
      e.dying!.ttlMs = ttl;
      return unitAnimState(e, 0);
    });
    expect(seq.every((s) => s.anim === 'death')).toBe(true);
    const frames = seq.map((s) => s.i);
    expect(frames[0]).toBe(0);
    expect([...frames].sort((a, b) => a - b)).toEqual(frames);
    expect(frames.at(-1)).toBe(ANIM_FRAMES.death - 1);
    expect(dyingAlpha(DYING_MS)).toBe(1);
    expect(dyingAlpha(0)).toBe(0);
  });

  it('idles slowly with two breathing frames', () => {
    const frames = new Set([0, 700, 1400].map((t) => unitAnimState(unit(false), t).i));
    expect(unitAnimState(unit(false), 0).anim).toBe('idle');
    expect(frames).toEqual(new Set([0, 1]));
  });
});

describe('sheet layout', () => {
  it('mirrors W, SW and S onto painted rows', () => {
    expect(headingSlot('SE')).toEqual({ slot: 0, flip: false });
    expect(headingSlot('S')).toEqual({ slot: headingSlot('E').slot, flip: true });
    expect(headingSlot('SW')).toEqual({ slot: headingSlot('NE').slot, flip: true });
    expect(headingSlot('W')).toEqual({ slot: headingSlot('N').slot, flip: true });
    expect(headingSlot('NW').flip).toBe(false);
  });

  it('gives every heading/animation/frame its own index and falls back for missing anims', () => {
    const villager = sheetLayout(unitAnims('villager'));
    const seen = new Set<number>();
    for (let slot = 0; slot < 5; slot++) {
      for (const anim of villager.anims) {
        for (let i = 0; i < ANIM_FRAMES[anim]; i++) seen.add(frameIndex(villager, slot, anim, i));
      }
    }
    expect(seen.size).toBe(villager.frameCount);
    const soldier = sheetLayout(unitAnims('pikeman'));
    expect(frameIndex(soldier, 1, 'work', 2)).toBe(frameIndex(soldier, 1, 'attack', 2));
  });
});

describe('unitAnimState for builders (M7: no tool swing away from the site)', () => {
  const site: Entity = { id: 7, position: { tx: 10, ty: 10 }, building: { type: 'barracks', footprint: { width: 3, height: 3 } }, underConstruction: { totalTime: 50, elapsed: 0 } };
  const siteOf = (id: number) => (id === 7 ? site : undefined);
  const builder = (tx: number, ty: number): Entity => ({
    ...unit(false),
    unit: { unitType: 'villager' },
    position: { tx, ty },
    buildCommand: { targetId: 7 },
  });

  it('swings the tool only on the ring around its site', () => {
    expect(unitAnimState(builder(9, 11), 0, siteOf).anim).toBe('work');
    expect(unitAnimState(builder(13, 13), 0, siteOf).anim).toBe('work');
  });

  it('idles when it stands away from the site or inside its footprint', () => {
    expect(unitAnimState(builder(2, 2), 0, siteOf).anim).toBe('idle');
    expect(unitAnimState(builder(11, 11), 0, siteOf).anim).toBe('idle');
  });

  it('walks while it moves toward the site', () => {
    const b = builder(2, 2);
    b.movable!.path = [{ tx: 3, ty: 3 }];
    expect(unitAnimState(b, 0, siteOf).anim).toBe('walk');
  });
});
