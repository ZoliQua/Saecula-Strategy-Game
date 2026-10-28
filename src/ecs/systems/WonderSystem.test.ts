import { afterEach, describe, expect, it } from 'vitest';
import { gameEvents, type GameEvents } from '../../game/events';
import { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';
import { createBuilding } from '../archetypes/building';
import { createEcsWorld } from '../world';
import { WonderSystem } from './WonderSystem';

const unsubs: (() => void)[] = [];
afterEach(() => {
  for (const u of unsubs.splice(0)) u();
});

function setup(options: { site?: boolean; enabled?: boolean } = {}) {
  const map = new MapData(20, 20, TERRAIN.grass);
  const world = createEcsWorld();
  const wonder = createBuilding(world, {
    type: 'wonder',
    origin: { tx: 4, ty: 4 },
    playerId: 2,
    mapData: map,
    underConstruction: options.site ?? false,
  });
  const completed: GameEvents['wonderCompleted'][] = [];
  const lost: GameEvents['wonderLost'][] = [];
  unsubs.push(gameEvents.on('wonderCompleted', (e) => completed.push(e)));
  unsubs.push(gameEvents.on('wonderLost', (e) => lost.push(e)));
  const system = new WonderSystem(world, options.enabled ?? true);
  return { world, wonder, system, completed, lost };
}

describe('WonderSystem', () => {
  it('finished Wonder gets the clock and emits wonderCompleted once', () => {
    const { wonder, system, completed } = setup();
    system.update(100);
    system.update(100);
    expect(wonder.wonder).toBeDefined();
    expect(completed).toEqual([{ playerId: 2, entityId: wonder.id }]);
  });

  it('site under construction gets no clock', () => {
    const { world, wonder, system, completed } = setup({ site: true });
    system.update(1000);
    expect(wonder.wonder).toBeUndefined();
    expect(completed).toHaveLength(0);
    // Finishing the site starts it.
    world.removeComponent(wonder, 'underConstruction');
    system.update(1000);
    expect(wonder.wonder).toEqual({ heldMs: 0 });
    expect(completed).toHaveLength(1);
  });

  it('heldMs adds each delta', () => {
    const { wonder, system } = setup();
    system.update(16);
    system.update(250);
    system.update(1000);
    expect(wonder.wonder?.heldMs).toBe(1250);
  });

  it('a dying or removed Wonder emits wonderLost and its clock stops', () => {
    const { world, wonder, system, lost } = setup();
    system.update(10);
    system.update(5000);
    const clock = wonder.wonder!;
    expect(clock.heldMs).toBe(5000);
    world.addComponent(wonder, 'dying', { ttlMs: 2400 });
    system.update(1000);
    system.update(1000);
    expect(clock.heldMs).toBe(5000);
    expect(wonder.wonder).toBeUndefined();
    expect(lost).toEqual([{ playerId: 2, entityId: wonder.id }]);

    const other = setup();
    other.system.update(10);
    other.world.remove(other.wonder);
    other.system.update(10);
    other.system.update(10);
    expect(other.lost).toEqual([{ playerId: 2, entityId: other.wonder.id }]);
  });

  it('disabled system adds nothing', () => {
    const { wonder, system, completed } = setup({ enabled: false });
    system.update(60_000);
    expect(wonder.wonder).toBeUndefined();
    expect(completed).toHaveLength(0);
  });
});
