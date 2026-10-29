import { MUSIC_CALM_BPM, MUSIC_VOICES, MUSIC_COMBAT_BPM_FACTOR, MUSIC_MENU_BPM, MUSIC_STINGER_SECONDS } from '../../config/audio';
import type { AgeId } from '../../types';
import { arrange, type Arrangement, type PieceKind } from './arrangers';
import { layers, vary } from './layers';
import { stinger } from './stingers';
import { ornament, moveLine, Score, writePeriod, type BarPlan, type LineNote, type Meter } from './phrases';
import { rand, subSeed, type Mode, type ModeName, type Rand } from './theory';

/**
 * The composer: a deterministic piece per (track, age, seed). Each age has
 * its modes and instruments; a calm piece is a small form (intro, A, A',
 * B, A'', outro) of 8-bar periods over a modal chord progression, combat
 * is a faster looping form over an ostinato, and the stingers are short
 * cadential flourishes.
 */

export type MusicTrack = 'menu' | 'calm_a' | 'calm_b' | 'combat' | 'victory' | 'defeat';
export type MusicKey = `music_${MusicTrack}`;

/** An instrument (the keys of MUSIC_VOICES, listed there by age). */
export type VoiceId = keyof typeof MUSIC_VOICES;

export interface NoteEvent {
  readonly beat: number;
  readonly beats: number;
  readonly voice: VoiceId;
  readonly midi: number;
  readonly velocity: number;
  /** The intensity this note needs to play (an intensity layer); absent: always. */
  readonly min?: number;
  /** Part of the percussion layer: its level follows the intensity live. */
  readonly pulse?: true;
}

/** How a note of a layer plays: from which intensity, and whether it is the percussion layer. */
export interface LayerTag {
  readonly min?: number;
  readonly pulse?: true;
}

export interface Piece {
  readonly track: MusicTrack;
  readonly age: AgeId;
  readonly bpm: number;
  readonly beats: number;
  readonly loop: boolean;
  readonly events: readonly NoteEvent[];
  /** Beats where a phrase starts, ascending, the first 0 (the tempo may change there and only there). */
  readonly phrases: readonly number[];
}


/** A piece's length in seconds. */
export function pieceSeconds(piece: Piece): number {
  return (piece.beats * 60) / piece.bpm;
}

const D4 = 62;
const G4 = 67;
const AGE3_MAJOR_TONICS = [60, 62, 65, 67] as const;

const key = (name: ModeName, tonic: number): Mode => ({ name, tonic });

/** The key of a piece: Roman D Dorian / Phrygian, medieval G Mixolydian / D Dorian, early-modern major or relative minor. */
export function modeOf(track: MusicTrack, age: AgeId, seed: number): Mode {
  if (track === 'menu') return key('aeolian', D4);
  const r = rand(subSeed(seed, `mode:${age}`));
  const pick = r.next() < 0.5;
  if (age === 1) {
    if (track === 'combat' || track === 'defeat') return key('phrygian', D4);
    if (track === 'victory') return key('dorian', D4);
    return pick ? key('dorian', D4) : key('phrygian', D4);
  }
  if (age === 2) {
    if (track === 'combat' || track === 'defeat') return key('dorian', D4);
    if (track === 'victory') return key('mixolydian', G4);
    return pick ? key('mixolydian', G4) : key('dorian', D4);
  }
  const major = r.pick(AGE3_MAJOR_TONICS);
  if (track === 'victory') return key('ionian', major);
  if (track === 'combat' || track === 'defeat') return key('aeolian', major - 3);
  return pick ? key('ionian', major) : key('aeolian', major - 3);
}

