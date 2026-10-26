import type Phaser from 'phaser';
import { ImagePool } from './ImagePool';

/** Per-frame look of a timed image; return false once it is finished. */
export type TimedTick = (img: Phaser.GameObjects.Image, ageMs: number) => boolean;

interface Live {
  readonly img: Phaser.GameObjects.Image;
  readonly born: number;
  readonly tick: TimedTick;
}

/**
 * Short-lived pooled images of one kind (muzzle flashes, blasts,
 * scorch marks, stuck arrows). At most `cap` live at once: spawning
 * past the cap recycles the oldest, so a long siege never grows the
 * scene graph.
 */
export class TimedImages {
  private readonly pool: ImagePool;
  private readonly live: Live[] = [];

  constructor(
    make: () => Phaser.GameObjects.Image,
    private readonly cap: number,
  ) {
    this.pool = new ImagePool(make);
  }

  /** A fresh image the caller positions; `tick` runs every frame until it returns false. */
  spawn(now: number, tick: TimedTick): Phaser.GameObjects.Image {
    if (this.live.length >= this.cap) {
      const oldest = this.live.shift();
      if (oldest) this.pool.release(oldest.img);
    }
    const img = this.pool.acquire();
    this.live.push({ img, born: now, tick });
    tick(img, 0);
    return img;
  }

  update(now: number): void {
    let w = 0;
    for (const l of this.live) {
      if (l.tick(l.img, now - l.born)) this.live[w++] = l;
      else this.pool.release(l.img);
    }
    this.live.length = w;
  }

  get count(): number {
    return this.live.length;
  }

  destroy(): void {
    this.pool.destroy();
    this.live.length = 0;
  }
}
