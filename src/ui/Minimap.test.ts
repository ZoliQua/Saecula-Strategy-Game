import { describe, expect, it } from 'vitest';
import { createUnit } from '../ecs/archetypes/createUnit';
import { createEcsWorld } from '../ecs/world';
import { killEntity } from '../game/kill';
import { minimapCrowns, minimapHillMark, minimapShows } from './Minimap';
import { HILL_MARK } from '../config/visual';

describe('minimapShows (M16)', () => {
  const friendly = (id: number) => id === 1 || id === 2;

  it("always shows the human's and its allies' entities, others only when visible", () => {
    expect(minimapShows(1, friendly, () => false)).toBe(true);
    expect(minimapShows(2, friendly, () => false)).toBe(true);
    expect(minimapShows(3, friendly, () => false)).toBe(false);
    expect(minimapShows(3, friendly, () => true)).toBe(true);
    expect(minimapShows(0, friendly, () => false)).toBe(false);
  });
});

describe('minimapCrowns (M19)', () => {
  function setup() {
    const world = createEcsWorld();
    const king = (playerId: number) => createUnit(world, { type: 'king', tile: { tx: playerId, ty: 1 }, playerId });
    const kings = [king(1), king(2), king(3)];
    createUnit(world, { type: 'knight', tile: { tx: 8, ty: 8 }, playerId: 1 });
    return { world, kings };
  }
  const friendly = (id: number) => id === 1 || id === 2;
  const txs = (tiles: readonly { tx: number }[]) => tiles.map((t) => t.tx).sort();

  it('own and allied kings always, others only in sight', () => {
    const { world } = setup();
    expect(txs(minimapCrowns(world, friendly, () => false))).toEqual([1, 2]);
    expect(txs(minimapCrowns(world, friendly, () => true))).toEqual([1, 2, 3]);
  });

  it('none for a dying king or one aboard', () => {
    const { world, kings } = setup();
    killEntity(world, kings[0] as Parameters<typeof killEntity>[1]);
    world.remove(kings[1]!);
    expect(txs(minimapCrowns(world, friendly, () => false))).toEqual([]);
  });
});

describe('minimapHillMark (M19)', () => {
  it('covers the zone, two to one like the tiles', () => {
    const mark = minimapHillMark(0.25);
    expect(mark.halfW).toBe(56);
    expect(mark.halfH).toBe(28);
  });

  it('stays findable on the largest map', () => {
    const mark = minimapHillMark(0.001);
    expect(mark.halfW).toBe(HILL_MARK.minimap.minHalfWidth);
    expect(mark.halfH).toBe(HILL_MARK.minimap.minHalfWidth / 2);
  });
});
