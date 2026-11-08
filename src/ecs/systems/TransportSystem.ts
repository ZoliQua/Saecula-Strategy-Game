import { NAVAL } from '../../config/balance';
import { chebyshev, tileEquals, type TileCoord } from '../../iso/coordinates';
import type { MapData } from '../../map/MapData';
import { NEIGHBOUR_STEPS, reachMask } from '../../map/gridSteps';
import { waterGrid } from '../../map/navGrid';
import type { Entity } from '../components';
import { moveLayerOf } from '../navLayer';
import { clearUnitOrders } from '../orders';
import type { EcsWorld } from '../world';
import { findEntityById } from './gathering/gatherQueries';

/** A boarding unit's wait (TransportSystem.waits). */
interface BoardWait {
  readonly order: object;
  sinceMs: number;
  unitAt: TileCoord;
  shipAt: TileCoord;
  calledAt: { ship: TileCoord; unit: TileCoord } | null;
}

/**
 * Transports (M14):
 *  - a land unit with a `boardIntent` walks to a land tile beside its own
 *    transport and boards it (leaves the world, kept whole in `cargo`);
 *    a full, foreign, dead or missing transport ends the order;
 *  - a transport with an `unloadIntent` sails toward the target and, once
 *    beside land near it (or as near as it gets), puts its cargo ashore on
 *    free land tiles, each unit then walking on to the target.
 * Sinking (the cargo is lost with the ship) is game/kill's applyDamage.
 */
export class TransportSystem {
  /** Where each boarding unit last headed for its order (re-planned when its transport moved away; a new order starts afresh). */
  private readonly headed = new WeakMap<Entity, { readonly order: object; readonly shipAt: TileCoord }>();
  /** The unload order each transport has set sail for (a new order starts afresh). */
  private readonly sailing = new WeakMap<Entity, object>();
  /**
   * Each boarding unit's wait: the order it belongs to, when the unit or its
   * transport last made progress (system clock, ms; not saved: it restarts
   * after a load), and where the transport stood when last called over.
   */
  private readonly waits = new WeakMap<Entity, BoardWait>();
  private nowMs = 0;
  /** The unload order each transport has already sought an open shore for (once per order). */
  private readonly sought = new WeakMap<Entity, object>();

  constructor(
    private readonly world: EcsWorld,
    private readonly map: MapData,
  ) {}

  update(deltaMs: number): void {
    this.nowMs += deltaMs;
    for (const u of [...this.world.with('boardIntent', 'position', 'owner')]) this.board(u);
    for (const t of [...this.world.with('unloadIntent', 'position', 'cargo', 'owner')]) this.unload(t);
    for (const t of this.world.with('unloadIntent')) if (!t.cargo || t.cargo.units.length === 0) this.world.removeComponent(t, 'unloadIntent');
  }

