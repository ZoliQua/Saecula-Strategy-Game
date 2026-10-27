import { describe, expect, it } from 'vitest';
import type { Entity } from '../ecs/components';
import { AI_COMMON } from '../config/aiBalance';
import { unstaffedSite } from './economyBuildings';
import type { WorldView } from './perception';

const site = (id: number, type: string, done = false, tx = 10, ty = 10): Entity =>
  ({
    id,
    position: { tx, ty },
    building: { type, footprint: { width: type === 'town_center' ? 3 : 2, height: type === 'town_center' ? 3 : 2 } },
    ...(done ? {} : { underConstruction: { totalTime: 60, elapsed: 10 } }),
  }) as unknown as Entity;
const builder = (targetId?: number): Entity =>
  ({ unit: { unitType: 'villager' }, ...(targetId === undefined ? {} : { buildCommand: { targetId } }) }) as unknown as Entity;
const view = (buildings: Entity[], villagers: Entity[], visibleEnemyUnits: Entity[] = []) =>
  ({ buildings, villagers, visibleEnemyUnits, townCenter: buildings.find((b) => b.building?.type === 'town_center') }) as unknown as WorldView;
const enemy = (unitType: string, tx: number, ty: number): Entity =>
  ({ unit: { unitType }, attacker: { damage: 5 }, position: { tx, ty } }) as unknown as Entity;

describe('unstaffedSite', () => {
  it('finds a site whose builders are gone (killed or sent off), so it is not left half-built for good', () => {
    const foundry = site(7, 'foundry');
    expect(unstaffedSite(view([site(1, 'town_center', true), foundry], [builder(), builder(3)]))).toBe(foundry);
  });

  it('ignores staffed sites, finished buildings and wall segments (a wall line is walked segment by segment)', () => {
    expect(unstaffedSite(view([site(7, 'foundry')], [builder(7)]))).toBeUndefined();
    expect(unstaffedSite(view([site(1, 'house', true)], []))).toBeUndefined();
    expect(unstaffedSite(view([site(2, 'wall')], []))).toBeUndefined();
  });

  it('leaves a site under attack, or far out from the base, to wait (M3 N3)', () => {
    const tc = site(1, 'town_center', true, 10, 10);
    const tower = site(7, 'tower', false, 16, 10);
    // An armed enemy beside the site: builders would walk into the fight.
    expect(unstaffedSite(view([tc, tower], [], [enemy('swordsman', 17, 11)]))).toBeUndefined();
    // A villager or a scout nearby is no attack.
    expect(unstaffedSite(view([tc, tower], [], [enemy('villager', 17, 11), enemy('scout', 16, 12)]))).toBe(tower);
    // An armed enemy far from the site does not hold it up.
    expect(unstaffedSite(view([tc, tower], [], [enemy('swordsman', 40, 40)]))).toBe(tower);
    // A forward site far out from the base is left.
    const forward = site(8, 'tower', false, 11 + AI_COMMON.restaffRadius + 2, 11);
    expect(unstaffedSite(view([tc, forward], []))).toBeUndefined();
  });
});