/** 8-bar progressions (question → half cadence, answer → tonic) per mode: [A variants, B variants]. */
const PROGRESSIONS: Readonly<Record<ModeName, readonly [readonly number[][], readonly number[][]]>> = {
  dorian: [
    [[0, 3, 0, 4, 0, 3, 6, 0], [0, 6, 3, 4, 0, 6, 3, 0]],
    [[6, 3, 6, 4, 2, 3, 6, 0], [2, 6, 3, 4, 3, 2, 6, 0]],
  ],
  phrygian: [
    [[0, 1, 0, 6, 5, 6, 1, 0], [0, 6, 1, 6, 0, 5, 1, 0]],
    [[2, 1, 2, 6, 5, 3, 1, 0], [5, 6, 2, 6, 3, 5, 1, 0]],
  ],
  mixolydian: [
    [[0, 6, 0, 4, 0, 6, 3, 0], [0, 3, 6, 4, 0, 3, 6, 0]],
    [[3, 3, 0, 6, 3, 0, 6, 0], [6, 3, 6, 4, 3, 6, 3, 0]],
  ],
  ionian: [
    [[0, 3, 1, 4, 5, 3, 4, 0], [0, 5, 3, 4, 0, 1, 4, 0]],
    [[5, 2, 3, 4, 5, 1, 4, 0], [3, 0, 1, 4, 5, 3, 4, 0]],
  ],
  aeolian: [
    [[0, 3, 0, 4, 5, 3, 4, 0], [0, 5, 3, 4, 0, 5, 4, 0]],
    [[2, 6, 5, 4, 2, 5, 4, 0], [5, 2, 6, 4, 3, 5, 4, 0]],
  ],
};

/** Combat progressions: darker and more driving. */
const COMBAT: Readonly<Partial<Record<ModeName, readonly [readonly number[], readonly number[]]>>> = {
  phrygian: [[0, 1, 0, 6, 0, 1, 6, 0], [5, 6, 5, 1, 5, 6, 1, 0]],
  dorian: [[0, 6, 0, 4, 0, 6, 3, 0], [3, 6, 3, 4, 2, 3, 6, 0]],
  aeolian: [[0, 5, 6, 4, 0, 5, 4, 0], [5, 6, 2, 4, 5, 3, 4, 0]],
};

type Letter = 'A' | 'B';

/** Bars of a form: intro bars on the tonic, 8-bar sections, outro bars on the tonic. */
function buildForm(sections: readonly Letter[], chords: Readonly<Record<Letter, readonly number[]>>, bpb: Meter, intro: number, outro: number, lift: number): BarPlan[] {
  const bars: BarPlan[] = [];
  const push = (b: Omit<BarPlan, 'start'>) => bars.push({ ...b, start: bars.length * bpb });
  for (let i = 0; i < intro; i++) push({ chord: 0, section: 'intro', phraseBar: -1, cadence: null, repeat: 0, energy: 0.68 + lift });
  const seen: Record<Letter, number> = { A: 0, B: 0 };
  for (const letter of sections) {
    const repeat = seen[letter]++;
    const energy = Math.min(0.95, (letter === 'A' ? 0.72 + 0.07 * repeat : 0.64 + 0.06 * repeat) + lift);
    chords[letter].forEach((chord, i) => {
      const cadence = i === 3 ? 'half' : i === 7 ? 'full' : null;
      push({ chord, section: letter, phraseBar: i % 4, cadence, repeat, energy });
    });
  }
  for (let i = 0; i < outro; i++) push({ chord: 0, section: 'outro', phraseBar: -1, cadence: null, repeat: 0, energy: 0.6 + lift });
  return bars;
}

/** The melodies' range in scale degrees. */
const MELODY_REGISTER = [-2, 9] as const;

/** The melody of every section: each letter is written once, its repeats are ornamented copies. */
function melodies(r: Rand, v: Rand, mode: Mode, bars: readonly BarPlan[], bpb: Meter, density: number, velocity: number): LineNote[][] {
  const out: LineNote[][] = [];
  const first: Partial<Record<Letter, { line: LineNote[]; start: number }>> = {};
  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    if (!bar || bar.phraseBar !== 0 || (bar.section !== 'A' && bar.section !== 'B') || bars[i - 1]?.cadence === 'half') continue;
    const letter = bar.section;
    const seed = first[letter];
    if (!seed) {
      const start = letter === 'A' ? r.pick([0, 2, 4]) : 4;
      const style = { start, peak: Math.min(9, start + (letter === 'A' ? r.int(4, 6) : r.int(3, 5))) };
      const line = writePeriod(r, mode, bars.slice(i, i + 8), { bpb, density: letter === 'B' ? Math.min(1, density + 0.2) : density, ...style, register: MELODY_REGISTER, velocity });
      first[letter] = { line, start: bar.start };
      out.push(line);
    } else {
      out.push(moveLine(vary(v, ornament(r, seed.line, 0.25 + 0.15 * bar.repeat), bpb, MELODY_REGISTER), bar.start - seed.start));
    }
  }
  return out;
}

