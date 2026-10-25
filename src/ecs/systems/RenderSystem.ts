import Phaser from 'phaser';
import type { With } from 'miniplex';
import { ART_SCALE, BUILDING_BOTTOM_PAD } from '../../iso/art/canvas';
import { UNIT_FRAMES, UNIT_ORIGIN_Y } from '../../iso/art/units';
import { tileToScreen } from '../../iso/coordinates';
import { footprintDepth, tileDepth } from '../../iso/depth';
import { constructionKey, teamTextureKey } from '../../iso/textures';
import type { FogOfWarData } from '../../map/FogOfWarData';
import type { Entity } from '../components';
import type { EcsWorld } from '../world';
import { unitAnimFrame } from './unitAnim';

type Renderable = With<Entity, 'position' | 'renderable'>;

const DYING_MS = 900;
const SPRITE_SCALE = 1 / ART_SCALE;

/**
 * Syncs ECS entities that have `position` + `renderable` into Phaser
 * sprites: team-coloured textures, walk/work/attack frames with a
 * little bob, buildings that rise out of their construction site, and
 * a sink-and-fade on death.
 */
export class RenderSystem {
  private readonly scene: Phaser.Scene;
  private readonly world: EcsWorld;
  private readonly renderable: ReturnType<EcsWorld['with']>;
  private readonly sites = new Map<Entity, Phaser.GameObjects.Image>();
  private fog: FogOfWarData | null = null;
  private viewerPlayerId = 1;

  constructor(scene: Phaser.Scene, world: EcsWorld) {
    this.scene = scene;
    this.world = world;
    this.renderable = this.world.with('position', 'renderable');

    this.renderable.onEntityRemoved.subscribe((entity: Renderable) => {
      entity.sprite?.destroy();
      delete entity.sprite;
      this.sites.get(entity)?.destroy();
      this.sites.delete(entity);
    });
  }

  setFogContext(fog: FogOfWarData, viewerPlayerId: number): void {
    this.fog = fog;
    this.viewerPlayerId = viewerPlayerId;
  }

  update(): void {
    const now = this.scene.time.now;
    for (const entity of this.renderable) {
      const sprite = entity.sprite ?? this.ensureSprite(entity);
      const { sx, sy } = renderScreenPos(entity);
      sprite.setPosition(sx, sy);
      sprite.setDepth(renderDepth(entity));
      if (entity.building) {
        this.applyConstruction(sprite, entity);
      } else {
        applyUnitAnimation(sprite, entity, now);
      }
      applyDying(sprite, entity);
      const visible = isVisibleToViewer(entity, this.fog, this.viewerPlayerId);
      sprite.setVisible(visible);
      const site = this.sites.get(entity);
      if (site) site.setVisible(visible);
    }
  }

  private ensureSprite(entity: Renderable): Phaser.GameObjects.Sprite {
    const key = teamTextureKey(this.scene, entity.renderable.textureKey, entity.owner?.playerId ?? 1);
    const sprite = this.scene.add.sprite(0, 0, key, entity.building ? undefined : UNIT_FRAMES.idle);
    sprite.setScale(SPRITE_SCALE);
    if (entity.building) {
      sprite.setOrigin(0.5, 1 - BUILDING_BOTTOM_PAD / sprite.height);
    } else {
      sprite.setOrigin(0.5, UNIT_ORIGIN_Y);
    }
    entity.sprite = sprite;
    return sprite;
  }

  /** Construction: the building grows up out of a scaffolded site. */
  private applyConstruction(sprite: Phaser.GameObjects.Sprite, entity: Renderable): void {
    const uc = entity.underConstruction;
    if (!uc) {
      if (sprite.isCropped) sprite.setCrop();
      this.sites.get(entity)?.destroy();
      this.sites.delete(entity);
      return;
    }
    const t = Math.min(1, uc.elapsed / uc.totalTime);
    const h = sprite.frame.height;
    const shown = Math.max(BUILDING_BOTTOM_PAD + 4, h * (0.08 + 0.92 * t));
    sprite.setCrop(0, h - shown, sprite.frame.width, shown);
    sprite.setAlpha(0.75 + 0.25 * t);
    let site = this.sites.get(entity);
    if (!site && entity.building) {
      const key = constructionKey(entity.building.footprint.width);
      site = this.scene.add.image(sprite.x, sprite.y, key).setScale(SPRITE_SCALE);
      site.setOrigin(0.5, 1 - BUILDING_BOTTOM_PAD / site.height);
      this.sites.set(entity, site);
    }
    if (site) {
      site.setPosition(sprite.x, sprite.y);
      site.setDepth(sprite.depth + 0.01);
      site.setAlpha(1 - t * 0.6);
    }
  }
}

function renderScreenPos(entity: Renderable): { sx: number; sy: number } {
  const current = entity.position;
  if (entity.building) {
    // Buildings render at the front corner of the footprint so the
    // sprite's bottom edge sits on the ground at the front of the
    // footprint diamond.
    const bottom = {
      tx: current.tx + entity.building.footprint.width - 1,
      ty: current.ty + entity.building.footprint.height - 1,
    };
    const p = tileToScreen(bottom);
    return { sx: p.sx, sy: p.sy + 16 };
  }
  const mv = entity.movable;
  if (!mv || mv.path.length === 0 || mv.progress === 0) {
    return tileToScreen(current);
  }
  const next = mv.path[0]!;
  const t = Math.min(Math.max(mv.progress, 0), 1);
  const from = tileToScreen(current);
  const to = tileToScreen(next);
  return {
    sx: from.sx + (to.sx - from.sx) * t,
    sy: from.sy + (to.sy - from.sy) * t,
  };
}

function isVisibleToViewer(entity: Renderable, fog: FogOfWarData | null, viewerPlayerId: number): boolean {
  if (!fog) return true;
  if (entity.owner?.playerId === viewerPlayerId) return true;
  // Enemy / neutral — only render on tiles that are currently visible.
  return fog.isVisible(entity.position.tx, entity.position.ty);
}

function applyUnitAnimation(sprite: Phaser.GameObjects.Sprite, entity: Renderable, now: number): void {
  const mv = entity.movable;
  if (mv) sprite.setFlipX(mv.facing === 'W' || mv.facing === 'NW' || mv.facing === 'SW');
  const { frame, bob } = unitAnimFrame(entity, now);
  sprite.setFrame(frame);
  sprite.y -= bob;
}

function applyDying(sprite: Phaser.GameObjects.Sprite, entity: Renderable): void {
  const d = entity.dying;
  if (!d) return;
  const t = Math.max(0, d.ttlMs / DYING_MS);
  sprite.setAlpha(t);
  sprite.setTint(0xb08070);
  if (!entity.building) {
    sprite.setAngle((1 - t) * (sprite.flipX ? -70 : 70));
    sprite.y += (1 - t) * 6;
  }
}

function renderDepth(entity: Renderable): number {
  if (entity.building) {
    return footprintDepth(
      entity.position,
      entity.building.footprint.width,
      entity.building.footprint.height,
    ) + 0.2;
  }
  const mv = entity.movable;
  if (!mv || mv.path.length === 0) return tileDepth(entity.position) + 0.3;
  const next = mv.path[0]!;
  const t = Math.min(Math.max(mv.progress, 0), 1);
  return (
    tileDepth(entity.position) +
    (tileDepth(next) - tileDepth(entity.position)) * t +
    0.3
  );
}
