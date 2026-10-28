import { describe, expect, it } from 'vitest';
import { SFX_RENDER_SEED } from '../../config/audio';
import { SFX_CATALOGUE, SFX_KEYS } from './catalogue';
import { SfxBank } from './SfxBank';
import { renderSfx } from './synth';

function fakeContext(sampleRate: number) {
  return {
    sampleRate,
    createBuffer: (channels: number, length: number) => {
      let data = new Float32Array(0);
      return {
        numberOfChannels: channels,
        length,
        copyToChannel: (src: Float32Array) => (data = src.slice()),
        data: () => data,
      };
    },
  };
}

describe('SfxBank', () => {
  it('renders in chunks across updates, and the buffers equal the one-shot renders', () => {
    const ctx = fakeContext(8000);
    const bank = new SfxBank(ctx as unknown as BaseAudioContext, 50);
    bank.update(0);
    // A zero budget does one chunk: not even the 20 ms click (160 samples) is done.
    expect(bank.size).toBe(0);
    let calls = 1;
    while (bank.size < SFX_KEYS.length && calls < 100_000) {
      bank.update(0);
      calls++;
    }
    expect(bank.size).toBe(SFX_KEYS.length);
    expect(calls).toBeGreaterThan(SFX_KEYS.length);
    for (const key of ['notification_wonder', 'sword_hit'] as const) {
      const buf = bank.get(key) as unknown as { data(): Float32Array };
      expect(buf.data()).toEqual(renderSfx(SFX_CATALOGUE[key].recipe, 8000, SFX_RENDER_SEED));
    }
  });

  it('a registered key is never rendered over', () => {
    const ctx = fakeContext(8000);
    const bank = new SfxBank(ctx as unknown as BaseAudioContext);
    const mine = { numberOfChannels: 1, length: 3 } as unknown as AudioBuffer;
    bank.register('ui_click', mine);
    for (let i = 0; i < 100; i++) bank.update(50);
    expect(bank.get('ui_click')).toBe(mine);
    expect(bank.size).toBe(SFX_KEYS.length);
  });
});
