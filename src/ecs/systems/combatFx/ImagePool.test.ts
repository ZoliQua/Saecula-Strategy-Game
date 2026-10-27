import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { ImagePool } from './ImagePool';

/** The parts of a Phaser Image the pool touches. */
function fakeImage() {
  const img = {
    active: true,
    visible: true,
    alpha: 1,
    mask: null as object | null,
    setActive(v: boolean) { img.active = v; return img; },
    setVisible(v: boolean) { img.visible = v; return img; },
    setAlpha(v: number) { img.alpha = v; return img; },
    clearMask() { img.mask = null; return img; },
  };
  return img;
}

describe('ImagePool', () => {
  it('reuses released images, shown again at full alpha', () => {
    const pool = new ImagePool(() => fakeImage() as unknown as Phaser.GameObjects.Image);
    const a = pool.acquire();
    a.setAlpha(0.2);
    pool.release(a);
    expect(a.visible).toBe(false);
    const b = pool.acquire();
    expect(b).toBe(a);
    expect(b.visible).toBe(true);
    expect(b.alpha).toBe(1);
  });

  it('drops a mask on release, so a recycled image is never clipped by a mask meant for its last owner', () => {
    const pool = new ImagePool(() => fakeImage() as unknown as Phaser.GameObjects.Image);
    const a = pool.acquire() as unknown as ReturnType<typeof fakeImage>;
    a.mask = { kind: 'collapse-mask' };
    pool.release(a as unknown as Phaser.GameObjects.Image);
    expect(a.mask).toBeNull();
  });
});
