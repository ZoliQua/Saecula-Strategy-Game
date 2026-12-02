import { describe, expect, it } from 'vitest';
import { AI_MEDIUM } from '../config/aiBalance';
import { CIV_IDS } from '../config/civs';
import { CAVALRY_CLASS, INFANTRY_CLASS, isNavalType, KING, TRAINER_BUILDINGS, UNIT_BALANCE } from '../config/balance';
import { createBuilding } from '../ecs/archetypes/building';
import { createUnit } from '../ecs/archetypes/createUnit';
import { queueUnit } from '../ecs/queueUnit';
import { toSelectedInfo } from '../ecs/systems/selectedInfo';
import { createEcsWorld } from '../ecs/world';
import { enemyClassShares } from '../ai/decisions/army';
import { enemyArmySeen } from '../ai/decisions/stance';
import type { AIContext } from '../ai/AIPlayer';
import { MediumStrategy } from '../ai/strategies/MediumStrategy';
import { hu } from '../i18n/hu';
import { FogOfWarData } from '../map/FogOfWarData';
import { MapData } from '../map/MapData';
import { createRng } from '../map/random';
import { techTreeModel } from '../ui/screens/techTreeModel';
import { BASE_UNIT_TYPES, type AgeId, type BuildingType } from '../types';
import { canCivTrain, civUnitTypes, isTrainableUnit, TRAINABLE_UNIT_TYPES } from './civUnits';
import { canConvert } from './convert';
import { createPlayer } from './Player';
import { computePopulation } from './population';

const AGES: readonly AgeId[] = [1, 2, 3];
const TRAINERS = [...TRAINER_BUILDINGS] as BuildingType[];

/** Medium with its mix and view opened up, on a table that (wrongly) lists the king. */
class Probe extends MediumStrategy {
  constructor() {
    super(createRng(5), { ...AI_MEDIUM, armyByAge: AI_MEDIUM.armyByAge.map((mix) => ({ ...mix, king: 5 })) });
  }
  look(ctx: AIContext) {
    const view = this.perception.update(ctx);
    return { view, mix: this.armyMix(ctx, view) };
  }
}

describe('the king (M19)', () => {
  it('has the spec stats: no trainer, no population, no attack', () => {
    expect(KING).toEqual({ hp: 150, speed: UNIT_BALANCE.villager.speed * 1.2, los: 6, meleeDef: 2, pierceDef: 2, alertEveryMs: 10_000 });
    expect(UNIT_BALANCE.king).toMatchObject({
      age: 1, hp: KING.hp, speed: KING.speed, los: KING.los, meleeDef: KING.meleeDef, pierceDef: KING.pierceDef,
      meleeAtk: 0, pierceAtk: 0, range: 0, trainers: [], popCost: 0, cost: { food: 0, wood: 0, gold: 0 },
    });
    expect(UNIT_BALANCE.king.replaces).toBeUndefined();
  });

  it('is a land unit of no class', () => {
    expect(isNavalType('king')).toBe(false);
    expect(CAVALRY_CLASS).not.toContain('king');
    expect(INFANTRY_CLASS).not.toContain('king');
  });

  it('is created without attacker, converter and gatherer, and takes no population', () => {
    const world = createEcsWorld();
    const king = createUnit(world, { type: 'king', tile: { tx: 3, ty: 3 }, playerId: 1 });
    expect(king.attacker).toBeUndefined();
    expect(king.converter).toBeUndefined();
    expect(king.gatherer).toBeUndefined();
    expect(king.health).toEqual({ current: KING.hp, max: KING.hp });
    expect(king.armor).toEqual({ melee: KING.meleeDef, pierce: KING.pierceDef });
    expect(king.fogEmitter).toEqual({ sightRange: KING.los });
    expect(computePopulation(world.entities, 1, 0).current).toBe(0);
  });

  it('is the one base unit nobody can train', () => {
    expect(BASE_UNIT_TYPES).toContain('king');
    expect(BASE_UNIT_TYPES.filter((t) => !TRAINABLE_UNIT_TYPES.includes(t))).toEqual(['king']);
    expect(isTrainableUnit('king')).toBe(false);
    for (const civ of CIV_IDS) {
      expect(civUnitTypes(civ), civ).not.toContain('king');
      expect(canCivTrain(civ, 'king'), civ).toBe(false);
    }
  });

  it('no trainer offers or accepts it', () => {
    for (const civ of CIV_IDS) {
      for (const type of TRAINERS) {
        const world = createEcsWorld();
        const building = createBuilding(world, { type, origin: { tx: 4, ty: 4 }, playerId: 1, mapData: new MapData(16, 16) });
        const info = toSelectedInfo(building as Parameters<typeof toSelectedInfo>[0], () => civ);
        if (info?.kind !== 'building') throw new Error(`no info for ${type}`);
        expect(info.trainable ?? [], `${civ} ${type}`).not.toContain('king');
        const wallet = { get: () => ({ food: 999, wood: 999, gold: 999 }), set: () => {} };
        const account = { wallet, population: () => ({ current: 0, cap: 10 }) };
        expect(queueUnit(building, 'king', { age: 3, civ }, account).ok, `${civ} ${type}`).toBe(false);
        expect(building.trainingQueue?.entries ?? []).toEqual([]);
      }
    }
  });

  it('is not in any tech tree', () => {
    for (const civ of CIV_IDS) {
      for (const age of AGES) {
        const columns = techTreeModel(civ, age).columns;
        expect(columns.flatMap((c) => c.units.map((u) => u.type)), `${civ} ${age}`).not.toContain('king');
      }
    }
  });

  it.each(AGES)('age %i: is never in an AI army mix, its army or the threats', (age) => {
    const world = createEcsWorld();
    const map = new MapData(32, 32);
    createBuilding(world, { type: 'town_center', origin: { tx: 12, ty: 12 }, playerId: 2, mapData: map });
    const own = createUnit(world, { type: 'king', tile: { tx: 11, ty: 12 }, playerId: 2 });
    const enemy = createUnit(world, { type: 'king', tile: { tx: 16, ty: 12 }, playerId: 1 });
    const fog = new FogOfWarData(32, 32);
    for (let ty = 0; ty < 32; ty++) for (let tx = 0; tx < 32; tx++) fog.markVisible(tx, ty);
    const ctx: AIContext = { world, mapData: map, player: createPlayer({ id: 2, age }), enemyPlayerId: 1, timeMs: 0, fog };
    const { view, mix } = new Probe().look(ctx);
    expect(mix).not.toHaveProperty('king');
    for (const group of [view.military, view.scouts, view.villagers, view.ships]) expect(group).not.toContain(own);
    // Seen (the waves may target it), but no threat.
    expect(view.visibleEnemyUnits).toContain(enemy);
    expect(view.threats).toEqual([]);
  });

  it('a sighted king is no enemy army', () => {
    expect(enemyArmySeen({ king: 2, swordsman: 1 })).toBe(1);
    expect(enemyClassShares({ king: 3, knight: 1 })).toEqual(enemyClassShares({ knight: 1 }));
  });

  it('cannot be converted', () => {
    const world = createEcsWorld();
    expect(canConvert(createUnit(world, { type: 'king', tile: { tx: 3, ty: 3 }, playerId: 2 }), 1)).toBe(false);
    expect(canConvert(createUnit(world, { type: 'knight', tile: { tx: 4, ty: 3 }, playerId: 2 }), 1)).toBe(true);
  });

  it('is called "Király" and has a role line', () => {
    expect(hu.units.king).toBe('Király');
    expect(hu.unitRoles.king).toBe('Nem harcol · ha elesik, kiesel');
  });
});
