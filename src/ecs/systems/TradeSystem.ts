import { REPATH_RETRY_MS } from '../../config/balance';
import { creditGathered } from '../../game/credit';
import { NO_TEAMS, type TeamLookup } from '../../game/diplomacy';
import type { PlayerManager } from '../../game/PlayerManager';
import { buildingById, routeStillValid, tradeGoldPerTrip } from '../../game/trade';
import type { TileCoord } from '../../iso/coordinates';
import { STRICT_ESCAPE } from '../../map/escape';
import type { MapData } from '../../map/MapData';
import { UNLIMITED_PATHS, type PathAllowance } from '../../map/pathBudget';
import { findPath, findPathToAny } from '../../map/pathfinding';
import type { Entity } from '../components';
import { escapeRulesAt } from '../escapeRules';
import { onFootprintRing } from '../footprint';
import { navGridFor } from '../navLayer';
import type { EcsWorld } from '../world';
import { findAdjacentToFootprint } from './gathering/gatherGeometry';
import type { Dropoff } from './gathering/gatherTypes';
import type { With } from 'miniplex';

/** A route end: a market or a dock. */
type Post = With<Entity, 'position' | 'building'>;

/**
 * The trade shuttle (M17): every trader with a `tradeRoute` walks (a ship
 * sails, on the water layer) to a tile beside its destination's footprint
 * — the target while `toTarget`, else home — and on arrival its owner is
 * paid tradeGoldPerTrip in gold (counted as gathered), then it turns back.
 * Like the gather cycle no explicit state is kept: the next action follows
 * from the route and where the trader stands.
 *
 * Each tick the route is re-checked (routeStillValid): when either end is
 * destroyed, unfinished, or the target no longer friendly (its owner's
 * defeat), the route is dropped and the trader stops where it is, idle.
 *
 * Searches take the shared per-frame path budget; a walk that found no way
 * waits REPATH_RETRY_MS before planning again.
 */
export class TradeSystem {
  private nowMs = 0;
  private readonly repathAt = new WeakMap<object, number>();
  private readonly teams: TeamLookup;

  constructor(
    private readonly world: EcsWorld,
    private readonly mapData: MapData,
    private readonly players: PlayerManager | null = null,
    private readonly paths: PathAllowance = UNLIMITED_PATHS,
  ) {
    this.teams = players ?? NO_TEAMS;
  }

  update(deltaMs: number): void {
    this.nowMs += deltaMs;
    for (const t of this.world.with('tradeRoute', 'position', 'movable', 'owner')) {
      if ((t as Entity).dying) continue;
      const route = t.tradeRoute;
      if (!routeStillValid(this.world, t, route, this.teams, (id) => this.players?.get(id)?.defeated ?? false)) {
        this.stop(t);
        continue;
      }
      const home = buildingById(this.world, route.homeId) as Post;
      const target = buildingById(this.world, route.targetId) as Post;
      const dest = route.toTarget ? target : home;
      if (this.arrivedAt(t, dest)) {
        const ownerId = t.owner.playerId;
        const gold = tradeGoldPerTrip(home, target, ownerId, this.teams, this.players?.get(ownerId));
        creditGathered(this.world, this.players, ownerId, 'gold', gold);
        route.toTarget = !route.toTarget;
        t.movable.path = [];
        t.movable.progress = 0;
        this.repathAt.delete(t);
        this.walkTo(t, route.toTarget ? target : home);
        continue;
      }
      if (t.movable.path.length === 0) this.walkTo(t, dest);
    }
  }

  /** Beside the footprint, on free ground of the trader's layer. */
  private arrivedAt(t: Entity & { position: TileCoord }, dest: Post): boolean {
    return onFootprintRing(t.position, dest.position, dest.building.footprint) && navGridFor(this.mapData, t).isPassable(t.position.tx, t.position.ty);
  }

  /** The route is over: the trader stands where it is, idle. */
  private stop(t: Entity): void {
    this.world.removeComponent(t, 'tradeRoute');
    if (t.movable) {
      t.movable.path = [];
      t.movable.progress = 0;
    }
  }

  /** Plans a walk (a sail) to a free tile beside `dest` within the path budget; a failed plan backs off. */
  private walkTo(t: Entity & { position: TileCoord; movable: NonNullable<Entity['movable']> }, dest: Post): void {
    if ((this.repathAt.get(t) ?? 0) > this.nowMs) return;
    const grid = navGridFor(this.mapData, t);
    const to = findAdjacentToFootprint(grid, dest as Dropoff, t.position);
    if (to && !this.paths.take()) return;
    const ownerId = t.owner?.playerId ?? 0;
    const escape = grid === this.mapData ? escapeRulesAt(this.world, t.position, this.mapData, ownerId) : STRICT_ESCAPE;
    const ring = (tx: number, ty: number) => onFootprintRing({ tx, ty }, dest.position, dest.building.footprint);
    const path = to ? (findPath(grid, t.position, to, escape) ?? findPathToAny(grid, t.position, ring, escape)) : null;
    if (!path) {
      this.repathAt.set(t, this.nowMs + REPATH_RETRY_MS);
      return;
    }
    t.movable.path = path.slice(1);
    t.movable.progress = 0;
  }
}
