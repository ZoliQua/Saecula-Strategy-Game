import { beforeEach, describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import type { AIContext } from '../../ai/AIPlayer';
import { canPlaceAt } from '../../ai/decisions/placement';
import { findDockSite } from '../../ai/decisions/naval';
import type { WorldView } from '../../ai/perception';
import { BaseStrategy } from '../../ai/strategies/BaseStrategy';
import type { StrategyState } from '../../ai/strategyState';
import { BUILDING_SPECS } from '../../ecs/archetypes/building';
import { createHill } from '../../ecs/archetypes/hill';
import type { Entity } from '../../ecs/components';
import type { SelectionSystem } from '../../ecs/systems/SelectionSystem';
import { createEcsWorld } from '../../ecs/world';
import { inHillZone } from '../../game/hill';
import { createPlayer } from '../../game/Player';
import type { TileCoord } from '../../iso/coordinates';
import { FogOfWarData } from '../../map/FogOfWarData';
import { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';
import type { BuildingType } from '../../types';
import { resetUiStore, uiStore } from '../../ui/store';
import { BuildPlacement } from './BuildPlacement';

const CENTRE = { tx: 20, ty: 20 };
const TYPES = Object.keys(BUILDING_SPECS) as BuildingType[];
const RICH = { food: 5000, wood: 5000, gold: 5000 };

/** The AI's two ways to place: a building (farms and docks included) and a wall line. */
class PlacingStrategy extends BaseStrategy {
  readonly name = 'test';
  constructor() {
    super(() => 0.5, { min: 1000, max: 1000 });
  }
  place(ctx: AIContext, type: BuildingType, anchor: TileCoord = CENTRE) {
    return this.startBuilding(ctx, this.perception.update(ctx), type, anchor);
  }
  wall(ctx: AIContext, tiles: readonly TileCoord[]) {
    return this.startWallLine(ctx, this.perception.update(ctx), tiles, 1);
  }
  snapshot(): StrategyState {
    throw new Error('not saved');
  }
  restore(): void {}
  protected decide(_ctx: AIContext, _view: WorldView): void {}
  protected upkeep(_ctx: AIContext, _view: WorldView): void {}
}

function setup({ hill = true } = {}) {
  const map = new MapData(48, 48);
  const world = createEcsWorld();
  if (hill) createHill(world, map, CENTRE);
  const selection = { getSelected: () => null, getAllSelected: () => [] } as unknown as SelectionSystem;
  const human = new BuildPlacement({} as Phaser.Scene, world, map, selection, () => null, () => 3, 1, 'hungarian');
  const fog = new FogOfWarData(48, 48);
  for (let ty = 0; ty < 48; ty++) for (let tx = 0; tx < 48; tx++) fog.markVisible(tx, ty);
  const ctx: AIContext = { world, mapData: map, player: createPlayer({ id: 2, age: 3, resources: { ...RICH } }), timeMs: 0, fog };
  const built = () => world.entities.filter((e) => e.building);
  return { map, world, human, ctx, built };
}

const onHill = (b: Entity) => {
  const { width, height } = b.building!.footprint;
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) if (inHillZone(CENTRE, { tx: b.position!.tx + dx, ty: b.position!.ty + dy })) return true;
  }
  return false;
};

beforeEach(() => {
  resetUiStore();
  uiStore.getState().setResources({ ...RICH });
});

