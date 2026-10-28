import {
  AI_PERSONALITY,
  PERSONALITIES,
  type HardTuning,
  type MediumTuning,
  type PersonalityId,
  type Span,
} from '../config/aiBalance';
import { createRng } from '../map/random';

export { PERSONALITIES, type PersonalityId };

/** The personality of AI `playerId` in a match: the same seed always deals the same ones. */
export function pickPersonality(matchSeed: number, playerId: number): PersonalityId {
  const rng = createRng(matchSeed ^ 0x9e3779b9 ^ (playerId * 0x85ebca6b));
  return PERSONALITIES[Math.floor(rng() * PERSONALITIES.length)] ?? 'boomer';
}

function isHardTuning(tune: MediumTuning): tune is HardTuning {
  return 'stance' in tune && 'turtle' in tune;
}

const scaleSpan = (s: Span, k: number): Span => ({ min: Math.round(s.min * k), max: Math.round(s.max * k) });

/**
 * `tune` with personality `id` laid over it (AI_PERSONALITY): a pure
 * overlay, `tune` is not changed. The Hard family (Hard, Mesteri) also
 * gets its stance and turtle overlays.
 */
export function applyPersonality<T extends MediumTuning>(tune: T, id: PersonalityId): T {
  const p = AI_PERSONALITY[id];
  const medium = {
    ...tune,
    firstAttackMs: scaleSpan(tune.firstAttackMs, p.firstAttackMs),
    attackWave: Math.round(tune.attackWave * p.attackWave),
    villagerTarget: tune.villagerTarget.map((n) => Math.round(n * p.villagerTarget)),
    pressure: { ...tune.pressure, minArmy: tune.pressure.minArmy + p.pressureMinArmy },
    minDefenders: tune.minDefenders + p.minDefenders,
    ageUpReserve: p.fullAgeUpReserve ? tune.ageUpReserve.map((r, age) => (age === 1 || age === 2 ? 1 : r)) : tune.ageUpReserve,
  };
  if (!isHardTuning(tune)) return medium;
  return {
    ...medium,
    stance: {
      ...tune.stance,
      turtleEnter: tune.stance.turtleEnter * p.turtleEnter,
      rushEnter: tune.stance.rushEnter + p.rushEnter,
    },
    villagerShare: {
      peace: tune.villagerShare.peace * p.villagerTarget,
      war: tune.villagerShare.war * p.villagerTarget,
    },
    turtle: {
      ...tune.turtle,
      towers: tune.turtle.towers + p.turtleTowers,
      ...(p.fortifyProactively ? { proactive: true } : {}),
    },
  };
}
