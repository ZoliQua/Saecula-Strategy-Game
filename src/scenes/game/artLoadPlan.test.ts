import { describe, expect, it } from 'vitest';
import { BUILDING_SPECS } from '../../ecs/archetypes/building';
import { BUILDING_BALANCE } from '../../config/balance';
import { COMMON_WALL_PIECES } from '../../iso/art/walls/commonWallPieces';
import type { BuildingType, CivId } from '../../types';
import { ART_EVICT_AFTER_LOAD_MS, ART_EVICT_INTERVAL_MS } from '../../config/visual';
import { ageUpArtJobs, BackgroundArt, civBaseOwners, evictionTimer, planArtLoad, prewarmUnitTypes, type AgeSpan, type ArtPainters } from './artLoadPlan';

const ALL_TYPES = Object.keys(BUILDING_SPECS) as BuildingType[];
const AGE1_TYPES = ALL_TYPES.filter((t) => BUILDING_BALANCE[t].age === 1);

/** Test painters: each paint is logged as 'building <type> <civ> <owner>', 'wall <piece> <age> <civ>' or 'unit <type> <civ>'. */
function recordingPainters(log: string[]): ArtPainters {
  return {
    building: (type, civ, owner) => log.push(`building ${type} ${civ} ${owner}`),
    wall: (piece, age, civ) => log.push(`wall ${piece} ${age} ${civ}`),
    unit: (type, civ) => log.push(`unit ${type} ${civ}`),
  };
}

/** Civ -> base owner: player 1 for the first civ, then 2, 3, ... */
const ownersOf = (civs: readonly CivId[]): Map<CivId, number> => new Map(civs.map((c, i) => [c, i + 1]));

function recordPlan(human: 'hungarian' | 'english', civs: Array<'hungarian' | 'english'>) {
  const painted: string[] = [];
  const plan = planArtLoad(human, ownersOf(civs), {
    building: (type, civ) => painted.push(`b:${type}:${civ}`),
    wall: (piece, age, civ) => painted.push(`w:${piece}:${age}:${civ}`),
    unit: () => {},
  });
  const run = (jobs: ReadonlyArray<() => void>) => {
    const from = painted.length;
    for (const job of jobs) job();
    return painted.slice(from);
  };
  return { critical: run(plan.critical), background: run(plan.background) };
}

describe('N-civ art budget (M5 Task 1)', () => {
  it('AI-only civs prewarm only age-1 unit types', () => {
    expect(prewarmUnitTypes('english', 'hungarian').sort()).toEqual(['archer', 'scout', 'swordsman', 'villager']);
    expect(prewarmUnitTypes('hungarian', 'hungarian')).toHaveLength(10);
  });

  it('age-up jobs paint that age’s unit sheets and the next age’s wall pieces', () => {
    const log: string[] = [];
    ageUpArtJobs('english', 2, recordingPainters(log)).forEach((j) => j());
    expect(log.filter((l) => l.startsWith('unit')).sort()).toEqual(['unit crossbowman english', 'unit knight english', 'unit pikeman english']);
    expect(log.some((l) => l.startsWith('wall') && l.includes(' 3 english'))).toBe(true);
  });

  it('age-up jobs to the last age paint its unit sheets and no wall pieces', () => {
    const log: string[] = [];
    ageUpArtJobs('english', 3, recordingPainters(log)).forEach((j) => j());
    expect(log.sort()).toEqual(['unit cannon english', 'unit cavalry english', 'unit musketeer english']);
  });

  it('base owner: the human for the human civ, else the lowest player id of the civ', () => {
    const players = [
      { id: 1, civ: 'english', isHuman: false },
      { id: 4, civ: 'hungarian', isHuman: false },
      { id: 2, civ: 'hungarian', isHuman: true },
      { id: 5, civ: 'german', isHuman: false },
      { id: 3, civ: 'german', isHuman: false },
    ] as const;
    expect([...civBaseOwners(players)].sort()).toEqual([['english', 1], ['german', 3], ['hungarian', 2]]);
  });

  it('BackgroundArt.enqueue appends jobs after the queued ones, also once the queue ran dry', () => {
    const ran: number[] = [];
    const bg = new BackgroundArt([() => ran.push(0)], { startDelayMs: 0, maxFrameWorkMs: 5, everyFrames: 1, now: () => 0 });
    bg.enqueue([() => ran.push(1)]);
    bg.update(16, 0);
    bg.update(16, 0);
    expect(bg.done).toBe(true);
    bg.enqueue([() => ran.push(2), () => ran.push(2)]);
    expect(bg.done).toBe(false);
    bg.update(16, 0);
    bg.update(16, 0);
    expect(ran).toEqual([0, 1, 2, 2]);
  });

  it('bases are painted for each civ’s base owner', () => {
    const log: string[] = [];
    planArtLoad('hungarian', new Map([['hungarian', 1], ['english', 3]]), recordingPainters(log)).critical.forEach((j) => j());
    expect(log).toContain('building house english 3');
    expect(log.filter((l) => l.startsWith('building') && l.endsWith('english 1'))).toEqual([]);
  });
});

