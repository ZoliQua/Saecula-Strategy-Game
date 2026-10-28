import type { AgeId } from '../../types';
import type { VoiceId } from './composer';
import { midiInRange, Score, voiceChord, type BarPlan, type LineNote, type Meter } from './phrases';
import { semitones, type Mode, type Rand } from './theory';

/**
 * The arrangers orchestrate a form for each age's ensemble: who plays the
 * melody in which section, the accompaniment patterns (a lyre's bass and
 * rolled chords, a medieval drone, harpsichord broken chords under a
 * string pad), and sparse percussion that marks downbeats and cadences.
 */

export type PieceKind = 'menu' | 'calm' | 'combat' | 'victory' | 'defeat';

export interface Arrangement {
  readonly r: Rand;
  readonly mode: Mode;
  readonly age: AgeId;
  readonly kind: PieceKind;
  readonly bpb: Meter;
  readonly bars: readonly BarPlan[];
  readonly score: Score;
  /** The melody of each section, in order (none for the stingers). */
  readonly melodies: readonly LineNote[][];
}

/** Low strokes of the unpitched drums (`midi` selects the stroke). */
export const DRUM_LOW = 40;
export const DRUM_HIGH = 72;

export function arrange(a: Arrangement): void {
  if (a.kind === 'menu') return menu(a);
  if (a.age === 1) return roman(a);
  if (a.age === 2) return medieval(a);
  return earlyModern(a);
}

/** The octave shift putting the tonic at or above `lo` (within an octave). */
export function octaveFor(mode: Mode, lo: number): number {
  return Math.ceil((lo - mode.tonic) / 12);
}

export function barAt(a: Arrangement, beat: number): BarPlan {
  const i = Math.min(a.bars.length - 1, Math.max(0, Math.floor(beat / a.bpb)));
  const bar = a.bars[i];
  if (!bar) throw new Error('empty form');
  return bar;
}

/** The last calm melody note rings into the outro (the piece ends on its tonic). */
function tied(a: Arrangement, line: LineNote[], index: number): LineNote[] {
  if (a.kind !== 'calm' || index !== a.melodies.length - 1 || line.length === 0) return line;
  const last = line[line.length - 1];
  if (!last) return line;
  const end = a.bars.length * a.bpb - a.bpb * 0.75;
  return [...line.slice(0, -1), { ...last, beats: Math.max(last.beats, end - last.beat) }];
}

/** Section dynamics as a gain on a line's velocities. */
const dyn = (bar: BarPlan): number => 0.55 + 0.55 * bar.energy;

/** Plays each section's melody on the voice `pick` chooses (or skips it). */
function melody(a: Arrangement, pick: (bar: BarPlan) => { voice: VoiceId; lo: number } | null): void {
  a.melodies.forEach((line, i) => {
    const first = line[0];
    if (!first) return;
    const bar = barAt(a, first.beat);
    const choice = pick(bar);
    if (choice) a.score.line(tied(a, line, i), choice.voice, a.mode, octaveFor(a.mode, choice.lo), dyn(bar));
  });
}

/** A chord rolled upwards (a strum), `gap` beats between strings. */
export function roll(a: Arrangement, at: number, beats: number, voice: VoiceId, notes: readonly number[], velocity: number, gap = 0.04): void {
  notes.forEach((m, i) => a.score.add(at + i * gap, beats - i * gap, voice, m, velocity * (1 - i * 0.06)));
}

/** Held chords (the top `top` notes of each voicing), common tones tied over (no re-attack), one voicing per bar. */
export function pad(a: Arrangement, voice: VoiceId, center: number, bars: readonly BarPlan[], velocity: (bar: BarPlan) => number, top = 3): void {
  let held: Array<{ midi: number; start: number; end: number; velocity: number }> = [];
  let prev: number[] | null = null;
  let lastEnd = -1;
  const flush = (keep: ReadonlySet<number>) => {
    for (const h of held) if (!keep.has(h.midi)) a.score.add(h.start, h.end - h.start, voice, h.midi, h.velocity);
    held = held.filter((h) => keep.has(h.midi));
  };
  for (const bar of bars) {
    if (bar.start !== lastEnd) {
      flush(new Set());
      prev = null;
    }
    const voicing = voiceChord(a.mode, bar.chord, center, prev);
    const chord = voicing.slice(-top);
    const end = bar.start + a.bpb;
    flush(new Set(chord));
    for (const m of chord) {
      const h = held.find((x) => x.midi === m);
      if (h) h.end = end - 0.1;
      else held.push({ midi: m, start: bar.start, end: end - 0.1, velocity: velocity(bar) });
    }
    prev = voicing;
    lastEnd = end;
  }
  flush(new Set());
}

