import type Phaser from 'phaser';
import { XRAY } from '../../../config/visual';
import { PLAYER_COLORS } from '../../../game/Player';
import { hiddenRect, type Box, type CoverSource, type PlacedCover } from '../../../iso/coverage';
import { frameCover } from '../../../iso/frameCover';
import type { Entity } from '../../components';
import type { EcsWorld } from '../../world';

/** Selection rings of occluded units sort this far above the occluder that hides them. */
const ABOVE_OCCLUDER = 0.001;
/**
 * All silhouettes draw in one band above the world (below combat FX at
 * 8 500 and health bars at 8 800), as in AoE2: one contiguous unlit batch
 * instead of a pipeline switch per silhouette between lit sprites.
 */
const SILHOUETTE_DEPTH = 8_400;

/** A sprite's drawn rect (world px). */
function spriteBox(s: Phaser.GameObjects.Sprite): Box {
  const left = s.x - s.displayOriginX * s.scaleX;
  const top = s.y - s.displayOriginY * s.scaleY;
  return { left, top, right: left + s.frame.realWidth * s.scaleX, bottom: top + s.frame.realHeight * s.scaleY };
}

/**
 * AoE2-style X-ray: the part of a unit hidden behind raised rock, a
 * building or trees drawn in front of it is overdrawn by a translucent
 * team-coloured silhouette (a pooled copy of the unit's frame, cropped to
 * the hidden rect) drawn over the world. Render state only. Cost per frame is O(units) with
 * small spatial queries; hidden (fogged) enemy units get none.
 */
export class UnitXRay {
  private readonly units: ReturnType<EcsWorld['with']>;
  private readonly buildings: ReturnType<EcsWorld['with']>;
  private readonly pool: Phaser.GameObjects.Image[] = [];
  private used = 0;
  /** Depth each occluded unit's silhouette (and selection ring) is raised to this frame. */
  private readonly raised = new Map<Entity, number>();
  private readonly covers: PlacedCover[] = [];
  private readonly buildingCovers: PlacedCover[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    world: EcsWorld,
    private readonly sources: readonly CoverSource[],
  ) {
    // Sprites are set on entities by RenderSystem (not as ECS components), so query without them.
    this.units = world.with('unit', 'position');
    this.buildings = world.with('building', 'position');
  }

  /** The depth a selection ring of `entity` should be raised to (undefined = not occluded). */
  raisedDepth(entity: Entity): number | undefined {
    return this.raised.get(entity);
  }

  /** After RenderSystem placed this frame's sprites. */
  update(): void {
    this.raised.clear();
    this.used = 0;
    this.collectBuildings();
    const view = this.scene.cameras.main.worldView;
    for (const e of this.units) {
      const body = e.sprite;
      if (!body || !body.visible || e.dying || body.alpha < 0.5) continue;
      const box = spriteBox(body);
      if (box.right < view.x || box.left > view.right || box.bottom < view.y || box.top > view.bottom) continue;
      this.covers.length = 0;
      for (const src of this.sources) src.collectCovers(box, body.depth, this.covers);
      for (const c of this.buildingCovers) {
        if (c.depth <= body.depth) continue;
        if (c.left >= box.right || c.left + c.cover.width * c.scale <= box.left || c.top >= box.bottom) continue;
        this.covers.push(c);
      }
      if (this.covers.length === 0) continue;
      const hidden = hiddenRect(box, this.covers, XRAY.sampleStep, XRAY.minHiddenPx);
      if (!hidden) continue;
      this.show(e, body, box, hidden);
    }
    for (let i = this.used; i < this.pool.length; i++) this.pool[i]?.setVisible(false);
  }

  private collectBuildings(): void {
    this.buildingCovers.length = 0;
    for (const e of this.buildings) {
      const s = e.sprite;
      if (!s || !s.visible || e.underConstruction || e.dying) continue;
      const cover = frameCover(s.frame);
      if (!cover) continue;
      const b = spriteBox(s);
      this.buildingCovers.push({ cover, left: b.left, top: b.top, scale: s.scaleX, flipX: s.flipX, depth: s.depth });
    }
  }

  private show(e: Entity, body: Phaser.GameObjects.Sprite, box: Box, hidden: Box & { depth: number }): void {
    let img = this.pool[this.used];
    if (!img) {
      img = this.scene.add.image(0, 0, body.texture.key, body.frame.name);
      this.pool.push(img);
    }
    this.used++;
    this.raised.set(e, hidden.depth + ABOVE_OCCLUDER);
    if (img.texture !== body.texture || img.frame.name !== body.frame.name) img.setTexture(body.texture.key, body.frame.name);
    const k = body.scaleX;
    img
      .setOrigin(body.originX, body.originY)
      .setScale(k)
      .setFlipX(body.flipX)
      .setPosition(body.x, body.y)
      .setDepth(SILHOUETTE_DEPTH)
      .setAlpha(XRAY.alpha)
      .setTintFill(PLAYER_COLORS[((e.owner?.playerId ?? 1) - 1) % PLAYER_COLORS.length] ?? 0xffffff)
      .setVisible(true);
    // Crop rect in the drawn (unflipped-display) image's px, see Frame.setCropUVs.
    img.setCrop((hidden.left - box.left) / k, (hidden.top - box.top) / k, (hidden.right - hidden.left) / k, (hidden.bottom - hidden.top) / k);
  }

  destroy(): void {
    for (const img of this.pool) img.destroy();
    this.pool.length = 0;
    this.raised.clear();
  }
}