describe('planArtLoad', () => {
  it("paints every age-1 building of the human's civ (the build menu shows them all) behind the loading card", () => {
    const { critical } = recordPlan('english', ['english']);
    expect(critical.filter((p) => p.startsWith('b:')).sort()).toEqual(ALL_TYPES.map((t) => `b:${t}:english`).sort());
  });

  it('paints only the age-1 buildable types of an AI-only civ (later types are painted in their own age style when built)', () => {
    const { critical } = recordPlan('english', ['english', 'hungarian']);
    const hungarian = critical.filter((p) => p.startsWith('b:') && p.endsWith(':hungarian'));
    expect(hungarian.sort()).toEqual(AGE1_TYPES.map((t) => `b:${t}:hungarian`).sort());
    expect(AGE1_TYPES.length).toBeLessThan(ALL_TYPES.length);
  });

  it('paints the age-1 common wall pieces of each civ while loading, age 2 in the game and age 3 only after an age-up', () => {
    const { critical, background } = recordPlan('hungarian', ['hungarian', 'english']);
    const walls = (list: string[], age: number, civ: string) => list.filter((p) => p.startsWith('w:') && p.endsWith(`:${age}:${civ}`));
    for (const civ of ['hungarian', 'english']) {
      expect(walls(critical, 1, civ)).toHaveLength(COMMON_WALL_PIECES.length);
      expect(walls(critical, 2, civ)).toHaveLength(0);
      expect(walls(background, 2, civ)).toHaveLength(COMMON_WALL_PIECES.length);
      expect(walls(background, 3, civ)).toHaveLength(0);
    }
    expect(background.filter((p) => p.startsWith('w:')).every((p) => p.includes(':2:'))).toBe(true);
  });
});

