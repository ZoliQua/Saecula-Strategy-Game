import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AudioSink } from '../audio/AudioManager';
import { AudioWatch } from '../audio/AudioWatch';
import { BUILDING_BALANCE, BUILDING_DEATH_TTL_MS } from '../config/balance';
import { createBuilding } from '../ecs/archetypes/building';
import { createUnit } from '../ecs/archetypes/createUnit';
import type { Entity } from '../ecs/components';
import { queueUnit } from '../ecs/queueUnit';
import { playerWallet, startResearch } from '../ecs/research';
import { ConstructionSystem } from '../ecs/systems/ConstructionSystem';
import { DeathSystem } from '../ecs/systems/DeathSystem';
import { GatheringSystem } from '../ecs/systems/GatheringSystem';
import { ResearchSystem } from '../ecs/systems/ResearchSystem';
import { TrainingSystem } from '../ecs/systems/TrainingSystem';
import { createEcsWorld } from '../ecs/world';
import { MapData } from '../map/MapData';
import { TERRAIN } from '../map/TerrainTypes';
import { MatchStats } from '../stats/MatchStats';
import { standingBuildingValue, victimValue } from '../stats/score';
import { gameEvents } from './events';
import { applyDamage } from './kill';
import { KingWatch } from './kingWatch';
import { createPlayer } from './Player';
import { PlayerManager } from './PlayerManager';
import { computePopulation } from './population';
import { createVictoryChecker } from './VictoryChecker';

type Mortal = Entity & { health: { current: number; max: number } };
/** How player 2 goes out: its king falls, or (the reference) an attackerless raze of its town centres. */
type Way = 'king' | 'razed';
const WAYS = ['king', 'razed'] as const;

const cleanup: Array<() => void> = [];
afterEach(() => cleanup.splice(0).forEach((off) => off()));

function setup() {
  const map = new MapData(48, 48, TERRAIN.grass);
  const world = createEcsWorld();
  const players = new PlayerManager([1, 2, 3].map((id) => createPlayer({ id, isHuman: id === 1, age: 2, resources: { food: 2000, wood: 2000, gold: 2000 } })));
  const kings = new Map<number, Mortal>();
  const tcs = new Map<number, Mortal>();
  for (const id of [1, 2, 3]) {
    tcs.set(id, createBuilding(world, { type: 'town_center', origin: { tx: id * 12, ty: 4 }, playerId: id, mapData: map }) as Mortal);
    kings.set(id, createUnit(world, { type: 'king', tile: { tx: id * 12, ty: 10 }, playerId: id }) as Mortal);
  }
  const second = createBuilding(world, { type: 'town_center', origin: { tx: 24, ty: 14 }, playerId: 2, mapData: map }) as Mortal;
  const site = createBuilding(world, { type: 'town_center', origin: { tx: 24, ty: 24 }, playerId: 2, mapData: map, underConstruction: true }) as Mortal;
  const doomed = [tcs.get(2)!, second, site];
  const checker = createVictoryChecker('regicide', world, players);
  const player = players.get(2)!;
  const fall = (way: Way) => {
    if (way === 'king') applyDamage(world, kings.get(2)!, 10_000, 1);
    else for (const tc of doomed) applyDamage(world, tc, 10_000, null);
    expect(checker.check()).toEqual({ kind: 'playing' });
    expect(player.defeated).toBe(true);
  };
  return { map, world, players, player, kings, doomed, second, site, checker, fall };
}

