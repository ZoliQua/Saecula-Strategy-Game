import type { TileCoord } from '../../iso/coordinates';
import type { GatherWeights } from '../../config/aiBalance';
import type { ResourceType } from '../../types';

const TYPES: readonly ResourceType[] = ['food', 'wood', 'gold'];

/**
 * Which resource the next free villager should gather: the one furthest
 * below its wanted share of `total` gatherers. Types with nothing to
 * gather are skipped; null when nothing can be gathered at all.
 */
export function pickGatherType(
  counts: Readonly<Record<ResourceType, number>>,
  weights: GatherWeights,
  available: (type: ResourceType) => boolean,
): ResourceType | null {
  const usable = TYPES.filter((t) => available(t));
  if (usable.length === 0) return null;
  const weightSum = usable.reduce((s, t) => s + weights[t], 0);
  const total = usable.reduce((s, t) => s + counts[t], 0) + 1;
  let best: ResourceType | null = null;
  let bestDeficit = -Infinity;
  for (const t of usable) {
    const share = weightSum > 0 ? weights[t] / weightSum : 1 / usable.length;
    const deficit = share * total - counts[t];
    if (deficit > bestDeficit) {
      bestDeficit = deficit;
      best = t;
    }
  }
  return best;
}

/**
 * A gatherer move that brings the split closer to `weights`: from the most
 * over-staffed resource to the most under-staffed one, or null when no
 * resource is off by at least `slack` villagers (moving costs a walk, so
 * small drifts are left alone).
 */
export function pickRebalance(
  counts: Readonly<Record<ResourceType, number>>,
  weights: GatherWeights,
  available: (type: ResourceType) => boolean,
  slack = 1,
): { from: ResourceType; to: ResourceType } | null {
  const total = TYPES.reduce((s, t) => s + counts[t], 0);
  if (total === 0) return null;
  const usable = TYPES.filter((t) => available(t));
  const weightSum = usable.reduce((s, t) => s + weights[t], 0);
  const want = (t: ResourceType) => (usable.includes(t) && weightSum > 0 ? (weights[t] / weightSum) * total : 0);
  let from: ResourceType | null = null;
  let to: ResourceType | null = null;
  for (const t of TYPES) {
    const diff = counts[t] - want(t);
    if (diff >= slack && (from === null || diff > counts[from] - want(from))) from = t;
    if (usable.includes(t) && diff <= -slack && (to === null || diff < counts[to] - want(to))) to = t;
  }
  return from && to ? { from, to } : null;
}

/** Nearest item by Chebyshev distance (optionally filtered), or undefined. */
export function nearest<T extends { position?: TileCoord }>(
  items: Iterable<T>,
  from: TileCoord,
  accept: (item: T) => boolean = () => true,
): T | undefined {
  let best: T | undefined;
  let bestD = Infinity;
  for (const it of items) {
    if (!it.position || !accept(it)) continue;
    const d = Math.max(Math.abs(it.position.tx - from.tx), Math.abs(it.position.ty - from.ty));
    if (d < bestD) {
      bestD = d;
      best = it;
    }
  }
  return best;
}

export function chebyshev(a: TileCoord, b: TileCoord): number {
  return Math.max(Math.abs(a.tx - b.tx), Math.abs(a.ty - b.ty));
}

/**
 * Shifts gatherer weights toward what a savings goal still lacks: each
 * resource's share of the remaining shortfall (`goal - have`) is blended
 * in with `strength` (0 = base weights, 1 = shortfall only). With no
 * shortfall the base weights are returned unchanged.
 */
export function weightsForGoal(
  base: GatherWeights,
  goal: Readonly<Record<ResourceType, number>>,
  have: Readonly<Record<ResourceType, number>>,
  strength: number,
): GatherWeights {
  const short = {
    food: Math.max(0, goal.food - have.food),
    wood: Math.max(0, goal.wood - have.wood),
    gold: Math.max(0, goal.gold - have.gold),
  };
  const total = short.food + short.wood + short.gold;
  if (total <= 0) return base;
  const baseSum = base.food + base.wood + base.gold || 1;
  const mix = (t: ResourceType) => (1 - strength) * (base[t] / baseSum) + strength * (short[t] / total);
  return { food: mix('food'), wood: mix('wood'), gold: mix('gold') };
}