const bassOf = (a: Arrangement, bar: BarPlan): number => midiInRange(a.mode, bar.chord, bar.chord, 45, 56);
const fifthOf = (a: Arrangement, bar: BarPlan): number => midiInRange(a.mode, bar.chord + 4, bar.chord, 50, 61);

/** Roman: an aulos sings over a lyre's bass and rolled chords, a frame drum keeps a light pulse. */
function roman(a: Arrangement): void {
  const combat = a.kind === 'combat';
  melody(a, (bar) => (!combat && bar.section === 'B' && bar.repeat === 0 ? { voice: 'lyre', lo: 69 } : { voice: 'aulos', lo: 60 }));
  let prev: number[] | null = null;
  for (const bar of a.bars) {
    const s = bar.start;
    const e = bar.energy;
    const chord = (prev = voiceChord(a.mode, bar.chord, 59, prev));
    const bass = bassOf(a, bar);
    if (combat) {
      // A 3-3-2 ostinato on the chord root, low on the lyre.
      const rel = [0, 0, 4, 0, 7, 0, 4, 2];
      const acc = [0.7, 0.38, 0.45, 0.66, 0.4, 0.45, 0.64, 0.42];
      rel.forEach((d, i) => a.score.add(s + i * 0.5, 0.45, 'lyre', midiInRange(a.mode, bar.chord + d, bar.chord, 45, 64), (acc[i] ?? 0.4) * e));
      const strokes: Array<[number, number, number]> = [[0, DRUM_LOW, 0.62], [1, DRUM_HIGH, 0.3], [1.5, DRUM_HIGH, 0.26], [2, DRUM_LOW, 0.5], [3, DRUM_HIGH, 0.36], [3.5, DRUM_HIGH, 0.3]];
      for (const [at, m, v] of bar.section === 'B' && bar.phraseBar < 2 ? strokes.filter(([at2]) => at2 % 2 === 0) : strokes) a.score.add(s + at, 0.25, 'frameDrum', m, v * e);
      if (bar.cadence === 'half') roll(a, s + 2, 1.8, 'lyre', chord, 0.42 * e);
      continue;
    }
    if (bar.section === 'intro') {
      a.score.add(s, 1.8, 'lyre', bass, 0.5 * e);
      roll(a, s + 2, 1.8, 'lyre', chord, 0.4 * e);
      if (bar.start > 0) a.score.add(s, 0.3, 'frameDrum', DRUM_LOW, 0.4 * e);
      continue;
    }
    if (bar.section === 'outro') {
      if (a.bars[s / a.bpb - 1]?.section !== 'outro') {
        a.score.add(s, a.bpb * 2 - 0.5, 'lyre', bass, 0.55 * e);
        roll(a, s + 0.1, a.bpb * 2 - 0.6, 'lyre', [...chord, chord[0] !== undefined ? chord[0] + 12 : bass + 24], 0.45 * e, 0.07);
        a.score.add(s, 0.4, 'frameDrum', DRUM_LOW, 0.5 * e);
      }
      continue;
    }
    if (bar.section === 'B' && bar.repeat === 0) {
      // The lyre has the tune: bass on 1 and 3, the aulos holds a soft fifth beneath.
      a.score.add(s, 1.8, 'lyre', bass, 0.45 * e);
      a.score.add(s + 2, 1.6, 'lyre', fifthOf(a, bar), 0.36 * e);
      a.score.add(s, a.bpb - 0.2, 'aulos', midiInRange(a.mode, bar.chord + 4, bar.chord, 55, 64), 0.3 * e);
      if (bar.phraseBar === 0) a.score.add(s, 0.3, 'frameDrum', DRUM_LOW, 0.38 * e);
      continue;
    }
    // A sections: bass, rolled chord, fifth, chord; the repeats break the last chord into eighths.
    const arrival = bar.cadence === 'full';
    a.score.add(s, 0.95, 'lyre', bass, 0.5 * e);
    roll(a, s + (arrival ? 0.05 : 1), arrival ? 2.6 : 0.9, 'lyre', chord, 0.36 * e);
    if (!arrival) {
      a.score.add(s + 2, 0.95, 'lyre', fifthOf(a, bar), 0.4 * e);
      if (bar.repeat > 0) chord.slice(0, 2).forEach((m, i) => a.score.add(s + 3 + i * 0.5, 0.45, 'lyre', m, 0.3 * e));
      else roll(a, s + 3, 0.9, 'lyre', chord.slice(1), 0.3 * e);
    }
    a.score.add(s, 0.3, 'frameDrum', DRUM_LOW, 0.5 * e);
    if (!arrival) {
      a.score.add(s + 2.5, 0.2, 'frameDrum', DRUM_HIGH, 0.24 * e);
      if (a.r.chance(0.6)) a.score.add(s + 3, 0.2, 'frameDrum', DRUM_HIGH, 0.28 * e);
    } else {
      a.score.add(s + 2, 0.3, 'frameDrum', DRUM_LOW, 0.32 * e);
    }
  }
}

