import { SFX_RENDER_SEED } from '../../config/audio';
import { SFX_CATALOGUE, SFX_KEYS, type SfxKey, type SoundKey } from './catalogue';
import { renderSfx } from './synth';

/**
 * The decoded sound buffers by key. The catalogue renders a few sounds per
 * frame (`update`, called only after the audio unlock), so loading never
 * stalls. `register` puts an external buffer (a decoded CC0 OGG) under a
 * key; a registered key is never overwritten by a render.
 */
export class SfxBank {
  private readonly buffers = new Map<SoundKey, AudioBuffer>();
  private readonly pending: SfxKey[] = [...SFX_KEYS];

  constructor(private readonly ctx: BaseAudioContext) {}

  /** Renders catalogue sounds for up to `budgetMs` (at least one per call while any is pending). */
  update(budgetMs: number): void {
    const until = performance.now() + budgetMs;
    while (this.pending.length > 0) {
      const key = this.pending.shift()!;
      if (!this.buffers.has(key)) this.renderKey(key);
      if (performance.now() >= until) return;
    }
  }

  get(key: SoundKey): AudioBuffer | undefined {
    return this.buffers.get(key);
  }

  register(key: SoundKey, buffer: AudioBuffer): void {
    this.buffers.set(key, buffer);
  }

  /** Sounds ready to play. */
  get size(): number {
    return this.buffers.size;
  }

  /** Bytes held by every buffer (Float32 samples). */
  get bytes(): number {
    let total = 0;
    for (const b of this.buffers.values()) total += b.length * b.numberOfChannels * 4;
    return total;
  }

  private renderKey(key: SfxKey): void {
    const rate = this.ctx.sampleRate;
    const samples = renderSfx(SFX_CATALOGUE[key].recipe, rate, SFX_RENDER_SEED);
    const buffer = this.ctx.createBuffer(1, samples.length, rate);
    buffer.copyToChannel(samples, 0);
    this.buffers.set(key, buffer);
  }
}