  private board(u: Entity & Required<Pick<Entity, 'boardIntent' | 'position' | 'owner'>>): void {
    const t = findEntityById(this.world, u.boardIntent.transportId);
    const valid =
      !u.dying &&
      moveLayerOf(u) === 'land' &&
      t?.unit?.unitType === 'transport' &&
      !t.dying &&
      t.owner?.playerId === u.owner.playerId &&
      !!t.position &&
      (t.cargo?.units.length ?? 0) < NAVAL.transportCapacity;
    if (!valid || !t?.position) {
      this.world.removeComponent(u, 'boardIntent');
      this.forget(u);
      return;
    }
    if (chebyshev(u.position, t.position) <= 1 && this.map.isPassable(u.position.tx, u.position.ty)) {
      this.stow(u, t);
      return;
    }
    const shipBusy = !!t.unloadIntent || !!t.moveIntent || (t.movable?.path.length ?? 0) > 0;
    // Too long with neither the unit nor its transport getting anywhere: the order is dropped.
    const wait = this.waitOf(u, t);
    if (this.nowMs - wait.sinceMs > NAVAL.boardTimeoutMs) {
      this.world.removeComponent(u, 'boardIntent');
      this.forget(u);
      return;
    }
    const beside = this.landBeside(t.position, u.position);
    const walking = !!u.moveIntent || (u.movable?.path.length ?? 0) > 0;
    const headed = this.headed.get(u);
    const last = headed?.order === u.boardIntent ? headed.shipAt : undefined;
    const shipMoved = !last || chebyshev(last, t.position) >= NAVAL.boardRetargetTiles;
    if (last && !shipMoved) {
      // Walking toward it, or done walking and not beside it: no new search until the transport moves;
      // an idle transport is called in to the shore by the unit (once from where it stands).
      if (!walking && !shipBusy) this.callOver(t, u, wait);
      return;
    }
    // Out at sea (no land beside it): the transport comes in to the shore by the unit.
    if (!beside && !shipBusy) this.callOver(t, u, wait);
    // A land tile beside the transport, nearest the unit; else toward the transport (the shore nearest it).
    const shore = beside ?? t.position;
    this.headed.set(u, { order: u.boardIntent, shipAt: { tx: t.position.tx, ty: t.position.ty } });
    if (u.moveIntent) u.moveIntent.target = shore;
    else this.world.addComponent(u, 'moveIntent', { target: shore });
  }

  private forget(u: Entity): void {
    this.headed.delete(u);
    this.waits.delete(u);
  }

  /** The unit's wait record for its current order; any movement of the unit or the transport is progress. */
  private waitOf(u: Entity & Required<Pick<Entity, 'boardIntent' | 'position'>>, t: Entity) {
    const shipAt = t.position!;
    const order = u.boardIntent;
    let w = this.waits.get(u);
    if (!w || w.order !== order) {
      w = { order, sinceMs: this.nowMs, unitAt: { ...u.position }, shipAt: { ...shipAt }, calledAt: null };
      this.waits.set(u, w);
    }
    if (!tileEquals(w.unitAt, u.position) || !tileEquals(w.shipAt, shipAt)) {
      w.sinceMs = this.nowMs;
      w.unitAt = { ...u.position };
      w.shipAt = { ...shipAt };
    }
    return w;
  }

  /** Calls the transport in to the shore by the unit, once per spot the transport stands on (no search every frame). */
  private callOver(t: Entity, u: Entity & { position: TileCoord }, wait: BoardWait): void {
    const at = t.position!;
    // Once per pair of spots: the transport where it stands, the unit where it waits.
    if (wait.calledAt && tileEquals(wait.calledAt.ship, at) && tileEquals(wait.calledAt.unit, u.position)) return;
    wait.calledAt = { ship: { ...at }, unit: { ...u.position } };
    this.world.addComponent(t, 'moveIntent', { target: { tx: u.position.tx, ty: u.position.ty } });
  }

  /** The unit leaves the world into the transport's cargo, whole (its orders dropped, deselected). */
  private stow(u: Entity, t: Entity): void {
    clearUnitOrders(this.world, u);
    if (u.boardIntent) this.world.removeComponent(u, 'boardIntent');
    if (u.movable) {
      u.movable.path = [];
      u.movable.progress = 0;
    }
    if (u.selectable) u.selectable.selected = false;
    this.forget(u);
    this.world.remove(u);
    if (t.cargo) t.cargo.units.push(u);
    else this.world.addComponent(t, 'cargo', { units: [u] });
  }

