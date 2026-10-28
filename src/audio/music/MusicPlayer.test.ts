import { describe, expect, it } from 'vitest';
import { MUSIC_CROSSFADE_MS, MUSIC_FAST_IN_MS, MUSIC_MAX_VOICES, MUSIC_STINGER_IN_MS } from '../../config/audio';
import { composePiece, pieceSeconds } from './composer';
import { fakeAudio, type FakeParam } from './fakeAudio.testkit';
import { incomingFadeMs, MusicPlayer } from './MusicPlayer';

/** Time of the last automation event of a param (where its fade lands). */
const fadeEnd = (p: FakeParam): number => Math.max(...p.events.map((e) => e[2]));

function setup(buffers: Record<string, AudioBuffer> = {}) {
  const fake = fakeAudio();
  const out = fake.ctx.createGain();
  const player = new MusicPlayer(fake.audio, out as unknown as AudioNode, { get: (k) => buffers[k] });
  // Bus gains are created right after `out` and the reverb input: [reverbIn, dryA, wetA, dryB, wetB].
  const dry = (i: 0 | 1) => fake.gains[2 + i * 2] as FakeParam;
  /** Runs the player to time `t` in 50 ms steps. */
  const run = (from: number, t: number) => {
    for (let x = from; x <= t; x += 0.05) {
      fake.advance(x);
      player.update(x * 1000);
    }
  };
  return { fake, player, dry, run };
}

describe('incomingFadeMs', () => {
  it('a new piece after silence comes in fast; over a sounding piece it crossfades; a stinger arrives fast', () => {
    expect(incomingFadeMs(true, 'calm_b', MUSIC_CROSSFADE_MS)).toBe(MUSIC_FAST_IN_MS);
    expect(incomingFadeMs(false, 'calm_b', MUSIC_CROSSFADE_MS)).toBe(MUSIC_CROSSFADE_MS);
    expect(incomingFadeMs(false, 'victory', 1000)).toBe(MUSIC_STINGER_IN_MS);
    expect(MUSIC_FAST_IN_MS).toBeLessThanOrEqual(200);
  });
});

describe('MusicPlayer', () => {
  it('the first piece and a piece after a natural end come in fast; a switch over a sounding piece crossfades', () => {
    const { fake, player, dry, run } = setup();
    player.play('calm_a', MUSIC_CROSSFADE_MS, 1, 3);
    // Nothing played before: bus B rises within the fast-in.
    expect(fadeEnd(dry(1))).toBeCloseTo(MUSIC_FAST_IN_MS / 1000, 5);
    run(0, 5);
    player.play('combat', MUSIC_CROSSFADE_MS, 1, 3);
    expect(fadeEnd(dry(0)) - fake.ctx.currentTime).toBeCloseTo(MUSIC_CROSSFADE_MS / 1000, 5);
    // Let the combat piece be replaced by a calm piece that then ends naturally.
    run(5, 8);
    player.play('calm_b', MUSIC_CROSSFADE_MS, 1, 4);
    const end = 8 + 0.05 + pieceSeconds(composePiece('calm_b', 1, 4));
    run(8, end + 3);
    const t = fake.ctx.currentTime;
    player.play('calm_a', MUSIC_CROSSFADE_MS, 1, 5);
    expect(fadeEnd(dry(0)) - t).toBeCloseTo(MUSIC_FAST_IN_MS / 1000, 5);
  });

  it('keeps the music within one voice budget over both buses during a crossfade', () => {
    const { player, run } = setup();
    player.play('combat', MUSIC_CROSSFADE_MS, 3, 9);
    let budget = 0;
    let sounding = 0;
    for (let t = 0; t < 20; t += 0.05) {
      if (Math.abs(t - 6) < 0.01) player.play('calm_b', MUSIC_CROSSFADE_MS, 3, 9);
      run(t, t);
      budget = Math.max(budget, player.stats().budget);
      sounding = Math.max(sounding, player.stats().voices);
    }
    expect(budget).toBeGreaterThan(4);
    expect(budget).toBeLessThanOrEqual(MUSIC_MAX_VOICES);
    expect(MUSIC_MAX_VOICES).toBe(16);
    // Only stolen notes in their short fade may sound beyond the budget.
    expect(sounding).toBeLessThanOrEqual(MUSIC_MAX_VOICES + 3);
  });

  it('a switched-out piece is disposed once its fade and tails are over', () => {
    const { fake, player, run } = setup();
    player.play('calm_a', MUSIC_CROSSFADE_MS, 2, 1);
    run(0, 4);
    player.play('combat', MUSIC_CROSSFADE_MS, 2, 1);
    const before = fake.disconnects();
    run(4, 12);
    // The old sequencer's channel nodes (panners, sends, inputs) were unwired.
    expect(fake.disconnects() - before).toBeGreaterThan(20);
  });

  it('a registered stinger plays once; a registered combat track loops', () => {
    const buf = { duration: 12 } as unknown as AudioBuffer;
    const { fake, player } = setup({ music_victory: buf, music_combat: buf });
    player.play('combat', 1000, 1, 1);
    expect(fake.sources.at(-1)).toMatchObject({ buffer: buf, loop: true });
    player.play('victory', 1000, 1, 1);
    expect(fake.sources.at(-1)).toMatchObject({ buffer: buf, loop: false });
  });

  it('game pieces take the match seed, the menu keeps its own; menu stats have no age', () => {
    const run = (match: number) => {
      const { player } = setup();
      player.setScene('game', match);
      player.update(0);
      return player.stats();
    };
    expect(run(1).seed).not.toBe(run(2).seed);
    expect(run(1).seed).toBe(run(1).seed);
    const menu = (match: number) => {
      const { player } = setup();
      player.setScene('game', match);
      player.update(0);
      player.setScene('menu');
      player.update(100);
      return player.stats();
    };
    expect(menu(1).seed).toBe(menu(2).seed);
    expect(menu(1)).toMatchObject({ track: 'menu', age: null });
  });
});
