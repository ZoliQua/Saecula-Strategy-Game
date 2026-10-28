import { describe, expect, it } from 'vitest';
import { AI_HARD, AI_MASTER, AI_MEDIUM } from '../config/aiBalance';
import { createPlayer } from '../game/Player';
import { createStatefulRng } from '../map/random';
import { AIPlayer } from './AIPlayer';
import { ArmyControl } from './ArmyControl';
import { WonderSiteCheck } from './decisions/wonder';
import { FlankControl } from './FlankControl';
import { HarassControl } from './HarassControl';
import { Perception } from './perception';
import { PressureControl, type PressureActions } from './PressureControl';
import { EasyStrategy } from './strategies/EasyStrategy';
import { HardStrategy } from './strategies/HardStrategy';
import { MasterStrategy } from './strategies/MasterStrategy';
import { MediumStrategy } from './strategies/MediumStrategy';
import { NullStrategy } from './strategies/NullStrategy';
import { ThoughtLog } from './thoughts';
import { WonderPlay, type WonderActions } from './WonderPlay';

/**
 * Field inventory guard: every own field of each class whose state a saved
 * game carries is listed here as saved or excluded (with the reason). A
 * new field fails this test until someone decides whether the snapshot
 * needs it (M6 Task 3; the snapshot round-trip tests cannot see a field
 * the snapshot leaves out).
 */
type Inventory = Record<string, 'saved' | `excluded: ${string}`>;

const CONFIG = 'excluded: constructor input (tuning, callbacks, shared objects), rebuilt with the strategy';
const RNG = 'excluded: shared rng.next; its state is AIPlayerState.rngState';
const LOG = 'excluded: dev ThoughtLog overlay (M6 decision 4)';

const BASE: Inventory = {
  name: 'excluded: constant',
  rng: RNG,
  decisionMs: CONFIG,
  log: LOG,
  nextUpkeepMs: 'saved',
  nextDecisionMs: 'saved',
  perception: 'saved',
};
const MEDIUM: Inventory = {
  ...BASE,
  tune: CONFIG,
  army: 'saved',
  wonder: 'saved',
  pressure: 'saved',
  firstAttackAtMs: 'saved',
  lastScoutMs: 'saved',
};
const HARD: Inventory = {
  ...MEDIUM,
  hard: CONFIG,
  harass: 'saved',
  stance: 'saved',
  aggression: 'saved',
  sensedAtMs: 'saved',
  threatFrom: 'saved',
  wallLinesLaid: 'saved',
  rebalancedAtMs: 'saved',
};

function cases(): [string, object, Inventory][] {
  const rng = createStatefulRng(1);
  const log = new ThoughtLog();
  const army = new ArmyControl(log, rng.next);
  const noPressure = {} as PressureActions;
  const noWonder = {} as WonderActions;
  return [
    ['Perception', new Perception(), { memory: 'saved', sightings: 'saved', villagerMemory: 'saved', lastMs: 'saved' }],
    ['ArmyControl', army, { wave: 'saved', waveTarget: 'saved', exploreGoal: 'saved', log: LOG, rng: RNG, isReserved: CONFIG }],
    ['HarassControl', new HarassControl(log, AI_HARD.harass), { raid: 'saved', target: 'saved', raidsSent: 'saved', endedAtMs: 'saved', log: LOG, tune: CONFIG }],
    ['FlankControl', new FlankControl(log, AI_MASTER.flank), { flank: 'saved', reorders: 'saved', goal: 'saved', launched: 'saved', log: LOG, tune: CONFIG }],
    ['PressureControl', new PressureControl(AI_MEDIUM, army, noPressure), { sentFlag: 'saved', raidOutSinceMs: 'saved', tune: CONFIG, army: CONFIG, act: CONFIG }],
    ['WonderSiteCheck', new WonderSiteCheck(1), { nextSearchMs: 'saved', found: 'saved', retryMs: CONFIG }],
    ['WonderPlay', new WonderPlay(AI_MEDIUM.wonder, noWonder), { site: 'saved', tune: CONFIG, act: CONFIG }],
    [
      'AIPlayer',
      new AIPlayer(createPlayer({ id: 2 }), new NullStrategy(), { rng }),
      {
        elapsedMs: 'saved',
        fogDelayMs: 'saved',
        fogSystem: 'excluded: rebuilt on the first tick; only its scan phase is saved (AIPlayerState.fogSinceScanMs)',
        pendingSinceScanMs: 'saved',
        strategy: 'saved',
        rng: 'saved',
        fogData: 'excluded: saved through SystemRunner.fogs() / FogOfWarData.load',
        player: 'excluded: saved by the players block',
      },
    ],
    ['NullStrategy', new NullStrategy(), { name: 'excluded: constant' }],
    ['EasyStrategy', new EasyStrategy(rng.next), { ...BASE, army: 'saved', ageUpFromMs: 'saved', firstAttackAtMs: 'saved' }],
    ['MediumStrategy', new MediumStrategy(rng.next), MEDIUM],
    ['HardStrategy', new HardStrategy(rng.next), HARD],
    ['MasterStrategy', new MasterStrategy(rng.next), { ...HARD, master: CONFIG, flank: 'saved' }],
  ];
}

describe('AI snapshot field inventory', () => {
  for (const [name, instance, inventory] of cases()) {
    it(`${name}: every own field is saved or explicitly excluded`, () => {
      expect(Object.keys(instance).sort()).toEqual(Object.keys(inventory).sort());
    });
  }
});
