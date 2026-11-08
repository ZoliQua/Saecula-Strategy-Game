import { NAVAL } from '../../config/balance';
import { chebyshev, tileEquals, type TileCoord } from '../../iso/coordinates';
import type { MapData } from '../../map/MapData';
import { NEIGHBOUR_STEPS, reachMask } from '../../map/gridSteps';
import { TERRAIN } from '../../map/TerrainTypes';
import { seaAt } from '../../map/waterBodies';
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
  /** The land region of each unload order's target (a reachMask, one land flood per order). */
  private readonly targetLand = new WeakMap<object, Uint8Array>();

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
    const land = this.landOf(t.unloadIntent);
    const besideOwn = this.landBeside(t.position, target, land) !== null;
    // Ashore on the target's own land (never the far bank of a strait) when near it,
    // or when the voyage toward it ended there.
    if (besideOwn && (chebyshev(t.position, target) <= NAVAL.unloadReach || (sailed && !walking))) {
      this.putAshore(t, target, land);
      return;
    }
    if (walking) return;
    if (sailed) {
      // The voyage ended beside other land or none (a built-up shore): on to the nearest open shore
      // of the target's land (else of any land), once.
      const shore = this.sought.get(t) === t.unloadIntent ? null : this.shoreWaterNear(t.position, target, land);
      if (shore && (shore.tx !== t.position.tx || shore.ty !== t.position.ty)) {
        this.sought.set(t, t.unloadIntent);
        this.world.addComponent(t, 'moveIntent', { target: shore });
        return;
      }
      // As near as it gets: ashore on whatever land lies beside it, else nothing to unload onto.
      if (this.landBeside(t.position, target) !== null) this.putAshore(t, target, land);
      else this.world.removeComponent(t, 'unloadIntent');
      return;
    }
    this.sailing.set(t, t.unloadIntent);
    this.world.addComponent(t, 'moveIntent', { target: { tx: target.tx, ty: target.ty } });
  }

  /** The land region `target` of an unload order lies in (walkable tiles that reach it), flooded once per order. */
  private landOf(order: { target: TileCoord }): Uint8Array {
    let mask = this.targetLand.get(order);
    if (!mask) {
      mask = reachMask(this.map, this.landSeed(order.target));
      this.targetLand.set(order, mask);
    }
    return mask;
  }

  /**
   * Where to flood a target's land from: the target itself when it or a tile beside it is walkable
   * (reachMask seeds those), else the nearest walkable tile reached by growing from the target
   * through blocked land only (a building's centre, a forest's heart), never across water, so the
   * far bank of a strait is never taken for the target's land (at most NAVAL.shoreSearch tiles away).
   */
  private landSeed(target: TileCoord): TileCoord {
    const map = this.map;
    const inside = (tx: number, ty: number) => tx >= 0 && ty >= 0 && tx < map.width && ty < map.height;
    if (!inside(target.tx, target.ty)) return target;
    if (map.isPassable(target.tx, target.ty)) return target;
    for (const [dx, dy] of NEIGHBOUR_STEPS) if (map.isPassable(target.tx + dx, target.ty + dy)) return target;
    const wet = (tx: number, ty: number) => {
      const k = map.getTile(tx, ty);
      return k === TERRAIN.water || k === TERRAIN.fish;
    };
    const w = map.width;
    const seen = new Uint8Array(w * map.height);
    const queue: number[] = [target.ty * w + target.tx];
    seen[queue[0]!] = 1;
    for (let head = 0; head < queue.length; head++) {
      const idx = queue[head]!;
      const tx = idx % w;
      const ty = (idx - tx) / w;
      for (const [dx, dy] of NEIGHBOUR_STEPS) {
        const nx = tx + dx;
        const ny = ty + dy;
        if (!inside(nx, ny) || Math.max(Math.abs(nx - target.tx), Math.abs(ny - target.ty)) > NAVAL.shoreSearch) continue;
        const n = ny * w + nx;
        if (seen[n] || wet(nx, ny)) continue;
        // A diagonal step never slips between two water tiles.
        if (dx !== 0 && dy !== 0 && wet(nx, ty) && wet(tx, ny)) continue;
        seen[n] = 1;
        if (map.isPassable(nx, ny)) return { tx: nx, ty: ny };
        queue.push(n);
      }
    }
    return target;
  }

  /**
   * Puts the cargo on free land tiles nearest the transport, all on the land
   * it landed at: the target's own land when it lies beside the transport
   * (never the far bank of a strait), else the shore beside it nearest
   * `target`; each unit walks on to `target`.
   */
  private putAshore(
    t: Entity & Required<Pick<Entity, 'unloadIntent' | 'position' | 'cargo'>>,
    target: TileCoord,
    targetLand: Uint8Array,
  ): void {
    const own = this.landBeside(t.position, target, targetLand);
    const landing = own ?? this.landBeside(t.position, target);
    const land = own ? targetLand : landing ? reachMask(this.map, landing) : null;
    const spots = landing && land ? this.landNear(t.position, t.cargo.units.length, land) : [];
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

  /**
   * The open-water tile of the transport's own sea (the water it can sail to from `from`, never a
   * pond inland) beside walkable land nearest `target` (rings outward, at most NAVAL.shoreSearch
   * tiles away): beside the target's own land (`land`) if any, else any land.
   */
  private shoreWaterNear(from: TileCoord, target: TileCoord, land: Uint8Array): TileCoord | null {
    const sea = seaAt(this.map, from);
    let fallback: TileCoord | null = null;
    for (let r = 0; r <= NAVAL.shoreSearch; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const tile = { tx: target.tx + dx, ty: target.ty + dy };
          if (!sea.has(tile.tx, tile.ty)) continue;
          if (this.landBeside(tile, target, land)) return tile;
          if (!fallback && this.landBeside(tile, target)) fallback = tile;
        }
      }
    }
    return fallback;
  }

  /**
   * A passable land tile next to `at` (only tiles of `within`, a reachMask, when given),
   * the one nearest `toward`; null when there is none.
   */
  private landBeside(at: TileCoord, toward: TileCoord, within?: Uint8Array): TileCoord | null {
    let best: TileCoord | null = null;
    let bestD = Infinity;
    for (const [dx, dy] of NEIGHBOUR_STEPS) {
      const tile = { tx: at.tx + dx, ty: at.ty + dy };
      if (!this.map.isPassable(tile.tx, tile.ty)) continue;
      if (within && within[tile.ty * this.map.width + tile.tx] !== 1) continue;
      const d = chebyshev(tile, toward);
      if (d < bestD) {
        bestD = d;
        best = tile;
      }
    }
    return best;
  }

  /** Up to `n` distinct passable land tiles of `land` (a reachMask), nearest `at` first (rings outward, at most NAVAL.unloadSpread tiles away). */
  private landNear(at: TileCoord, n: number, land: Uint8Array): TileCoord[] {
    const out: TileCoord[] = [];
    for (let r = 1; r <= NAVAL.unloadSpread && out.length < n; r++) {
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
