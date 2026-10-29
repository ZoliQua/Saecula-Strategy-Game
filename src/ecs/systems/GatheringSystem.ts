import { REPATH_RETRY_MS } from '../../config/balance';
import { gatherRateMultiplier } from '../../game/modifiers';
import type { PlayerManager } from '../../game/PlayerManager';
import type { MapData } from '../../map/MapData';
import { UNLIMITED_PATHS, type PathAllowance } from '../../map/pathBudget';
import { findPath, findPathToAny } from '../../map/pathfinding';
import type { TileCoord } from '../../iso/coordinates';
import type { ResourceType } from '../../types';
import { uiStore } from '../../ui/store';
import type { Entity } from '../components';
import { escapeRulesAt } from '../escapeRules';
import { faceToward } from './facing';
import {
  findAdjacentPassable,
  findAdjacentToBuildingNode,
  findAdjacentToFootprint,
  isAdjacentToFootprint,
  isAdjacentToNode,
} from './gathering/gatherGeometry';
import { findEntityById, findNearestDropoff, findNearestNodeOfType } from './gathering/gatherQueries';
import type { Dropoff, ResourceNode, Villager } from './gathering/gatherTypes';
import type { EcsWorld } from '../world';
import { TERRAIN } from '../../map/TerrainTypes';
import { gameEvents } from '../../game/events';

/**
 * Full gather cycle state machine for villagers with a `gatherer`
 * component:
 *
 *   idle ── gatherIntent ─→ walking-to-node ─→ gathering
 *     ↑                                            │
 *     │                                            ▼
 *     └── dropoff ←── walking-to-dropoff ←── carrying-full
 *
 * We don't store an explicit state — we derive the next action from
 * `gatherer.targetNodeId`, `carrying`, `capacity`, and proximity.
 *
 * Every A* search asks the shared per-frame budget first (a refused walk
 * simply retries next tick), and a walk that found no way (unreachable
 * node or drop-off) waits REPATH_RETRY_MS before planning again.
 */
export class GatheringSystem {
  private readonly world: EcsWorld;
  private readonly mapData: MapData;
  private readonly players: PlayerManager | null;
  private readonly paths: PathAllowance;
  /** Clock and per-villager earliest next search after a failed one. */
  private nowMs = 0;
  private readonly repathAt = new WeakMap<object, number>();

  constructor(
    world: EcsWorld,
    mapData: MapData,
    players: PlayerManager | null = null,
    paths: PathAllowance = UNLIMITED_PATHS,
  ) {
    this.world = world;
    this.mapData = mapData;
    this.players = players;
    this.paths = paths;
  }

  update(deltaMs: number): void {
    this.nowMs += deltaMs;
    const dt = deltaMs / 1000;
    const villagers = this.world.with('position', 'gatherer', 'movable', 'owner');
    for (const v of villagers) {
      this.applyIntent(v);
      this.tick(v, dt);
    }
  }

  private applyIntent(v: Villager): void {
    if (!v.gatherIntent) return;
    v.gatherer.targetNodeId = v.gatherIntent.nodeId;
    v.gatherer.dropoffId = undefined;
    this.world.removeComponent(v as Entity, 'gatherIntent');
    // A new order plans at once, whatever the last failed search was.
    this.repathAt.delete(v);
    this.walkToNode(v);
  }

  private tick(v: Villager, dt: number): void {
    const g = v.gatherer;
    if (g.carrying >= g.capacity) {
      this.handleFull(v);
      return;
    }
    if (g.targetNodeId === undefined) {
      // Out of work nearby (retarget): carry the partial load home, then idle there.
      if (g.carrying > 0 && g.dropoffId !== undefined) this.handleFull(v);
      return;
    }
    const node = findEntityById(this.world, g.targetNodeId) as
      | ResourceNode
      | undefined;
    // An empty farm regrows (FarmRegenSystem): its farmer waits instead of leaving.
    const regrows = (node as Entity | undefined)?.building?.type === 'farm' && !(node as Entity | undefined)?.dying;
    if (!node || !node.resourceNode || (node.resourceNode.amount <= 0 && !regrows)) {
      this.retarget(v);
      return;
    }
    // A partial load of another type (sent to new work) goes to the drop-off first; deciding
    // that only at the node made villagers ping-pong between node and drop-off forever.
    if (g.carryingType && g.carrying > 0 && g.carryingType !== node.resourceNode.type) {
      this.handleFull(v);
      return;
    }
    // A villager on blocked ground (a foundation laid over it) steps out before it works.
    if (isAdjacentToNode(v.position, node) && this.onFreeGround(v)) {
      this.gather(v, node, dt);
      return;
    }
    if (v.movable.path.length === 0) {
      this.walkToNode(v);
    }
  }

  private gather(v: Villager, node: ResourceNode, dt: number): void {
    const g = v.gatherer;
    if (g.carryingType && g.carryingType !== node.resourceNode.type) {
      // Different resource type than what we're carrying — head to
      // dropoff first.
      this.handleFull(v);
      return;
    }
    // Stop any residual movement while working.
    v.movable.path = [];
    v.movable.progress = 0;
    faceToward(v as Entity, node as Entity);

    const wantType = node.resourceNode.type;
    const take = Math.min(
      g.gatherRate * this.rateMultiplier(v, node) * dt,
      node.resourceNode.amount,
      g.capacity - g.carrying,
    );
    if (take <= 0) return;
    node.resourceNode.amount -= take;
    g.carrying += take;
    g.carryingType = wantType;
    if (node.resourceNode.amount <= 0) {
      this.depleteNode(node);
    }
    // Proactively transition if we just filled up — otherwise the
    // villager would stand idle for one tick.
    if (g.carrying >= g.capacity) {
      this.handleFull(v);
    }
  }