describe('no building on the hill (M19)', () => {
  it.each(TYPES.filter((t) => t !== 'wall' && t !== 'dock'))('human %s: refused on the zone, also by one tile of it, fine beside it', (type) => {
    const { human, built } = setup();
    const { width, height } = BUILDING_SPECS[type];
    const corner = { tx: 17 - width + 1, ty: 17 - height + 1 };
    for (const origin of [CENTRE, corner, { tx: 23, ty: 23 }]) {
      expect(human.canPlaceBuilding(origin, width, height, type)).toBe(false);
      human.tryPlaceBuilding(origin, type);
    }
    expect(built()).toEqual([]);
    expect(uiStore.getState().resources).toEqual(RICH);
    expect(human.canPlaceBuilding({ tx: 24, ty: 20 }, width, height, type)).toBe(true);
  });

  it('human dock: refused on the zone', () => {
    const { map, human } = setup();
    for (let ty = 10; ty < 31; ty++) map.setTile(24, ty, TERRAIN.water);
    expect(human.canPlaceBuilding({ tx: 21, ty: 19 }, 3, 3, 'dock')).toBe(false);
    expect(human.canPlaceBuilding({ tx: 21, ty: 25 }, 3, 3, 'dock')).toBe(true);
  });

  it('human wall line: skips the zone and pays only for what stands', () => {
    const { human, built } = setup();
    human.beginWallLine({ tx: 14, ty: 20 });
    expect(human.commitWallLine({ tx: 26, ty: 20 })).toBe(6);
    expect(built().map((w) => w.position!.tx).sort((a, b) => a - b)).toEqual([14, 15, 16, 24, 25, 26]);
    expect(uiStore.getState().resources.wood).toBe(RICH.wood - 6 * BUILDING_SPECS.wall.cost.wood);
  });

  it.each(TYPES.filter((t) => t !== 'wall'))('AI %s: nowhere on the zone, though it is the only ground it knows', (type) => {
    const tries = (hill: boolean) => {
      let built = 0;
      for (let d = 0; d <= 14; d++) {
        const { map, ctx, world } = setup({ hill });
        if (type === 'dock') for (let ty = 10; ty < 31; ty++) map.setTile(24, ty, TERRAIN.water);
        const fog = new FogOfWarData(48, 48);
        for (let ty = 17; ty <= 23; ty++) for (let tx = 17; tx <= 23; tx++) fog.markVisible(tx, ty);
        if (new PlacingStrategy().place({ ...ctx, world, fog }, type, { tx: CENTRE.tx + d, ty: CENTRE.ty })) built++;
      }
      return built;
    };
    expect(tries(false), 'the same ground without a hill').toBeGreaterThan(0);
    expect(tries(true)).toBe(0);
  });

  it('the AI still finds room for a farm and a house by the hill', () => {
    for (const type of ['farm', 'house'] as const) {
      const { ctx, built } = setup();
      expect(new PlacingStrategy().place(ctx, type)).not.toBeNull();
      expect(built()).toHaveLength(1);
      expect(onHill(built()[0]!)).toBe(false);
    }
  });

  it('AI dock site: the shore of the zone is none', () => {
    const { map } = setup();
    for (let ty = 10; ty < 31; ty++) map.setTile(24, ty, TERRAIN.water);
    const site = findDockSite(map, { tx: 21, ty: 19 }, 12, () => true)!;
    expect(site).not.toBeNull();
    expect(onHill({ position: site, building: { type: 'dock', footprint: { width: 3, height: 3 } } })).toBe(false);
  });

  it('AI wall line: skips the zone', () => {
    const { ctx, built } = setup();
    const line = Array.from({ length: 13 }, (_, i) => ({ tx: 14 + i, ty: 20 }));
    expect(new PlacingStrategy().wall(ctx, line)).toBeGreaterThan(0);
    for (const wall of built()) expect(onHill(wall)).toBe(false);
  });

  it('AI placement refuses a footprint that touches the zone by one tile', () => {
    const { map } = setup();
    expect(canPlaceAt(map, { tx: 23, ty: 23 }, 2, 2, { clearance: 0 })).toBe(false);
    expect(canPlaceAt(map, { tx: 24, ty: 23 }, 2, 2, { clearance: 0 })).toBe(true);
  });

  it('a felled tree on the zone leaves no building ground', () => {
    const { map } = setup();
    map.setTile(19, 19, TERRAIN.forest);
    map.setTile(19, 19, TERRAIN.grass);
    expect(map.isBuildable(19, 19)).toBe(false);
  });

  it('units walk over it', () => {
    const { map } = setup();
    expect(map.isPassable(CENTRE.tx, CENTRE.ty)).toBe(true);
    expect(map.isBlocked(CENTRE.tx, CENTRE.ty)).toBe(false);
  });
});
