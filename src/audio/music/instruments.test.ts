import { describe, expect, it } from 'vitest';
import { fakeAudio, type FakeParam } from './fakeAudio.testkit';
import { playNote } from './instruments';

describe('Voice.release', () => {
  it('with cancelAndHold, the note is held at the release time and fades from there', () => {
    const fake = fakeAudio({ hold: true });
    const v = playNote(fake.audio, fake.ctx.destination as unknown as AudioNode, 'lyre', 62, 0.8, 0, 1);
    fake.ctx.currentTime = 0.2;
    v.release(0.3);
    const amp = fake.gains[0] as FakeParam;
    expect(amp.events.slice(-2)).toEqual([
      ['hold', 0, 0.3],
      ['target', 0, 0.3],
    ]);
  });

  it('without cancelAndHold (Firefox), the release starts now from the current value, never at a later time', () => {
    const fake = fakeAudio({ hold: false });
    const v = playNote(fake.audio, fake.ctx.destination as unknown as AudioNode, 'lyre', 62, 0.8, 0, 1);
    fake.ctx.currentTime = 0.2;
    const amp = fake.gains[0] as FakeParam;
    amp.value = 0.05;
    v.release(0.3);
    expect(amp.events.slice(-3)).toEqual([
      ['cancel', 0, 0.2],
      ['set', 0.05, 0.2],
      ['target', 0, 0.2],
    ]);
    expect(v.end).toBeGreaterThan(0.2);
  });

  it('exposes the note-off time (a held note is not yet releasing)', () => {
    const fake = fakeAudio();
    const v = playNote(fake.audio, fake.ctx.destination as unknown as AudioNode, 'drone', 50, 0.6, 1, 8);
    expect(v.off).toBe(9);
    expect(v.end).toBeGreaterThan(9);
  });
});
