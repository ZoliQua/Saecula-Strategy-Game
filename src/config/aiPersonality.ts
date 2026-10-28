/**
 * AI personalities (rusher / boomer / turtle): seeded per AI player
 * (ai/personality.ts) and laid over the Medium-family tuning of the
 * Medium, Hard and Mesteri AIs. Multipliers scale the base value (a span
 * scales both bounds); results are rounded. Easy has no personality.
 */
export type PersonalityId = 'rusher' | 'boomer' | 'turtle';

export const PERSONALITIES: readonly PersonalityId[] = ['rusher', 'boomer', 'turtle'];

export interface PersonalityTuning {
  /** Multiplier on `firstAttackMs` (both bounds). */
  readonly firstAttackMs: number;
  /** Multiplier on `attackWave`. */
  readonly attackWave: number;
  /** Multiplier on each `villagerTarget` entry. */
  readonly villagerTarget: number;
  /** Added to `pressure.minArmy`. */
  readonly pressureMinArmy: number;
  /** Added to `minDefenders`. */
  readonly minDefenders: number;
  /** The age-1 and age-2 `ageUpReserve` entries are kept at 1 (the full age-up cost saved). */
  readonly fullAgeUpReserve: boolean;
  /** Hard family: multiplier on `stance.turtleEnter`. */
  readonly turtleEnter: number;
  /** Hard family: added to `turtle.towers`. */
  readonly turtleTowers: number;
  /** Hard family: added to `stance.rushEnter`. */
  readonly rushEnter: number;
}

const NEUTRAL: PersonalityTuning = {
  firstAttackMs: 1,
  attackWave: 1,
  villagerTarget: 1,
  pressureMinArmy: 0,
  minDefenders: 0,
  fullAgeUpReserve: false,
  turtleEnter: 1,
  turtleTowers: 0,
  rushEnter: 0,
};

export const AI_PERSONALITY: Readonly<Record<PersonalityId, PersonalityTuning>> = {
  /** Attacks early with small waves on a slightly leaner economy. */
  rusher: { ...NEUTRAL, firstAttackMs: 0.75, attackWave: 0.7, villagerTarget: 0.9, pressureMinArmy: 1, rushEnter: 2 },
  /** Grows its economy first; attacks late with big waves. */
  boomer: { ...NEUTRAL, firstAttackMs: 1.4, attackWave: 1.3, villagerTarget: 1.15, fullAgeUpReserve: true },
  /** Keeps a big home guard, fortifies sooner, attacks late. */
  turtle: { ...NEUTRAL, minDefenders: 4, firstAttackMs: 1.5, attackWave: 1.4, turtleEnter: 0.5, turtleTowers: 1 },
};
