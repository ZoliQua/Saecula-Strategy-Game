import type { With } from 'miniplex';
import type { TileCoord } from '../../iso/coordinates';
import type { MapData } from '../../map/MapData';
import { findPath } from '../../map/pathfinding';
import { FARM_BALANCE, REPATH_RETRY_MS, TRAINER_BUILDINGS } from '../../config/balance';
import { BUILDING_SPECS, towerAttacker } from '../archetypes/building';
import type { Entity } from '../components';
import { faceToward } from './facing';
import type { EcsWorld } from '../world';

/** How far (tiles) from the finished segment a builder looks for the next wall segment. */
const CHAIN_RADIUS = 3;


type Builder = With<Entity, 'position' | 'movable' | 'buildCommand' | 'owner'>;
type Site = With<
  Entity,
  'position' | 'building' | 'underConstruction' | 'health'
>;

/**
 * Advances building construction when assigned villagers are adjacent
 * to the site. One builder contributes 1 builder-second per real
 * second; multiple builders stack. On completion, the building's HP
 * is topped up and `underConstruction` + `buildCommand` tags drop.
 */
export class ConstructionSystem {
  private readonly world: EcsWorld;
  private readonly mapData: MapData;
  /** Clock and per-builder earliest next repath, so enclosed sites are not re-planned every tick. */
  private nowMs = 0;
  private readonly repathAt = new WeakMap<object, number>();

  constructor(world: EcsWorld, mapData: MapData) {
    this.world = world;
    this.mapData = mapData;
  }

  update(deltaMs: number): void {
    this.nowMs += deltaMs;
    const dt = deltaMs / 1000;
    const builders = this.world.with('position', 'movable', 'buildCommand', 'owner');
    const sites = new Map<number, Site>();
    for (const s of this.world.with('building', 'underConstruction', 'health', 'position')) {
      // A destroyed (dying) site can't be worked on: its builders are released below.
      if (s.id !== undefined && !(s as Entity).dying) sites.set(s.id, s);
    }

    for (const b of [...builders]) {
      if (!b.buildCommand) continue; // released earlier this tick
      const site = sites.get(b.buildCommand.targetId);
      if (!site || !site.underConstruction) {
        this.world.removeComponent(b as Entity, 'buildCommand');
        continue;
      }
      if (!isAdjacentToFootprint(b.position, site)) {
        if (b.movable.path.length === 0) {
          this.walkToSite(b, site);
        }
        continue;
      }
      // Adjacent — contribute build time.
      b.movable.path = [];
      b.movable.progress = 0;
      faceToward(b as Entity, site as Entity);
      site.underConstruction.elapsed += dt;
      const pct = Math.min(
        1,
        site.underConstruction.elapsed / site.underConstruction.totalTime,
      );
      site.health.current = Math.max(
        1,
        Math.round(site.health.max * pct),
      );
      if (pct >= 1) {
        this.complete(site);
        this.moveBuildersOn(site, builders);
      }
    }
  }

  private complete(site: Site): void {
    const spec = BUILDING_SPECS[site.building.type];
    this.world.removeComponent(site as Entity, 'underConstruction');
    site.health.current = site.health.max;
    if (spec.dropoffAccepts && !(site as Entity).resourceDropoff) {
      this.world.addComponent(site as Entity, 'resourceDropoff', {
        accepts: spec.dropoffAccepts,
      });
    }
    if (site.building.type === 'tower' && !(site as Entity).attacker) {
      this.world.addComponent(site as Entity, 'attacker', towerAttacker());
    }
    if (site.building.type === 'farm') {
      // Farms are harvestable, self-regrowing food sources (FarmRegenSystem).
      this.world.addComponent(site as Entity, 'resourceNode', {
        type: 'food',
        amount: FARM_BALANCE.capacity,
        maxAmount: FARM_BALANCE.capacity,
      });
    }
    if (TRAINER_BUILDINGS.has(site.building.type) && !(site as Entity).trainingQueue) {
      this.world.addComponent(site as Entity, 'trainingQueue', {
        entries: [],
        maxQueue: 5,
      });
    }
  }

  /**
   * A finished wall segment hands its builders to the nearest unfinished
   * segment of the same owner nearby (so a dragged line is built through);
   * anything else just releases them.
   */
  private moveBuildersOn(done: Site, builders: Iterable<Builder>): void {
    for (const b of [...builders]) {
      if (!b.buildCommand || b.buildCommand.targetId !== done.id) continue;
      const next =
        done.building.type === 'wall' ? this.nearestWallSite(done, b.position, b.owner.playerId) : null;
      if (next?.id !== undefined) b.buildCommand.targetId = next.id;
      else this.world.removeComponent(b as Entity, 'buildCommand');
    }
  }

  private nearestWallSite(done: Site, from: TileCoord, playerId: number): Site | null {
    let best: Site | null = null;
    let bestD = Infinity;
    for (const s of this.world.with('building', 'underConstruction', 'health', 'position', 'owner')) {
      if (s.building.type !== 'wall' || s.owner.playerId !== playerId || s.id === done.id) continue;
      const fromDone = Math.max(Math.abs(s.position.tx - done.position.tx), Math.abs(s.position.ty - done.position.ty));
      if (fromDone > CHAIN_RADIUS) continue;
      const d = Math.abs(s.position.tx - from.tx) + Math.abs(s.position.ty - from.ty);
      if (d < bestD) {
        bestD = d;
        best = s as Site;
      }
    }
    return best;
  }

  private walkToSite(b: Builder, site: Site): void {
    if ((this.repathAt.get(b) ?? 0) > this.nowMs) return;
    const goal = findAdjacent(this.mapData, site, b.position);
    const path = goal ? findPath(this.mapData, b.position, goal) : null;
    if (!path) {
      this.repathAt.set(b, this.nowMs + REPATH_RETRY_MS);
      return;
    }
    b.movable.path = path.slice(1);
    b.movable.progress = 0;
  }
}

function isAdjacentToFootprint(v: TileCoord, site: Site): boolean {
  const { width, height } = site.building.footprint;
  const x0 = site.position.tx - 1;
  const y0 = site.position.ty - 1;
  const x1 = site.position.tx + width;
  const y1 = site.position.ty + height;
  return v.tx >= x0 && v.tx <= x1 && v.ty >= y0 && v.ty <= y1;
}

function findAdjacent(
  map: MapData,
  site: Site,
  preferNear: TileCoord,
): TileCoord | null {
  const { width, height } = site.building.footprint;
  const candidates: TileCoord[] = [];
  for (let dx = -1; dx <= width; dx++) {
    candidates.push({ tx: site.position.tx + dx, ty: site.position.ty - 1 });
    candidates.push({ tx: site.position.tx + dx, ty: site.position.ty + height });
  }
  for (let dy = 0; dy < height; dy++) {
    candidates.push({ tx: site.position.tx - 1, ty: site.position.ty + dy });
    candidates.push({ tx: site.position.tx + width, ty: site.position.ty + dy });
  }
  const passable = candidates.filter((t) => map.isPassable(t.tx, t.ty));
  if (passable.length === 0) return null;
  passable.sort(
    (a, b) =>
      Math.abs(a.tx - preferNear.tx) + Math.abs(a.ty - preferNear.ty) -
      (Math.abs(b.tx - preferNear.tx) + Math.abs(b.ty - preferNear.ty)),
  );
  return passable[0]!;
}
