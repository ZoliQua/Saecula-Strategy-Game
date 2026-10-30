import { describe, expect, it } from 'vitest';
import type { Difficulty } from '../../game/GameSetupConfig';
import { createRng } from '../../map/random';
import { civUnitTypes } from '../../game/civUnits';
import type { CivId, UnitType } from '../../types';
import type { AIStrategy } from '../AIPlayer';
import { createHeadlessMatch } from '../testing/headlessMatch';
import { EasyStrategy } from './EasyStrategy';
import { HardStrategy } from './HardStrategy';
import { MediumStrategy } from './MediumStrategy';

const MIN = 60_000;
/** Wall-clock cap per six-player match (about 12-13 s each when the machine is idle). */
const SIM_TIMEOUT_MS = 90_000;

/**
 * M5 closing smoke without a browser (CLAUDE.md §9 M5): two 6-player
 * 96×96 matches whose line-ups cover all eight civs, every gameplay system
 * running. This pins that any civ in any slot runs through all three ages
 * without exceptions and within the 500-entity budget (units, buildings,
 * projectiles; CLAUDE.md §10). M8: every civ fields only its own roster,
 * and the age-1 unique units (legionary, cossack, sissi) take the field —
 * so the Italian and Russian sides hold Medium slots (Easy trains only
 * villagers and swordsmen, and is raided down early).
 *
 * Target rules as in threeAges.sim.test.ts: a head-on Medium-vs-Hard duel
 * ends before age 2, so each Medium or Hard side first raids its own Easy
 * neighbour (the Easy fights back at it); once every Medium and Hard side
 * is in the Enlightenment they turn on each other. A side whose target is
 * gone moves on to the next one alive.
 * Measured (seed 3, M8): run A — age 3 at 21.40 (IT), 19.05 (DE), 21.59
 * (RU) min; foundries and cannons for all three; legionaries and
 * cossacks; first cannonball at 22.93 min; at most 293 entities; ends at
 * 27.6 min; about 13 s. Run B — age 3 at 18.00 (EN), 18.39 (FI); foundries
 * and cannons for both; sissis; the first cannonball only at 32.95 min
 * (14.6 min into the late phase: longbowmen and sissis keep the duel
 * long), hence its 16-minute late window; at most 226 entities; ends at
 * 34.4 min; about 12 s. PRINT_SIM=1 prints the figures.
 */

interface Slot {
  readonly civ: CivId;
  readonly difficulty: Difficulty;
  /** Early target, then the late (all strong sides in age 3) target. */
  readonly early: readonly number[];
  readonly late: readonly number[];
}

/** The age-1 unique units (M8) and their civs. */
const AGE1_UNIQUES: readonly { readonly civ: CivId; readonly type: UnitType }[] = [
  { civ: 'italian', type: 'legionary' },
  { civ: 'russian', type: 'cossack' },
  { civ: 'finnish', type: 'sissi' },
];

function strategyFor(difficulty: Difficulty, seed: number): AIStrategy {
  if (difficulty === 'hard') return new HardStrategy(createRng(seed * 31 + 2));
  if (difficulty === 'medium') return new MediumStrategy(createRng(seed * 7 + 6));
  return new EasyStrategy(createRng(seed * 5 + 4));
}

interface RunResult {
  readonly civs: CivId[];
  readonly age3At: Map<number, number>;
  readonly maxEntities: number;
  readonly foundryOwners: Set<number>;
  readonly cannonOwners: Set<number>;
  readonly cannonballs: boolean;
  readonly firstCannonballMin: number;
  /** When every Medium and Hard side was in age 3 (the late phase started). */
  readonly lateMin: number;
  /** Unit types each player fielded (sampled during the run). */
  readonly fielded: Map<number, Set<UnitType>>;
  readonly endMin: number;
  readonly wallMs: number;
}

/** Plays a 6-player 96×96 meadow match with `slots` (slot 0 is the human, driven by an AI). */
function play(seed: number, slots: readonly Slot[], lateMin = 6): RunResult {
  const t0 = performance.now();
  let late = false;
  const [human, ...ais] = slots;
  if (!human) throw new Error('no human slot');
  const owns = (id: number) => match.world.entities.some((e) => (e.unit || e.building) && e.owner?.playerId === id);
  const target = (id: number): number => {
    const slot = slots[id - 1];
    const prefs = slot ? (late ? slot.late : slot.early) : [1];
    return prefs.find(owns) ?? prefs[0] ?? 1;
  };
  const match = createHeadlessMatch({
    seed,
    size: 96,
    aiCount: ais.length,
    civs: { human: human.civ, ais: ais.map((s) => s.civ) },
    strategy: (id) => strategyFor(slots[id - 1]?.difficulty ?? 'easy', seed + id),
    difficulty: (id) => slots[id - 1]?.difficulty ?? 'easy',
    enemyOf: target,
    humanStrategy: strategyFor(human.difficulty, seed + 1),
    humanEnemy: () => target(1),
  });
  const strong = slots.map((s, i) => (s.difficulty === 'easy' ? 0 : i + 1)).filter((id) => id > 0);
  const live = () => match.world.entities.filter((e) => e.unit || e.building || e.projectile).length;
  const age3At = new Map<number, number>();
  const cannonOwners = new Set<number>();
  // Sampled during the run, like cannonOwners: a foundry razed before the end still counts.
  const foundryOwners = new Set<number>();
  const fielded = new Map<number, Set<UnitType>>();
  let maxEntities = 0;
  let firstCannonballAt = Infinity;
  let lateAt = Infinity;
  match.run(45 * MIN, 100, (t) => {
    maxEntities = Math.max(maxEntities, live());
    for (const p of match.players.all()) if (p.age >= 3 && !age3At.has(p.id)) age3At.set(p.id, t);
    for (const e of match.world.entities) {
      if (e.projectile?.kind === 'cannonball' && firstCannonballAt === Infinity) firstCannonballAt = t;
      if (e.unit?.unitType === 'cannon') cannonOwners.add(e.owner?.playerId ?? 0);
      if (e.unit && e.owner) {
        const types = fielded.get(e.owner.playerId) ?? new Set<UnitType>();
        fielded.set(e.owner.playerId, types.add(e.unit.unitType));
      }
      if (e.building?.type === 'foundry' && !e.underConstruction) foundryOwners.add(e.owner?.playerId ?? 0);
    }
    if (!late && strong.every((id) => age3At.has(id))) {
      late = true;
      lateAt = t;
    }
    return late && t >= lateAt + lateMin * MIN;
  });
  return {
    civs: match.players.all().map((p) => p.civ),
    age3At,
    maxEntities,
    foundryOwners,
    cannonOwners,
    cannonballs: firstCannonballAt < Infinity,
    firstCannonballMin: +(firstCannonballAt / MIN).toFixed(2),
    lateMin: +(lateAt / MIN).toFixed(2),
    fielded,
    endMin: +(match.timeMs() / MIN).toFixed(2),
    wallMs: Math.round(performance.now() - t0),
  };
}