describe.each(WAYS)('out by %s: the town centres are gone (M19)', (way) => {
  it('their queued villager and research die with them, nothing refunded', () => {
    const m = setup();
    const wallet = playerWallet(m.player);
    expect(queueUnit(m.doomed[0]!, 'villager', m.player, { wallet, population: () => ({ current: 0, cap: 10 }) })).toEqual({ ok: true });
    expect(startResearch(m.world, m.second, 'artisan_guilds', m.player, wallet)).toEqual({ ok: true });
    const paid = { ...m.player.resources };
    m.fall(way);
    new TrainingSystem(m.world, m.map, m.players).update(600_000);
    new ResearchSystem(m.world, m.players).update(600_000);
    expect(m.world.entities.filter((e) => e.unit?.unitType === 'villager')).toEqual([]);
    expect(m.player.researched.has('artisan_guilds')).toBe(false);
    expect(m.player.resources).toEqual(paid);
  });

  it("a site's builder is released and it never completes", () => {
    const m = setup();
    const builder = createUnit(m.world, { type: 'villager', tile: { tx: 23, ty: 24 }, playerId: 2 });
    m.world.addComponent(builder, 'buildCommand', { targetId: m.site.id! });
    m.fall(way);
    new ConstructionSystem(m.world, m.map).update(600_000);
    expect(builder.buildCommand).toBeUndefined();
    expect(m.site.underConstruction).toBeDefined();
  });

  it('carried goods wait, and go to another drop-off once there is one', () => {
    const m = setup();
    const villager = createUnit(m.world, { type: 'villager', tile: { tx: 23, ty: 5 }, playerId: 2 });
    const g = villager.gatherer!;
    g.carrying = g.capacity;
    g.carryingType = 'wood';
    m.fall(way);
    const gathering = new GatheringSystem(m.world, m.map, m.players);
    gathering.update(100);
    expect(g.carrying).toBe(g.capacity);
    expect(m.player.resources.wood).toBe(2000);
    createBuilding(m.world, { type: 'lumber_camp', origin: { tx: 21, ty: 5 }, playerId: 2, mapData: m.map });
    gathering.update(100);
    expect(g.carrying).toBe(0);
    expect(m.player.resources.wood).toBe(2000 + g.capacity);
  });

  it('the population cap and the building value lose them at once', () => {
    const m = setup();
    createBuilding(m.world, { type: 'house', origin: { tx: 10, ty: 30 }, playerId: 2, mapData: m.map });
    const house = BUILDING_BALANCE.house;
    expect(computePopulation(m.world.entities, 2, 0).cap).toBeGreaterThan(house.popBonus);
    m.fall(way);
    expect(computePopulation(m.world.entities, 2, 0)).toEqual({ current: 0, cap: house.popBonus });
    expect(standingBuildingValue(m.world, 2)).toBe(victimValue({ buildingType: 'house' }));
  });

  it('DeathSystem frees the footprints', () => {
    const m = setup();
    m.fall(way);
    const death = new DeathSystem(m.world, m.map);
    death.update(BUILDING_DEATH_TTL_MS - 1);
    expect(m.map.isBlocked(24, 4)).toBe(true);
    death.update(1);
    for (const tc of m.doomed) {
      expect(m.world.has(tc)).toBe(false);
      for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) expect(m.map.isBlocked(tc.position!.tx + dx, tc.position!.ty + dy)).toBe(false);
    }
  });
});

describe('who hears the collapse (M19)', () => {
  it('no score, no kill, no lost building and no event of its own', () => {
    const m = setup();
    const stats = new MatchStats(m.world, m.players);
    applyDamage(m.world, m.kings.get(2)!, 10_000, 1);
    cleanup.push(stats.attach());
    const before = stats.snapshot();
    const heard = vi.fn();
    cleanup.push(gameEvents.on('entityKilled', heard), gameEvents.on('buildingDeleted', heard));
    m.checker.check();
    expect(m.doomed.every((tc) => tc.dying)).toBe(true);
    expect(heard).not.toHaveBeenCalled();
    expect(stats.snapshot()).toEqual(before);
    // A blow already on its way finds a collapsing building.
    for (const tc of m.doomed) expect(applyDamage(m.world, tc, 10_000, 1)).toBe(false);
    expect(stats.snapshot()).toEqual(before);
  });

  it('a town centre razed with the king is its killer\'s as ever, the collapsed ones nobody\'s', () => {
    const m = setup();
    const stats = new MatchStats(m.world, m.players);
    cleanup.push(stats.attach());
    applyDamage(m.world, m.doomed[0]!, 10_000, 3);
    applyDamage(m.world, m.kings.get(2)!, 10_000, 1);
    m.checker.check();
    expect(m.second.dying).toBeDefined();
    expect(stats.of(3).killValue).toBe(victimValue({ buildingType: 'town_center' }));
    expect(stats.of(1).killValue).toBe(victimValue({ unitType: 'king' }));
    expect(stats.of(2)).toMatchObject({ unitsLost: 1, buildingsLost: 1 });
  });

  it('"king fell" is said once', () => {
    const m = setup();
    const notify = vi.fn();
    const watch = new KingWatch(m.world, m.players, 1, notify);
    cleanup.push(() => watch.destroy());
    m.fall('king');
    watch.update(100);
    m.checker.check();
    watch.update(200);
    expect(m.doomed.every((tc) => tc.dying)).toBe(true);
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('it sounds like any razed town centre', () => {
    const heard = (way: Way) => {
      const m = setup();
      const played: string[] = [];
      const sink: AudioSink = { playSFX: (key, _volume, at) => played.push(`${key}@${at?.tx},${at?.ty}`) };
      const watch = new AudioWatch(m.world, sink, 1, () => ({ tx: 24, ty: 8 }));
      cleanup.push(() => watch.destroy());
      watch.update(0);
      m.fall(way);
      watch.update(100);
      // The king's own death is the only other sound.
      return played.filter((sound) => sound.startsWith('building_')).sort();
    };
    const razed = heard('razed');
    expect(razed.filter((sound) => sound.startsWith('building_destroyed'))).toHaveLength(3);
    expect(heard('king')).toEqual(razed);
  });
});
