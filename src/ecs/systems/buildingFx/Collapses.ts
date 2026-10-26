import Phaser from 'phaser';
import { BUILDING_DEATH_TTL_MS } from '../../../config/balance';
import { BUILDING_FX } from '../../../config/visual';
import { ART_SCALE, BUILDING_BOTTOM_PAD } from '../../../iso/art/canvas';
import { RUBBLE_ORIGIN_Y, RUBBLE_VARIANTS } from '../../../iso/art/fireArt';
import { lit } from '../../../iso/art/lighting/LightManager';
import { mix } from '../../../iso/art/palette';
import { tileToScreen } from '../../../iso/coordinates';
import { DAMAGE_KEYS } from '../../../iso/damageTextures';
import type { FogOfWarData } from '../../../map/FogOfWarData';
import type { Entity } from '../../components';
import type { EcsWorld } from '../../world';
import { GROUND_FX_DEPTH, tileSeen } from '../combatFx/fxContext';
import { shakeIntensity } from '../combatFx/fxMath';
import { TimedImages } from '../combatFx/TimedImages';
import type { BuildingEmitters } from './BuildingEmitters';
import type { BuildingFires } from './BuildingFires';
import { collapsePose, collapseProgress, rubbleAlpha } from './damageMath';

const SCALE = 1 / ART_SCALE;
/** Collapses this far outside the camera view skip their particles (world px). */
const VIEW_MARGIN = 160;
/** Rubble decals alive at once (oldest recycled). */
const MAX_RUBBLE = 28;
/** Colour a collapsing building darkens towards (dust and soot). */
const DUST_TINT = 0x6f6152;

interface Collapse {
  readonly e: Entity;
  readonly lean: number;
  /** Footprint centre on the ground, world px, and its width across. */
  readonly cx: number;
  readonly cy: number;
  readonly span: number;
  readonly tiles: number;
  dust: number;
  debris: number;
}

/**
 * Destroyed buildings (ECS `dying`, BUILDING_DEATH_TTL_MS): the sprite
 * shudders, then sinks into the ground (cropped at the ground line)
 * with a slight lean, darkening and fading at the end, while a dust
 * ring, a billowing cloud and falling debris pour out; its damage
 * overlay follows the same pose. Underneath, a rubble decal fades in
 * and stays ~30 s after the entity is gone (render-only state; the
 * footprint is freed by DeathSystem as before). Fog-aware and pooled.
 */
