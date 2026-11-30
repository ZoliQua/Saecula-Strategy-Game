import { describe, expect, it } from 'vitest';
import { MISSIONS, TUTORIAL_ID } from '../../campaign/missions';
import { AI_MEDIUM } from '../../config/aiMedium';
import { ObjectiveTracker } from '../../campaign/ObjectiveTracker';
import { queueUnit } from '../../ecs/queueUnit';
import { startRepair } from '../../game/repair';
import { VictoryChecker } from '../../game/VictoryChecker';
import { createRng } from '../../map/random';
import { aiTrainAccount } from '../economy';
import { createHeadlessMatch } from '../testing/headlessMatch';
import { EasyStrategy } from './EasyStrategy';
import { MediumStrategy } from './MediumStrategy';

const MIN = 60_000;
const SIM_TIMEOUT_MS = 300_000;
const REPAIR_STEP = MISSIONS.tutorial.objectives.findIndex((o) => o.kind === 'repaired');
const SWORD_STEP = MISSIONS.tutorial.objectives.findIndex((o) => o.kind === 'ownUnits' && o.unit === 'swordsman');

/*
 * M18: the tutorial's steps can be reached in order by a Medium AI playing
 * the human slot. Two steps get the orders a player following the hints
 * would give, because the Medium AI does not take them by itself in time:
 * the swordsmen (its army mix favours other units: on its turn the test
 * queues swordsmen at the human's barracks, paid from the human's own
 * stock, until three are trained or queued) and the repair (on its turn
 * the test sends one villager to the damaged house with startRepair; the
 * human-slot AI's own repair play is switched off, so the step is the
 * test's, as it is the player's in the tutorial).
 */

describe('tutorial mission (M18)', () => {
  it(
    'a Medium player in the human slot reaches every step in order within 30 minutes (the test performs the repair step); the mission is won',
    () => {
      const s = MISSIONS.tutorial.setup;
      const match = createHeadlessMatch({
        mission: TUTORIAL_ID,
        seed: s.seed,
        size: 64,
        aiCount: s.aiCount,
        strategy: () => new EasyStrategy(createRng(4)),
        difficulty: () => s.difficulty,
        // The human-slot AI does not repair by itself (maxVillagers 0): the repair step is the test's.
        humanStrategy: new MediumStrategy(createRng(11), { ...AI_MEDIUM, repair: { ...AI_MEDIUM.repair, maxVillagers: 0 } }),
        humanEnemy: () => 2,
      });
      const tracker = new ObjectiveTracker(MISSIONS.tutorial.objectives, [], true);
      const doneAt: number[] = [];
      let repairOrdered = false;
      match.run(30 * MIN, 100, (t) => {
        if (Math.round(t) % 1000 !== 0) return;
        const h = match.players.human()!;
        const st = match.stats.of(h.id);
        const fresh = tracker.update({ entities: match.world.entities, humanId: h.id, humanAge: h.age, humanDefeated: h.defeated, timeMs: t, gatheredBy: { ...st.gatheredBy }, repairsDone: st.repairsDone });
        for (const i of fresh) doneAt[i] = t;
        if (tracker.current() === SWORD_STEP) {
          const own = match.world.entities.filter((e) => e.owner?.playerId === 1);
          const barracks = own.find((e) => e.building?.type === 'barracks' && !e.underConstruction && !e.dying);
          const have = own.filter((e) => e.unit?.unitType === 'swordsman' && !e.dying).length;
          const queued = own.reduce((n, e) => n + (e.trainingQueue?.entries.filter((q) => q.unitType === 'swordsman').length ?? 0), 0);
          if (barracks && have + queued < 3) queueUnit(barracks, 'swordsman', h, aiTrainAccount(match.world, h));
        }
        if (tracker.current() === REPAIR_STEP && !repairOrdered) {
          const house = match.world.entities.find((e) => e.building?.type === 'house' && e.owner?.playerId === 1 && e.health && e.health.current < e.health.max);
          const v = match.world.entities.find((e) => e.unit?.unitType === 'villager' && e.owner?.playerId === 1 && !e.dying);
          if (house && v) {
            startRepair(match.world, v, house);
            repairOrdered = true;
          }
        }
        return tracker.complete();
      });
      expect(repairOrdered).toBe(true);
      // Each step completes no earlier than the one before it.
      expect(doneAt.every((t, i) => i === 0 || t >= (doneAt[i - 1] ?? Infinity))).toBe(true);
      expect(tracker.done).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
      expect(match.timeMs()).toBeLessThan(30 * MIN);
      expect(new VictoryChecker(match.world, match.players, null, null, tracker).check()).toMatchObject({ kind: 'victory', winnerId: 1, cause: 'mission' });
    },
    SIM_TIMEOUT_MS,
  );
});