describe('planArtLoad for a loaded save (age spans)', () => {
  const owners = ownersOf(['hungarian', 'english']);
  const run = (spans?: ReadonlyMap<CivId, AgeSpan>) => {
    const log: string[] = [];
    const plan = planArtLoad('hungarian', owners, recordingPainters(log), spans);
    plan.critical.forEach((j) => j());
    const critical = [...log];
    plan.background.forEach((j) => j());
    return { critical, background: log.slice(critical.length) };
  };
  const span = (min: 1 | 2 | 3, max: 1 | 2 | 3): AgeSpan => ({ min, max });
  const wallAges = (list: string[], civ: string) =>
    [...new Set(list.filter((l) => l.startsWith('wall') && l.endsWith(` ${civ}`)).map((l) => Number(l.split(' ')[2])))].sort();
  const units = (list: string[], civ: string) => list.filter((l) => l.startsWith('unit') && l.endsWith(` ${civ}`)).sort();

  it('a civ entirely at age 3 queues no age-1/age-2 walls; its age-2/3 unit sheets and age-3 walls load', () => {
    const { critical, background } = run(new Map([['hungarian', span(1, 1)], ['english', span(3, 3)]]));
    expect(wallAges(critical, 'english')).toEqual([3]);
    expect(wallAges(background, 'english')).toEqual([]);
    expect(critical.filter((l) => l.startsWith('wall') && l.endsWith(' 3 english'))).toHaveLength(COMMON_WALL_PIECES.length);
    expect(units(critical, 'english')).toEqual(
      ['unit cannon english', 'unit cavalry english', 'unit crossbowman english', 'unit knight english', 'unit musketeer english', 'unit pikeman english'],
    );
  });

  it('a mixed civ at ages 1 and 3 queues walls of ages 1..3 (all shown now) and no next age', () => {
    const { critical, background } = run(new Map([['hungarian', span(1, 3)], ['english', span(1, 1)]]));
    expect(wallAges(critical, 'hungarian')).toEqual([1, 2, 3]);
    expect(wallAges(background, 'hungarian')).toEqual([]);
  });

  it('a civ at age 2 paints its age-2 walls while loading and its age-3 walls (next) in the background', () => {
    const { critical, background } = run(new Map([['hungarian', span(1, 1)], ['english', span(2, 2)]]));
    expect(wallAges(critical, 'english')).toEqual([2]);
    expect(wallAges(background, 'english')).toEqual([3]);
    expect(units(critical, 'english')).toEqual(['unit crossbowman english', 'unit knight english', 'unit pikeman english']);
  });

  it('a civ at age 1 keeps today’s walls (age 1 loading, age 2 in the background); buildings unchanged', () => {
    const today = run();
    const { critical, background } = run(new Map([['hungarian', span(1, 1)], ['english', span(3, 3)]]));
    expect(wallAges(critical, 'hungarian')).toEqual([1]);
    expect(wallAges(background, 'hungarian')).toEqual([2]);
    const buildings = (list: string[]) => list.filter((l) => l.startsWith('building'));
    expect(buildings(critical)).toEqual(buildings(today.critical));
    expect(buildings(background)).toEqual(buildings(today.background));
  });

  it('no spans (a new match) keeps today’s plan', () => {
    const today = run();
    expect(wallAges(today.critical, 'english')).toEqual([1]);
    expect(wallAges(today.background, 'english')).toEqual([2]);
    expect(today.critical.some((l) => l.startsWith('unit'))).toBe(false);
  });
});

describe('planArtLoad background buildings', () => {
  it('queues the foundry and Wonder of an AI-only civ in the background (after the walls) instead of dropping them', () => {
    const { critical, background } = recordPlan('hungarian', ['hungarian', 'english']);
    expect(background.filter((p) => p.startsWith('b:'))).toEqual(['b:foundry:english', 'b:wonder:english']);
    expect(critical.some((p) => p === 'b:foundry:english' || p === 'b:wonder:english')).toBe(false);
    expect(background.findIndex((p) => p.startsWith('b:'))).toBeGreaterThan(background.map((p) => p.startsWith('w:')).lastIndexOf(true));
  });
});