export class Collapses {
  private readonly active = new Map<Entity, Collapse>();
  private readonly rubble: TimedImages;
  private fog: FogOfWarData | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    world: EcsWorld,
    private readonly fx: BuildingEmitters,
    private readonly fires: BuildingFires,
  ) {
    this.rubble = new TimedImages(
      () => lit(scene.add.image(0, 0, DAMAGE_KEYS.rubble(0)).setOrigin(0.5, RUBBLE_ORIGIN_Y).setDepth(GROUND_FX_DEPTH)),
      MAX_RUBBLE,
    );
    const dying = world.with('dying', 'building', 'position');
    dying.onEntityAdded.subscribe((e) => this.start(e));
    dying.onEntityRemoved.subscribe((e) => this.active.delete(e));
  }

  setFogContext(fog: FogOfWarData): void {
    this.fog = fog;
  }

  update(now: number, deltaMs: number): void {
    for (const c of this.active.values()) this.pose(c, deltaMs);
    this.rubble.update(now);
  }

  private start(e: Entity): void {
    const b = e.building;
    const p = e.position;
    if (!b || !p) return;
    const fp = b.footprint;
    const tx = p.tx + (fp.width - 1) / 2;
    const ty = p.ty + (fp.height - 1) / 2;
    const g = tileToScreen({ tx, ty });
    const tiles = Math.max(fp.width, fp.height);
    const c: Collapse = { e, lean: Math.random() < 0.5 ? -1 : 1, cx: g.sx, cy: g.sy, span: (fp.width + fp.height) * 32, tiles, dust: 0, debris: 0 };
    this.active.set(e, c);
    if (!tileSeen(this.fog, tx, ty)) return;
    this.spawnRubble(tx, ty, g.sx, g.sy, b.type === 'wall' ? 0.5 : ((fp.width + fp.height) / 4) * 0.85);
    if (!this.nearView(g.sx, g.sy)) return;
    this.fx.collapseBurst(g.sx, g.sy, c.span);
    if (tiles >= 3) this.shake(g.sx, g.sy, tiles);
  }

  private spawnRubble(tx: number, ty: number, x: number, y: number, scale: number): void {
    const life = BUILDING_FX.rubbleLifeMs;
    const img = this.rubble.spawn(this.scene.time.now, (im, age) => {
      im.setVisible(tileSeen(this.fog, tx, ty)).setAlpha(rubbleAlpha(age, BUILDING_DEATH_TTL_MS, life, BUILDING_FX.rubbleHold));
      return age < BUILDING_DEATH_TTL_MS + life;
    });
    img.setTexture(DAMAGE_KEYS.rubble(Math.floor(Math.random() * RUBBLE_VARIANTS)));
    img.setPosition(x, y).setScale(SCALE * scale).setFlipX(Math.random() < 0.5);
  }

  private pose(c: Collapse, deltaMs: number): void {
    const sprite = c.e.sprite;
    const d = c.e.dying;
    if (!sprite || !d) return;
    const t = collapseProgress(d.ttlMs, BUILDING_DEATH_TTL_MS);
    const pose = collapsePose(t, c.lean);
    const fh = sprite.frame.height;
    const above = fh - BUILDING_BOTTOM_PAD;
    const sinkTex = above * pose.sink;
    const x = sprite.x + pose.dx;
    const y = sprite.y + sinkTex * SCALE;
    const tint = mix(0xffffff, DUST_TINT, pose.darken * 0.7);
    sprite.setPosition(x, y).setRotation(pose.rotation).setAlpha(pose.alpha).setTint(tint);
    sprite.setCrop(0, 0, sprite.frame.width, Math.max(1, fh - BUILDING_BOTTOM_PAD - sinkTex));
    const overlay = this.fires.overlayOf(c.e);
    if (overlay) {
      const k = overlay.frame.height / fh;
      overlay.setPosition(x, y).setRotation(pose.rotation).setAlpha(pose.alpha);
      overlay.setCrop(0, 0, overlay.frame.width, Math.max(1, (fh - BUILDING_BOTTOM_PAD - sinkTex) * k));
    }
    if (!sprite.visible || !this.nearView(c.cx, c.cy) || t >= 0.92) return;
    // Particles spread over the collapse at a steady rate per footprint tile.
    const perMs = c.tiles / BUILDING_DEATH_TTL_MS;
    c.dust += deltaMs * perMs * BUILDING_FX.collapseDustPerTile;
    c.debris += deltaMs * perMs * BUILDING_FX.collapseDebrisPerTile * (t > 0.1 ? 1 : 0);
    // Half the dust rolls out of the cut at the front of the footprint, hiding the ground line.
    for (; c.dust >= 1; c.dust--) {
      if (Math.random() < 0.5) this.fx.collapseDust(c.cx, c.cy, c.span * 0.8);
      else this.fx.collapseDust(x, y - sinkTex * SCALE - 4, c.span * 0.9);
    }
    const top = y - (above - sinkTex) * SCALE;
    for (; c.debris >= 1; c.debris--) this.fx.collapseDebris(sprite.x, Math.min(top + 6, c.cy), c.span * 0.7);
  }

  private shake(x: number, y: number, tiles: number): void {
    const cam = this.scene.cameras.main;
    const v = cam.worldView;
    const s = BUILDING_FX.collapseShake;
    const k = shakeIntensity(x - v.centerX, y - v.centerY, v.width / 2, v.height / 2, s.perTile * tiles, s.edgeKeep);
    if (k > 0) cam.shake(s.ms, k);
  }

  private nearView(x: number, y: number): boolean {
    const v = this.scene.cameras.main.worldView;
    return x > v.x - VIEW_MARGIN && x < v.right + VIEW_MARGIN && y > v.y - VIEW_MARGIN && y < v.bottom + VIEW_MARGIN * 2;
  }

  destroy(): void {
    this.rubble.destroy();
    this.active.clear();
  }
}