interface Plan {
  readonly bpb: Meter;
  readonly bpm: number;
  readonly sections: readonly Letter[];
  readonly intro: number;
  readonly outro: number;
  readonly loop: boolean;
  readonly density: number;
}

function planFor(kind: PieceKind, age: AgeId, r: Rand): Plan {
  const [lo, hi] = MUSIC_CALM_BPM[age];
  const ageMeter: Meter = age === 1 ? 4 : age === 2 ? 3 : r.chance(0.5) ? 3 : 4;
  if (kind === 'menu') return { bpb: 4, bpm: MUSIC_MENU_BPM, sections: ['A', 'B', 'A', 'B'], intro: 0, outro: 0, loop: true, density: 0.2 };
  if (kind === 'combat') {
    return { bpb: age === 2 ? 3 : 4, bpm: Math.ceil(hi * MUSIC_COMBAT_BPM_FACTOR), sections: ['A', 'A', 'B', 'A'], intro: 0, outro: 0, loop: true, density: 0.75 };
  }
  if (kind === 'calm') {
    const sections: Letter[] = ageMeter === 3 ? ['A', 'A', 'B', 'B', 'A'] : ['A', 'A', 'B', 'A'];
    return { bpb: ageMeter, bpm: r.int(lo, hi), sections, intro: 2, outro: 2, loop: false, density: r.next() * 0.5 };
  }
  const bpm = kind === 'victory' ? lo : Math.round(lo * 0.75);
  const barSeconds = (ageMeter * 60) / bpm;
  const bars = Math.ceil(MUSIC_STINGER_SECONDS[kind] / barSeconds);
  return { bpb: ageMeter, bpm, sections: [], intro: bars, outro: 0, loop: false, density: 0.5 };
}

/** Beats where a phrase starts: the first bar, each 4-bar phrase, and the first intro / outro bar. */
function phraseStarts(bars: readonly BarPlan[]): number[] {
  return bars.filter((b, i) => i === 0 || b.phraseBar === 0 || (b.phraseBar === -1 && bars[i - 1]?.section !== b.section)).map((b) => b.start);
}

/** A piece for `track` in `age`; the same arguments always write the same piece. */
export function composePiece(track: MusicTrack, age: AgeId, seed: number): Piece {
  const kind: PieceKind = track === 'calm_a' || track === 'calm_b' ? 'calm' : track;
  const r = rand(subSeed(seed, `${track}:${age}`));
  const mode = modeOf(track, age, seed);
  const plan = planFor(kind, age, r);
  const [aChoices, bChoices] = PROGRESSIONS[mode.name];
  const combat = kind === 'combat' ? COMBAT[mode.name] : undefined;
  const chords = { A: combat?.[0] ?? r.pick(aChoices), B: combat?.[1] ?? r.pick(bChoices) };
  const bars = buildForm(plan.sections, chords, plan.bpb, plan.intro, plan.outro, kind === 'combat' ? 0.1 : 0);
  const beats = bars.length * plan.bpb;
  const score = new Score(rand(subSeed(seed, `human:${track}`)), plan.bpm, beats);
  const ctx: Arrangement = {
    r,
    mode,
    age,
    kind,
    bpb: plan.bpb,
    bars,
    score,
    melodies:
      kind === 'victory' || kind === 'defeat' ? [] : melodies(r, rand(subSeed(seed, `vary:${track}`)), mode, bars, plan.bpb, plan.density, kind === 'combat' ? 0.7 : 0.62),
  };
  if (kind === 'victory' || kind === 'defeat') {
    stinger(ctx);
  } else {
    arrange(ctx);
    layers(ctx);
  }
  return { track, age, bpm: plan.bpm, beats, loop: plan.loop, events: score.done(), phrases: phraseStarts(bars) };
}
