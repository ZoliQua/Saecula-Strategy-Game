import { describe, expect, it } from 'vitest';
import {
  MUSIC_CROSSFADE_MS,
  MUSIC_INTENSITY,
  MUSIC_INTENSITY_RISE_MS,
  MUSIC_LAYER_MIN,
  MUSIC_LAYER_VOICES,
  MUSIC_MAX_VOICES,
  MUSIC_OSTINATO_FROM,
  MUSIC_PIECE_VOICES,
  MUSIC_TEMPO_LIFT,
  MUSIC_VOICES,
} from '../../config/audio';
import type { AgeId } from '../../types';
import { composePiece, type MusicTrack, type NoteEvent, type Piece } from './composer';
import { fakeAudio } from './fakeAudio.testkit';
import { vary } from './layers';
import { intensityTarget, MusicDirector, smoothIntensity, type DirectorInput } from './MusicDirector';
import { MusicPlayer } from './MusicPlayer';
import { audible, liveVelocity, nextPhrase, Sequencer, tempoFactor } from './Sequencer';
import { rand } from './theory';

const AGES: readonly AgeId[] = [1, 2, 3];
const SEEDS = [1, 7, 42, 1234, 99991, 0xdeadbeef];
const LEVELS = [0, 0.25, 0.5, 0.75, 1];

/** Most notes sounding at once at `intensity` (release tails counted). */
function peakAt(piece: Piece, intensity: number): number {
  const spb = 60 / piece.bpm;
  const marks: Array<[number, number]> = [];
  for (const e of piece.events) {
    if (!audible(e, intensity)) continue;
    const start = e.beat * spb;
    marks.push([start, 1], [start + e.beats * spb + MUSIC_VOICES[e.voice].tailS, -1]);
  }
  marks.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let now = 0;
  let peak = 0;
  for (const [, d] of marks) peak = Math.max(peak, (now += d));
  return peak;
}

/** The percussion layer's loudness per beat at `intensity`. */
function pulsePerBeat(piece: Piece, intensity: number): number {
  const notes = piece.events.filter((e) => e.pulse && audible(e, intensity));
  return notes.reduce((s, e) => s + liveVelocity(e, intensity), 0) / piece.beats;
}

