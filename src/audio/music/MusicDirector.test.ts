import { describe, expect, it } from 'vitest';
import type { AgeId } from '../../types';
import { MusicDirector, type DirectorInput } from './MusicDirector';

function input(over: Partial<DirectorInput> = {}): DirectorInput {
  return { scene: 'game', age: 1, combatNear: false, pieceEndsAtMs: null, ...over };
}

/** A director already playing calm_a (the game started at t = 0). */
function started(age: AgeId = 1): MusicDirector {
  const d = new MusicDirector(7);
  expect(d.update(0, input({ age, pieceEndsAtMs: 90_000 }))).toMatchObject({ track: 'calm_a', age, crossfadeMs: 3000 });
  return d;
}

describe('MusicDirector', () => {
  it('the menu plays the menu track once; a game start plays calm_a', () => {
    const d = new MusicDirector(1);
    expect(d.update(0, input({ scene: 'menu' }))).toMatchObject({ track: 'menu' });
    expect(d.update(500, input({ scene: 'menu' }))).toBeNull();
    expect(d.update(1000, input())).toMatchObject({ track: 'calm_a', age: 1, crossfadeMs: 3000 });
    expect(d.update(1016, input())).toBeNull();
  });

  it('combat at t=5 000 → combat', () => {
    const d = started();
    expect(d.update(4000, input({ pieceEndsAtMs: 90_000 }))).toBeNull();
    expect(d.update(5000, input({ combatNear: true, pieceEndsAtMs: 90_000 }))).toMatchObject({ track: 'combat', age: 1, crossfadeMs: 3000 });
    expect(d.update(5016, input({ combatNear: true }))).toBeNull();
  });

  it('last combat t=8 000, at t=17 999 no change, at t=18 000 calm', () => {
    const d = started();
    expect(d.update(5000, input({ combatNear: true }))).toMatchObject({ track: 'combat' });
    expect(d.update(8000, input({ combatNear: true }))).toBeNull();
    expect(d.update(12_000, input())).toBeNull();
    expect(d.update(17_999, input())).toBeNull();
    // Back to calm: the calm piece after the last one played (calm_a → calm_b).
    expect(d.update(18_000, input())).toMatchObject({ track: 'calm_b', age: 1, crossfadeMs: 3000 });
    expect(d.update(18_016, input({ pieceEndsAtMs: 100_000 }))).toBeNull();
  });

  it('calm_a end → calm_b, and calm_b end → calm_a', () => {
    const d = started();
    expect(d.update(89_999, input({ pieceEndsAtMs: 90_000 }))).toBeNull();
    expect(d.update(90_000, input({ pieceEndsAtMs: 90_000 }))).toMatchObject({ track: 'calm_b', age: 1, crossfadeMs: 3000 });
    expect(d.update(90_016, input({ pieceEndsAtMs: 180_000 }))).toBeNull();
    expect(d.update(180_000, input({ pieceEndsAtMs: 180_000 }))).toMatchObject({ track: 'calm_a', crossfadeMs: 3000 });
  });

  it('age 2 during calm_a applies to calm_b', () => {
    const d = started(1);
    expect(d.update(30_000, input({ age: 2, pieceEndsAtMs: 90_000 }))).toBeNull();
    expect(d.update(90_000, input({ age: 2, pieceEndsAtMs: 90_000 }))).toMatchObject({ track: 'calm_b', age: 2, crossfadeMs: 3000 });
  });

  it('an age change during combat applies when the music returns to calm', () => {
    const d = started(1);
    expect(d.update(5000, input({ combatNear: true }))).toMatchObject({ track: 'combat', age: 1 });
    expect(d.update(6000, input({ age: 3, combatNear: true }))).toBeNull();
    expect(d.update(16_000, input({ age: 3 }))).toMatchObject({ track: 'calm_b', age: 3 });
  });

  it('victory after combat → victory stinger, then nothing', () => {
    const d = started();
    expect(d.update(5000, input({ combatNear: true }))).toMatchObject({ track: 'combat' });
    expect(d.update(6000, input({ scene: 'victory', combatNear: true }))).toMatchObject({ track: 'victory', age: 1, crossfadeMs: 1000 });
    expect(d.update(6016, input({ scene: 'victory', combatNear: true }))).toBeNull();
    expect(d.update(30_000, input({ scene: 'victory', pieceEndsAtMs: 20_000 }))).toBeNull();
    expect(d.update(60_000, input({ scene: 'victory' }))).toBeNull();
  });

  it('defeat plays the defeat stinger once; the menu afterwards plays the menu again', () => {
    const d = started(2);
    expect(d.update(1000, input({ scene: 'defeat', age: 2 }))).toMatchObject({ track: 'defeat', age: 2, crossfadeMs: 1000 });
    expect(d.update(20_000, input({ scene: 'defeat', age: 2 }))).toBeNull();
    expect(d.update(25_000, input({ scene: 'menu' }))).toMatchObject({ track: 'menu', crossfadeMs: 3000 });
  });

  it('each command carries a fresh piece seed, fixed by the director seed', () => {
    const run = (seed: number) => {
      const d = new MusicDirector(seed);
      return [d.update(0, input()), d.update(90_000, input({ pieceEndsAtMs: 90_000 }))].map((c) => c?.seed);
    };
    const [a, b] = run(7);
    expect(a).not.toBe(b);
    expect(run(7)).toEqual([a, b]);
    expect(run(8)).not.toEqual([a, b]);
  });
});
