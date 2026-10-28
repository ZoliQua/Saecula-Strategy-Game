import { SFX_RENDER_CHUNK_SAMPLES, SFX_RENDER_SEED } from '../../config/audio';
import { SFX_CATALOGUE, SFX_KEYS, type SfxKey, type SoundKey } from './catalogue';
import { SfxRenderer } from './synth';

/**
 * The decoded sound buffers by key. The catalogue renders in small chunks
 * within a per-frame budget (`update`, called only after the audio
 * unlock), so even a long sound never stalls a frame. `register` puts an
 * external buffer (a decoded CC0 OGG) under a key; a registered key is
 * never overwritten by a render.
 */
export class SfxBank {
  private readonly buffers = new Map<SoundKey, AudioBuffer>();
  private readonly pending: SfxKey[] = [...SFX_KEYS];
  private current: { key: SfxKey; renderer: SfxRenderer } | null = null;

  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly chunkSamples = SFX_RENDER_CHUNK_SAMPLES,
  ) {}

  /** Renders for up to `budgetMs` (at least one chunk per call while anything is pending). */
  update(budgetMs: number): void {
    const until = performance.now() + budgetMs;
    for (;;) {
      const job = this.current ?? this.nextJob();
      if (!job) return;
      this.current = job;
      if (job.renderer.step()) {
        this.current = null;
        if (!this.buffers.has(job.key)) this.store(job.key, job.renderer.samples);
      }
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

  /** Bytes held by the sound-effect buffers (Float32 samples); registered music is not counted. */
  get bytes(): number {
    let total = 0;
    for (const [key, b] of this.buffers) if (!key.startsWith('music_')) total += b.length * b.numberOfChannels * 4;
    return total;
  }

  /** The next catalogue key still to render (registered keys are skipped). */
  private nextJob(): { key: SfxKey; renderer: SfxRenderer } | null {
    for (let key = this.pending.shift(); key !== undefined; key = this.pending.shift()) {
      if (this.buffers.has(key)) continue;
      return { key, renderer: new SfxRenderer(SFX_CATALOGUE[key].recipe, this.ctx.sampleRate, SFX_RENDER_SEED, this.chunkSamples) };
    }
    return null;
  }

  private store(key: SfxKey, samples: Float32Array<ArrayBuffer>): void {
    const buffer = this.ctx.createBuffer(1, samples.length, this.ctx.sampleRate);
    buffer.copyToChannel(samples, 0);
    this.buffers.set(key, buffer);
  }
}
