import { describe, expect, it } from 'vitest';
import type { NoteEvent, Piece } from './composer';
import type { Voice } from './instruments';
import { fakeAudio } from './fakeAudio.testkit';
import { eventsInWindow, heldAt, pickSteal, Sequencer, VoicePool } from './Sequencer';

const note = (beat: number): NoteEvent => ({ beat, beats: 0.5, voice: 'lyre', midi: 62, velocity: 0.5 });

function piece(loop: boolean): Piece {
  return { track: 'calm_a', age: 1, bpm: 120, beats: 8, loop, events: [note(0), note(1.5), note(4), note(7.75)] };
}

describe('eventsInWindow', () => {
  it('eventsInWindow returns events with from ≤ beat < to, looping when loop is true', () => {
    const once = piece(false);
    expect(eventsInWindow(once, 0, 1.5).map((e) => e.beat)).toEqual([0]);
    expect(eventsInWindow(once, 1.5, 4).map((e) => e.beat)).toEqual([1.5]);
    expect(eventsInWindow(once, 4, 4)).toEqual([]);
    expect(eventsInWindow(once, 3.99, 8).map((e) => e.beat)).toEqual([4, 7.75]);
    // Not looping: nothing after the end.
    expect(eventsInWindow(once, 8, 20)).toEqual([]);

    const looped = piece(true);
    // The window wraps the loop point: beats come back unwrapped (absolute), in order.
    expect(eventsInWindow(looped, 7, 9.6).map((e) => e.beat)).toEqual([7.75, 8, 9.5]);
    // Several periods in one window.
    expect(eventsInWindow(looped, 0, 24).length).toBe(12);
    expect(eventsInWindow(looped, 16, 16.0001).map((e) => e.beat)).toEqual([16]);
    // Other fields are kept.
    expect(eventsInWindow(looped, 12, 13)[0]).toEqual({ ...note(4), beat: 12 });
  });

  it('an empty or inverted window returns nothing', () => {
    expect(eventsInWindow(piece(true), 5, 5)).toEqual([]);
    expect(eventsInWindow(piece(true), 6, 2)).toEqual([]);
    expect(eventsInWindow({ ...piece(true), events: [] }, 0, 100)).toEqual([]);
  });
});

describe('heldAt', () => {
  it('returns the long notes that started in the skipped span and still sound, with their beats left', () => {
    const drone: NoteEvent = { beat: 2, beats: 20, voice: 'drone', midi: 50, velocity: 0.6 };
    const p: Piece = { ...piece(false), beats: 32, events: [note(0), drone, note(3)] };
    // Skipped beats 1..10: the drone (beats 2..22) is still held at 10, the short note is not.
    expect(heldAt(p, 1, 10, 2)).toEqual([{ ...drone, beat: 10, beats: 12 }]);
    // Too little left: nothing.
    expect(heldAt(p, 1, 21, 2)).toEqual([]);
    // Started before the skipped span (already scheduled): not re-entered.
    expect(heldAt(p, 3, 10, 2)).toEqual([]);
  });

  it('only sustained instruments are re-entered (a lyre is not plucked again)', () => {
    const lyre: NoteEvent = { beat: 2, beats: 20, voice: 'lyre', midi: 50, velocity: 0.6 };
    expect(heldAt({ ...piece(false), beats: 32, events: [lyre] }, 1, 10, 2)).toEqual([]);
  });
});

