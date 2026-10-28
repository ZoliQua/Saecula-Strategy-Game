import { DRUM_HIGH, DRUM_LOW, octaveFor, pad, roll, type Arrangement } from './arrangers';
import type { VoiceId } from './composer';
import { midiInRange, voiceChord, writeShape, type BarPlan, type Rhythm } from './phrases';
import { semitones, type ModeName } from './theory';

/**
 * Victory and defeat stingers (10–15 s, played once): a fanfare rising to
 * the high tonic over a cadence and a held final chord, or a slow
 * descending lament settling on the low tonic.
 */

/** The two chords before the final tonic of a victory. */
const VICTORY_CADENCE: Readonly<Record<ModeName, readonly [number, number]>> = {
  dorian: [3, 6],
  mixolydian: [3, 6],
  ionian: [3, 4],
  aeolian: [3, 4],
  phrygian: [5, 1],
};
/** The chords a defeat walks through before its tonic. */
const DEFEAT_STEPS: Readonly<Record<ModeName, readonly number[]>> = {
  dorian: [0, 3, 6, 3],
  phrygian: [0, 5, 1, 5],
  aeolian: [0, 3, 5, 4],
  ionian: [5, 3, 1, 4],
  mixolydian: [0, 6, 3, 6],
};

const FANFARE: Readonly<Record<3 | 4, readonly Rhythm[]>> = {
  4: [
    [[0, 0.5], [0.5, 0.5], [1, 1], [2, 1.5], [3.5, 0.5]],
    [[0, 1], [1, 1], [2, 1], [3, 1]],
  ],
  3: [
    [[0, 0.5], [0.5, 0.5], [1, 1], [2, 1]],
    [[0, 1.5], [1.5, 0.5], [2, 1]],
  ],
};
const LAMENT: Readonly<Record<3 | 4, readonly Rhythm[]>> = {
  4: [[[0, 2], [2, 2]], [[0, 1.5], [1.5, 0.5], [2, 2]]],
  3: [[[0, 2], [2, 1]], [[0, 1.5], [1.5, 0.5], [2, 1]]],
};

const MELODY: Readonly<Record<1 | 2 | 3, { voice: VoiceId; lo: number }>> = {
  1: { voice: 'aulos', lo: 60 },
  2: { voice: 'recorder', lo: 67 },
  3: { voice: 'flute', lo: 69 },
};