  private unload(t: Entity & Required<Pick<Entity, 'unloadIntent' | 'position' | 'cargo' | 'owner'>>): void {
    if (t.dying || t.cargo.units.length === 0) {
      this.world.removeComponent(t, 'unloadIntent');
      return;
    }
    const target = t.unloadIntent.target;
    const walking = !!t.moveIntent || (t.movable?.path.length ?? 0) > 0;
    const sailed = this.sailing.get(t) === t.unloadIntent;
    const besideLand = this.landBeside(t.position, target) !== null;
    // Ashore near the target, or wherever the voyage toward it ended beside land.
    if (besideLand && (chebyshev(t.position, target) <= NAVAL.unloadReach || (sailed && !walking))) {
      this.putAshore(t, target);
      return;
    }
    if (walking) return;
    if (sailed) {
      // The voyage ended with no land beside it (a built-up shore): on to the nearest open shore, once.
      const shore = this.sought.get(t) === t.unloadIntent ? null : this.shoreWaterNear(target);
      if (shore && (shore.tx !== t.position.tx || shore.ty !== t.position.ty)) {
        this.sought.set(t, t.unloadIntent);
        this.world.addComponent(t, 'moveIntent', { target: shore });
        return;
      }
      // As near as it gets, nothing to unload onto.
      this.world.removeComponent(t, 'unloadIntent');
      return;
    }
    this.sailing.set(t, t.unloadIntent);
    this.world.addComponent(t, 'moveIntent', { target: { tx: target.tx, ty: target.ty } });
  }

  /**
   * Puts the cargo on free land tiles nearest the transport, all on the land
   * it landed at (the shore beside it nearest `target`, never the far bank of
   * a strait); each unit walks on to `target`.
   */
  private putAshore(t: Entity & Required<Pick<Entity, 'unloadIntent' | 'position' | 'cargo'>>, target: TileCoord): void {
    const landing = this.landBeside(t.position, target);
    const spots = landing ? this.landNear(t.position, t.cargo.units.length, reachMask(this.map, landing)) : [];
    const stay: Entity[] = [];
    t.cargo.units.forEach((u, i) => {
      const spot = spots[i];
      if (!spot) {
        stay.push(u);
        return;
      }
      u.position = { tx: spot.tx, ty: spot.ty };
      if (u.movable) {
        u.movable.path = [];
        u.movable.progress = 0;
      }
      this.world.add(u);
      if (this.map.isPassable(target.tx, target.ty) && (target.tx !== spot.tx || target.ty !== spot.ty)) {
        this.world.addComponent(u, 'moveIntent', { target: { tx: target.tx, ty: target.ty } });
      }
    });
    t.cargo.units = stay;
    this.world.removeComponent(t, 'unloadIntent');
  }

  /** The open-water tile beside walkable land nearest `target` (rings outward, at most NAVAL.shoreSearch tiles away). */
  private shoreWaterNear(target: TileCoord): TileCoord | null {
    const water = waterGrid(this.map);
    for (let r = 0; r <= NAVAL.shoreSearch; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const tile = { tx: target.tx + dx, ty: target.ty + dy };
          if (water.isPassable(tile.tx, tile.ty) && this.landBeside(tile, target)) return tile;
        }
      }
    }
    return null;
  }

  /** A passable land tile next to `at`, the one nearest `toward`; null when `at` is not beside land. */
  private landBeside(at: TileCoord, toward: TileCoord): TileCoord | null {
    let best: TileCoord | null = null;
    let bestD = Infinity;
    for (const [dx, dy] of NEIGHBOUR_STEPS) {
      const tile = { tx: at.tx + dx, ty: at.ty + dy };
      if (!this.map.isPassable(tile.tx, tile.ty)) continue;
      const d = chebyshev(tile, toward);
      if (d < bestD) {
        bestD = d;
        best = tile;
      }
    }
    return best;
  }

  /** Up to `n` distinct passable land tiles of `land` (a reachMask), nearest `at` first (rings outward, at most 4 tiles away). */
  private landNear(at: TileCoord, n: number, land: Uint8Array): TileCoord[] {
    const out: TileCoord[] = [];
    for (let r = 1; r <= 4 && out.length < n; r++) {
      for (let dy = -r; dy <= r && out.length < n; dy++) {
        for (let dx = -r; dx <= r && out.length < n; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const tx = at.tx + dx;
          const ty = at.ty + dy;
          if (this.map.isPassable(tx, ty) && land[ty * this.map.width + tx] === 1) out.push({ tx, ty });
        }
      }
    }
    return out;
  }
}
