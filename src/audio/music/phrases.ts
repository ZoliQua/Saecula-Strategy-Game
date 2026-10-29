import { MUSIC_HUMANIZE_MS } from '../../config/audio';
import type { LayerTag, NoteEvent, VoiceId } from './composer';
import { degreeToMidi, isChordTone, mod, semitones, type Mode, type Rand } from './theory';

/**
 * Melody writing: rhythms per bar, 4-bar phrases with an arched contour
 * (stepwise, leaps resolved by step, chord tones on strong beats) and a
 * cadence on the last note; 8-bar periods as call and response (the
 * answer opens like the question and closes on the tonic). Plus the
 * score the arrangers write into, and close chord voicings.
 */

/** One bar of a form. */
export interface BarPlan {
  /** First beat of the bar. */
  readonly start: number;
  /** Chord root (scale degree). */
  readonly chord: number;
  readonly section: 'intro' | 'A' | 'B' | 'outro';
  /** Bar within its 4-bar phrase (0–3); -1 in the intro and outro. */
  readonly phraseBar: number;
  /** Cadence closing on this bar: half (open) or full (on the tonic). */
  readonly cadence: 'half' | 'full' | null;
  /** How many times this section letter came before (A = 0, A' = 1, …). */
  readonly repeat: number;
  /** Dynamics of the section, 0–1. */
  readonly energy: number;
}

/** A melody note in scale degrees. */
export interface LineNote {
  readonly beat: number;
  readonly beats: number;
  readonly degree: number;
  readonly chord: number;
  readonly velocity: number;
}

/** A bar's rhythm: [onset, length] pairs in beats. */
export type Rhythm = ReadonlyArray<readonly [number, number]>;

const MOTIFS: Readonly<Record<3 | 4, readonly Rhythm[]>> = {
  4: [
    [[0, 2], [2, 1], [3, 1]],
    [[0, 1.5], [1.5, 0.5], [2, 2]],
    [[0, 1], [1, 1], [2, 2]],
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[0, 1.5], [1.5, 0.5], [2, 1], [3, 1]],
    [[0, 1], [1, 0.5], [1.5, 0.5], [2, 1.5], [3.5, 0.5]],
    [[0, 0.5], [0.5, 0.5], [1, 1], [2, 1], [3, 1]],
  ],
  3: [
    [[0, 2], [2, 1]],
    [[0, 1], [1, 1], [2, 1]],
    [[0, 1.5], [1.5, 0.5], [2, 1]],
    [[0, 1], [1, 0.5], [1.5, 0.5], [2, 1]],
    [[0, 0.5], [0.5, 0.5], [1, 1], [2, 1]],
    [[0, 2.5], [2.5, 0.5]],
  ],
};
const HALF_CADENCE: Readonly<Record<3 | 4, readonly Rhythm[]>> = {
  4: [[[0, 1], [1, 1], [2, 1.5]], [[0, 2], [2, 1.5]], [[0, 1.5], [1.5, 0.5], [2, 1.5]]],
  3: [[[0, 2.5]], [[0, 1], [1, 1.5]]],
};
const FULL_CADENCE: Readonly<Record<3 | 4, readonly Rhythm[]>> = {
  4: [[[0, 1], [1, 2.5]], [[0, 3.25]], [[0, 0.5], [0.5, 0.5], [1, 2.5]]],
  3: [[[0, 2.5]], [[0, 1], [1, 1.75]]],
};

export type Meter = 3 | 4;

/** Motifs from calm (0) to busy (1). */
export function motifs(bpb: Meter, density: number): readonly Rhythm[] {
  const all = MOTIFS[bpb];
  const lo = Math.floor(density * (all.length - 3));
  return all.slice(lo, lo + 3);
}

interface Contour {
  readonly start: number;
  readonly peak: number;
  readonly end: number;
  /** Where the peak falls, 0–1 of the phrase. */
  readonly peakAt: number;
}

function contourAt(c: Contour, p: number): number {
  return p <= c.peakAt ? c.start + (c.peak - c.start) * (p / c.peakAt) : c.peak + (c.end - c.peak) * ((p - c.peakAt) / (1 - c.peakAt));
}

/** Chord tones of `root` inside [lo, hi]. */
function chordTones(root: number, lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let d = lo; d <= hi; d++) if (isChordTone(d, root)) out.push(d);
  return out;
}

/** The candidate nearest `to` (ties: the first). */
function nearest(cands: readonly number[], to: number): number {
  let best = cands[0] ?? to;
  for (const c of cands) if (Math.abs(c - to) < Math.abs(best - to)) best = c;
  return best;
}

