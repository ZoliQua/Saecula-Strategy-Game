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

  it('without cancelAndHold (Firefox), a release now (a steal) starts from the current value now', () => {
    const fake = fakeAudio({ hold: false });
    const v = playNote(fake.audio, fake.ctx.destination as unknown as AudioNode, 'lyre', 62, 0.8, 0, 1);
    fake.ctx.currentTime = 0.2;
    const amp = fake.gains[0] as FakeParam;
    amp.value = 0.05;
    v.release(0.2);
    expect(amp.events.slice(-3)).toEqual([
      ['cancel', 0, 0.2],
      ['set', 0.05, 0.2],
      ['target', 0, 0.2],
    ]);
    expect(v.end).toBeGreaterThan(0.2);
  });

  it('without cancelAndHold, a future release (a crossfade end) keeps the note sounding until then', () => {
    const fake = fakeAudio({ hold: false });
    const v = playNote(fake.audio, fake.ctx.destination as unknown as AudioNode, 'drone', 50, 0.6, 0, 10);
    fake.ctx.currentTime = 0.2;
    const amp = fake.gains[0] as FakeParam;
    const before = amp.events.length;
    v.release(3.2);
    // Nothing happens before 3.2 s: the automation is cut from 3.2 on, and the fade starts there.
    expect(amp.events.slice(before)).toEqual([
      ['cancel', 0, 3.2],
      ['target', 0, 3.2],
    ]);
    expect(v.end).toBeCloseTo(3.35, 5);
  });

  it('exposes the note-off time (a held note is not yet releasing)', () => {
    const fake = fakeAudio();
    const v = playNote(fake.audio, fake.ctx.destination as unknown as AudioNode, 'drone', 50, 0.6, 1, 8);
    expect(v.off).toBe(9);
    expect(v.end).toBeGreaterThan(9);
  });
});
