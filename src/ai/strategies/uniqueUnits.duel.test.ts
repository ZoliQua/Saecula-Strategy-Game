import { describe, expect, it } from 'vitest';
import { isNavalType, UNIT_BALANCE } from '../../config/balance';
import { isUniqueUnit } from '../../game/civUnits';
import { hu } from '../../i18n/hu';
import { BASE_UNIT_TYPES, type BaseUnitType, type UniqueUnitType, type UnitType } from '../../types';
import { DUEL_BUDGET, fairDuel } from '../testing/unitDuel';

/**
 * Unique-unit rules (0.9.1, CLAUDE.md §9), measured with the equal-cost duel (DUEL_BUDGET
 * resources per side, no civ bonus, no upgrades; open arena, so ranged units lose open charges
 * to melee):
 * (a) a unique unit stays near the base unit it replaces: |fairDuel(U, B)| <= half the budget;
 * (b) it does not beat its base's counters: every other base land military unit of its age or
 *     earlier that beats B also beats U.
 * Scores are fairDuel (both sides averaged), so the arena's side bias cancels.
 * 0.9.1 baseline (0.9.0 stats): cossack vs swordsman +90 while the scout scores -528 (rule b
 * fails); landsknecht vs pikeman +698, legionary vs swordsman +560 (both pass).
 * Final (cossack HP 50 / attack 5): cossack vs swordsman -575, cossack vs scout +152.
 */

const UNIQUES = (Object.keys(UNIT_BALANCE) as UnitType[]).filter(isUniqueUnit) as UniqueUnitType[];

function baseOf(u: UniqueUnitType): BaseUnitType {
  const b = UNIT_BALANCE[u].replaces;
  if (!b) throw new Error(`${u} replaces nothing`);
  return b;
}

/** Land units outside the duel's counter pool: the villager, the cannon (a siege unit) and the monk (it converts, M11). */
const NOT_COUNTERS: ReadonlySet<BaseUnitType> = new Set<BaseUnitType>(['villager', 'cannon', 'monk']);

/**
 * Base land military units available by `age` other than `base` itself (a mirror match says
 * nothing about counters; ships, M14, never meet land units in the arena).
 */
function counterPool(age: number, base: BaseUnitType): BaseUnitType[] {
  return BASE_UNIT_TYPES.filter((t) => t !== base && !NOT_COUNTERS.has(t) && !isNavalType(t) && UNIT_BALANCE[t].age <= age);
}

describe('unique units in equal-cost duels', () => {
  it('there are eight unique units', () => {
    expect(UNIQUES).toHaveLength(8);
  });

  for (const u of UNIQUES) {
    const b = baseOf(u);

    it(`(a) ${u} stays within half the budget of ${b}`, () => {
      const score = fairDuel(u, b);
      expect(Math.abs(score), `${u} vs ${b}: ${Math.round(score)}`).toBeLessThanOrEqual(0.5 * DUEL_BUDGET);
    });

    it(`(b) ${u} loses to every counter of ${b}`, () => {
      for (const o of counterPool(UNIT_BALANCE[u].age, b)) {
        const baseScore = fairDuel(b, o);
        if (baseScore >= 0) continue;
        const score = fairDuel(u, o);
        expect(score, `${u} (replaces ${b}) vs ${o}: ${b} scores ${Math.round(baseScore)}, ${u} scores ${Math.round(score)}`).toBeLessThan(0);
      }
    });
  }
});

describe('land unit texts carry no stat numbers', () => {
  // Ships are left out: the transport's role text names its capacity (M14).
  it('no land unit name or role description contains a digit', () => {
    for (const t of (Object.keys(UNIT_BALANCE) as UnitType[]).filter((u) => !isNavalType(u))) {
      expect(hu.units[t], `hu.units.${t}`).not.toMatch(/\d/);
      expect(hu.unitRoles[t], `hu.unitRoles.${t}`).not.toMatch(/\d/);
    }
  });
});
