import { describe, expect, it } from 'vitest';
import { CONSCRIPTION_BUILDINGS, MONK, TECH_BALANCE } from '../config/balance';
import { createUnit } from '../ecs/archetypes/createUnit';
import { createBuilding } from '../ecs/archetypes/building';
import { MonkSystem } from '../ecs/systems/MonkSystem';
import { ResearchSystem } from '../ecs/systems/ResearchSystem';
import { TrainingSystem } from '../ecs/systems/TrainingSystem';
import { createEcsWorld } from '../ecs/world';
import { MapData } from '../map/MapData';
import type { TechId } from '../types';
import { buildSpeedMultiplier, convertRechargeMultiplier, effectiveUnitStats, trainSpeedMultiplier } from './modifiers';
import { createPlayer } from './Player';
import { PlayerManager } from './PlayerManager';
import { TECH_SPECS } from './technologies';

const M12: readonly TechId[] = ['wheelbarrow', 'treadmill_crane', 'husbandry', 'cavalry_armor', 'forced_march', 'conscription', 'chemistry', 'sanctity', 'fervor', 'illumination'];
const with_ = (...ids: TechId[]) => ({ researched: new Set<TechId>(ids) });

describe('M12 technologies', () => {
  it('are all specified, at their building and age, with their prerequisites', () => {
    for (const id of M12) expect(TECH_SPECS[id], id).toBeDefined();
    expect(M12.map((id) => [TECH_SPECS[id].building, TECH_SPECS[id].requiredAge])).toEqual([
      ['town_center', 2], ['town_center', 2], ['stable', 2], ['stable', 3], ['barracks', 3],
      ['barracks', 3], ['blacksmith', 3], ['monastery', 2], ['monastery', 2], ['monastery', 3],
    ]);
    expect(TECH_SPECS.cavalry_armor.prerequisites).toEqual(['cavalry_training']);
    expect(TECH_SPECS.forced_march.prerequisites).toEqual(['infantry_march']);
  });

  it('speed: wheelbarrow (villagers), husbandry (cavalry), forced march (infantry, stacking), fervor (monks)', () => {
    const v = (techs: TechId[], t: Parameters<typeof effectiveUnitStats>[1]) => effectiveUnitStats(with_(...techs), t).speedMultiplier;
    expect(v(['wheelbarrow'], 'villager')).toBeCloseTo(1.1);
    expect(v(['wheelbarrow'], 'swordsman')).toBe(1);
    expect(v(['husbandry'], 'knight')).toBeCloseTo(1.1);
    expect(v(['husbandry'], 'hussar')).toBeCloseTo(1.1);
    expect(v(['infantry_march', 'forced_march'], 'swordsman')).toBeCloseTo(1.1 * 1.1);
    expect(v(['fervor'], 'monk')).toBeCloseTo(1.15);
    expect(v(['fervor'], 'villager')).toBe(1);
  });

  it('HP: cavalry armour (cavalry), sanctity (monks); chemistry: +1 pierce for gunpowder units only', () => {
    expect(effectiveUnitStats(with_('cavalry_training', 'cavalry_armor'), 'knight').hpMultiplier).toBeCloseTo(1.1 * 1.15);
    expect(effectiveUnitStats(with_('sanctity'), 'monk').hp).toBe(45);
    for (const t of ['musketeer', 'mousquetaire', 'cannon'] as const) expect(effectiveUnitStats(with_('chemistry'), t).pierceAtk, t).toBe(effectiveUnitStats(with_(), t).pierceAtk + 1);
    expect(effectiveUnitStats(with_('chemistry'), 'archer').pierceAtk).toBe(effectiveUnitStats(with_(), 'archer').pierceAtk);
  });

  it('treadmill crane builds 20% faster; conscription trains 25% faster at its buildings only; illumination halves the recharge', () => {
    expect(buildSpeedMultiplier(with_('treadmill_crane'))).toBeCloseTo(1.2);
    for (const b of CONSCRIPTION_BUILDINGS) expect(trainSpeedMultiplier(with_('conscription'), b)).toBeCloseTo(1.25);
    expect(trainSpeedMultiplier(with_('conscription'), 'town_center')).toBe(1);
    expect(trainSpeedMultiplier(with_(), 'barracks')).toBe(1);
    expect(convertRechargeMultiplier(with_('illumination'))).toBeCloseTo(0.5);
    expect(TECH_BALANCE.illumination.value).toBe(0.5);
  });

  it('researching sanctity raises existing monks once; new monks spawn with it', () => {
    const map = new MapData(30, 30);
    const world = createEcsWorld();
    const players = new PlayerManager([createPlayer({ id: 1, isHuman: true }), createPlayer({ id: 2 })]);
    const monk = createUnit(world, { type: 'monk', tile: { tx: 3, ty: 3 }, playerId: 1 });
    monk.health!.current = 15;
    const knight = createUnit(world, { type: 'knight', tile: { tx: 4, ty: 3 }, playerId: 1 });
    const monastery = createBuilding(world, { type: 'monastery', origin: { tx: 10, ty: 10 }, playerId: 1, mapData: map });
    world.addComponent(monastery, 'research', { techId: 'sanctity', elapsed: 0, totalTime: 1 });
    new ResearchSystem(world, players).update(2000);
    expect(players.get(1)!.researched.has('sanctity')).toBe(true);
    expect(monk.health).toEqual({ current: 23, max: 45 });
    expect(knight.health!.max).toBe(100);
    monastery.trainingQueue!.entries.push({ unitType: 'monk', elapsed: 0, totalTime: 1 });
    new TrainingSystem(world, map, players).update(1500);
    const fresh = world.entities.filter((e) => e.unit?.unitType === 'monk' && e !== monk);
    expect(fresh.map((m) => m.health)).toEqual([{ current: 45, max: 45 }]);
  });

  it('conscription shortens a barracks queue; illumination shortens a monk\'s recharge after converting', () => {
    const map = new MapData(30, 30);
    const world = createEcsWorld();
    const players = new PlayerManager([createPlayer({ id: 1, isHuman: true }), createPlayer({ id: 2 })]);
    players.get(1)!.researched.add('conscription');
    players.get(1)!.researched.add('illumination');
    const barracks = createBuilding(world, { type: 'barracks', origin: { tx: 10, ty: 10 }, playerId: 1, mapData: map });
    barracks.trainingQueue!.entries.push({ unitType: 'swordsman', elapsed: 0, totalTime: 10 });
    new TrainingSystem(world, map, players).update(4000);
    expect(barracks.trainingQueue!.entries[0]!.elapsed).toBeCloseTo(5);
    const monk = createUnit(world, { type: 'monk', tile: { tx: 3, ty: 3 }, playerId: 1 });
    const archer = createUnit(world, { type: 'archer', tile: { tx: 5, ty: 3 }, playerId: 2 });
    world.addComponent(monk, 'convertIntent', { targetId: archer.id!, elapsedMs: 0 });
    new MonkSystem(world, map, () => 'hungarian', (id) => players.get(id)).update(MONK.convertTimeMs);
    expect(archer.owner!.playerId).toBe(1);
    expect(monk.converter!.rechargeMs).toBe(MONK.rechargeMs / 2);
  });
});