describe('intensity layers (composer)', () => {
  it('the note count grows with the intensity, calm and combat, every age', () => {
    for (const seed of SEEDS) {
      for (const age of AGES) {
        for (const track of ['calm_a', 'calm_b', 'combat'] as MusicTrack[]) {
          const p = composePiece(track, age, seed);
          const counts = LEVELS.map((k) => p.events.filter((e) => audible(e, k)).length);
          for (let i = 1; i < counts.length; i++) expect(counts[i]!, `${track}/${age}/${seed} ${counts.join(',')}`).toBeGreaterThan(counts[i - 1]!);
          // Intensity 1 is clearly busier (≥ 1.4× the notes of intensity 0).
          expect(counts[4]! / counts[0]!).toBeGreaterThan(1.4);
        }
      }
    }
  });

  it('at intensity 0 a piece is its base arrangement: every layer note needs at least MUSIC_LAYER_MIN', () => {
    for (const age of AGES) {
      const p = composePiece('calm_a', age, 42);
      const layer = p.events.filter((e) => e.min !== undefined);
      expect(layer.length).toBeGreaterThan(0);
      for (const e of layer) expect(e.min!).toBeGreaterThanOrEqual(MUSIC_LAYER_MIN);
      expect(p.events.filter((e) => e.pulse).every((e) => e.voice === 'tom')).toBe(true);
    }
  });

  it('the percussion layer is present in battle and quieter in calm', () => {
    for (const seed of SEEDS) {
      for (const age of AGES) {
        const calm = composePiece('calm_a', age, seed);
        const combat = composePiece('combat', age, seed);
        // Typical levels: calm with a few units moving, a battle.
        const calmLevel = pulsePerBeat(calm, 0.3);
        const battleLevel = pulsePerBeat(combat, 0.85);
        expect(calmLevel).toBeGreaterThan(0);
        expect(combat.events.some((e) => e.pulse && audible(e, 0.6))).toBe(true);
        expect(battleLevel, `${age}/${seed}`).toBeGreaterThan(3 * calmLevel);
        // Live: the same note is louder at a higher intensity.
        const stroke = combat.events.find((e) => e.pulse)!;
        expect(liveVelocity(stroke, 1)).toBeGreaterThan(liveVelocity(stroke, 0.2));
        expect(liveVelocity(stroke, 1)).toBeCloseTo(stroke.velocity, 6);
      }
    }
  });

  it('the ostinato voice enters only above MUSIC_OSTINATO_FROM', () => {
    const voices = (p: Piece, k: number) => new Set(p.events.filter((e) => audible(e, k)).map((e) => e.voice));
    const ost = { 1: 'lyre', 2: 'citole', 3: 'harpsichord' } as const;
    for (const age of AGES) {
      const p = composePiece('calm_b', age, 7);
      const ostinato = p.events.filter((e) => e.voice === ost[age] && e.min !== undefined);
      expect(ostinato.length).toBeGreaterThan(20);
      expect(ostinato.every((e) => e.min! >= MUSIC_OSTINATO_FROM)).toBe(true);
      if (age === 2) {
        expect(voices(p, 0.45).has('citole')).toBe(false);
        expect(voices(p, 0.55).has('citole')).toBe(true);
      }
    }
  });

  it('the base layer stays within MUSIC_PIECE_VOICES, the full layers within MUSIC_LAYER_VOICES more', () => {
    for (const seed of SEEDS) {
      for (const age of AGES) {
        for (const track of ['calm_a', 'calm_b', 'combat'] as MusicTrack[]) {
          const p = composePiece(track, age, seed);
          expect(peakAt(p, 0)).toBeLessThanOrEqual(MUSIC_PIECE_VOICES);
          for (const k of LEVELS) expect(peakAt(p, k), `${track}/${age}/${seed}@${k}`).toBeLessThanOrEqual(MUSIC_PIECE_VOICES + MUSIC_LAYER_VOICES);
        }
      }
    }
    expect(MUSIC_PIECE_VOICES + MUSIC_LAYER_VOICES).toBeLessThan(MUSIC_MAX_VOICES);
  });

  it('phrase starts: 0 first, ascending, on bar lines, inside the piece', () => {
    for (const age of AGES) {
      for (const track of ['calm_a', 'combat', 'menu', 'victory'] as MusicTrack[]) {
        const p = composePiece(track, age, 99);
        expect(p.phrases[0]).toBe(0);
        for (let i = 1; i < p.phrases.length; i++) expect(p.phrases[i]!).toBeGreaterThan(p.phrases[i - 1]!);
        expect(p.phrases.every((b) => b < p.beats)).toBe(true);
        if (track === 'calm_a') expect(p.phrases.length).toBeGreaterThanOrEqual(8);
      }
    }
  });
});

describe('phrase variation', () => {
  const line = [
    { beat: 0, beats: 2, degree: 2, chord: 0, velocity: 0.6 },
    { beat: 2, beats: 2, degree: 3, chord: 0, velocity: 0.6 },
    { beat: 4, beats: 1, degree: 4, chord: 3, velocity: 0.6 },
    { beat: 5, beats: 1, degree: 3, chord: 3, velocity: 0.6 },
    { beat: 6, beats: 2, degree: 2, chord: 3, velocity: 0.6 },
    { beat: 8, beats: 3, degree: 0, chord: 0, velocity: 0.6 },
  ];

  it('is seeded: the same stream gives the same line, and the source line is not changed', () => {
    const copy = JSON.stringify(line);
    expect(vary(rand(5), line, 4, [-2, 9])).toEqual(vary(rand(5), line, 4, [-2, 9]));
    expect(JSON.stringify(line)).toBe(copy);
  });

  it('a displacement anticipates a downbeat by half a beat; an octave leap splits a long note; the end stays the tonic', () => {
    let displaced = 0;
    let leaps = 0;
    for (let s = 0; s < 60; s++) {
      const out = vary(rand(s), line, 4, [-2, 9]);
      if (out.some((n) => n.beat === 3.5)) displaced++;
      if (out.length > line.length) {
        leaps++;
        const i = out.findIndex((n, j) => j > 0 && Math.abs(n.degree - out[j - 1]!.degree) === 7);
        expect(i).toBeGreaterThan(0);
        expect(out[i]!.beat).toBe(out[i - 1]!.beat + out[i - 1]!.beats);
      }
      // The total length and the final tonic never change.
      const last = out[out.length - 1]!;
      expect(last.beat + last.beats).toBe(11);
      expect(last.degree).toBe(0);
    }
    expect(displaced).toBeGreaterThan(10);
    expect(leaps).toBeGreaterThan(5);
  });
});

