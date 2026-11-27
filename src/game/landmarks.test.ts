import { beforeEach, describe, expect, it } from 'vitest';
import { BUILDING_BALANCE, LANDMARK, UNIQUE_BUILDINGS } from '../config/balance';
import { CIV_IDS, landmarkOf } from '../config/civs';
import type { AIContext } from '../ai/AIPlayer';
import type { WorldView } from '../ai/perception';
import { BaseStrategy } from '../ai/strategies/BaseStrategy';
import type { StrategyState } from '../ai/strategyState';
import { createBuilding } from '../ecs/archetypes/building';
import { createEcsWorld } from '../ecs/world';
import { hu } from '../i18n/hu';
import { FogOfWarData } from '../map/FogOfWarData';
import { MapData } from '../map/MapData';
import { TERRAIN } from '../map/TerrainTypes';
import { HudSync } from '../scenes/game/HudSync';
import type { BuildingType } from '../types';
import { buildingName, buildingRole } from '../ui/buildingText';
import { resetUiStore, uiStore } from '../ui/store';
import { buildBlocker, countPlayerBuildings } from './buildRules';
import { distanceToFootprint } from './landmarks';
import { createPlayer } from './Player';
import { PlayerManager } from './PlayerManager';

/** A bare strategy exposing the AI's one way to place a building (BaseStrategy.startBuilding). */
class PlacingStrategy extends BaseStrategy {
  readonly name = 'test';
  constructor() {
    super(() => 0.5, { min: 1000, max: 1000 });
  }
  place(ctx: AIContext, type: BuildingType) {
    return this.startBuilding(ctx, this.perception.update(ctx), type, { tx: 20, ty: 20 });
  }
  snapshot(): StrategyState {
    throw new Error('not saved');
  }
  restore(): void {}
  protected decide(_ctx: AIContext, _view: WorldView): void {}
  protected upkeep(_ctx: AIContext, _view: WorldView): void {}
}

beforeEach(() => resetUiStore());

describe('landmark rules (M17)', () => {
  it('every civ has a landmark effect as CLAUDE.md lists it, and a Hungarian name and role', () => {
    const kinds = Object.fromEntries(CIV_IDS.map((c) => [c, landmarkOf(c).kind]));
    expect(kinds).toEqual({
      hungarian: 'fort', english: 'modifier', german: 'modifier', french: 'modifier',
      spanish: 'mint', italian: 'modifier', russian: 'fort', finnish: 'sauna',
    });
    const effect = (c: (typeof CIV_IDS)[number]) => {
      const lm = landmarkOf(c);
      return lm.kind === 'modifier' ? lm.effect.kind : null;
    };
    expect([effect('english'), effect('german'), effect('french'), effect('italian')]).toEqual(['dockTrainSpeed', 'tradeGold', 'researchSpeed', 'marketRate']);
    expect(CIV_IDS.map((c) => hu.landmarks[c].name)).toEqual(['Végvár', 'Királyi hajógyár', 'Hanza-kontor', 'Akadémia', 'Pénzverde', 'Bankház', 'Osztrog', 'Szauna']);
    for (const c of CIV_IDS) expect(hu.landmarks[c].role.length).toBeGreaterThan(10);
  });

  it('the landmark is a 3×3, age-2 building, unique per player', () => {
    expect(BUILDING_BALANCE.landmark).toMatchObject({ age: 2, width: 3, height: 3 });
    expect(UNIQUE_BUILDINGS.has('landmark')).toBe(true);
    expect(buildBlocker('landmark', 1, 0)).toBe('age-locked');
    expect(buildBlocker('landmark', 2, 0)).toBeNull();
    expect(buildBlocker('landmark', 2, 1)).toBe('unique-limit');
  });

  it('build menu, panel and tech tree name it after the civ', () => {
    expect(buildingName('landmark', 'finnish')).toBe('Szauna');
    expect(buildingRole('landmark', 'spanish')).toBe(hu.landmarks.spanish.role);
    expect(buildingName('market', 'finnish')).toBe(hu.buildings.market);
    expect(hu.landmarks.spanish.role).toContain(String(LANDMARK.mintGoldPerMin));
  });

  it('human path: a site counts, so a second landmark is refused and the HUD greys the button', () => {
    const map = new MapData(40, 40, TERRAIN.grass);
    const world = createEcsWorld();
    const players = new PlayerManager([createPlayer({ id: 1, isHuman: true, age: 2 }), createPlayer({ id: 2 })]);
    createBuilding(world, { type: 'landmark', origin: { tx: 5, ty: 5 }, playerId: 1, mapData: map, underConstruction: true });
    const existing = countPlayerBuildings(world.entities, 1, 'landmark');
    expect(buildBlocker('landmark', 2, existing)).toBe('unique-limit');
    // Another player's landmark does not count for the human.
    expect(countPlayerBuildings(world.entities, 2, 'landmark')).toBe(0);
    new HudSync(world, players, null).secondTick();
    expect(uiStore.getState().uniqueBuilt).toContain('landmark');
  });

  it('AI path: startBuilding places one landmark and never a second', () => {
    const map = new MapData(48, 48, TERRAIN.grass);
    const world = createEcsWorld();
    const fog = new FogOfWarData(48, 48);
    for (let ty = 0; ty < 48; ty++) for (let tx = 0; tx < 48; tx++) fog.markVisible(tx, ty);
    const player = createPlayer({ id: 2, age: 2, civ: 'german', resources: { food: 5000, wood: 5000, gold: 5000 } });
    const ctx: AIContext = { world, mapData: map, player, timeMs: 0, fog };
    const ai = new PlacingStrategy();
    expect(ai.place(ctx, 'landmark')).not.toBeNull();
    const wood = player.resources.wood;
    expect(ai.place(ctx, 'landmark')).toBeNull();
    expect(player.resources.wood).toBe(wood);
    expect(countPlayerBuildings(world.entities, 2, 'landmark')).toBe(1);
  });

  it('distanceToFootprint is the Chebyshev distance to the nearest footprint tile', () => {
    const fp = { width: 3, height: 3 };
    const o = { tx: 10, ty: 10 };
    expect(distanceToFootprint({ tx: 11, ty: 11 }, o, fp)).toBe(0);
    expect(distanceToFootprint({ tx: 16, ty: 12 }, o, fp)).toBe(4);
    expect(distanceToFootprint({ tx: 6, ty: 6 }, o, fp)).toBe(4);
    expect(distanceToFootprint({ tx: 9, ty: 15 }, o, fp)).toBe(3);
  });
});
