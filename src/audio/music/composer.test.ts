import { describe, expect, it } from 'vitest';
import { MUSIC_PIECE_VOICES, MUSIC_VOICES } from '../../config/audio';
import type { AgeId } from '../../types';
import { composePiece, modeOf, pieceSeconds, type MusicTrack, type Piece, type VoiceId } from './composer';
import { audible } from './Sequencer';
import { allowedPitchClasses, isPitched } from './theory';

const AGES: readonly AgeId[] = [1, 2, 3];
const TRACKS: readonly MusicTrack[] = ['menu', 'calm_a', 'calm_b', 'combat', 'victory', 'defeat'];
const SEEDS = [1, 7, 42, 1234, 99991, 0xdeadbeef];

/** Most notes of the base layer (intensity 0) sounding at once, counting each voice's release tail (the layers: dynamics.test.ts). */
function peakPolyphony(piece: Piece): number {
  const spb = 60 / piece.bpm;
  const marks: Array<[number, number]> = [];
  for (const e of piece.events) {
    if (!audible(e, 0)) continue;
    const start = e.beat * spb;
    marks.push([start, 1], [start + e.beats * spb + MUSIC_VOICES[e.voice].tailS, -1]);
  }
  marks.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let now = 0;
  let peak = 0;
  for (const [, d] of marks) peak = Math.max(peak, (now += d));
  return peak;
}