describe('tempo', () => {
  it('tempoFactor: 1 at rest, at most +12 % at intensity 1 (clamped)', () => {
    expect(tempoFactor(0)).toBe(1);
    expect(tempoFactor(1)).toBeCloseTo(1 + MUSIC_TEMPO_LIFT, 9);
    expect(tempoFactor(5)).toBeCloseTo(1.12, 9);
    expect(tempoFactor(-1)).toBe(1);
    expect(tempoFactor(0.5)).toBeGreaterThan(1);
  });

  it('nextPhrase: the next start after a beat, repeating with a loop', () => {
    const p = { track: 'combat', age: 1, bpm: 60, beats: 16, loop: true, events: [], phrases: [0, 8] } as Piece;
    expect(nextPhrase(p, 0)).toBe(8);
    expect(nextPhrase(p, 8)).toBe(16);
    expect(nextPhrase(p, 17)).toBe(24);
    expect(nextPhrase({ ...p, loop: false }, 8)).toBe(Number.POSITIVE_INFINITY);
  });

  it('the tempo changes only at a phrase start, never mid-phrase', () => {
    const fake = fakeAudio();
    const seq = new Sequencer(fake.audio, fake.ctx.destination as unknown as AudioNode);
    const events: NoteEvent[] = Array.from({ length: 16 }, (_, b) => ({ beat: b, beats: 0.5, voice: 'harpsichord', midi: 62, velocity: 0.5 }));
    seq.play({ track: 'calm_a', age: 3, bpm: 60, beats: 16, loop: false, events, phrases: [0, 8] }, 0);
    for (let t = 0; t <= 16; t += 0.05) {
      if (t >= 3) seq.intensity = 1;
      fake.advance(t);
      seq.update();
      if (t < 7.85) expect(seq.tempo).toBe(1);
    }
    const starts = [...new Set(fake.sources.map((s) => s.startedAt).filter((x): x is number => x !== null))].sort((a, b) => a - b);
    expect(starts.length).toBe(16);
    // Beats 0–8 at the old tempo (the intensity rose at 3 s, inside the first phrase).
    for (let b = 0; b <= 8; b++) expect(starts[b]!).toBeCloseTo(b, 6);
    // From the phrase at beat 8: 12 % faster.
    for (let b = 9; b < 16; b++) expect(starts[b]! - starts[b - 1]!).toBeCloseTo(1 / 1.12, 6);
    expect(seq.tempo).toBeCloseTo(1.12, 9);
  });
});

