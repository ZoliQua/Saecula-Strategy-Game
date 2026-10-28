import { describe, expect, it } from 'vitest';
import { AI_HARD, AI_MASTER, AI_MEDIUM } from '../config/aiBalance';
import { applyPersonality, PERSONALITIES, pickPersonality, type PersonalityId } from './personality';

describe('AI personalities', () => {
  it('pickPersonality is stable per (seed, id) and spreads: over seeds 1-60 each personality appears ≥ 10 times', () => {
    expect(pickPersonality(42, 2)).toBe(pickPersonality(42, 2));
    const counts: Record<PersonalityId, number> = { rusher: 0, boomer: 0, turtle: 0 };
    for (let seed = 1; seed <= 60; seed++) counts[pickPersonality(seed, 2)]++;
    for (const id of PERSONALITIES) expect(counts[id], id).toBeGreaterThanOrEqual(10);
    // Different AIs in the same match draw independently.
    const perId = new Set([2, 3, 4, 5, 6].map((id) => pickPersonality(7, id)));
    expect(perId.size).toBeGreaterThan(1);
  });

  it('applyPersonality rusher halves nothing it must not: decisionMs unchanged', () => {
    const rusher = applyPersonality(AI_MEDIUM, 'rusher');
    expect(rusher.decisionMs).toEqual(AI_MEDIUM.decisionMs);
    expect(rusher.gatherByAge).toEqual(AI_MEDIUM.gatherByAge);
    expect(rusher.wonder).toEqual(AI_MEDIUM.wonder);
    // A pure overlay: the base table is untouched.
    expect(AI_MEDIUM.attackWave).toBe(12);
    expect(AI_MEDIUM.firstAttackMs).toEqual({ min: 5 * 60_000, max: 7.5 * 60_000 });
  });

  it('exact overlay values for one field of each personality', () => {
    const rusher = applyPersonality(AI_MEDIUM, 'rusher');
    expect(rusher.firstAttackMs).toEqual({ min: 225_000, max: 337_500 });
    expect(rusher.attackWave).toBe(8);
    expect(rusher.villagerTarget).toEqual([0, 13, 23, 29]);
    expect(rusher.pressure.minArmy).toBe(4);
    const boomer = applyPersonality(AI_MEDIUM, 'boomer');
    expect(boomer.villagerTarget).toEqual([0, 16, 30, 37]);
    expect(boomer.attackWave).toBe(16);
    expect(boomer.ageUpReserve).toEqual([0, 1, 1, 0]);
    expect(applyPersonality({ ...AI_MEDIUM, ageUpReserve: [0, 0.5, 0.2, 0.1] }, 'boomer').ageUpReserve).toEqual([0, 1, 1, 0.1]);
    const turtle = applyPersonality(AI_MEDIUM, 'turtle');
    expect(turtle.minDefenders).toBe(9);
    expect(turtle.firstAttackMs).toEqual({ min: 450_000, max: 675_000 });
    expect(turtle.attackWave).toBe(17);
  });

  it('Hard turtle lowers turtleEnter', () => {
    const turtle = applyPersonality(AI_HARD, 'turtle');
    expect(turtle.stance.turtleEnter).toBe(AI_HARD.stance.turtleEnter * 0.5);
    expect(turtle.turtle.towers).toBe(AI_HARD.turtle.towers + 1);
    expect(turtle.stance.rushEnter).toBe(AI_HARD.stance.rushEnter);
    const rusher = applyPersonality(AI_HARD, 'rusher');
    expect(rusher.stance.rushEnter).toBe(AI_HARD.stance.rushEnter + 2);
    expect(rusher.stance.turtleEnter).toBe(AI_HARD.stance.turtleEnter);
    // Mesteri keeps its own fields (flank) through the overlay.
    expect(applyPersonality(AI_MASTER, 'boomer').flank).toEqual(AI_MASTER.flank);
  });

  it('only the turtle fortifies proactively (Hard family)', () => {
    expect(applyPersonality(AI_HARD, 'turtle').turtle.proactive).toBe(true);
    expect(applyPersonality(AI_MASTER, 'turtle').turtle.proactive).toBe(true);
    expect(applyPersonality(AI_HARD, 'rusher').turtle.proactive).toBeUndefined();
    expect(applyPersonality(AI_HARD, 'boomer').turtle.proactive).toBeUndefined();
    expect(AI_HARD.turtle.proactive).toBeUndefined();
  });

  it('the villager multiplier scales the Hard family\'s population-share sizing', () => {
    const boomer = applyPersonality(AI_HARD, 'boomer');
    expect(boomer.villagerShare.peace).toBeCloseTo(AI_HARD.villagerShare.peace * 1.15, 10);
    expect(boomer.villagerShare.war).toBeCloseTo(AI_HARD.villagerShare.war * 1.15, 10);
    const rusher = applyPersonality(AI_MASTER, 'rusher');
    expect(rusher.villagerShare.peace).toBeCloseTo(AI_MASTER.villagerShare.peace * 0.9, 10);
    expect(applyPersonality(AI_HARD, 'turtle').villagerShare).toEqual(AI_HARD.villagerShare);
    // Villagers wanted at age 2 (share × population target): boomer > base > rusher.
    const at2 = (t: typeof AI_HARD) => Math.round(t.villagerShare.peace * (t.populationTarget[2] ?? 0));
    expect(at2(boomer)).toBeGreaterThan(at2(AI_HARD));
    expect(at2(applyPersonality(AI_HARD, 'rusher'))).toBeLessThan(at2(AI_HARD));
  });

  it('no personality touches the Wonder play or its guards (Task 1)', () => {
    for (const id of PERSONALITIES) {
      for (const base of [AI_MEDIUM, AI_HARD, AI_MASTER]) {
        const t = applyPersonality(base, id);
        expect(t.wonder, id).toEqual(base.wonder);
        // Easier than the base would keep a boomer/turtle saving all game: the guard thresholds are the base's.
        expect(t.ageUpReserve[3], id).toBe(base.ageUpReserve[3]);
      }
    }
  });
});
