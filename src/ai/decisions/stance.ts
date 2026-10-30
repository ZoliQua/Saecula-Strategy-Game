import { BUILDING_BALANCE, UNIT_BALANCE } from '../../config/balance';
import type { StanceTuning } from '../../config/aiBalance';
import type { AgeId, BuildingType, UnitType } from '../../types';

/**
 * Hard AI strategy stances (§10.3 "stratégiai váltás"):
 * - `turtle`: the enemy is aggressive (its army keeps showing up at the
 *   base) → towers and walls, the army stays home;
 * - `rush`: the enemy is passive (little army seen) → small, early waves;
 * - `tech`: the enemy is teching / booming (later-age units or buildings
 *   seen) → age-ups and technologies first, bigger waves later;
 * - `balanced`: nothing decisive seen yet.
 */
export type Stance = 'balanced' | 'turtle' | 'rush' | 'tech';

export interface StanceState {
  readonly stance: Stance;
  /** Game time the stance was entered (ms). */
  readonly sinceMs: number;
}

/** What the AI has perceived about its enemy (fog-limited, never cheated). */
export interface StanceSignals {
  readonly timeMs: number;
  /** Decaying score of armed enemy units seen near the own base. */
  readonly aggression: number;
  /** Decaying count of enemy military units seen anywhere (scouts and villagers excluded). */
  readonly enemyArmySeen: number;
  /** Highest age among the enemy units / buildings the AI has seen. */
  readonly enemyAgeSeen: AgeId;
  readonly ownAge: AgeId;
}

/** The stance the signals call for, judged with the "stay" thresholds of the current one. */
function wantedStance(current: Stance, s: StanceSignals, t: StanceTuning): Stance {
  const turtleAt = current === 'turtle' ? t.turtleExit : t.turtleEnter;
  if (s.aggression >= turtleAt) return 'turtle';
  if (s.enemyAgeSeen > s.ownAge || s.enemyAgeSeen >= 3) return 'tech';
  const passiveAt = current === 'rush' ? t.rushExit : t.rushEnter;
  if (s.timeMs >= t.passiveAfterMs && s.enemyArmySeen <= passiveAt) return 'rush';
  // No decisive reading any more (e.g. the AI caught up with a teching enemy): back to balanced.
  return 'balanced';
}

/**
 * Next stance with hysteresis: separate enter / exit thresholds, and a
 * minimum dwell time before any change, so the stance does not flip
 * every decision. An attack on the base (turtle) overrides the dwell time.
 */
export function nextStance(state: StanceState, signals: StanceSignals, tuning: StanceTuning): StanceState {
  const wanted = wantedStance(state.stance, signals, tuning);
  if (wanted === state.stance) return state;
  const dwelt = signals.timeMs - state.sinceMs >= tuning.minDwellMs;
  if (!dwelt && wanted !== 'turtle') return state;
  return { stance: wanted, sinceMs: signals.timeMs };
}

/** Peak-hold score that decays by `decayPerMin` per minute (aggression memory). */
export function decayedPeak(previous: number, now: number, elapsedMs: number, decayPerMin: number): number {
  return Math.max(now, previous * Math.pow(decayPerMin, elapsedMs / 60_000));
}

/** Enemy military seen: sightings of everything but villagers and scouts (exact types: a cossack counts). */
export function enemyArmySeen(sightings: Readonly<Partial<Record<UnitType, number>>>): number {
  let n = 0;
  for (const [type, count] of Object.entries(sightings) as [UnitType, number][]) {
    if (type !== 'villager' && type !== 'scout') n += count;
  }
  return n;
}

/**
 * Lower bound on the enemy's age from what was seen: the highest age
 * requirement of any sighted unit (count ≥ `minCount`) or known building.
 */
export function enemyAgeSeen(
  sightings: Readonly<Partial<Record<UnitType, number>>>,
  buildings: readonly { readonly type: BuildingType }[],
  minCount: number,
): AgeId {
  let age: AgeId = 1;
  for (const [type, count] of Object.entries(sightings) as [UnitType, number][]) {
    if (count >= minCount && UNIT_BALANCE[type].age > age) age = UNIT_BALANCE[type].age;
  }
  for (const b of buildings) if (BUILDING_BALANCE[b.type].age > age) age = BUILDING_BALANCE[b.type].age;
  return age;
}