/** Medieval: a recorder over a drone, a tabor dance pulse and a bell at each section. */
function medieval(a: Arrangement): void {
  const combat = a.kind === 'combat';
  melody(a, () => ({ voice: 'recorder', lo: 67 }));
  // Organum: in the first B, long notes get a fifth or fourth below.
  a.melodies.forEach((line) => {
    const bar = line[0] ? barAt(a, line[0].beat) : null;
    if (!bar || bar.section !== 'B' || bar.repeat !== 0 || combat) return;
    const oct = octaveFor(a.mode, 67);
    for (const n of line) {
      if (n.beats < 1) continue;
      const below = [n.degree - 3, n.degree - 4].find((d) => [5, 7].includes(semitones(a.mode, n.degree, d, n.chord)));
      if (below !== undefined) a.score.line([{ ...n, degree: below, velocity: n.velocity * 0.6 }], 'recorder', a.mode, oct, dyn(bar));
    }
  });
  // The drone: tonic and fifth, renewed at each section.
  const total = a.bars.length * a.bpb;
  const starts = a.bars.filter((b, i) => i === 0 || (b.phraseBar === 0 && a.bars[i - 1]?.cadence === 'full') || (b.section === 'outro' && a.bars[i - 1]?.section !== 'outro'));
  starts.forEach((b, i) => {
    const end = (starts[i + 1]?.start ?? total) - (starts[i + 1] ? 0.25 : a.bpb * 0.5);
    const v = (0.45 + 0.35 * b.energy) * (b.section === 'B' ? 0.85 : 1);
    a.score.add(b.start, end - b.start, 'drone', midiInRange(a.mode, 0, 0, 43, 54), v);
    a.score.add(b.start, end - b.start, 'drone', midiInRange(a.mode, 4, 0, 50, 61), v * 0.8);
    if (!combat || b.section === 'A') a.score.add(b.start, 2, 'bell', midiInRange(a.mode, b.section === 'B' ? 4 : 0, 0, 72, 83), 0.42 + 0.1 * b.energy);
    if (b.section === 'outro') a.score.add(b.start + 0.5, 2, 'bell', midiInRange(a.mode, 4, 0, 72, 83), 0.36);
  });
  for (const bar of a.bars) {
    const s = bar.start;
    const e = bar.energy;
    const hit = (at: number, m: number, v: number) => a.score.add(s + at, 0.2, 'tabor', m, v * e);
    if (combat) {
      // A running recorder ostinato an octave below the tune, and a driving tabor.
      [0, 1, 2, 1, 0, -1].forEach((d, i) => a.score.add(s + i * 0.5, 0.42, 'recorder', midiInRange(a.mode, bar.chord + d, bar.chord, 55, 67), (i === 0 ? 0.5 : 0.36) * e));
      if (bar.cadence === 'full') [0, 0.5, 1, 2].forEach((at, i) => hit(at, i === 0 ? DRUM_LOW : DRUM_HIGH, 0.5 - i * 0.05));
      else [[0, DRUM_LOW, 0.62], [1, DRUM_HIGH, 0.32], [2, DRUM_HIGH, 0.42], [2.5, DRUM_HIGH, 0.3]].forEach(([at, m, v]) => hit(at ?? 0, m ?? DRUM_HIGH, v ?? 0.3));
      continue;
    }
    if (bar.section === 'intro') {
      if (s > 0) [0, 2, 2.5].forEach((at, i) => hit(at, i === 0 ? DRUM_LOW : DRUM_HIGH, 0.4 - 0.08 * i));
      continue;
    }
    if (bar.section === 'outro') {
      if (a.bars[s / a.bpb - 1]?.section !== 'outro') hit(0, DRUM_LOW, 0.5);
      continue;
    }
    if (bar.section === 'B') {
      if (bar.phraseBar === 0) hit(0, DRUM_LOW, 0.34);
      continue;
    }
    hit(0, DRUM_LOW, 0.5);
    if (bar.cadence !== 'full') {
      hit(a.bpb - 1, DRUM_HIGH, 0.3);
      if (a.r.chance(0.35 + 0.15 * bar.repeat)) hit(a.bpb - 0.5, DRUM_HIGH, 0.22);
    }
  }
}

