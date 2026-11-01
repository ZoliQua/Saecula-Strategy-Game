import { AI_NAVAL, type NavalTuning } from '../config/aiBalance';
import { isNavalType } from '../config/balance';
import type { Entity } from '../ecs/components';
import { canAttackTarget } from '../ecs/navLayer';
import { chebyshev, type TileCoord } from '../iso/coordinates';
import type { BaseUnitType, BuildingType } from '../types';
import type { AIContext } from './AIPlayer';
import { nearest } from './decisions/gathering';
import { findDockSite } from './decisions/naval';
import { baseAnchor } from './economyBuildings';
import type { WorldView } from './perception';
import { FOG_UNEXPLORED } from '../map/FogOfWarData';
import { TERRAIN } from '../map/TerrainTypes';
import type { MapData } from '../map/MapData';
import { waterGrid } from '../map/navGrid';

/** The strategy helpers naval play acts through (BaseStrategy's building and training). */
export interface NavalActions {
  ownCount(view: WorldView, type: BuildingType, finishedOnly?: boolean): number;
  startBuilding(ctx: AIContext, view: WorldView, type: BuildingType, anchor: TileCoord): Entity | null;
  train(ctx: AIContext, view: WorldView, type: BaseUnitType, maxQueued?: number): boolean;
  /** Transports the strategy wants for a landing now (0: none). */
  transportsWanted(ctx: AIContext, view: WorldView): number;
}

/**
 * The AI's navy (M14), read from the world each time (nothing to save):
 *  - build: a dock on its shore once it has the villagers, if a dock site
 *    lies within reach of its base (a map without water there: no navy);
 *  - train: fishing boats while fish is known, galleys and frigates by age,
 *    transports when the strategy wants a landing;
 *  - control: idle fishing boats fish the nearest known school; warships
 *    engage enemies close by, else explore unexplored water, else keep
 *    near the dock.
 */
export class NavalPlay {
  constructor(
    private readonly tune: NavalTuning,
    private readonly act: NavalActions,
  ) {}

  build(ctx: AIContext, view: WorldView): void {
    if (view.villagers.length < this.tune.minVillagers || this.act.ownCount(view, 'dock') > 0) return;
    const anchor = baseAnchor(view);
    if (!anchor || !findDockSite(ctx.mapData, anchor, AI_NAVAL.dockSearchRadius, (tx, ty) => ctx.fog.get(tx, ty) !== FOG_UNEXPLORED)) return;
    this.act.startBuilding(ctx, view, 'dock', anchor);
  }

  train(ctx: AIContext, view: WorldView): void {
    if (this.act.ownCount(view, 'dock', true) === 0) return;
    const count = (t: BaseUnitType) =>
      view.ships.filter((s) => s.unit?.unitType === t).length +
      view.buildings.reduce((n, b) => n + (b.trainingQueue?.entries.filter((e) => e.unitType === t).length ?? 0), 0);
    const age = ctx.player.age;
    const wants: Array<[BaseUnitType, number]> = [
      ['transport', this.act.transportsWanted(ctx, view)],
      ['fishing_boat', view.fish.length > 0 ? this.tune.fishingBoats : 0],
      ['galley', this.tune.galleys[age] ?? 0],
      ['frigate', this.tune.frigates[age] ?? 0],
    ];
    for (const [type, want] of wants) {
      if (count(type) < want && this.act.train(ctx, view, type, 1)) return;
    }
  }

  control(ctx: AIContext, view: WorldView): void {
    const dock = view.buildings.find((b) => b.building?.type === 'dock' && !b.underConstruction);
    for (const ship of view.ships) {
      if (!ship.position || ship.dying) continue;
      const type = ship.unit!.unitType;
      if (type === 'fishing_boat') this.fish(ctx, view, ship);
      else if (type === 'galley' || type === 'frigate') this.patrol(ctx, view, ship, dock);
    }
  }

  private fish(ctx: AIContext, view: WorldView, boat: Entity): void {
    if (boat.gatherIntent || boat.gatherer?.targetNodeId !== undefined) return;
    const school = nearest(view.fish, boat.position!);
    if (school?.id !== undefined) ctx.world.addComponent(boat, 'gatherIntent', { nodeId: school.id });
  }

  private patrol(ctx: AIContext, view: WorldView, ship: Entity, dock: Entity | undefined): void {
    const at = ship.position!;
    const busy = ship.attackIntent !== undefined || ship.moveIntent !== undefined || (ship.movable?.path.length ?? 0) > 0;
    // Ships first, then anything else it can reach; only what is close by.
    const range = ship.attacker?.range ?? 0;
    const near = (e: Entity) =>
      !!e.position && chebyshev(e.position, at) <= AI_NAVAL.engageRadius && canAttackTarget(ship, e) && shootableFromWater(ctx.mapData, e, range);
    const foe =
      view.visibleEnemyUnits.find((e) => e.unit && isNavalType(e.unit.unitType) && near(e)) ??
      view.visibleEnemyUnits.find(near) ??
      view.visibleEnemyBuildings.find(near);
    if (foe?.id !== undefined) {
      if (ship.attackIntent?.targetId !== foe.id) {
        if (ship.moveIntent) ctx.world.removeComponent(ship, 'moveIntent');
        if (ship.attackIntent) ctx.world.removeComponent(ship, 'attackIntent');
        ctx.world.addComponent(ship, 'attackIntent', { targetId: foe.id });
      }
      return;
    }
    if (busy) return;
    const unexplored = this.unexploredWater(ctx, at);
    if (unexplored) {
      ctx.world.addComponent(ship, 'moveIntent', { target: unexplored });
      return;
    }
    if (dock?.position && chebyshev(dock.position, at) > AI_NAVAL.homeRadius) {
      ctx.world.addComponent(ship, 'moveIntent', { target: { tx: dock.position.tx + 1, ty: dock.position.ty + 1 } });
    }
  }

  /** The nearest unexplored open-water tile (ring search, every 3rd tile), or null when the sea in reach is known. */
  private unexploredWater(ctx: AIContext, from: TileCoord): TileCoord | null {
    const map = ctx.mapData;
    const max = Math.max(map.width, map.height);
    for (let r = 4; r < max; r += 3) {
      for (let dy = -r; dy <= r; dy += 3) {
        for (let dx = -r; dx <= r; dx += 3) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) < r - 2) continue;
          const tx = from.tx + dx;
          const ty = from.ty + dy;
          if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) continue;
          if (ctx.fog.get(tx, ty) === FOG_UNEXPLORED && map.getTile(tx, ty) === TERRAIN.water) return { tx, ty };
        }
      }
    }
    return null;
  }
}

/** Whether some open-water tile lies within `range` of `target` (a ship can shoot it from there, M14). */
function shootableFromWater(map: MapData, target: Entity, range: number): boolean {
  const p = target.position!;
  const w = target.building?.footprint.width ?? 1;
  const h = target.building?.footprint.height ?? 1;
  const water = waterGrid(map);
  for (let ty = p.ty - range; ty < p.ty + h + range; ty++) {
    for (let tx = p.tx - range; tx < p.tx + w + range; tx++) if (water.isPassable(tx, ty)) return true;
  }
  return false;
}