describe('composePiece', () => {
  it('same (track, age, seed) → identical piece', () => {
    for (const track of TRACKS) {
      for (const age of AGES) {
        expect(composePiece(track, age, 42)).toEqual(composePiece(track, age, 42));
      }
    }
    // A different seed writes a different piece.
    expect(composePiece('calm_a', 1, 1).events).not.toEqual(composePiece('calm_a', 1, 2).events);
  });

  it('every pitched note is in the age\'s mode', () => {
    for (const seed of SEEDS) {
      for (const age of AGES) {
        for (const track of TRACKS) {
          const mode = modeOf(track, age, seed);
          const allowed = allowedPitchClasses(mode);
          const piece = composePiece(track, age, seed);
          for (const e of piece.events) {
            if (!isPitched(e.voice)) continue;
            expect(allowed.has(((e.midi % 12) + 12) % 12), `${track}/${age}/${seed} midi ${e.midi}`).toBe(true);
          }
        }
        // The modes the brief names, per age.
        const calm = modeOf('calm_a', age, seed);
        if (age === 1) expect(calm.tonic % 12 === 2 && ['dorian', 'phrygian'].includes(calm.name)).toBe(true);
        if (age === 2) expect(['G mixolydian', 'D dorian']).toContain(`${'C D EF G A B'[calm.tonic % 12]} ${calm.name}`);
        if (age === 3) expect(['ionian', 'aeolian']).toContain(calm.name);
      }
    }
  });

  it('age voice sets are disjoint across ages 1-3 (the low tom is the shared percussion layer)', () => {
    const used = new Map<AgeId, Set<VoiceId>>(AGES.map((a) => [a, new Set<VoiceId>()]));
    for (const seed of SEEDS) {
      for (const age of AGES) {
        for (const track of TRACKS.filter((t) => t !== 'menu')) {
          for (const e of composePiece(track, age, seed).events) used.get(age)?.add(e.voice);
        }
      }
    }
    for (const age of AGES) {
      expect(used.get(age)?.has('tom')).toBe(true);
      used.get(age)?.delete('tom');
    }
    expect([...(used.get(1) ?? [])].sort()).toEqual(['aulos', 'frameDrum', 'lyre']);
    expect([...(used.get(2) ?? [])].sort()).toEqual(['bell', 'citole', 'drone', 'recorder', 'tabor']);
    expect([...(used.get(3) ?? [])].sort()).toEqual(['flute', 'harpsichord', 'strings', 'timpani']);
    const menu = new Set(composePiece('menu', 1, 5).events.map((e) => e.voice));
    expect([...menu].sort()).toEqual(['harp', 'pad']);
  });

  it('calm pieces last 60-120 s, stingers 10-15 s', () => {
    for (const seed of SEEDS) {
      for (const age of AGES) {
        for (const track of ['calm_a', 'calm_b'] as const) {
          const p = composePiece(track, age, seed);
          expect(p.loop).toBe(false);
          expect(pieceSeconds(p)).toBeGreaterThanOrEqual(60);
          expect(pieceSeconds(p)).toBeLessThanOrEqual(120);
        }
        for (const track of ['victory', 'defeat'] as const) {
          const p = composePiece(track, age, seed);
          expect(p.loop).toBe(false);
          expect(pieceSeconds(p)).toBeGreaterThanOrEqual(10);
          expect(pieceSeconds(p)).toBeLessThanOrEqual(15);
        }
        expect(composePiece('combat', age, seed).loop).toBe(true);
      }
    }
    expect(composePiece('menu', 1, 3).loop).toBe(true);
  });

  it('combat bpm ≥ 1.3 × calm bpm', () => {
    for (const age of AGES) {
      for (const a of SEEDS) {
        for (const b of SEEDS) {
          const calm = Math.max(composePiece('calm_a', age, a).bpm, composePiece('calm_b', age, a).bpm);
          expect(composePiece('combat', age, b).bpm).toBeGreaterThanOrEqual(1.3 * calm);
        }
      }
    }
  });

  it('never needs more than the voice cap, events sorted and inside the piece', () => {
    for (const seed of SEEDS) {
      for (const age of AGES) {
        for (const track of TRACKS) {
          const p = composePiece(track, age, seed);
          expect(peakPolyphony(p), `${track}/${age}/${seed}`).toBeLessThanOrEqual(MUSIC_PIECE_VOICES);
          for (let i = 1; i < p.events.length; i++) expect(p.events[i]!.beat).toBeGreaterThanOrEqual(p.events[i - 1]!.beat);
          for (const e of p.events) {
            expect(e.beat).toBeGreaterThanOrEqual(0);
            expect(e.beat).toBeLessThan(p.beats);
            expect(e.velocity).toBeGreaterThan(0);
            expect(e.velocity).toBeLessThanOrEqual(1);
            expect(e.beats).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('phrases cadence on the tonic: the last melody note of a calm piece is the tonic', () => {
    for (const seed of SEEDS) {
      for (const age of AGES) {
        const mode = modeOf('calm_a', age, seed);
        const p = composePiece('calm_a', age, seed);
        const melodyVoice = { 1: 'aulos', 2: 'recorder', 3: 'flute' }[age];
        const melody = p.events.filter((e) => e.voice === melodyVoice);
        const last = melody[melody.length - 1];
        expect(last && (last.midi - mode.tonic) % 12 === 0).toBe(true);
      }
    }
  });

  it('melodies move mostly by step and resolve leaps (an octave leap of the phrase variation aside)', () => {
    for (const seed of SEEDS) {
      for (const age of AGES) {
        const melodyVoice = { 1: 'aulos', 2: 'recorder', 3: 'flute' }[age];
        const notes = composePiece('calm_b', age, seed).events.filter((e) => e.voice === melodyVoice);
        let steps = 0;
        let big = 0;
        let octaves = 0;
        for (let i = 1; i < notes.length; i++) {
          const d = Math.abs(notes[i]!.midi - notes[i - 1]!.midi);
          if (d <= 2) steps++;
          // An octave leap (a note's second half an octave away) and the move on from it are the variation's.
          if (d === 12) octaves++;
          else if (d > 9 && !(i > 1 && Math.abs(notes[i - 1]!.midi - notes[i - 2]!.midi) === 12)) big++;
        }
        // At most one octave leap (up and back) per repeated section.
        expect(octaves).toBeLessThanOrEqual(6);
        expect(steps / (notes.length - 1)).toBeGreaterThan(0.45);
        expect(big).toBeLessThanOrEqual(notes.length * 0.05);
      }
    }
  });

  it('minor melodies never step by an augmented second (6th to raised 7th)', () => {
    for (const seed of SEEDS) {
      for (const track of TRACKS.filter((t) => t !== 'menu')) {
        const mode = modeOf(track, 3, seed);
        if (mode.name !== 'aeolian') continue;
        const notes = composePiece(track, 3, seed).events.filter((e) => e.voice === 'flute');
        const pc = (m: number) => (((m - mode.tonic) % 12) + 12) % 12;
        for (let i = 1; i < notes.length; i++) {
          const pair = [pc(notes[i - 1]!.midi), pc(notes[i]!.midi)].sort((x, y) => x - y);
          const step = Math.abs(notes[i]!.midi - notes[i - 1]!.midi);
          expect(step === 3 && pair[0] === 8 && pair[1] === 11, `${track}/${seed} at ${notes[i]!.beat}`).toBe(false);
        }
      }
    }
  });
});