/**
 * Pitches for a run of rhythm slots: strong notes take chord tones near
 * the contour, weak ones move by step; a leap of a fourth or more is
 * followed by a step back; the last note is `final` (when given).
 */
function pitchLine(
  r: Rand,
  mode: Mode,
  slots: ReadonlyArray<{ beat: number; beats: number; chord: number; strong: boolean }>,
  contour: Contour,
  register: readonly [number, number],
  from: number | null,
  final: number | null,
): number[] {
  const [lo, hi] = register;
  const out: number[] = [];
  let prev = from ?? nearest(chordTones(slots[0]?.chord ?? 0, lo, hi), contour.start);
  let resolve = 0;
  let prevChord = slots[0]?.chord ?? 0;
  slots.forEach((s, i) => {
    const last = i === slots.length - 1;
    let deg: number;
    if (last && final !== null) {
      deg = final;
    } else if (i === 0 && from === null) {
      deg = prev;
    } else {
      const target = contourAt(contour, slots.length < 2 ? 0 : i / (slots.length - 1));
      const towardFinal = final !== null && i === slots.length - 2;
      let cands: number[] = s.strong ? chordTones(s.chord, Math.max(lo, prev - 4), Math.min(hi, prev + 4)) : [prev - 1, prev + 1, prev - 2, prev + 2, prev];
      // A leap resolves by step (or by a third where the step would be an augmented second).
      if (resolve !== 0) cands = augmentedSecond(mode, prev, prevChord, prev + resolve, s.chord) ? [prev + resolve, prev + 2 * resolve] : [prev + resolve];
      cands = cands.filter((c) => c >= lo && c <= hi);
      if (cands.length === 0) cands = [Math.min(hi, Math.max(lo, prev))];
      let best = cands[0] ?? prev;
      let bestScore = Number.POSITIVE_INFINITY;
      for (const c of cands) {
        let score = Math.abs(c - target) + 0.6 * Math.abs(c - prev) + r.next() * 0.7;
        // Repeated notes plod: one repeat costs, a second in a row almost never wins.
        if (c === prev) score += out.length >= 2 && out[out.length - 2] === prev ? 6 : 2.2;
        // Turning straight back (a-b-a) now and then is a neighbour figure; again and again it is a trill.
        if (c === out[out.length - 2] && out[out.length - 3] === prev) score += 1.5;
        if (!s.strong && Math.abs(c - prev) === 2 && !isChordTone(c, s.chord)) score += 1.2;
        if (semitones(mode, c, prev, s.chord) === 6) score += 4;
        if (augmentedSecond(mode, prev, prevChord, c, s.chord)) score += 8;
        if (towardFinal && final !== null) score += 1.5 * Math.max(0, Math.abs(c - final) - 1);
        if (score < bestScore) {
          bestScore = score;
          best = c;
        }
      }
      deg = best;
    }
    const leap = deg - prev;
    resolve = Math.abs(leap) >= 3 && !last ? -Math.sign(leap) : 0;
    out.push(deg);
    prev = deg;
    prevChord = s.chord;
  });
  return out;
}

/** Whether a step between two degrees (each over its chord) is an augmented second (minor: 6th to raised 7th). */
function augmentedSecond(mode: Mode, a: number, aChord: number, b: number, bChord: number): boolean {
  return Math.abs(a - b) === 1 && Math.abs(degreeToMidi(mode, a, aChord) - degreeToMidi(mode, b, bChord)) === 3;
}

/** Strong positions: a downbeat, the middle of a 4/4 bar, or a long note. */
function strongAt(beatInBar: number, beats: number, bpb: Meter): boolean {
  return beatInBar === 0 || (bpb === 4 && beatInBar === 2) || beats >= 1.5;
}

function slotsFor(bars: readonly BarPlan[], rhythms: readonly Rhythm[], bpb: Meter) {
  return bars.flatMap((bar, i) =>
    (rhythms[i] ?? []).map(([on, len]) => ({ beat: bar.start + on, beats: len, chord: bar.chord, strong: strongAt(on, len, bpb) })),
  );
}

/** Note velocities: an arch over the phrase, accents on strong notes, softer endings. */
function shape(r: Rand, slots: ReadonlyArray<{ strong: boolean }>, base: number): number[] {
  return slots.map((s, i) => {
    const p = slots.length < 2 ? 0 : i / (slots.length - 1);
    const arch = Math.sin(Math.PI * Math.min(1, p * 1.25));
    return base + 0.16 * arch + (s.strong ? 0.07 : 0) - (i === slots.length - 1 ? 0.06 : 0) + r.signed() * 0.04;
  });
}

