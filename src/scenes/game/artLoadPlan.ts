import { civUnitTypes } from '../../game/civUnits';
import { BUILDING_BALANCE, UNIT_BALANCE } from '../../config/balance';
import {
  BACKGROUND_ART_EVERY_FRAMES,
  BACKGROUND_ART_FORCE_AFTER_FRAMES,
  BACKGROUND_ART_MAX_FRAME_WORK_MS,
  BACKGROUND_ART_START_DELAY_MS,
} from '../../config/constants';
import { ART_EVICT_AFTER_LOAD_MS, ART_EVICT_INTERVAL_MS } from '../../config/visual';
import { BUILDING_SPECS } from '../../ecs/archetypes/building';
import { COMMON_WALL_PIECES } from '../../iso/art/walls/commonWallPieces';
import type { AgeId, BuildingType, CivId, UnitType } from '../../types';

/** Paints (and registers) one texture; textures already present are cache hits. */
export interface ArtPainters {
  /** A building type's age-1 base, in the colour of `owner` (its civ's base owner). */
  building(type: BuildingType, civ: CivId, owner: number): void;
  wall(piece: number, age: AgeId, civ: CivId): void;
  /** A unit type's sheet (allocation + first idle frames). */
  unit(type: UnitType, civ: CivId): void;
}

/**
 * Unit sheets painted while loading: every type for the human's civ (the
 * HUD and the build/train panels show them), only the age-1 types for an
 * AI-only civ; its later sheets follow its age-ups (ageUpArtJobs) and a
 * unit trained before that is painted on demand (unitArt).
 */
export function prewarmUnitTypes(civ: CivId, human: CivId): UnitType[] {
  const types = civUnitTypes(civ);
  return civ === human ? types : types.filter((t) => UNIT_BALANCE[t].age === 1);
}

/** The unit sheets of the types introduced in `age`. */
function unitArtJobs(civ: CivId, age: AgeId, paint: ArtPainters): Array<() => void> {
  return civUnitTypes(civ).filter((t) => UNIT_BALANCE[t].age === age).map((t) => () => paint.unit(t, civ));
}

/**
 * Background jobs when the first player of `civ` reaches `age`: the unit
 * sheets of that age's types and the civ's common wall pieces of the
 * next age (the one its owners can show next).
 */
export function ageUpArtJobs(civ: CivId, age: AgeId, paint: ArtPainters): Array<() => void> {
  const jobs = unitArtJobs(civ, age, paint);
  if (age < 3) {
    const next = (age + 1) as AgeId;
    for (const piece of COMMON_WALL_PIECES) jobs.push(() => paint.wall(piece, next, civ));
  }
  return jobs;
}

/**
 * Base owner of each civ in a match: the human's id for the human's civ,
 * otherwise the lowest player id of that civ. Building bases are painted
 * in that player's colour, so no civ keeps a base nobody shows.
 */
export function civBaseOwners(players: ReadonlyArray<{ readonly id: number; readonly civ: CivId; readonly isHuman: boolean }>): Map<CivId, number> {
  const owners = new Map<CivId, number>();
  for (const p of [...players].sort((a, b) => Number(b.isHuman) - Number(a.isHuman) || a.id - b.id)) {
    if (!owners.has(p.civ)) owners.set(p.civ, p.id);
  }
  return owners;
}

/** The ages a civ's living players are in (a loaded save): lowest and highest. */
export interface AgeSpan {
  readonly min: AgeId;
  readonly max: AgeId;
}

/** Ages whose common wall pieces a civ's owners show now or next (keepWallKeys): min..max+1, at most 3. */
function shownWallAges({ min, max }: AgeSpan): AgeId[] {
  const out: AgeId[] = [];
  for (let a = min; a <= Math.min(max + 1, 3); a++) out.push(a as AgeId);
  return out;
}

export interface ArtLoadPlan {
  /** Run behind the loading card: everything the first game frames can show. */
  readonly critical: ReadonlyArray<() => void>;
  /** Run during play, a job at a time in spare frame time (BackgroundArt). */
  readonly background: ReadonlyArray<() => void>;
}

/** Age-3 single-style buildings of AI-only civs: painted in spare frame time, not on first placement. */
const BACKGROUND_BUILDINGS: readonly BuildingType[] = ['foundry', 'wonder'];

/**
 * Which civ art a match paints while loading and which it leaves for the
 * game (Global Constraint 8: an extra civ adds ≤ ~1 s of load).
 * `owners` maps each civ in the match to its base owner (civBaseOwners):
 * its building bases are painted in that player's colour.
 *  - The human's civ: every building type's age-1 base (the build menu
 *    shows all of them, locked ones too).
 *  - An AI-only civ: only the types buildable in age 1; later types are
 *    first needed in their own age style and are painted when built, like
 *    every age-2/3 style. The age-3 single-style buildings (foundry, Wonder)
 *    go to the background queue instead, so the first one placed in age 3
 *    reuses the painted base (normal map, trim) rather than a 50-80 ms
 *    frame; only the owner's team-colour variant is still painted then.
 *  - Every civ: the age-1 common wall pieces; age 2 goes to the
 *    background queue, done seconds into the game — long before anyone
 *    can leave the Roman age. Age 3 is queued when the civ reaches age 2
 *    (ageUpArtJobs).
 *  - A loaded save (`spans`: the ages each civ's living players are in):
 *    the unit sheets of ages 2..max are painted while loading; wall
 *    pieces only for the ages its owners show now (min..max, while
 *    loading) or next (max + 1, in the background). No wall age below
 *    min is painted: eviction would drop it again (texture budget).
 */
