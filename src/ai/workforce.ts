import { AI_COMMON, type GatherWeights } from '../config/aiBalance';
import type { Entity } from '../ecs/components';
import { clearUnitOrders } from '../ecs/orders';
import type { EcsWorld } from '../ecs/world';
import type { TileCoord } from '../iso/coordinates';
import type { ResourceType } from '../types';
import { nearest, onEnemyGround, pickGatherType, pickRebalance } from './decisions/gathering';
import { villagerTask, type VillagerTask } from './economy';
import type { WorldView } from './perception';

const TYPES: readonly ResourceType[] = ['food', 'wood', 'gold'];

/** A villager with nothing to do (not walking either). */
export function isIdleVillager(v: Entity, view: WorldView): boolean {
  if (villagerTask(v, view.byId) !== 'idle') return false;
  return !v.moveIntent && (v.movable?.path.length ?? 0) === 0;
}

/**
 * A gatherer the game sent on to a node this AI does not know about (the
 * nearest one when its own ran out may be anywhere — even another
 * player's farm): the AI takes it back and gives it a job of its own.
 */
function isStray(v: Entity, known: ReadonlySet<number>): boolean {
  const id = v.gatherer?.targetNodeId;
  return id !== undefined && !v.gatherIntent && !v.buildCommand && !known.has(id);
}

/** Villagers currently working each resource. */
export function gatherCounts(view: WorldView): Record<ResourceType, number> {
  const counts: Record<ResourceType, number> = { food: 0, wood: 0, gold: 0 };
  for (const v of view.villagers) {
    const t: VillagerTask = villagerTask(v, view.byId);
    if (t === 'food' || t === 'wood' || t === 'gold') counts[t]++;
  }
  return counts;
}

/** Ids of resource nodes somebody already works (farms take one farmer). */
function workedNodes(view: WorldView): Set<number> {
  const taken = new Set<number>();
  for (const v of view.villagers) {
    const id = v.gatherIntent?.nodeId ?? v.gatherer?.targetNodeId;
    if (id !== undefined) taken.add(id);
  }
  return taken;
}

/** Natural nodes the AI may send villagers to: known, and not inside a known enemy base. */
function workable(view: WorldView, type: ResourceType): Entity[] {
  return view.resources[type].filter(
    (n) => n.building !== undefined || !n.position || !onEnemyGround(n.position, view.knownEnemyBuildings, AI_COMMON.enemyGroundRadius),
  );
}

/** Best node of `type` for a villager at `from`: a free own farm first for food, else the nearest workable node. */
function nodeFor(view: WorldView, type: ResourceType, from: TileCoord, taken: Set<number>): Entity | undefined {
  const nodes = workable(view, type);
  if (type === 'food') {
    const farm = nearest(nodes, from, (n) => n.building !== undefined && n.id !== undefined && !taken.has(n.id));
    if (farm) return farm;
    return nearest(nodes, from, (n) => n.building === undefined);
  }
  return nearest(nodes, from);
}

/** Whether `type` has anything left to gather for this AI. */
function gatherable(view: WorldView, type: ResourceType, taken: Set<number>): boolean {
  const nodes = workable(view, type);
  if (type !== 'food') return nodes.length > 0;
  return nodes.some((n) => !n.building || (n.id !== undefined && !taken.has(n.id)));
}

function sendToGather(world: EcsWorld, v: Entity, node: Entity, taken: Set<number>): void {
  if (node.id === undefined) return;
  clearUnitOrders(world, v);
  world.addComponent(v, 'gatherIntent', { nodeId: node.id });
  taken.add(node.id);
}

/**
 * Puts every idle villager to work on the resource furthest below its
 * wanted share (`weights`). Returns how many were assigned.
 */
export function assignIdleVillagers(world: EcsWorld, view: WorldView, weights: GatherWeights): number {
  const counts = gatherCounts(view);
  const taken = workedNodes(view);
  let assigned = 0;
  const known = new Set<number>();
  for (const t of TYPES) for (const n of view.resources[t]) if (n.id !== undefined) known.add(n.id);
  for (const v of view.villagers) {
    if (!v.position) continue;
    const stray = isStray(v, known);
    if (!stray && !isIdleVillager(v, view)) continue;
    if (stray) {
      const was = villagerTask(v, view.byId);
      if (was === 'food' || was === 'wood' || was === 'gold') counts[was]--;
    }
    const type = pickGatherType(counts, weights, (t) => gatherable(view, t, taken));
    if (!type) break;
    const node = nodeFor(view, type, v.position, taken);
    if (!node) continue;
    sendToGather(world, v, node, taken);
    counts[type]++;
    assigned++;
  }
  return assigned;
}

/**
 * Moves up to `maxMoves` gatherers from an over-staffed resource to the
 * most under-staffed one. Returns the moves made.
 */
export function rebalanceGatherers(
  world: EcsWorld,
  view: WorldView,
  weights: GatherWeights,
  maxMoves: number,
): { from: ResourceType; to: ResourceType }[] {
  const counts = gatherCounts(view);
  const taken = workedNodes(view);
  // Judge availability once: a move that fills the last free farm must not make food look unwanted.
  const open = new Set(TYPES.filter((t) => gatherable(view, t, taken)));
  const moves: { from: ResourceType; to: ResourceType }[] = [];
  for (let i = 0; i < maxMoves; i++) {
    const move = pickRebalance(counts, weights, (t) => open.has(t), AI_COMMON.rebalanceSlack);
    if (!move) break;
    // Lightest load first; a carried load is still dropped off before the new job (GatheringSystem).
    const worker = view.villagers
      .filter((v) => villagerTask(v, view.byId) === move.from && v.position)
      .sort((a, b) => (a.gatherer?.carrying ?? 0) - (b.gatherer?.carrying ?? 0))[0];
    if (!worker) break;
    const node = nodeFor(view, move.to, worker.position!, taken);
    if (!node) break;
    sendToGather(world, worker, node, taken);
    counts[move.from]--;
    counts[move.to]++;
    moves.push(move);
  }
  return moves;
}

/** Food spots for the AI: AI_COMMON.berrySpots per known berry bush near home, one per own farm. */
export function foodSpots(view: WorldView, home: TileCoord, radius: number): number {
  let spots = 0;
  for (const n of view.resources.food) {
    if (n.building) spots += 1;
    else if (n.position && Math.max(Math.abs(n.position.tx - home.tx), Math.abs(n.position.ty - home.ty)) <= radius) {
      spots += AI_COMMON.berrySpots;
    }
  }
  // Farm sites still going up will host a farmer too.
  spots += view.buildings.filter((b) => b.building?.type === 'farm' && b.underConstruction).length;
  return spots;
}
