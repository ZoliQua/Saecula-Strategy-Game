import type Phaser from 'phaser';
import { ART_SCALE } from '../../../iso/art/canvas';
import { lit } from '../../../iso/art/lighting/LightManager';
import { wallBannerAnchor } from '../../../iso/art/walls/paintWall';
import { WALL_BANNER_ORIGIN } from '../../../iso/art/walls/wallBanner';
import { pieceHasPost } from '../../../iso/art/walls/wallPiece';
import { FX_KEYS } from '../../../iso/textures';
import type { AgeId, CivId } from '../../../types';

const SCALE = 1 / ART_SCALE;

/**
 * Team banners on wall posts: one small white cloth texture tinted with
 * the owner's colour, flying from the pole painted on post pieces, so
 * wall textures need no team variants. Render proxies only.
 */
export class WallBanners {
  private readonly banners = new Map<object, Phaser.GameObjects.Image>();

  constructor(private readonly scene: Phaser.Scene) {}

  /** Places (or hides) the banner of a wall showing `piece` in `age` and `civ`'s style. */
  sync(owner: object, sprite: Phaser.GameObjects.Sprite, piece: number, age: AgeId, civ: CivId, color: number, show: boolean): void {
    let banner = this.banners.get(owner);
    if (!pieceHasPost(piece)) {
      banner?.setVisible(false);
      return;
    }
    if (!banner) {
      banner = lit(this.scene.add.image(0, 0, FX_KEYS.wallBanner).setOrigin(WALL_BANNER_ORIGIN.x, WALL_BANNER_ORIGIN.y));
      banner.setTint(color);
      this.banners.set(owner, banner);
    }
    const [dx, dy] = wallBannerAnchor(age, civ);
    const now = this.scene.time.now;
    // Gentle flutter, out of phase between posts.
    const flutter = 0.86 + 0.14 * Math.sin(now * 0.0045 + sprite.x * 0.07 + sprite.y * 0.03);
    banner
      .setPosition(sprite.x + dx, sprite.y + dy)
      .setScale(SCALE * flutter, SCALE)
      .setDepth(sprite.depth + 0.001)
      .setAlpha(sprite.alpha)
      .setVisible(show);
  }

  remove(owner: object): void {
    this.banners.get(owner)?.destroy();
    this.banners.delete(owner);
  }
}
