import type { With } from 'miniplex';
import type { TileCoord } from '../../iso/coordinates';
import type { PlayerManager } from '../../game/PlayerManager';
import type { MapData } from '../../map/MapData';
import { findPath } from '../../map/pathfinding';
import type { ResourceType } from '../../types';
import { uiStore } from '../../ui/store';
import type { Entity } from '../components';
import { faceToward } from './facing';
import type { EcsWorld } from '../world';

type Villager = With<
  Entity,
  'position' | 'gatherer' | 'movable' | 'owner'
>;
type ResourceNode = With<Entity, 'position' | 'resourceNode'>;
type Dropoff = With<
  Entity,
  'position' | 'resourceDropoff' | 'building'
>;

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
 */
export class GatheringSystem {
  private readonly world: EcsWorld;
  private readonly mapData: MapData;
  private readonly players: PlayerManager | null;

  constructor(
    world: EcsWorld,
    mapData: MapData,
    players: PlayerManager | null = null,
  ) {
    this.world = world;
    this.mapData = mapData;
    this.players = players;
  }

  update(deltaMs: number): void {
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
    this.walkToNode(v);
  }

  private tick(v: Villager, dt: number): void {
    const g = v.gatherer;
    if (g.carrying >= g.capacity) {
      this.handleFull(v);
      return;
    }
    if (g.targetNodeId === undefined) return;
    const node = this.findEntityById(g.targetNodeId) as
      | ResourceNode
      | undefined;
    if (!node || !node.resourceNode || node.resourceNode.amount <= 0) {
      this.retarget(v);
      return;
    }
    if (isAdjacentToNode(v.position, node)) {
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
      g.gatherRate * dt,
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

  private handleFull(v: Villager): void {
    const g = v.gatherer;
    if (!g.carryingType || g.carrying <= 0) return;
    const dropoff = this.findNearestDropoff(v, g.carryingType);
    if (!dropoff) {
      // No dropoff reachable — stay put.
      v.movable.path = [];
      v.movable.progress = 0;
      return;
    }
    g.dropoffId = dropoff.id ?? undefined;
    if (isAdjacentToFootprint(v.position, dropoff)) {
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

  private walkToNode(v: Villager): void {
    const g = v.gatherer;
    if (g.targetNodeId === undefined) return;
    const node = this.findEntityById(g.targetNodeId) as
      | ResourceNode
      | undefined;
    if (!node) return;
    const goal = (node as Entity).building
      ? findAdjacentToBuildingNode(this.mapData, node, v.position)
      : findAdjacentPassable(this.mapData, node.position, v.position);
    if (!goal) return;
    const path = findPath(this.mapData, v.position, goal);
    if (!path) return;
    v.movable.path = path.slice(1);
    v.movable.progress = 0;
  }

  private walkToFootprint(v: Villager, dropoff: Dropoff): void {
    const goal = findAdjacentToFootprint(
      this.mapData,
      dropoff,
      v.position,
    );
    if (!goal) return;
    const path = findPath(this.mapData, v.position, goal);
    if (!path) return;
    v.movable.path = path.slice(1);
    v.movable.progress = 0;
  }

  private retarget(v: Villager): void {
    const g = v.gatherer;
    if (!g.carryingType) {
      g.targetNodeId = undefined;
      return;
    }
    const next = this.findNearestNodeOfType(v.position, g.carryingType);
    g.targetNodeId = next?.id ?? undefined;
    if (g.carrying >= g.capacity) {
      this.handleFull(v);
    } else if (next) {
      this.walkToNode(v);
    }
  }

  private depleteNode(node: ResourceNode): void {
    if ((node as Entity).building) {
      // Farms keep the building but drop the resourceNode tag so no
      // further villagers come here to gather.
      this.world.removeComponent(node as Entity, 'resourceNode');
      return;
    }
    const { tx, ty } = node.position;
    // Natural resource tiles revert to grass on depletion.
    const TERRAIN_GRASS = 0;
    this.mapData.setTile(tx, ty, TERRAIN_GRASS as 0);
    this.world.remove(node as Entity);
  }

  private deposit(v: Villager, type: ResourceType, amount: number): void {
    const floored = Math.floor(amount);
    if (floored <= 0) return;
    const ownerId = v.owner.playerId;
    const player = this.players?.get(ownerId);
    if (player) player.resources[type] += floored;
    if (ownerId === 1) {
      const state = uiStore.getState();
      state.setResources({ [type]: state.resources[type] + floored });
    }
    v.gatherer.carrying -= floored;
  }

  private findEntityById(id: number): Entity | undefined {
    for (const entity of this.world.entities) {
      if (entity.id === id) return entity;
    }
    return undefined;
  }

  private findNearestDropoff(
    v: Villager,
    type: ResourceType,
  ): Dropoff | undefined {
    let best: Dropoff | undefined;
    let bestDist = Infinity;
    const dropoffs = this.world.with('position', 'resourceDropoff', 'building');
    for (const d of dropoffs) {
      if (!d.resourceDropoff.accepts.includes(type)) continue;
      if (d.owner?.playerId !== v.owner.playerId) continue;
      const dist = footprintDistance(v.position, d);
      if (dist < bestDist) {
        bestDist = dist;
        best = d;
      }
    }
    return best;
  }

  private findNearestNodeOfType(
    from: TileCoord,
    type: ResourceType,
  ): ResourceNode | undefined {
    let best: ResourceNode | undefined;
    let bestDist = Infinity;
    const nodes = this.world.with('position', 'resourceNode');
    for (const n of nodes) {
      if (n.resourceNode.type !== type) continue;
      if (n.resourceNode.amount <= 0) continue;
      const dist = manhattan(from, n.position);
      if (dist < bestDist) {
        bestDist = dist;
        best = n;
      }
    }
    return best;
  }
}

function isAdjacentToNode(v: TileCoord, node: ResourceNode): boolean {
  const b = (node as Entity).building;
  if (!b) {
    const dx = Math.abs(v.tx - node.position.tx);
    const dy = Math.abs(v.ty - node.position.ty);
    return dx <= 1 && dy <= 1;
  }
  return (
    v.tx >= node.position.tx - 1 &&
    v.tx <= node.position.tx + b.footprint.width &&
    v.ty >= node.position.ty - 1 &&
    v.ty <= node.position.ty + b.footprint.height
  );
}

function isAdjacentToFootprint(v: TileCoord, d: Dropoff): boolean {
  const { width, height } = d.building.footprint;
  const x0 = d.position.tx - 1;
  const y0 = d.position.ty - 1;
  const x1 = d.position.tx + width;
  const y1 = d.position.ty + height;
  return v.tx >= x0 && v.tx <= x1 && v.ty >= y0 && v.ty <= y1;
}

function findAdjacentPassable(
  map: MapData,
  target: TileCoord,
  preferNear: TileCoord,
): TileCoord | null {
  const candidates: TileCoord[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const tile = { tx: target.tx + dx, ty: target.ty + dy };
      if (map.isPassable(tile.tx, tile.ty)) candidates.push(tile);
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => manhattan(a, preferNear) - manhattan(b, preferNear));
  return candidates[0]!;
}

function findAdjacentToBuildingNode(
  map: MapData,
  node: ResourceNode,
  preferNear: TileCoord,
): TileCoord | null {
  const b = (node as Entity).building;
  if (!b) return null;
  const { width, height } = b.footprint;
  const candidates: TileCoord[] = [];
  for (let dx = -1; dx <= width; dx++) {
    candidates.push({ tx: node.position.tx + dx, ty: node.position.ty - 1 });
    candidates.push({ tx: node.position.tx + dx, ty: node.position.ty + height });
  }
  for (let dy = 0; dy < height; dy++) {
    candidates.push({ tx: node.position.tx - 1, ty: node.position.ty + dy });
    candidates.push({ tx: node.position.tx + width, ty: node.position.ty + dy });
  }
  const passable = candidates.filter((t) => map.isPassable(t.tx, t.ty));
  if (passable.length === 0) return null;
  passable.sort(
    (a, b2) =>
      Math.abs(a.tx - preferNear.tx) + Math.abs(a.ty - preferNear.ty) -
      (Math.abs(b2.tx - preferNear.tx) + Math.abs(b2.ty - preferNear.ty)),
  );
  return passable[0]!;
}

function findAdjacentToFootprint(
  map: MapData,
  d: Dropoff,
  preferNear: TileCoord,
): TileCoord | null {
  const { width, height } = d.building.footprint;
  const candidates: TileCoord[] = [];
  for (let dx = -1; dx <= width; dx++) {
    for (const dy of [-1, height]) {
      candidates.push({ tx: d.position.tx + dx, ty: d.position.ty + dy });
    }
  }
  for (let dy = 0; dy < height; dy++) {
    candidates.push({ tx: d.position.tx - 1, ty: d.position.ty + dy });
    candidates.push({ tx: d.position.tx + width, ty: d.position.ty + dy });
  }
  const passable = candidates.filter((t) => map.isPassable(t.tx, t.ty));
  if (passable.length === 0) return null;
  passable.sort((a, b) => manhattan(a, preferNear) - manhattan(b, preferNear));
  return passable[0]!;
}

function manhattan(a: TileCoord, b: TileCoord): number {
  return Math.abs(a.tx - b.tx) + Math.abs(a.ty - b.ty);
}

function footprintDistance(v: TileCoord, d: Dropoff): number {
  const { width, height } = d.building.footprint;
  const cx = d.position.tx + (width - 1) / 2;
  const cy = d.position.ty + (height - 1) / 2;
  return Math.abs(v.tx - cx) + Math.abs(v.ty - cy);
}
