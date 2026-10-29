import { MUSIC_CALM_TOP, MUSIC_LAYER_MIN, MUSIC_OSTINATO_FROM, MUSIC_OSTINATO_FULL, MUSIC_PULSE_LEVEL, MUSIC_VARIATION } from '../../config/audio';
import type { AgeId } from '../../types';
import type { Arrangement } from './arrangers';
import type { VoiceId } from './composer';
import { midiInRange, type BarPlan, type LineNote, type Meter } from './phrases';
import type { Rand } from './theory';

/**
 * The intensity layers (M7 Decision 12) laid over an arranged calm or
 * combat piece: a low-tom percussion pulse (quiet in calm, strong in
 * combat) and an ostinato voice above MUSIC_OSTINATO_FROM. Each note
 * carries the intensity it needs (`min`), so the sequencer thins or fills
 * the texture live; the base arrangement is untouched. Plus the seeded
 * phrase variation of repeated sections.
 */

/** A pulse stroke: [beat in bar, high stroke, velocity, min intensity]. */
type Stroke = readonly [number, boolean, number, number];

const PULSE: Readonly<Record<'calm' | 'combat', Readonly<Record<Meter, readonly Stroke[]>>>> = {
  calm: {
    4: [[0, false, 0.55, 0], [2, false, 0.4, 0.2], [3, true, 0.3, 0.35], [1.5, true, 0.26, 0.45], [3.5, true, 0.24, 0.6], [1, false, 0.3, 0.7]],
    3: [[0, false, 0.55, 0], [2, true, 0.3, 0.25], [1, true, 0.26, 0.4], [2.5, true, 0.22, 0.55], [1.5, false, 0.3, 0.7]],
  },
  combat: {
    4: [[0, false, 0.7, 0], [1, false, 0.4, 0], [2, false, 0.6, 0], [3, false, 0.45, 0.2], [0.5, true, 0.28, 0.4], [2.5, true, 0.3, 0.55], [3.5, true, 0.36, 0.7], [1.5, true, 0.26, 0.9]],
    3: [[0, false, 0.7, 0], [1, false, 0.4, 0], [2, false, 0.5, 0.2], [0.5, true, 0.28, 0.4], [1.5, true, 0.3, 0.6], [2.5, true, 0.34, 0.9]],
  },
};

/** The tom's low stroke per age (its body sounds an octave below); the high stroke is a fourth up. */
const TOM_LOW: Readonly<Record<AgeId, number>> = { 1: 55, 2: 57, 3: 52 };

/** The ostinato voice and its register per age. */
const OSTINATO: Readonly<Record<AgeId, { voice: VoiceId; lo: number; hi: number }>> = {
  1: { voice: 'lyre', lo: 64, hi: 79 },
  2: { voice: 'citole', lo: 62, hi: 76 },
  3: { voice: 'harpsichord', lo: 67, hi: 81 },
};

/** Ostinato figures (scale steps above the chord root, one per eighth). */
const FIGURES: Readonly<Record<Meter, readonly (readonly number[])[]>> = {
  4: [[0, 4, 2, 4, 0, 4, 2, 4], [0, 2, 4, 7, 4, 2, 4, 2], [4, 2, 0, 2, 4, 7, 4, 2]],
  3: [[0, 4, 2, 4, 7, 4], [0, 2, 4, 2, 4, 7]],
};

/** Lays the pulse and the ostinato over a calm or combat piece. */
export function layers(a: Arrangement): void {
  if (a.kind !== 'calm' && a.kind !== 'combat') return;
  pulse(a, a.kind);
  ostinato(a, a.kind);
}

