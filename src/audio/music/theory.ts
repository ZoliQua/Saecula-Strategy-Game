/**
 * Music theory for the composer: diatonic modes, scale degrees, chords
 * and a small seeded random source. Degrees are 0-based scale steps from
 * the tonic (7 = the tonic an octave up, -1 = the step below it).
 */

export type ModeName = 'ionian' | 'dorian' | 'phrygian' | 'mixolydian' | 'aeolian';

const STEPS: Readonly<Record<ModeName, readonly number[]>> = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
};

/** A key: a mode on a tonic (the tonic's MIDI note in the melody octave). */
export interface Mode {
  readonly name: ModeName;
  readonly tonic: number;
}

/** Instruments without a pitch: their `midi` selects a stroke (low = a deep stroke), or the tom's drum tuning. */
const UNPITCHED: ReadonlySet<string> = new Set(['frameDrum', 'tabor', 'tom']);

export function isPitched(voice: string): boolean {
  return !UNPITCHED.has(voice);
}

export const mod = (n: number, m: number): number => ((n % m) + m) % m;

/** Whether a chord on `root` is the dominant of a minor key (it takes the raised leading tone). */
function minorDominant(mode: Mode, root: number | undefined): boolean {
  return mode.name === 'aeolian' && root !== undefined && mod(root, 7) === 4;
}

/**
 * The MIDI note of a scale degree. Over a minor key's dominant chord the
 * 7th degree is raised (the harmonic-minor leading tone of a cadence).
 */
export function degreeToMidi(mode: Mode, degree: number, chordRoot?: number): number {
  const octave = Math.floor(degree / 7);
  const idx = degree - octave * 7;
  const step = STEPS[mode.name][idx] ?? 0;
  return mode.tonic + octave * 12 + step + (idx === 6 && minorDominant(mode, chordRoot) ? 1 : 0);
}

/** Pitch classes a piece in `mode` may use: the mode's seven, plus the leading tone of a minor key. */
export function allowedPitchClasses(mode: Mode): Set<number> {
  const out = new Set(STEPS[mode.name].map((s) => mod(mode.tonic + s, 12)));
  if (mode.name === 'aeolian') out.add(mod(mode.tonic + 11, 12));
  return out;
}

/** The degrees of a triad on `root` (root, third, fifth). */
export function triad(root: number): [number, number, number] {
  return [root, root + 2, root + 4];
}

/** Whether `degree` is a tone of the triad on `root` (any octave). */
export function isChordTone(degree: number, root: number): boolean {
  const d = mod(degree - root, 7);
  return d === 0 || d === 2 || d === 4;
}

/** Semitones between two degrees (absolute), for avoiding a tritone. */
export function semitones(mode: Mode, a: number, b: number, chordRoot?: number): number {
  return Math.abs(degreeToMidi(mode, a, chordRoot) - degreeToMidi(mode, b, chordRoot));
}

/** A seeded random source (Mulberry32) with the helpers the composer needs. */
export interface Rand {
  next(): number;
  /** Integer in [min, max]. */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  chance(p: number): boolean;
  /** Uniform in [-1, 1]. */
  signed(): number;
}

export function rand(seed: number): Rand {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: readonly T[]): T => {
      const item = items[Math.floor(next() * items.length)];
      if (item === undefined) throw new Error('pick from an empty list');
      return item;
    },
    chance: (p) => next() < p,
    signed: () => next() * 2 - 1,
  };
}

/** Mixes a seed with a label, so each part of a piece draws from its own stream. */
export function subSeed(seed: number, label: string): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  for (let i = 0; i < label.length; i++) h = Math.imul(h ^ label.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}