/** Early modern: a flute over harpsichord broken chords, a string pad and timpani at the cadences. */
function earlyModern(a: Arrangement): void {
  const combat = a.kind === 'combat';
  melody(a, () => ({ voice: 'flute', lo: 69 }));
  const strung = a.bars.filter((b) => combat || b.section === 'intro' || b.section === 'outro' || b.section === 'B' || b.repeat > 0);
  // Two string parts above the harpsichord's bass.
  pad(a, 'strings', 62, strung, (b) => (0.4 + 0.35 * b.energy) * (b.section === 'intro' ? 0.8 : 1), 2);
  const timp = (at: number, degree: number, chord: number, v: number) => a.score.add(at, 0.5, 'timpani', midiInRange(a.mode, degree, chord, 41, 52), v);
  let prev: number[] | null = null;
  for (const bar of a.bars) {
    const s = bar.start;
    const e = bar.energy;
    const c = bar.chord;
    const chord = (prev = voiceChord(a.mode, c, 60, prev));
    const bass = midiInRange(a.mode, c, c, 41, 53);
    const tone = (d: number) => midiInRange(a.mode, c + d, c, 55, 68);
    const h = (at: number, beats: number, m: number, v: number) => a.score.add(s + at, beats, 'harpsichord', m, v * e);
    if (combat) {
      // Driving eighths: root, octave, fifth, octave.
      const rel = a.bpb === 4 ? [0, 7, 4, 7, 0, 7, 4, 7] : [0, 7, 4, 7, 2, 7];
      rel.forEach((d, i) => h(i * 0.5, 0.45, midiInRange(a.mode, c + d, c, 43, 62), i % 4 === 0 ? 0.62 : 0.42));
      timp(s, c === 4 ? 4 : 0, c, (bar.phraseBar === 0 ? 0.62 : 0.45) * e);
      if (a.bpb === 4) timp(s + 2, c === 4 ? 0 : 4, c, 0.4 * e);
      continue;
    }
    if (bar.section === 'outro') {
      if (a.bars[s / a.bpb - 1]?.section !== 'outro') {
        h(0, a.bpb * 2 - 0.5, bass, 0.55);
        roll(a, s + 0.06, a.bpb * 2 - 0.6, 'harpsichord', chord, 0.45 * e, 0.06);
        timp(s, 0, 0, 0.55 * e);
      }
      continue;
    }
    if (bar.cadence) timp(s, c === 4 ? 4 : 0, c, (bar.cadence === 'full' ? 0.55 : 0.42) * e);
    else if (bar.phraseBar === 0 && bar.section === 'A' && bar.repeat > 0 && a.bars[s / a.bpb - 1]?.cadence === 'full') timp(s, 0, 0, 0.35 * e);
    h(0, a.bpb === 4 ? 1.8 : 0.9, bass, 0.55);
    if (bar.cadence === 'full') {
      roll(a, s + 0.04, a.bpb - 0.4, 'harpsichord', chord, 0.42 * e, 0.05);
      continue;
    }
    const broken = bar.section === 'A' && bar.repeat > 0;
    if (a.bpb === 4) {
      if (broken) [0, 4, 2, 4, 0, 4, 2, 4].forEach((d, i) => i > 0 && h(i * 0.5, 0.45, tone(d), i % 2 === 0 ? 0.42 : 0.34));
      else if (bar.section === 'B') [2, 4, 7].forEach((d, i) => h(1 + i, 0.9, tone(d), 0.38));
      else [1, 2, 3].forEach((at) => (at === 2 ? h(at, 0.9, midiInRange(a.mode, c + 4, c, 43, 55), 0.42) : chord.slice(1).forEach((m) => h(at, 0.8, m, 0.33))));
    } else if (broken) {
      [1, 1.5, 2, 2.5].forEach((at, i) => h(at, 0.45, tone([2, 4, 7, 4][i] ?? 2), 0.36));
    } else {
      [1, 2].forEach((at) => chord.slice(1).forEach((m) => h(at, 0.8, m, 0.33)));
    }
  }
}

/** The menu: a slow harp over a soft pad; the harp's tune enters on the second pass. */
function menu(a: Arrangement): void {
  melody(a, (bar) => (bar.section === 'A' && bar.repeat === 0 ? null : { voice: 'harp', lo: 67 }));
  pad(a, 'pad', 57, a.bars, (b) => 0.45 + 0.3 * b.energy);
  for (const bar of a.bars) {
    const s = bar.start;
    const c = bar.chord;
    const bass = midiInRange(a.mode, c, c, 38, 50);
    const v = 0.5 + 0.3 * bar.energy;
    a.score.add(s, 2.5, 'harp', bass, v);
    if (bar.section === 'A' && bar.repeat === 0) {
      [2, 4, 7].forEach((d, i) => a.score.add(s + 1 + i, 1.5, 'harp', midiInRange(a.mode, c + d, c, 55, 70), v * (0.8 - i * 0.06)));
    } else {
      a.score.add(s + 2, 1.5, 'harp', midiInRange(a.mode, c + 4, c, 50, 62), v * 0.7);
    }
  }
}