export function planArtLoad(
  human: CivId,
  owners: ReadonlyMap<CivId, number>,
  paint: ArtPainters,
  spans?: ReadonlyMap<CivId, AgeSpan>,
): ArtLoadPlan {
  const types = Object.keys(BUILDING_SPECS) as BuildingType[];
  const civs = [...owners.keys()];
  const critical: Array<() => void> = [];
  const background: Array<() => void> = [];
  const lateBuildings: Array<() => void> = [];
  for (const [civ, owner] of owners) {
    for (const type of types) {
      if (civ === human || BUILDING_BALANCE[type].age === 1) critical.push(() => paint.building(type, civ, owner));
      else if (BACKGROUND_BUILDINGS.includes(type)) lateBuildings.push(() => paint.building(type, civ, owner));
    }
  }
  const walls = (civ: CivId, age: AgeId, into: Array<() => void>) => {
    for (const piece of COMMON_WALL_PIECES) into.push(() => paint.wall(piece, age, civ));
  };
  if (!spans) {
    for (const civ of civs) walls(civ, 1, critical);
    // Age 3 follows each civ's first age-2 player (ageUpArtJobs): only ages its owners can show next.
    for (const civ of civs) walls(civ, 2, background);
    background.push(...lateBuildings); // needed last (age 3)
    return { critical, background };
  }
  const nextWalls: Array<() => void> = [];
  for (const civ of civs) {
    const span = spans.get(civ) ?? { min: 1, max: 1 };
    for (const age of shownWallAges(span)) walls(civ, age, age <= span.max ? critical : nextWalls);
  }
  background.push(...nextWalls, ...lateBuildings);
  for (const [civ, { max }] of spans) {
    for (let a = 2; a <= max; a++) critical.push(...unitArtJobs(civ, a as AgeId, paint));
  }
  return { critical, background };
}

export interface BackgroundArtOptions {
  /** Real time after the game starts before the first job. */
  readonly startDelayMs: number;
  /** A frame whose own work (from its start) exceeds this runs no job. */
  readonly maxFrameWorkMs: number;
  /** At most one job every this many frames. */
  readonly everyFrames: number;
  /** After this many paced frames skipped as busy, the next one runs a job anyway (slow machines). */
  readonly forceAfterFrames: number;
  readonly now: () => number;
  /** Called each time a job empties the queue (the match evicts unused art then: texture peak). */
  readonly onDrained?: () => void;
}

const DEFAULT_OPTIONS: BackgroundArtOptions = {
  startDelayMs: BACKGROUND_ART_START_DELAY_MS,
  maxFrameWorkMs: BACKGROUND_ART_MAX_FRAME_WORK_MS,
  everyFrames: BACKGROUND_ART_EVERY_FRAMES,
  forceAfterFrames: BACKGROUND_ART_FORCE_AFTER_FRAMES,
  now: () => performance.now(),
};

/**
 * Runs paint jobs during play without frame hitches: one job (a wall
 * piece, ~5-15 ms) at most every few frames, and only in a frame whose
 * own work so far is light, so job + frame stays near 16.7 ms. A machine
 * too slow for any light frame still gets a job about once a second.
 */
export class BackgroundArt {
  private readonly queue: Array<() => void>;
  private readonly options: BackgroundArtOptions;
  private elapsedMs = 0;
  private frames = 0;
  private busySkips = 0;
  /** Jobs run, slowest job and total job time in ms (dev diagnostics). */
  readonly stats = { jobs: 0, maxJobMs: 0, totalMs: 0 };

  constructor(jobs: ReadonlyArray<() => void>, options: Partial<BackgroundArtOptions> = {}) {
    this.queue = [...jobs];
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  get done(): boolean {
    return this.queue.length === 0;
  }

  /** Appends jobs (duplicates are fine: painters are cache hits for textures already there). */
  enqueue(jobs: ReadonlyArray<() => void>): void {
    this.queue.push(...jobs);
  }

  /** Call once per frame, after the frame's systems ran; `frameStartMs` is when the frame's work began. */
  update(realDeltaMs: number, frameStartMs: number): void {
    if (this.done) return;
    this.elapsedMs += realDeltaMs;
    if (this.elapsedMs < this.options.startDelayMs) return;
    if (this.frames++ % this.options.everyFrames !== 0) return;
    const { now, maxFrameWorkMs, forceAfterFrames } = this.options;
    const t0 = now();
    if (t0 - frameStartMs > maxFrameWorkMs && ++this.busySkips < forceAfterFrames) return;
    this.busySkips = 0;
    this.queue.shift()?.();
    const dt = now() - t0;
    this.stats.jobs++;
    this.stats.totalMs += dt;
    this.stats.maxJobMs = Math.max(this.stats.maxJobMs, dt);
    if (this.done) this.options.onDrained?.();
  }
}

/**
 * The looping eviction timer (Phaser TimerEvent `delay` / `startAt`): every
 * ART_EVICT_INTERVAL_MS, the first one a full interval into a new match but
 * only ART_EVICT_AFTER_LOAD_MS into a loaded one (texture peak after a load).
 */
export function evictionTimer(loaded: boolean): { delay: number; startAt: number } {
  return { delay: ART_EVICT_INTERVAL_MS, startAt: loaded ? ART_EVICT_INTERVAL_MS - ART_EVICT_AFTER_LOAD_MS : 0 };
}