export interface PeriodStyle {
  readonly bpb: Meter;
  /** Rhythmic activity, 0–1. */
  readonly density: number;
  /** Opening and peak degree. */
  readonly start: number;
  readonly peak: number;
  readonly register: readonly [number, number];
  readonly velocity: number;
}

/**
 * An 8-bar period (two 4-bar phrases): the question closes on a chord
 * tone of its cadence chord, the answer repeats the question's first two
 * bars and closes on the tonic.
 */
export function writePeriod(r: Rand, mode: Mode, bars: readonly BarPlan[], style: PeriodStyle): LineNote[] {
  const { bpb } = style;
  const pool = motifs(bpb, style.density);
  const [m1, m2, m3] = [r.pick(pool), r.pick(pool), r.pick(pool)];
  const q = bars.slice(0, 4);
  const a = bars.slice(4, 8);
  const qRhythm = [m1, m2, r.chance(0.5) ? m1 : m3, r.pick(HALF_CADENCE[bpb])];
  const aRhythm = [m1, m2, m3, r.pick(FULL_CADENCE[bpb])];
  const [lo, hi] = style.register;
  const qSlots = slotsFor(q, qRhythm, bpb);
  const half = nearest(chordTones(q[3]?.chord ?? 4, lo, hi), style.start + 2);
  const qDeg = pitchLine(r, mode, qSlots, { start: style.start, peak: style.peak, end: half, peakAt: 0.6 }, style.register, null, half);
  // The answer: the question's opening two bars (fitted to the chords), then a new close on the tonic.
  const aSlots = slotsFor(a, aRhythm, bpb);
  const openLen = slotsFor(q.slice(0, 2), qRhythm, bpb).length;
  // Where the answer's chords differ, its opening bars are the question's moved in sequence (by the chord
  // step, or that step an octave the other way when the bar would leave the register).
  const shiftFor = new Map<number, number>();
  const opening = qDeg.slice(0, openLen).map((d, i) => {
    const s = aSlots[i];
    const qs = qSlots[i];
    if (!s || !qs) return d;
    const bar = Math.floor((qs.beat - (q[0]?.start ?? 0)) / bpb);
    let shift = shiftFor.get(bar);
    if (shift === undefined) {
      const step = mod(s.chord - qs.chord + 3, 7) - 3;
      const inBar = qDeg.slice(0, openLen).filter((_, j) => Math.floor(((qSlots[j]?.beat ?? 0) - (q[0]?.start ?? 0)) / bpb) === bar);
      shift = [step, step - 7, step + 7, 0].find((k) => inBar.every((x) => x + k >= lo && x + k <= hi)) ?? 0;
      shiftFor.set(bar, shift);
    }
    return d + shift;
  });
  const lastOpen = opening[opening.length - 1] ?? style.start;
  const tonic = nearest([0, 7].filter((d) => d >= lo && d <= hi), lastOpen);
  const close = pitchLine(r, mode, aSlots.slice(openLen), { start: lastOpen, peak: style.peak - 1, end: tonic, peakAt: 0.35 }, style.register, lastOpen, tonic);
  const aDeg = [...opening, ...close];
  const qVel = shape(r, qSlots, style.velocity);
  const aVel = shape(r, aSlots, style.velocity);
  return [
    ...qSlots.map((s, i) => ({ beat: s.beat, beats: s.beats, degree: qDeg[i] ?? 0, chord: s.chord, velocity: qVel[i] ?? style.velocity })),
    ...aSlots.map((s, i) => ({ beat: s.beat, beats: s.beats, degree: aDeg[i] ?? 0, chord: s.chord, velocity: aVel[i] ?? style.velocity })),
  ];
}

/** A short phrase over `bars` along a contour, ending on `final` (stingers). */
export function writeShape(r: Rand, mode: Mode, bars: readonly BarPlan[], rhythms: readonly Rhythm[], bpb: Meter, contour: Contour, register: readonly [number, number], final: number, velocity: number): LineNote[] {
  const slots = slotsFor(bars, rhythms, bpb);
  const deg = pitchLine(r, mode, slots, contour, register, null, final);
  const vel = shape(r, slots, velocity);
  return slots.map((s, i) => ({ beat: s.beat, beats: s.beats, degree: deg[i] ?? final, chord: s.chord, velocity: vel[i] ?? velocity }));
}

