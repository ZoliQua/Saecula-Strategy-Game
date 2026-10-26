import type Phaser from 'phaser';

/**
 * Recycles Phaser Images so per-shot effects never create or destroy
 * GameObjects mid-fight: released images are hidden and parked until
 * the next acquire.
 */
export class ImagePool {
  private readonly free: Phaser.GameObjects.Image[] = [];
  private readonly all: Phaser.GameObjects.Image[] = [];

  constructor(private readonly make: () => Phaser.GameObjects.Image) {}

  acquire(): Phaser.GameObjects.Image {
    let img = this.free.pop();
    if (!img) {
      img = this.make();
      this.all.push(img);
    }
    return img.setActive(true).setVisible(true).setAlpha(1);
  }

  release(img: Phaser.GameObjects.Image): void {
    img.setActive(false).setVisible(false);
    this.free.push(img);
  }

  destroy(): void {
    for (const img of this.all) img.destroy();
    this.all.length = 0;
    this.free.length = 0;
  }
}
