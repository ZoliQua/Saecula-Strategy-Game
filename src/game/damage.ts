import {
  CAVALRY_CLASS,
  ANTI_CAVALRY_BONUS,
  ANTI_CAVALRY_UNITS,
} from '../config/balance';
import type { UnitType } from '../types';

export interface AttackStats {
  readonly meleeAtk: number;
  readonly pierceAtk: number;
  /** Bonus melee damage against the cavalry class (pikeman, landsknecht). */
  readonly bonusVsCavalry?: number;
}

export interface ArmorStats {
  readonly melee: number;
  readonly pierce: number;
}

export function bonusVsCavalryFor(type: UnitType): number {
  return ANTI_CAVALRY_UNITS.includes(type) ? ANTI_CAVALRY_BONUS : 0;
}

/**
 * damage = max(1, mATK - mDEF) + max(0, pATK - pDEF), where each term is
 * only counted if the attacker has that attack type. Minimum total is 1.
 */
export function computeDamage(
  attack: AttackStats,
  armor: ArmorStats,
  targetUnit?: UnitType,
): number {
  let melee = attack.meleeAtk;
  if (melee > 0 && targetUnit && CAVALRY_CLASS.includes(targetUnit)) {
    melee += attack.bonusVsCavalry ?? 0;
  }
  let total = 0;
  if (melee > 0) total += Math.max(1, melee - armor.melee);
  if (attack.pierceAtk > 0) total += Math.max(0, attack.pierceAtk - armor.pierce);
  return Math.max(1, total);
}