function pulse(a: Arrangement, kind: 'calm' | 'combat'): void {
  const strokes = PULSE[kind][a.bpb];
  const low = TOM_LOW[a.age];
  const level = MUSIC_PULSE_LEVEL[kind];
  for (const bar of a.bars) {
    if (bar.section === 'outro') continue;
    // Breathing room: the intro and a calm full cadence keep only the downbeat; a calm B opens thinner.
    const only = bar.section === 'intro' || (kind === 'calm' && bar.cadence === 'full');
    const lift = kind === 'calm' && bar.section === 'B' && bar.phraseBar < 2 ? 0.15 : bar.section === 'intro' ? 0.3 : 0;
    for (const [at, high, v, min] of strokes) {
      if (only && at !== 0) continue;
      // A calm tier stays reachable without a battle (MUSIC_CALM_TOP).
      const top = kind === 'calm' ? MUSIC_CALM_TOP : 1;
      a.score.add(bar.start + at, 0.25, 'tom', high ? low + 5 : low, v * level * (0.6 + 0.5 * bar.energy), { min: Math.min(top, Math.max(MUSIC_LAYER_MIN, min + lift)), pulse: true });
    }
  }
}

function ostinato(a: Arrangement, kind: 'calm' | 'combat'): void {
  const { voice, lo, hi } = OSTINATO[a.age];
  const figure = a.r.pick(FIGURES[a.bpb]);
  const base = kind === 'combat' ? 0.42 : 0.48;
  for (const bar of a.bars) {
    if (bar.section === 'intro' || bar.section === 'outro') continue;
    if (bar.cadence === 'full') {
      // The cadence: one ringing chord tone, the figure rests.
      a.score.add(bar.start, 1.5, voice, tone(a, bar, 0, lo, hi), base * bar.energy, { min: MUSIC_OSTINATO_FROM });
      continue;
    }
    figure.forEach((step, i) => {
      // In combat the base already runs in eighths: the upper ostinato answers in quarters.
      if (kind === 'combat' && i % 2 === 1) return;
      const min = i % 2 === 0 ? MUSIC_OSTINATO_FROM : MUSIC_OSTINATO_FULL;
      a.score.add(bar.start + i * 0.5, 0.3, voice, tone(a, bar, step, lo, hi), (i === 0 ? base * 1.15 : base) * bar.energy, { min });
    });
  }
}

const tone = (a: Arrangement, bar: BarPlan, step: number, lo: number, hi: number): number => midiInRange(a.mode, bar.chord + step, bar.chord, lo, hi);

/**
 * Phrase variation of a repeated section (seeded): now and then one
 * syncopation (a downbeat note anticipated by half a beat, the note before
 * it shortened) and one octave leap (a long note's second half an octave
 * up, or down when that would leave the register).
 */
export function vary(r: Rand, line: readonly LineNote[], bpb: Meter, register: readonly [number, number]): LineNote[] {
  const out = line.map((n) => ({ ...n }));
  const first = out[0];
  if (!first) return out;
  if (r.chance(MUSIC_VARIATION.displace)) {
    const cands = out
      .map((n, i) => ({ n, i, prev: out[i - 1] }))
      .filter(({ n, i, prev }) => i < out.length - 1 && prev && prev.beats >= 1 && Math.abs(prev.beat + prev.beats - n.beat) < 1e-6 && n.beat - first.beat >= bpb && (n.beat - first.beat) % bpb === 0);
    const c = cands.length > 0 ? r.pick(cands) : null;
    if (c?.prev) {
      c.prev.beats -= 0.5;
      c.n.beat -= 0.5;
      c.n.beats += 0.5;
    }
  }
  if (r.chance(MUSIC_VARIATION.octave)) {
    const cands = out.map((n, i) => ({ n, i })).filter(({ n, i }) => i > 0 && i < out.length - 1 && n.beats >= 1.5);
    const c = cands.length > 0 ? r.pick(cands) : null;
    const shift = c ? (c.n.degree + 7 <= register[1] + 2 ? 7 : c.n.degree - 7 >= register[0] - 2 ? -7 : 0) : 0;
    if (c && shift !== 0) {
      const half = c.n.beats / 2;
      c.n.beats = half;
      out.splice(c.i + 1, 0, { ...c.n, beat: c.n.beat + half, degree: c.n.degree + shift, velocity: c.n.velocity * 0.92 });
    }
  }
  return out;
}
