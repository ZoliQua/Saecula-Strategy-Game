import Phaser from 'phaser';
import type { With } from 'miniplex';
import { ART_SCALE, BUILDING_BOTTOM_PAD } from '../../iso/art/canvas';
import { LightManager, lit } from '../../iso/art/lighting/LightManager';
import { frameIndex, headingSlot, unitSheetLayout } from '../../iso/art/units/layout';
import { pumpUnitArt } from '../../iso/art/units/UnitArt';
import { createUnitSprites, setUnitFrame, syncTeamSprite, type UnitSprites } from '../../iso/art/units/unitSprite';
import { PLAYER_COLORS } from '../../game/Player';
import { tileToScreen } from '../../iso/coordinates';
import { footprintDepth, tileDepth } from '../../iso/depth';
import { BUILDING_LIGHT, buildingTexture, constructionKey } from '../../iso/textures';
import type { FogOfWarData } from '../../map/FogOfWarData';
import type { AgeId } from '../../types';
import type { Entity } from '../components';
import type { EcsWorld } from '../world';
import { dyingAlpha, DYING_MS, unitAnimState } from './unitAnim';

type Renderable = With<Entity, 'position' | 'renderable'>;

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
  /** Unit body + team-colour overlay pairs. */
  private readonly units = new Map<Entity, UnitSprites>();
  /** Detaches shadows / glows / torches registered with the LightManager. */
  private readonly unlight = new Map<Entity, () => void>();
  /** Units showing the white hit flash, by the time it ends. */
  private readonly hitUntil = new Map<Entity, number>();
  /** Age style each building sprite currently shows (render state, not game state). */
  private readonly shownAge = new Map<Entity, AgeId>();
  /** Buildings whose re-skin waits for their age-up effect (AgeUpFxSystem). */
  private readonly heldReskin = new Set<Entity>();
  private ageOf: (playerId: number) => AgeId = () => 1;
  private fog: FogOfWarData | null = null;
  private viewerPlayerId = 1;

  constructor(scene: Phaser.Scene, world: EcsWorld) {
    this.scene = scene;
    this.world = world;
    this.renderable = this.world.with('position', 'renderable');

    this.renderable.onEntityRemoved.subscribe((entity: Renderable) => {
      this.unlight.get(entity)?.();
      this.unlight.delete(entity);
      entity.sprite?.destroy();
      delete entity.sprite;
      this.units.get(entity)?.team.destroy();
      this.units.delete(entity);
      this.sites.get(entity)?.destroy();
      this.sites.delete(entity);
      this.hitUntil.delete(entity);
      this.shownAge.delete(entity);
      this.heldReskin.delete(entity);
    });
  }

  /** Where buildings read their owner's age (style shown on the sprite). */
  setAgeSource(ageOf: (playerId: number) => AgeId): void {
    this.ageOf = ageOf;
  }

  /** Keeps a building in its old style until releaseReskin (age-up effect running). */
  holdReskin(entity: Entity): void {
    if (entity.building && entity.sprite) this.heldReskin.add(entity);
  }

  /** Ends a hold and swaps the building to its owner's current age style now. */
  releaseReskin(entity: Entity): void {
    this.heldReskin.delete(entity);
    if (entity.building && entity.sprite && entity.position && entity.renderable) this.reskin(entity as Renderable, entity.sprite);
  }

  /** Brief white flash on a unit that just took damage (cosmetic). */
  flashHit(entity: Entity, durationMs: number): void {
    if (this.units.has(entity)) this.hitUntil.set(entity, this.scene.time.now + durationMs);
  }

  setFogContext(fog: FogOfWarData, viewerPlayerId: number): void {
    this.fog = fog;
    this.viewerPlayerId = viewerPlayerId;
  }

  update(): void {
    const now = this.scene.time.now;
    pumpUnitArt(this.scene);
    for (const entity of this.renderable) {
      const sprite = entity.sprite ?? this.ensureSprite(entity);
      const { sx, sy } = renderScreenPos(entity);
      sprite.setPosition(sx, sy);
      sprite.setDepth(renderDepth(entity));
      if (entity.building) {
        if (!this.heldReskin.has(entity) && this.shownAge.get(entity) !== this.ownerAge(entity)) this.reskin(entity, sprite);
        this.applyConstruction(sprite, entity);
      }
      applyDying(sprite, entity);
      const visible = isVisibleToViewer(entity, this.fog, this.viewerPlayerId);
      sprite.setVisible(visible);
      const site = this.sites.get(entity);
      if (site) site.setVisible(visible);
      const unit = this.units.get(entity);
      if (unit) {
        const { anim, i, heading } = unitAnimState(entity, now);
        const { slot, flip } = headingSlot(heading);
        setUnitFrame(unit, frameIndex(unitSheetLayout(unit.type), slot, anim, i), flip);
        syncTeamSprite(unit);
        this.applyHitFlash(entity, unit, now);
        // Units whose textures were deferred get their cast shadow once they exist.
        if (unit.art && !this.unlight.has(entity)) this.attachLighting(entity, sprite);
      }
    }
  }

  private applyHitFlash(entity: Renderable, unit: UnitSprites, now: number): void {
    const until = this.hitUntil.get(entity);
    if (until === undefined) return;
    if (now < until) {
      unit.body.setTintFill(0xffffff);
      unit.team.setTintFill(0xffffff);
      return;
    }
    this.hitUntil.delete(entity);
    unit.body.clearTint();
    unit.team.setTint(teamColor(entity.owner?.playerId ?? 1));
  }

  private ensureSprite(entity: Renderable): Phaser.GameObjects.Sprite {
    const playerId = entity.owner?.playerId ?? 1;
    let sprite: Phaser.GameObjects.Sprite;
    if (entity.unit) {
      const pair = createUnitSprites(this.scene, entity.unit.unitType, entity.renderable.textureKey, teamColor(playerId));
      this.units.set(entity, pair);
      sprite = pair.body;
    } else {
      sprite = this.scene.add.sprite(0, 0, this.buildingKey(entity));
      sprite.setScale(SPRITE_SCALE);
      sprite.setOrigin(0.5, 1 - BUILDING_BOTTOM_PAD / sprite.height);
      lit(sprite);
      if (entity.building) this.shownAge.set(entity, this.ownerAge(entity));
    }
    entity.sprite = sprite;
    // Position first so building-anchored lights land on the right spot.
    const { sx, sy } = renderScreenPos(entity);
    sprite.setPosition(sx, sy);
    this.attachLighting(entity, sprite);
    return sprite;
  }

  private ownerAge(entity: Renderable): AgeId {
    return this.ageOf(entity.owner?.playerId ?? 1);
  }

  private buildingKey(entity: Renderable): string {
    const type = entity.building?.type;
    const playerId = entity.owner?.playerId ?? 1;
    return type ? buildingTexture(this.scene, type, this.ownerAge(entity), playerId) : entity.renderable.textureKey;
  }

  /** Swaps a building sprite to its owner's current age style (texture, origin, lights). */
  private reskin(entity: Renderable, sprite: Phaser.GameObjects.Sprite): void {
    const age = this.ownerAge(entity);
    this.shownAge.set(entity, age);
    const key = this.buildingKey(entity);
    if (sprite.texture.key === key) return;
    const cropped = sprite.isCropped;
    if (cropped) sprite.setCrop();
    sprite.setTexture(key);
    sprite.setOrigin(0.5, 1 - BUILDING_BOTTOM_PAD / sprite.height);
    this.unlight.get(entity)?.();
    this.unlight.delete(entity);
    this.attachLighting(entity, sprite);
  }

  private attachLighting(entity: Renderable, sprite: Phaser.GameObjects.Sprite): void {
    const lights = LightManager.of(this.scene);
    if (!lights) return;
    const baseKey = entity.renderable.textureKey;
    const b = entity.building;
    if (!b) {
      if (this.units.get(entity)?.art) this.unlight.set(entity, lights.attachCaster(sprite, baseKey));
      return;
    }
    const info = BUILDING_LIGHT.get(sprite.texture.key) ?? BUILDING_LIGHT.get(baseKey);
    this.unlight.set(
      entity,
      lights.attachBuilding({
        sprite,
        type: b.type,
        footprint: { w: b.footprint.width, h: b.footprint.height },
        volume: info?.volume ?? [],
        glows: info?.glows ?? [],
        lights: info?.lights ?? [],
        isComplete: () => !entity.underConstruction && !entity.dying,
        heightScale: () => {
          const uc = entity.underConstruction;
          return uc ? Math.min(1, uc.elapsed / uc.totalTime) : 1;
        },
      }),
    );
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
      site = lit(this.scene.add.image(sprite.x, sprite.y, key).setScale(SPRITE_SCALE));
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

function teamColor(playerId: number): number {
  return PLAYER_COLORS[(playerId - 1) % PLAYER_COLORS.length] ?? 0xffffff;
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

function applyDying(sprite: Phaser.GameObjects.Sprite, entity: Renderable): void {
  const d = entity.dying;
  if (!d) return;
  if (entity.building) {
    sprite.setAlpha(Math.max(0, d.ttlMs / DYING_MS));
    sprite.setTint(0xb08070);
    return;
  }
  // Units play their death fall (unitAnim); the corpse then fades.
  sprite.setAlpha(dyingAlpha(d.ttlMs));
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