function expectRun(r: RunResult, slots: readonly Slot[]): void {
  expect(r.civs).toEqual(slots.map((s) => s.civ));
  expect(r.maxEntities).toBeLessThanOrEqual(500);
  slots.forEach((s, i) => {
    if (s.difficulty === 'easy') return;
    expect(r.age3At.get(i + 1) ?? Infinity, `${s.civ} (${s.difficulty}) reaches age 3`).toBeLessThan(30 * MIN);
  });
  expect(r.foundryOwners.size, 'foundries').toBeGreaterThan(0);
  expect(r.cannonOwners.size, 'cannons').toBeGreaterThan(0);
  expect(r.cannonballs, 'cannonballs fired').toBe(true);
  // M8: every civ fields only its own roster, and the age-1 unique units in the line-up take the field.
  slots.forEach((s, i) => {
    const fielded = [...(r.fielded.get(i + 1) ?? [])];
    expect(fielded.filter((t) => !civUnitTypes(s.civ).includes(t)), `${s.civ} outside its roster`).toEqual([]);
  });
  for (const unique of AGE1_UNIQUES.filter((u) => slots.some((s) => s.civ === u.civ))) {
    const id = slots.findIndex((s) => s.civ === unique.civ) + 1;
    expect(r.fielded.get(id)?.has(unique.type), `${unique.civ} trains ${unique.type}`).toBe(true);
  }
  if (!process.env['PRINT_SIM']) return;
  const age3Min = Object.fromEntries([...r.age3At].map(([id, t]) => [id, +(t / MIN).toFixed(2)]));
  const fielded = Object.fromEntries([...r.fielded].map(([id, types]) => [id, [...types]]));
  console.log(JSON.stringify({ ...r, age3At: age3Min, foundryOwners: [...r.foundryOwners], cannonOwners: [...r.cannonOwners], fielded }));
}

describe('eight-civ headless matches (96×96 meadow, 6 players each)', () => {
  it('run A: Italian Medium vs German Hard, Russian Medium and French, Hungarian, Spanish Easy', () => {
    // 1 raids 3, 2 raids 5, 4 raids 6; then 1 and 4 turn on 2, 2 on 1.
    const slots: Slot[] = [
      { civ: 'italian', difficulty: 'medium', early: [3, 5, 6], late: [2, 4] },
      { civ: 'german', difficulty: 'hard', early: [5, 3, 6], late: [1, 4] },
      { civ: 'french', difficulty: 'easy', early: [1, 2], late: [1, 2] },
      { civ: 'russian', difficulty: 'medium', early: [6, 5, 3], late: [2, 1] },
      { civ: 'hungarian', difficulty: 'easy', early: [2, 1], late: [2, 1] },
      { civ: 'spanish', difficulty: 'easy', early: [4, 2], late: [4, 2] },
    ];
    expectRun(play(3, slots), slots);
  }, SIM_TIMEOUT_MS);

  it('run B: English Medium vs Finnish Hard and four Easy (Hungarian, German, French, Spanish)', () => {
    // 1 raids 3, 2 raids 4; then 1 and 2 duel.
    const slots: Slot[] = [
      { civ: 'english', difficulty: 'medium', early: [3, 5, 6], late: [2] },
      { civ: 'finnish', difficulty: 'hard', early: [4, 6, 5], late: [1] },
      { civ: 'hungarian', difficulty: 'easy', early: [1, 2], late: [1, 2] },
      { civ: 'german', difficulty: 'easy', early: [2, 1], late: [2, 1] },
      { civ: 'french', difficulty: 'easy', early: [1, 2], late: [1, 2] },
      { civ: 'spanish', difficulty: 'easy', early: [2, 1], late: [2, 1] },
    ];
    expectRun(play(3, slots, 16), slots);
  }, SIM_TIMEOUT_MS);
});