  /** Technology (food bonuses on farms only) and difficulty-handicap multiplier on the gather rate. */
  private rateMultiplier(v: Villager, node: ResourceNode): number {
    const type = node.resourceNode.type;
    const player = this.players?.get(v.owner.playerId);
    if (!player) return 1;
    return gatherRateMultiplier(player, type, type !== 'food' || (node as Entity).building !== undefined);
  }

  private handleFull(v: Villager): void {
    const g = v.gatherer;
    if (!g.carryingType || g.carrying <= 0) return;
    const dropoff = findNearestDropoff(this.world, v, g.carryingType);
    if (!dropoff) {
      // No dropoff reachable — stay put.
      v.movable.path = [];
      v.movable.progress = 0;
      return;
    }
    g.dropoffId = dropoff.id ?? undefined;
    if (isAdjacentToFootprint(v.position, dropoff) && this.onFreeGround(v)) {
      this.deposit(v, g.carryingType, g.carrying);
      g.carrying = 0;
      g.carryingType = null;
      // After dropping off, try to return to the original node.
      if (g.targetNodeId !== undefined) {
        this.walkToNode(v);
      }
      return;
    }
    if (v.movable.path.length === 0) {
      this.walkToFootprint(v, dropoff);
    }
  }

  private onFreeGround(v: Villager): boolean {
    return this.mapData.isPassable(v.position.tx, v.position.ty);
  }

  private walkToNode(v: Villager): void {
    const g = v.gatherer;
    if (g.targetNodeId === undefined) return;
    const node = findEntityById(this.world, g.targetNodeId) as ResourceNode | undefined;
    if (!node) return;
    this.walkTo(
      v,
      () =>
        (node as Entity).building
          ? findAdjacentToBuildingNode(this.mapData, node, v.position)
          : findAdjacentPassable(this.mapData, node.position, v.position),
      (tx, ty) => isAdjacentToNode({ tx, ty }, node),
    );
  }

  private walkToFootprint(v: Villager, dropoff: Dropoff): void {
    this.walkTo(
      v,
      () => findAdjacentToFootprint(this.mapData, dropoff, v.position),
      (tx, ty) => isAdjacentToFootprint({ tx, ty }, dropoff),
    );
  }

  /**
   * Plans a walk to `goal()` within the path budget; a failed plan backs off (see class doc).
   * When the picked tile is cut off (a grass hole in a forest), the nearest reachable tile
   * where `isWorkTile` holds is used instead.
   */
  private walkTo(v: Villager, goal: () => TileCoord | null, isWorkTile: (tx: number, ty: number) => boolean): void {
    if ((this.repathAt.get(v) ?? 0) > this.nowMs) return;
    const to = goal();
    if (to && !this.paths.take()) return;
    const escape = escapeRulesAt(this.world, v.position, this.mapData, v.owner?.playerId ?? 0);
    const path = to ? (findPath(this.mapData, v.position, to, escape) ?? findPathToAny(this.mapData, v.position, isWorkTile, escape)) : null;
    if (!path) {
      this.repathAt.set(v, this.nowMs + REPATH_RETRY_MS);
      return;
    }
    v.movable.path = path.slice(1);
    v.movable.progress = 0;
  }

  /**
   * The node ran out: on to the nearest node of the same type within
   * GATHER_RETARGET_RADIUS, or, when there is none, home to the drop-off
   * with whatever is carried, to wait there for orders.
   */
  private retarget(v: Villager): void {
    const g = v.gatherer;
    const next = g.carryingType ? findNearestNodeOfType(this.world, v, g.carryingType) : undefined;
    g.targetNodeId = next?.id ?? undefined;
    if (!next) g.dropoffId = undefined;
    if (g.carrying >= g.capacity || (!next && g.carrying > 0)) {
      this.handleFull(v);
    } else if (next) {
      this.walkToNode(v);
    }
  }

  private depleteNode(node: ResourceNode): void {
    // Farms are never used up: they regrow (FarmRegenSystem).
    if ((node as Entity).building) return;
    const { tx, ty } = node.position;
    // Natural resource tiles revert to grass on depletion.
    this.mapData.setTile(tx, ty, TERRAIN.grass);
    this.world.remove(node as Entity);
  }

  private deposit(v: Villager, type: ResourceType, amount: number): void {
    const floored = Math.floor(amount);
    if (floored <= 0) return;
    const ownerId = v.owner.playerId;
    const player = this.players?.get(ownerId);
    if (player) {
      player.resources[type] += floored;
      gameEvents.emit('resourcesDelivered', { world: this.world, playerId: ownerId, amount: floored });
    }
    if (ownerId === 1) {
      const state = uiStore.getState();
      state.setResources({ [type]: state.resources[type] + floored });
    }
    v.gatherer.carrying -= floored;
  }
}
