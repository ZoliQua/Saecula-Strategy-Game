import { describe, expect, it } from 'vitest';
import { BUILDING_SPECS } from '../../ecs/archetypes/building';
import { BUILDING_BALANCE } from '../../config/balance';
import { COMMON_WALL_PIECES } from '../../iso/art/walls/commonWallPieces';
import type { BuildingType } from '../../types';
import { BackgroundArt, planArtLoad } from './artLoadPlan';

const ALL_TYPES = Object.keys(BUILDING_SPECS) as BuildingType[];
const AGE1_TYPES = ALL_TYPES.filter((t) => BUILDING_BALANCE[t].age === 1);

function recordPlan(human: 'hungarian' | 'english', civs: Array<'hungarian' | 'english'>) {
  const painted: string[] = [];
  const plan = planArtLoad(human, civs, {
    building: (type, civ) => painted.push(`b:${type}:${civ}`),
    wall: (piece, age, civ) => painted.push(`w:${piece}:${age}:${civ}`),
  });
  const run = (jobs: ReadonlyArray<() => void>) => {
    const from = painted.length;
    for (const job of jobs) job();
    return painted.slice(from);
  };
  return { critical: run(plan.critical), background: run(plan.background) };
}

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

  it('paints the age-1 common wall pieces of each civ while loading and leaves ages 2-3 to the game', () => {
    const { critical, background } = recordPlan('hungarian', ['hungarian', 'english']);
    const walls = (list: string[], age: number, civ: string) => list.filter((p) => p.startsWith('w:') && p.endsWith(`:${age}:${civ}`));
    for (const civ of ['hungarian', 'english']) {
      expect(walls(critical, 1, civ)).toHaveLength(COMMON_WALL_PIECES.length);
      expect(walls(critical, 2, civ)).toHaveLength(0);
      expect(walls(background, 2, civ)).toHaveLength(COMMON_WALL_PIECES.length);
      expect(walls(background, 3, civ)).toHaveLength(COMMON_WALL_PIECES.length);
    }
    expect(background.every((p) => p.startsWith('w:'))).toBe(true);
    // Age 2 comes first: it is needed first.
    const lastAge2 = background.map((p) => p.includes(':2:')).lastIndexOf(true);
    expect(background.findIndex((p) => p.includes(':3:'))).toBeGreaterThan(lastAge2);
  });
});

describe('BackgroundArt', () => {
  const clock = (start = 0) => {
    let t = start;
    return { now: () => t, advance: (ms: number) => (t += ms) };
  };

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