describe('BackgroundArt', () => {
  const clock = (start = 0) => {
    let t = start;
    return { now: () => t, advance: (ms: number) => (t += ms) };
  };

  it('reports each drain once: the first eviction runs when the queue empties (texture peak)', () => {
    const c = clock();
    let drained = 0;
    const ran: number[] = [];
    const bg = new BackgroundArt([0, 1].map((i) => () => ran.push(i)), {
      startDelayMs: 0,
      maxFrameWorkMs: 5,
      everyFrames: 1,
      now: c.now,
      onDrained: () => drained++,
    });
    bg.update(16, c.now());
    expect(drained).toBe(0);
    bg.update(16, c.now());
    expect(ran).toEqual([0, 1]);
    expect(drained).toBe(1);
    bg.update(16, c.now());
    expect(drained).toBe(1);
    bg.enqueue([() => ran.push(2)]);
    bg.update(16, c.now());
    expect(drained).toBe(2);
  });

  it('a job that re-enqueues itself (a unit sheet deferred to a later frame) is not a drain', () => {
    const c = clock();
    let drained = 0;
    let tries = 0;
    const bg: BackgroundArt = new BackgroundArt([() => (++tries < 2 ? bg.enqueue([() => tries++]) : undefined)], {
      startDelayMs: 0,
      maxFrameWorkMs: 5,
      everyFrames: 1,
      now: c.now,
      onDrained: () => drained++,
    });
    bg.update(16, c.now());
    expect(drained).toBe(0);
    bg.update(16, c.now());
    expect(drained).toBe(1);
  });

  it('waits out the start delay, then runs one job per eligible frame', () => {
    const c = clock();
    const ran: number[] = [];
    const bg = new BackgroundArt([0, 1, 2].map((i) => () => ran.push(i)), { startDelayMs: 1000, maxFrameWorkMs: 5, everyFrames: 1, now: c.now });
    bg.update(16, c.now());
    expect(ran).toEqual([]);
    bg.update(1000, c.now());
    expect(ran).toEqual([0]);
    bg.update(16, c.now());
    expect(ran).toEqual([0, 1]);
    bg.update(16, c.now());
    bg.update(16, c.now());
    expect(ran).toEqual([0, 1, 2]);
    expect(bg.done).toBe(true);
  });

  it('skips a frame whose own work already exceeded the budget, and paces jobs every N frames', () => {
    const c = clock();
    const ran: number[] = [];
    const bg = new BackgroundArt([0, 1, 2].map((i) => () => ran.push(i)), { startDelayMs: 0, maxFrameWorkMs: 5, everyFrames: 2, now: c.now });
    const frameStart = c.now();
    c.advance(8);
    bg.update(16, frameStart);
    expect(ran).toEqual([]);
    for (let i = 0; i < 4; i++) bg.update(16, c.now());
    expect(ran).toEqual([0, 1]);
  });

  it('still runs a job after forceAfterFrames busy frames (slow machines do not starve the queue)', () => {
    const c = clock();
    const ran: number[] = [];
    const bg = new BackgroundArt([0, 1].map((i) => () => ran.push(i)), { startDelayMs: 0, maxFrameWorkMs: 5, everyFrames: 1, forceAfterFrames: 3, now: c.now });
    const busy = () => {
      const start = c.now();
      c.advance(10);
      bg.update(16, start);
    };
    busy();
    busy();
    expect(ran).toEqual([]);
    busy();
    expect(ran).toEqual([0]);
    busy();
    expect(ran).toEqual([0]);
  });

  it('records the slowest job (diagnostics)', () => {
    const c = clock();
    const bg = new BackgroundArt([() => c.advance(7), () => c.advance(3)], { startDelayMs: 0, maxFrameWorkMs: 5, everyFrames: 1, now: c.now });
    bg.update(16, c.now());
    bg.update(16, c.now());
    expect(bg.stats).toEqual({ jobs: 2, maxJobMs: 7, totalMs: 10 });
  });
});

describe('evictionTimer', () => {
  it('a new match evicts first after a full interval', () => {
    expect(evictionTimer(false)).toEqual({ delay: ART_EVICT_INTERVAL_MS, startAt: 0 });
  });

  it('a loaded match evicts first right after its first frames, then every interval', () => {
    const t = evictionTimer(true);
    expect(t.delay).toBe(ART_EVICT_INTERVAL_MS);
    // Phaser fires a looping TimerEvent first when elapsed (starting at startAt) reaches delay.
    expect(t.delay - t.startAt).toBe(ART_EVICT_AFTER_LOAD_MS);
    expect(ART_EVICT_AFTER_LOAD_MS).toBeGreaterThan(0);
    expect(ART_EVICT_AFTER_LOAD_MS).toBeLessThan(5_000);
  });
});