describe('intensity (MusicDirector)', () => {
  it('intensityTarget: the age base, the units in motion and a battle, clamped to 0..1', () => {
    expect(intensityTarget(1, 0, false)).toBeCloseTo(MUSIC_INTENSITY.ageBase[1], 9);
    expect(intensityTarget(3, 0, false)).toBeGreaterThan(intensityTarget(1, 0, false));
    expect(intensityTarget(1, 6, false)).toBeGreaterThan(intensityTarget(1, 2, false));
    // Full at movingFull units, no more after.
    expect(intensityTarget(1, MUSIC_INTENSITY.movingFull, false)).toBeCloseTo(intensityTarget(1, 500, false), 9);
    expect(intensityTarget(1, 0, true)).toBeGreaterThan(0.6);
    expect(intensityTarget(3, 500, true)).toBe(1);
    expect(intensityTarget(1, -4, false)).toBeCloseTo(MUSIC_INTENSITY.ageBase[1], 9);
  });

  it('smoothIntensity: rises within a few seconds, falls slower, never overshoots', () => {
    const up = smoothIntensity(0, 1, MUSIC_INTENSITY_RISE_MS);
    expect(up).toBeCloseTo(1 - Math.exp(-1), 6);
    const down = smoothIntensity(1, 0, MUSIC_INTENSITY_RISE_MS);
    expect(1 - down).toBeLessThan(up);
    expect(smoothIntensity(0.4, 0.4, 1000)).toBe(0.4);
    expect(smoothIntensity(0.3, 0.9, 0)).toBe(0.3);
    let x = 0;
    for (let i = 0; i < 1000; i++) x = smoothIntensity(x, 0.7, 16);
    expect(x).toBeLessThanOrEqual(0.7);
    expect(x).toBeGreaterThan(0.69);
  });

  it('follows the game: starts at its target, swells in a battle near the camera, settles after; 0 in the menu', () => {
    const d = new MusicDirector(3);
    const input = (over: Partial<DirectorInput> = {}): DirectorInput => ({ scene: 'game', age: 2, combatNear: false, pieceEndsAtMs: 90_000, movingUnits: 0, ...over });
    d.update(0, input());
    expect(d.intensity).toBeCloseTo(intensityTarget(2, 0, false), 9);
    // Twenty units marching: higher, smoothly (not a jump).
    d.update(500, input({ movingUnits: 20 }));
    const early = d.intensity;
    expect(early).toBeGreaterThan(intensityTarget(2, 0, false));
    expect(early).toBeLessThan(intensityTarget(2, 20, false));
    let t = 500;
    for (; t < 20_000; t += 100) d.update(t, input({ movingUnits: 20 }));
    expect(d.intensity).toBeCloseTo(intensityTarget(2, 20, false), 2);
    // A battle near the camera: combat music, and the battle term.
    for (const end = t + 8000; t < end; t += 100) d.update(t, input({ combatNear: true, movingUnits: 20 }));
    expect(d.current).toBe('combat');
    expect(d.intensity).toBeGreaterThan(0.9);
    // The fight ends: back to calm after the hold, the intensity settles back.
    for (const end = t + 60_000; t < end; t += 100) d.update(t, input({ pieceEndsAtMs: 1e9 }));
    expect(d.current).not.toBe('combat');
    expect(d.intensity).toBeLessThan(intensityTarget(2, 0, false) + 0.02);
    d.update(t, input({ scene: 'menu' }));
    expect(d.intensity).toBe(0);
  });
});

describe('the voice cap at intensity 1', () => {
  it('a combat → calm crossfade at intensity 1 keeps the music budget at 16', () => {
    for (const [from, to] of [[1, 3], [2, 2], [3, 1]] as const) {
      const fake = fakeAudio();
      const out = fake.ctx.createGain();
      const player = new MusicPlayer(fake.audio, out as unknown as AudioNode, { get: () => undefined });
      player.holdIntensity(1);
      player.play('combat', MUSIC_CROSSFADE_MS, from, 9);
      let budget = 0;
      let sounding = 0;
      for (let t = 0; t < 24; t += 0.05) {
        if (Math.abs(t - 8) < 0.01) player.play('calm_b', MUSIC_CROSSFADE_MS, to, 9);
        fake.advance(t);
        player.update(t * 1000);
        budget = Math.max(budget, player.stats().budget);
        sounding = Math.max(sounding, player.stats().voices);
      }
      expect(player.stats().intensity).toBe(1);
      expect(budget).toBeGreaterThan(8);
      expect(budget).toBeLessThanOrEqual(MUSIC_MAX_VOICES);
      expect(MUSIC_MAX_VOICES).toBe(16);
      // Only stolen notes in their 0.15 s fade may sound beyond the budget (more steal at intensity 1).
      expect(sounding).toBeLessThanOrEqual(MUSIC_MAX_VOICES + 4);
    }
  });
});
