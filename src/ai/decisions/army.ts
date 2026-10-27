import { ARROW_UNITS, CAVALRY_CLASS, INFANTRY_CLASS } from '../../config/balance';
import { AI_COUNTERS, AI_MEDIUM, type CounterTuning } from '../../config/aiBalance';
import type { Resources, UnitType } from '../../types';
import { canAfford } from '../economy';

export type ArmyMix = Readonly<Partial<Record<UnitType, number>>>;
type Sightings = Readonly<Partial<Record<UnitType, number>>>;

/** Sighting share of each counter-relevant class (cavalry, archers, melee infantry). */
export function enemyClassShares(seen: Sightings): Record<keyof typeof AI_COUNTERS.vs, number> {
  let total = 0;
  let cavalry = 0;
  let archers = 0;
  let infantry = 0;
  for (const [type, n] of Object.entries(seen) as [UnitType, number][]) {
    if (type === 'villager' || type === 'scout' || n <= 0) continue;
    total += n;
    if (CAVALRY_CLASS.includes(type)) cavalry += n;
    else if (ARROW_UNITS.includes(type)) archers += n;
    else if (INFANTRY_CLASS.includes(type)) infantry += n;
  }
  if (total === 0) return { cavalry: 0, archers: 0, infantry: 0 };
  return { cavalry: cavalry / total, archers: archers / total, infantry: infantry / total };
}

/**
 * Adjusts an army mix to what the AI has seen (§10.2 counter units):
 * every enemy class above the threshold boosts its counters (§7.5:
 * pikemen vs cavalry; knights / swordsmen / cavalry vs archers; ranged vs
 * infantry), and a lot of archers also drops the pikemen. Only units in
 * `allowed` are kept. `tuning` sets how early and how strongly it reacts.
 * Returns weights that sum to 1 (or an empty mix).
 */
export function counterMix(
  base: ArmyMix,
  seen: Sightings,
  allowed: readonly UnitType[],
  tuning: CounterTuning = AI_MEDIUM.counters,
): ArmyMix {
  const mix: Partial<Record<UnitType, number>> = {};
  for (const t of allowed) if ((base[t] ?? 0) > 0) mix[t] = base[t]!;
  const shares = enemyClassShares(seen);
  for (const cls of Object.keys(shares) as (keyof typeof shares)[]) {
    const share = shares[cls];
    if (share < tuning.threshold) continue;
    for (const t of AI_COUNTERS.vs[cls]) {
      if (allowed.includes(t)) mix[t] = (mix[t] ?? 0) + tuning.boost * share;
    }
    if (cls === 'archers' && mix.pikeman !== undefined) mix.pikeman *= 1 - share;
  }
  const sum = Object.values(mix).reduce((s, n) => s + n, 0);
  if (sum <= 0) return {};
  for (const t of Object.keys(mix) as UnitType[]) mix[t] = mix[t]! / sum;
  return mix;
}

/**
 * The unit type to train next: the trainable type furthest below its share
 * of the army (after this unit). Null when nothing in the mix is trainable.
 */
export function nextUnitToTrain(
  mix: ArmyMix,
  counts: Readonly<Partial<Record<UnitType, number>>>,
  canTrain: (type: UnitType) => boolean,
): UnitType | null {
  const total = Object.values(counts).reduce((s, n) => s + (n ?? 0), 0) + 1;
  let best: UnitType | null = null;
  let bestDeficit = -Infinity;
  for (const [type, share] of Object.entries(mix) as [UnitType, number][]) {
    if (share <= 0 || !canTrain(type)) continue;
    const deficit = share * total - (counts[type] ?? 0);
    if (deficit > bestDeficit) {
      bestDeficit = deficit;
      best = type;
    }
  }
  return best;
}

/**
 * The first unit of `savesFor` (expensive ones, such as the cannon) that
 * the army is still short of (below its share of the army after the next
 * unit) and `canTrain` (a trainer exists), or null.
 */
export function savedForUnit(
  mix: ArmyMix,
  counts: Readonly<Partial<Record<UnitType, number>>>,
  canTrain: (type: UnitType) => boolean,
  savesFor: readonly UnitType[],
): UnitType | null {
  const total = Object.values(counts).reduce((s, n) => s + (n ?? 0), 0) + 1;
  return savesFor.find((t) => (mix[t] ?? 0) * total - (counts[t] ?? 0) >= 1 && canTrain(t)) ?? null;
}

/**
 * What other units must leave in the bank while the AI saves for `goal`
 * (see savedForUnit): when `goal` is one of `savesFor` but `have` cannot
 * pay its `cost` above `reserve` yet, the cost joins the reserve;
 * otherwise the reserve is unchanged. Without this, cheap units keep
 * spending the gold and the cannon never comes.
 */
export function reserveForGoal(
  goal: UnitType | null,
  have: Resources,
  cost: Resources,
  reserve: Resources,
  savesFor: readonly UnitType[],
): Resources {
  if (!goal || !savesFor.includes(goal) || canAfford(have, cost, reserve)) return reserve;
  return { food: reserve.food + cost.food, wood: reserve.wood + cost.wood, gold: reserve.gold + cost.gold };
}

/** Counts units by type. */
export function countByType(units: Iterable<{ unit?: { unitType: UnitType } }>): Partial<Record<UnitType, number>> {
  const out: Partial<Record<UnitType, number>> = {};
  for (const u of units) {
    if (!u.unit) continue;
    out[u.unit.unitType] = (out[u.unit.unitType] ?? 0) + 1;
  }
  return out;
}