describe('VoicePool', () => {
  const voice = (end: number, off = end) => {
    const v = { end, off, released: null as number | null, release: (at: number) => ((v.released = at), (v.end = at + 0.25)) };
    return v;
  };

  it('caps every bus together and lets the voice ending first go (a tail before a held note)', () => {
    const pool = new VoicePool(3);
    const held = voice(20, 18);
    const tail = voice(5.2, 5);
    const short = voice(6, 6);
    for (const v of [held, tail, short]) {
      pool.admit(5.1, 5.1);
      pool.add(v as unknown as Voice);
    }
    pool.admit(5.1, 5.15);
    expect(tail.released).toBe(5.15);
    expect(held.released).toBeNull();
    expect(pool.size).toBe(2);
    expect(pool.stolen).toBe(1);
  });

  it('prefers a voice already past its note-off over one still held', () => {
    const pool = new VoicePool(2);
    const held = voice(7, 6.9);
    const releasing = voice(8, 4);
    pool.add(held as unknown as Voice);
    pool.add(releasing as unknown as Voice);
    pool.admit(5, 5);
    expect(releasing.released).toBe(5);
    expect(held.released).toBeNull();
  });

  it('ended voices free their place without a steal', () => {
    const pool = new VoicePool(1);
    pool.add(voice(1) as unknown as Voice);
    pool.admit(2, 2);
    expect(pool.stolen).toBe(0);
    expect(pool.size).toBe(0);
  });
});

describe('Sequencer after a stall', () => {
  it('skips the missed notes but brings a held drone back in, without a burst', () => {
    const fake = fakeAudio();
    const seq = new Sequencer(fake.audio, fake.ctx.destination as unknown as AudioNode);
    const drone: NoteEvent = { beat: 1, beats: 30, voice: 'drone', midi: 50, velocity: 0.6 };
    const missed = [2, 3, 4, 5].map((b) => ({ ...note(b), voice: 'lyre' as const }));
    seq.play({ track: 'calm_a', age: 2, bpm: 60, beats: 40, loop: false, events: [note(0), drone, ...missed] }, 0);
    seq.update();
    const before = seq.played;
    // The tab was hidden from 0.1 s to 8 s: the drone (1–31 s) and the lyre notes (2–5 s) were missed.
    fake.advance(8);
    seq.update();
    expect(seq.played - before).toBe(1);
    expect(seq.sounding).toBe(1);
  });
});

describe('pickSteal', () => {
  const c = (outgoing: boolean, off: number, end: number) => ({ outgoing, off, end });

  it('takes the outgoing piece\'s releasing note first (soonest end)', () => {
    const list = [c(false, 1, 2), c(true, 9, 10), c(true, 4, 8), c(true, 3, 6)];
    expect(pickSteal(list, 5)).toBe(3);
  });

  it('then the outgoing piece\'s oldest note, even one still held, before any incoming note', () => {
    // Incoming notes are releasing, outgoing ones are held: an outgoing one still goes, the oldest (first added).
    const list = [c(false, 1, 2), c(true, 9, 12), c(true, 8, 9), c(false, 2, 3)];
    expect(pickSteal(list, 5)).toBe(1);
  });

  it('with no outgoing notes: a releasing note before a held one, then the soonest end', () => {
    expect(pickSteal([c(false, 9, 12), c(false, 4, 11), c(false, 9, 10)], 5)).toBe(1);
    expect(pickSteal([c(false, 9, 12), c(false, 8, 10)], 5)).toBe(1);
  });
});

describe('VoicePool across a crossfade', () => {
  it('never cuts an incoming note while the outgoing piece still has notes', () => {
    const pool = new VoicePool(3);
    const mk = (end: number, off: number) => {
      const v = { end, off, released: null as number | null, release: (at: number) => ((v.released = at), (v.end = at + 0.15)) };
      return v;
    };
    const out = { stopping: true };
    const inc = { stopping: false };
    const old = mk(30, 29);
    const n1 = mk(2.4, 2.4);
    const n2 = mk(2.6, 2.6);
    pool.add(old as unknown as Voice, out);
    pool.add(n1 as unknown as Voice, inc);
    pool.add(n2 as unknown as Voice, inc);
    pool.admit(2, 2.05);
    expect(old.released).toBe(2.05);
    expect(n1.released).toBeNull();
    expect(n2.released).toBeNull();
  });
});