/** A repeat with ornaments: a third between two notes is sometimes filled with a passing note. */
export function ornament(r: Rand, line: readonly LineNote[], chance: number): LineNote[] {
  const out: LineNote[] = [];
  line.forEach((n, i) => {
    const next = line[i + 1];
    if (next && n.beats >= 1 && Math.abs(next.degree - n.degree) === 2 && next.beat === n.beat + n.beats && r.chance(chance)) {
      out.push({ ...n, beats: n.beats - 0.5 });
      out.push({ ...n, beat: n.beat + n.beats - 0.5, beats: 0.5, degree: (n.degree + next.degree) / 2, velocity: n.velocity - 0.08 });
    } else {
      out.push(n);
    }
  });
  return out;
}

/** Moves a line in time (a repeated section starts later). */
export function moveLine(line: readonly LineNote[], by: number): LineNote[] {
  return line.map((n) => ({ ...n, beat: n.beat + by }));
}

/** A close triad voicing on `root` near `center` (a MIDI note), moving as little as possible from `prev`. */
export function voiceChord(mode: Mode, root: number, center: number, prev: readonly number[] | null): number[] {
  let best: number[] = [];
  let bestScore = Number.POSITIVE_INFINITY;
  for (let a = -2; a <= 1; a++) {
    for (let b = -2; b <= 1; b++) {
      for (let c = -2; c <= 1; c++) {
        const degs = [root + 7 * a, root + 2 + 7 * b, root + 4 + 7 * c].sort((x, y) => x - y);
        const lowest = degs[0] ?? 0;
        if ((degs[2] ?? 0) - lowest > 6) continue;
        const midis = degs.map((d) => degreeToMidi(mode, d, root));
        const mean = midis.reduce((s, m) => s + m, 0) / 3;
        const score = prev ? midis.reduce((s, m, i) => s + Math.abs(m - (prev[i] ?? m)), 0) + 0.3 * Math.abs(mean - center) : Math.abs(mean - center);
        if (score < bestScore) {
          bestScore = score;
          best = midis;
        }
      }
    }
  }
  return best;
}

/** The events of a piece as the arrangers write them: humanized, clamped and sorted on `done`. */
export class Score {
  private readonly events: NoteEvent[] = [];
  private readonly jitterBeats: number;

  constructor(
    private readonly r: Rand,
    bpm: number,
    private readonly length: number,
  ) {
    this.jitterBeats = (MUSIC_HUMANIZE_MS / 1000) * (bpm / 60);
  }

  /** A note; `beat` 0 stays exact (the piece starts on time). A `layer` note plays only from its intensity on. */
  add(beat: number, beats: number, voice: VoiceId, midi: number, velocity: number, layer?: LayerTag): void {
    const at = beat <= 0 ? 0 : Math.max(0, beat + this.r.signed() * this.jitterBeats);
    if (at >= this.length || beats <= 0) return;
    const v = Math.min(1, Math.max(0.05, velocity));
    const e: NoteEvent = { beat: at, beats, voice, midi: Math.round(midi), velocity: Math.round(v * 1000) / 1000 };
    this.events.push(layer && (layer.min !== undefined || layer.pulse) ? { ...e, ...layer } : e);
  }

  /**
   * A melody line on `voice`, `octave` octaves above the mode's tonic. A
   * step between the 6th and a raised 7th (an augmented second) takes the
   * natural 7th instead, as melodic minor does.
   */
  line(line: readonly LineNote[], voice: VoiceId, mode: Mode, octave: number, gain = 1): void {
    let prev: { degree: number; midi: number; index: number } | null = null;
    for (const n of line) {
      const degree = n.degree + 7 * octave;
      let midi = degreeToMidi(mode, degree, n.chord);
      if (prev && Math.abs(degree - prev.degree) === 1 && Math.abs(midi - prev.midi) === 3) {
        const natural = degreeToMidi(mode, degree);
        const earlier = this.events[prev.index];
        if (natural !== midi) midi = natural;
        else if (earlier) this.events[prev.index] = { ...earlier, midi: degreeToMidi(mode, prev.degree) };
      }
      const index = this.events.length;
      this.add(n.beat, n.beats * 0.95, voice, midi, n.velocity * gain);
      prev = this.events.length > index ? { degree, midi, index } : null;
    }
  }

  done(): NoteEvent[] {
    return [...this.events].sort((a, b) => a.beat - b.beat);
  }
}

/** Degree shifted by octaves into [lo, hi] MIDI. */
export function midiInRange(mode: Mode, degree: number, chord: number, lo: number, hi: number): number {
  let d = degree;
  while (degreeToMidi(mode, d, chord) < lo) d += 7;
  while (degreeToMidi(mode, d, chord) > hi) d -= 7;
  return degreeToMidi(mode, d, chord);
}