export function stinger(a: Arrangement): void {
  const victory = a.kind === 'victory';
  const { bpb, mode, score } = a;
  const n = a.bars.length;
  const hold = victory ? 2 : 1;
  const pre = n - hold;
  const [lead, turn] = VICTORY_CADENCE[mode.name];
  const steps = DEFEAT_STEPS[mode.name];
  const chords = a.bars.map((_, i) => {
    if (i >= pre) return 0;
    if (!victory) return steps[i % steps.length] ?? 0;
    if (i === pre - 1) return turn;
    if (i === pre - 2) return lead;
    return i % 2 === 0 ? 0 : lead;
  });
  const bars: BarPlan[] = a.bars.map((b, i) => ({
    ...b,
    chord: chords[i] ?? 0,
    phraseBar: i,
    energy: victory ? 0.7 + (0.25 * i) / n : 0.55 - (0.15 * i) / n,
  }));
  const end = n * bpb;
  const held = hold * bpb - 0.75;
  const rhythms: Rhythm[] = [];
  for (let i = 0; i < pre; i++) rhythms.push((victory ? FANFARE : LAMENT)[bpb][i % 2] ?? [[0, bpb]]);
  rhythms.push([[0, held]]);
  const tune = victory
    ? writeShape(a.r, mode, bars.slice(0, pre + 1), rhythms, bpb, { start: 0, peak: 7, end: 7, peakAt: 0.95 }, [-1, 9], 7, 0.74)
    : writeShape(a.r, mode, bars.slice(0, pre + 1), rhythms, bpb, { start: 4, peak: 5, end: 0, peakAt: 0.2 }, [-3, 7], 0, 0.5);
  const age = a.age;
  const lead1 = MELODY[age];
  score.line(tune, lead1.voice, mode, octaveFor(mode, lead1.lo));
  const finalBar = bars[pre];
  if (!finalBar) return;
  const v = victory ? 0.75 : 0.45;

  if (age === 1) {
    let prev: number[] | null = null;
    for (const bar of bars.slice(0, pre)) {
      const chord = (prev = voiceChord(mode, bar.chord, 59, prev));
      score.add(bar.start, victory ? 1.8 : bpb - 0.2, 'lyre', midiInRange(mode, bar.chord, bar.chord, 45, 56), v * 0.7);
      roll(a, bar.start + 0.05, victory ? 1.8 : bpb - 0.3, 'lyre', chord, v * 0.55, victory ? 0.04 : 0.09);
      if (victory) roll(a, bar.start + 2, 1.8, 'lyre', chord, v * 0.5);
      if (victory) score.add(bar.start, 0.3, 'frameDrum', DRUM_LOW, v * 0.7);
    }
    const last = bars[pre - 1];
    if (victory && last) [2, 2.5, 3, 3.5].forEach((at, i) => score.add(last.start + at, 0.2, 'frameDrum', DRUM_HIGH, 0.3 + 0.08 * i));
    const chord = voiceChord(mode, 0, 59, prev);
    score.add(finalBar.start, end - finalBar.start - 0.5, 'lyre', midiInRange(mode, 0, 0, 45, 56), v * 0.75);
    roll(a, finalBar.start + 0.06, end - finalBar.start - 0.6, 'lyre', victory ? [...chord, (chord[0] ?? 62) + 12] : chord.slice(0, 2), v * 0.6, 0.08);
    score.add(finalBar.start, 0.4, 'frameDrum', DRUM_LOW, victory ? 0.75 : 0.35);
    return;
  }

  if (age === 2) {
    score.add(0, end - 0.5, 'drone', midiInRange(mode, 0, 0, 43, 54), v * 0.8);
    score.add(0, end - 0.5, 'drone', midiInRange(mode, 4, 0, 50, 61), v * 0.65);
    if (victory) {
      // Organum under the fanfare's long notes.
      for (const t of tune) {
        if (t.beats < 1) continue;
        const below = [t.degree - 3, t.degree - 4].find((d) => [5, 7].includes(semitones(mode, t.degree, d, t.chord)));
        if (below !== undefined) score.line([{ ...t, degree: below, velocity: t.velocity * 0.6 }], 'recorder', mode, octaveFor(mode, 67));
      }
      for (const bar of bars.slice(0, pre)) score.add(bar.start, 0.2, 'tabor', DRUM_LOW, 0.5);
      const last = bars[pre - 1];
      if (last) [1, 1.5, 2, 2.5].forEach((at, i) => score.add(last.start + at, 0.2, 'tabor', DRUM_HIGH, 0.3 + 0.07 * i));
      score.add(finalBar.start, 0.2, 'tabor', DRUM_LOW, 0.7);
      [0, 4, 7].forEach((d, i) => score.add(finalBar.start + i * 0.5, 2, 'bell', midiInRange(mode, d, 0, 72, 86), 0.5 - 0.05 * i));
    } else {
      score.add(finalBar.start, 2, 'bell', midiInRange(mode, 0, 0, 60, 71), 0.35);
    }
    return;
  }

  pad(a, 'strings', 62, bars, (b) => (victory ? 0.5 + 0.3 * b.energy : 0.4), 2);
  for (const bar of bars.slice(0, pre)) {
    const bass = midiInRange(mode, bar.chord, bar.chord, 41, 53);
    score.add(bar.start, victory ? 0.9 : bpb - 0.3, 'harpsichord', bass, v * 0.7);
    if (victory) {
      const chord = voiceChord(mode, bar.chord, 62, null);
      roll(a, bar.start + 0.03, 0.9, 'harpsichord', chord, v * 0.5, 0.03);
      if (bpb === 4) roll(a, bar.start + 2.03, 0.9, 'harpsichord', chord.slice(1), v * 0.45, 0.03);
    }
  }
  const last = bars[pre - 1];
  if (victory && last) {
    score.add(last.start + bpb - 0.5, 0.5, 'timpani', midiInRange(mode, 4, 4, 41, 52), 0.55);
  }
  score.add(finalBar.start, end - finalBar.start - 0.5, 'harpsichord', midiInRange(mode, 0, 0, 41, 53), v * 0.7);
  if (victory) roll(a, finalBar.start + 0.05, end - finalBar.start - 0.6, 'harpsichord', voiceChord(mode, 0, 64, null), v * 0.55, 0.05);
  score.add(finalBar.start, 0.5, 'timpani', midiInRange(mode, 0, 0, 41, 52), victory ? 0.7 : 0.35);
}
