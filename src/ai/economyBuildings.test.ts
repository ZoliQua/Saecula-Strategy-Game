import { describe, expect, it } from 'vitest';
import type { Entity } from '../ecs/components';
import { unstaffedSite } from './economyBuildings';
import type { WorldView } from './perception';

const site = (id: number, type: string, done = false): Entity =>
  ({ id, building: { type }, ...(done ? {} : { underConstruction: { totalTime: 60, elapsed: 10 } }) }) as unknown as Entity;
const builder = (targetId?: number): Entity =>
  ({ unit: { unitType: 'villager' }, ...(targetId === undefined ? {} : { buildCommand: { targetId } }) }) as unknown as Entity;
const view = (buildings: Entity[], villagers: Entity[]) => ({ buildings, villagers }) as unknown as WorldView;

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
});
