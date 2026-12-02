import type Phaser from 'phaser';
import { CROWN } from '../../config/visual';
import { livingKings } from '../../game/regicide';
import { ART_SCALE } from '../../iso/art/canvas';
import { FX_KEYS } from '../../iso/textures';
import type { Entity } from '../components';
import type { EcsWorld } from '../world';

/**
 * The crown over every king's head (M19, Regicide). Render proxies rebuilt
 * from the world: each follows its king's sprite (position, depth, shown
 * or hidden in fog) and goes when the king dies, boards a transport or
 * the match ends. Run it after RenderSystem.
 */
export class CrownSystem {
  private readonly crowns = new Map<Entity, Phaser.GameObjects.Image>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly world: EcsWorld,
    /** The depth an occluded unit is raised to (UnitXRay), as its selection ring is. */
    private readonly raisedDepth: (entity: Entity) => number | undefined = () => undefined,
  ) {}

  update(): void {
    const shown = new Set<Entity>();
    for (const king of livingKings(this.world)) {
      const body = king.sprite;
      if (!body) continue;
      shown.add(king);
      let crown = this.crowns.get(king);
      if (!crown) {
        crown = this.scene.add.image(0, 0, FX_KEYS.crown).setScale(1 / ART_SCALE).setOrigin(0.5, 1);
        this.crowns.set(king, crown);
      }
      crown
        .setPosition(body.x, body.y - CROWN.lift)
        .setDepth(Math.max(body.depth + CROWN.depthAboveBody, this.raisedDepth(king) ?? -Infinity))
        .setVisible(body.visible);
    }
    for (const [king, crown] of this.crowns) {
      if (shown.has(king)) continue;
      crown.destroy();
      this.crowns.delete(king);
    }
  }

  destroy(): void {
    for (const crown of this.crowns.values()) crown.destroy();
    this.crowns.clear();
  }
}
