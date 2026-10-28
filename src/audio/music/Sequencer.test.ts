import { describe, expect, it } from 'vitest';
import type { NoteEvent, Piece } from './composer';
import { eventsInWindow } from './Sequencer';

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
