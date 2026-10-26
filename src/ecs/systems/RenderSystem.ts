import Phaser from 'phaser';
import { ART_SCALE, BUILDING_BOTTOM_PAD } from '../../iso/art/canvas';
import { LightManager, lit } from '../../iso/art/lighting/LightManager';
import { frameIndex, headingSlot, unitSheetLayout } from '../../iso/art/units/layout';
import { pumpUnitArt } from '../../iso/art/units/UnitArt';
import { createUnitSprites, setUnitFrame, syncTeamSprite, type UnitSprites } from '../../iso/art/units/unitSprite';
import { PLAYER_COLORS } from '../../game/Player';
import { wonderStage } from '../../iso/art/architecture/wonder';
import {
  BUILDING_LIGHT,
  buildingTexture,
  constructionKey,
  releaseStaleBuildingArt,
  releaseWonderStages,
  wallTexture,
  wonderStageTexture,
} from '../../iso/textures';
import type { FogOfWarData } from '../../map/FogOfWarData';
import type { AgeId } from '../../types';
import type { Entity } from '../components';
import type { EcsWorld } from '../world';
import { BUILDING_DEATH_TTL_MS } from '../../config/balance';
import { collapseHeightScale } from './buildingFx/damageMath';
import { siteAlpha, sitePlateAlpha, siteShownHeight } from './buildingFx/siteLook';
import { applyDying, isVisibleToViewer, renderDepth, renderScreenPos, type Renderable } from './renderPlacement';
import { unitAnimState } from './unitAnim';
import { WallBanners } from './wallJoins/WallBanners';
import { WallJoinIndex } from './wallJoins/WallJoinIndex';

const SPRITE_SCALE = 1 / ART_SCALE;
/** Building re-skins (each may paint a texture) allowed per frame. */
const RESKINS_PER_FRAME = 2;

/**
 * Syncs ECS entities that have `position` + `renderable` into Phaser
 * sprites: team-coloured textures, walk/work/attack frames with a
 * little bob, buildings that rise out of their construction site, and
 * a fade on death (buildings collapse in BuildingFxSystem).
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
  /** Look each building sprite currently shows: age style (+ wall piece) — render state, not game state. */
  private readonly shownLook = new Map<Entity, number>();
  /** Which wall piece (arms + post) each wall segment shows. */
  private readonly joins = new WallJoinIndex<Renderable>();
  private readonly banners: WallBanners;
  /** Buildings whose re-skin waits for their age-up effect (AgeUpFxSystem). */
  private readonly heldReskin = new Set<Entity>();
  private ageOf: (playerId: number) => AgeId = () => 1;
  private fog: FogOfWarData | null = null;
  private viewerPlayerId = 1;

  constructor(scene: Phaser.Scene, world: EcsWorld) {
    this.scene = scene;
    this.world = world;
    this.renderable = this.world.with('position', 'renderable');
    this.banners = new WallBanners(scene);

    // Walls are indexed as they enter the world, before any gets a sprite: a whole
    // fortress ring spawned at once then joins right on its first paint.
    for (const entity of this.renderable) this.joins.add(entity as Renderable);
    this.renderable.onEntityAdded.subscribe((entity: Renderable) => this.joins.add(entity));
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
      this.shownLook.delete(entity);
      this.heldReskin.delete(entity);
      this.joins.remove(entity);
      this.banners.remove(entity);
    });
  }

  /** Where buildings read their owner's age (style shown on the sprite). */
  setAgeSource(ageOf: (playerId: number) => AgeId): void {
    this.ageOf = ageOf;
  }

  /** Frees building textures of age styles no sprite shows any more (texture memory budget). */
  releaseStaleAgeArt(ageOf: (playerId: number) => AgeId | undefined, minAge: AgeId): number {
    const inUse = new Set<string>();
    for (const e of this.renderable) if (e.building && e.sprite) inUse.add(e.sprite.texture.key);
    return releaseStaleBuildingArt(this.scene, ageOf, minAge, inUse);
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
    let reskinBudget = RESKINS_PER_FRAME;
    for (const entity of this.renderable) {
      const sprite = entity.sprite ?? this.ensureSprite(entity);
      const { sx, sy } = renderScreenPos(entity);
      sprite.setPosition(sx, sy);
      sprite.setDepth(renderDepth(entity));
      const visible = isVisibleToViewer(entity, this.fog, this.viewerPlayerId);
      if (entity.building) {
        // Hidden buildings keep their old style until seen, and re-skins (which may paint
        // a new texture) are spread over frames, so another player's age-up can't hitch.
        if (visible && reskinBudget > 0 && !this.heldReskin.has(entity) && this.shownLook.get(entity) !== this.lookOf(entity)) {
          this.reskin(entity, sprite);
          reskinBudget--;
        }
        this.applyConstruction(sprite, entity);
        if (entity.building.type === 'wall') {
          const shownAge = ((this.shownLook.get(entity) ?? 1) % 4) as AgeId;
          const show = visible && !entity.underConstruction && !entity.dying;
          this.banners.sync(entity, sprite, this.joins.pieceOf(entity), shownAge, teamColor(entity.owner?.playerId ?? 1), show);
        }
      }
      applyDying(sprite, entity);
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
      if (entity.building) this.shownLook.set(entity, this.lookOf(entity));
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

  /**
   * What a building sprite should show, as a number that changes when the
   * texture must: the age style (< 4), plus the wall piece for walls, or
   * the scaffolding stage (negative) for a Wonder under construction.
   */
  private lookOf(entity: Renderable): number {
    const age = this.ownerAge(entity);
    const type = entity.building?.type;
    if (type === 'wall') return age + 4 * (1 + this.joins.pieceOf(entity));
    const stage = this.wonderStageOf(entity);
    return stage === null ? age : -stage;
  }

  private wonderStageOf(entity: Renderable): number | null {
    const uc = entity.underConstruction;
    if (entity.building?.type !== 'wonder' || !uc) return null;
    return wonderStage(uc.elapsed / uc.totalTime);
  }

  private buildingKey(entity: Renderable): string {
    const type = entity.building?.type;
    const playerId = entity.owner?.playerId ?? 1;
    if (type === 'wall') return wallTexture(this.scene, this.joins.pieceOf(entity), this.ownerAge(entity));
    const stage = this.wonderStageOf(entity);
    if (stage !== null) return wonderStageTexture(this.scene, stage);
    return type ? buildingTexture(this.scene, type, this.ownerAge(entity), playerId) : entity.renderable.textureKey;
  }

  /** Swaps a building sprite to its owner's current age style (texture, origin, lights). */
  private reskin(entity: Renderable, sprite: Phaser.GameObjects.Sprite): void {
    this.shownLook.set(entity, this.lookOf(entity));
    const key = this.buildingKey(entity);
    if (sprite.texture.key === key) return;
    const wasStage = sprite.texture.key.startsWith('building_wonder~s');
    const cropped = sprite.isCropped;
    if (cropped) sprite.setCrop();
    sprite.setTexture(key);
    sprite.setOrigin(0.5, 1 - BUILDING_BOTTOM_PAD / sprite.height);
    this.unlight.get(entity)?.();
    this.unlight.delete(entity);
    this.attachLighting(entity, sprite);
    if (wasStage) {
      const inUse = new Set<string>();
      for (const e of this.renderable) if (e.building && e.sprite) inUse.add(e.sprite.texture.key);
      releaseWonderStages(this.scene, inUse);
    }
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
          if (entity.dying) return collapseHeightScale(entity.dying.ttlMs, BUILDING_DEATH_TTL_MS);
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
    // The Wonder shows its own scaffolding stages instead of rising out of a site.
    if (this.wonderStageOf(entity) !== null) return;
    const h = sprite.frame.height;
    const shown = siteShownHeight(h, t);
    sprite.setCrop(0, h - shown, sprite.frame.width, shown);
    sprite.setAlpha(siteAlpha(t));
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
      // A destroyed site's plate fades out with its collapse.
      const fade = entity.dying ? Math.max(0, entity.dying.ttlMs / BUILDING_DEATH_TTL_MS) : 1;
      site.setAlpha(sitePlateAlpha(t) * fade);
    }
  }
}

function teamColor(playerId: number): number {
  return PLAYER_COLORS[(playerId - 1) % PLAYER_COLORS.length] ?? 0xffffff;
}
