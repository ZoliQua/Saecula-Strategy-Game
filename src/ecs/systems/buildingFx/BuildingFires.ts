import Phaser from 'phaser';
import { BUILDING_FX } from '../../../config/visual';
import { ART_SCALE, BUILDING_BOTTOM_PAD } from '../../../iso/art/canvas';
import { FLAME_FRAMES, FLAME_H, FLAME_ORIGIN_Y } from '../../../iso/art/fireArt';
import { LightManager, type LightHandle } from '../../../iso/art/lighting/LightManager';
import { damageOverlayTexture, DAMAGE_KEYS, showsTexture } from '../../../iso/damageTextures';
import { BUILDING_LIGHT } from '../../../iso/buildingTextures';
import { FX_KEYS } from '../../../iso/textures';
import type { Entity } from '../../components';
import type { EcsWorld } from '../../world';
import { ImagePool } from '../combatFx/ImagePool';
import type { BuildingEmitters } from './BuildingEmitters';
import { damageStage, fireAnchors, nearestIndices, type DamageStage, type Offset } from './damageMath';

type Sprite = Phaser.GameObjects.Sprite;
type Image = Phaser.GameObjects.Image;

const SCALE = 1 / ART_SCALE;
/** Buildings this far outside the camera view get no effects (world px). */
const VIEW_MARGIN = 160;

interface Flame {
  readonly img: Image;
  readonly glow: Image;
  readonly at: Offset;
  readonly size: number;
  readonly phase: number;
}

interface Look {
  overlay: Image | null;
  stage: DamageStage;
  flames: Flame[];
  anchors: Offset[];
  anchorsFor: string;
  nextSmoke: number;
  nextEmber: number;
}

interface Burning {
  readonly e: Entity;
  readonly sprite: Sprite;
  readonly look: Look;
  readonly x: number;
  readonly y: number;
  readonly wall: boolean;
}

/**
 * Damage looks of finished buildings, read from their HP each frame:
 * below BUILDING_FX.smokeBelow a crack + soot overlay fitted to the
 * building's silhouette and grey wisps; below fireBelow a scorched
 * overlay, animated flames on the roof with a warm halo, thick black
 * smoke, embers and a flickering fire light. Only buildings the viewer
 * sees near the camera get effects; flames are capped (nearest the view
 * centre first, wall segments separately and only every other one) and
 * so are fire lights, which share the light budget with torches.
 * Pooled; cosmetic only.
 */
export class BuildingFires {
  private readonly looks = new Map<Entity, Look>();
  private readonly overlays: ImagePool;
  private readonly flameImgs: ImagePool;
  private readonly glowImgs: ImagePool;
  private readonly lights: LightHandle[] = [];
  private readonly unsubscribe: () => void;

  constructor(
    private readonly scene: Phaser.Scene,
    world: EcsWorld,
    private readonly fx: BuildingEmitters,
  ) {
    this.overlays = new ImagePool(() => scene.add.image(0, 0, '__DEFAULT'));
    this.flameImgs = new ImagePool(() => scene.add.image(0, 0, DAMAGE_KEYS.flame, 0).setOrigin(0.5, FLAME_ORIGIN_Y));
    this.glowImgs = new ImagePool(() => scene.add.image(0, 0, FX_KEYS.glow).setBlendMode(Phaser.BlendModes.ADD));
    this.unsubscribe = world.with('building').onEntityRemoved.subscribe((e) => this.release(e));
  }

  /** The crack / soot overlay shown on a building, if any (collapse poses it with the sprite). */
  overlayOf(e: Entity): Image | null {
    return this.looks.get(e)?.overlay ?? null;
  }

  update(world: EcsWorld, now: number): void {
    const view = this.scene.cameras.main.worldView;
    const burning: Burning[] = [];
    const inUse = new Set<string>();
    for (const look of this.looks.values()) if (look.overlay) inUse.add(look.overlay.texture.key);
    for (const e of world.with('building', 'health')) {
      const sprite = e.sprite;
      const prev = this.looks.get(e);
      // A collapsing building keeps the scorched look it had.
      const stage: DamageStage = e.dying
        ? (prev?.stage ?? 0)
        : e.underConstruction ? 0 : damageStage(e.health.current, e.health.max, BUILDING_FX.smokeBelow, BUILDING_FX.fireBelow);
      if (!sprite || stage === 0 || !sprite.visible || !nearView(sprite, view)) {
        if (prev) this.release(e);
        continue;
      }
      const look = prev ?? this.create(e);
      look.stage = stage;
      this.syncOverlay(look, sprite, inUse);
      this.syncAnchors(e, look, sprite);
      if (e.dying) {
        this.dropFlames(look);
        continue;
      }
      if (stage === 2) {
        const wall = e.building.type === 'wall';
        // Long burning walls: flames on every other segment only.
        const flames = !wall || ((e.position?.tx ?? 0) + (e.position?.ty ?? 0)) % 2 === 0;
        if (flames) burning.push({ e, sprite, look, x: sprite.x, y: sprite.y, wall });
        else this.dropFlames(look);
      } else this.dropFlames(look);
      if (stage === 1 && now >= look.nextSmoke) {
        look.nextSmoke = now + BUILDING_FX.lightSmokeMs * (0.7 + Math.random() * 0.6);
        const a = look.anchors[0] ?? [0, -20];
        this.fx.smolder(sprite.x + a[0], sprite.y + a[1]);
      }
    }
    this.burn(burning, now, view);
  }

  private burn(burning: Burning[], now: number, view: Phaser.Geom.Rectangle): void {
    const cx = view.centerX;
    const cy = view.centerY;
    const halls = burning.filter((b) => !b.wall);
    const walls = burning.filter((b) => b.wall);
    const keep = new Set([
      ...pick(halls, nearestIndices(halls, cx, cy, BUILDING_FX.maxBurning)),
      ...pick(walls, nearestIndices(walls, cx, cy, BUILDING_FX.maxBurningWalls)),
    ]);
    for (const b of burning) if (!keep.has(b)) this.dropFlames(b.look);
    for (const b of keep) this.syncFlames(b, now);
    // Fire lights: the nearest big fires first, then walls.
    const lit = [...pick(halls, nearestIndices(halls, cx, cy, BUILDING_FX.maxFireLights))];
    if (lit.length < BUILDING_FX.maxFireLights) lit.push(...pick(walls, nearestIndices(walls, cx, cy, BUILDING_FX.maxFireLights - lit.length)));
    this.syncLights(lit);
  }

  private create(e: Entity): Look {
    const look: Look = { overlay: null, stage: 0, flames: [], anchors: [], anchorsFor: '', nextSmoke: 0, nextEmber: 0 };
    this.looks.set(e, look);
    return look;
  }

  private syncOverlay(look: Look, sprite: Sprite, inUse: Set<string>): void {
    const key = damageOverlayTexture(this.scene, sprite.texture.key, BUILDING_LIGHT.get(sprite.texture.key)?.volume ?? [], inUse);
    if (!key) return;
    inUse.add(key);
    const img = look.overlay ?? (look.overlay = this.overlays.acquire());
    // Compare texture objects, not keys: a pruned overlay may be repainted under the same key.
    if (!showsTexture(img, this.scene.textures, key)) img.setTexture(key, 0);
    img.setFrame(look.stage === 2 ? 1 : 0);
    img.setOrigin(sprite.originX, sprite.originY);
    img.setDisplaySize(sprite.displayWidth, sprite.displayHeight);
    img.setPosition(sprite.x, sprite.y).setRotation(sprite.rotation).setDepth(sprite.depth + 0.001).setAlpha(sprite.alpha);
    if (img.isCropped) img.setCrop();
  }

  private syncAnchors(e: Entity, look: Look, sprite: Sprite): void {
    const key = sprite.texture.key;
    if (look.anchorsFor === key) return;
    const b = e.building!;
    const volume = BUILDING_LIGHT.get(key)?.volume ?? [];
    const size = Math.max(b.footprint.width, b.footprint.height);
    const count = b.type === 'wall' ? 1 : (BUILDING_FX.flamesBySize[size] ?? 2);
    const h = sprite.frame.height;
    const fallback: Offset = [0, -(b.footprint.width + b.footprint.height) * 8 - 14];
    look.anchors = fireAnchors(volume, sprite.frame.width / 2, h - BUILDING_BOTTOM_PAD, ART_SCALE, count, fallback);
    look.anchorsFor = key;
    this.dropFlames(look);
  }

  private syncFlames(b: Burning, now: number): void {
    const { look, sprite, e } = b;
    if (look.flames.length === 0) {
      const fp = e.building!.footprint;
      const base = b.wall ? 0.75 : 0.95 + Math.min(4, fp.width) * 0.17;
      look.anchors.forEach((at, i) => {
        const size = base * (i === 0 ? 1 : 0.8 + Math.random() * 0.2);
        const img = this.flameImgs.acquire().setFlipX(Math.random() < 0.5);
        const glow = this.glowImgs.acquire();
        look.flames.push({ img, glow, at, size, phase: Math.random() * 10_000 });
      });
    }
    const frameMs = BUILDING_FX.flameFrameMs;
    const emitSmoke = now >= look.nextSmoke;
    const emitEmbers = now >= look.nextEmber;
    if (emitSmoke) look.nextSmoke = now + BUILDING_FX.heavySmokeMs * (b.wall ? 2.2 : 1) * (0.75 + Math.random() * 0.5);
    if (emitEmbers) look.nextEmber = now + BUILDING_FX.emberMs * (b.wall ? 2 : 1) * (0.6 + Math.random() * 0.8);
    for (const f of look.flames) {
      const x = sprite.x + f.at[0];
      const y = sprite.y + f.at[1];
      const t = now + f.phase;
      const flicker = 1 + 0.08 * Math.sin(t * 0.021) + 0.05 * Math.sin(t * 0.057);
      f.img.setFrame(Math.floor(t / frameMs) % FLAME_FRAMES);
      f.img.setPosition(x, y + 2).setScale(SCALE * f.size * (2 - flicker) * 0.98, SCALE * f.size * flicker).setDepth(sprite.depth + 0.002);
      f.glow.setPosition(x, y - FLAME_H * 0.25 * f.size).setScale(f.size * (1.05 + 0.1 * flicker)).setAlpha(0.4 * flicker).setDepth(sprite.depth + 0.0015);
      const top = y - FLAME_H * 0.75 * f.size;
      if (emitSmoke) this.fx.fireSmoke(x, top, f.size);
      if (emitEmbers) this.fx.fireEmbers(x, y - FLAME_H * 0.4 * f.size, b.wall ? 1 : 2);
    }
  }

  private syncLights(burning: Burning[]): void {
    const lm = LightManager.of(this.scene);
    if (!lm?.active) return;
    const l = BUILDING_FX.fireLight;
    while (this.lights.length < Math.min(burning.length, BUILDING_FX.maxFireLights)) {
      this.lights.push(lm.addLight({ x: 0, y: 0, color: l.color, radius: l.radius, intensity: l.intensity, flicker: l.flicker }));
    }
    this.lights.forEach((h, i) => {
      const b = burning[i];
      h.setEnabled(!!b);
      if (!b) return;
      const fp = b.e.building!.footprint;
      // Ground point just in front of the footprint centre, so the flames light the front walls.
      h.setPosition(b.x, b.y - (fp.width + fp.height) * 5);
    });
  }

  private dropFlames(look: Look): void {
    for (const f of look.flames) {
      this.flameImgs.release(f.img);
      this.glowImgs.release(f.glow);
    }
    look.flames.length = 0;
  }

  private release(e: Entity): void {
    const look = this.looks.get(e);
    if (!look) return;
    this.dropFlames(look);
    if (look.overlay) {
      if (look.overlay.isCropped) look.overlay.setCrop();
      // Let go of the overlay texture so pruning can't leave a pooled image pointing at a destroyed one.
      this.overlays.release(look.overlay.setTexture('__DEFAULT'));
    }
    this.looks.delete(e);
  }

  destroy(): void {
    this.unsubscribe();
    for (const h of this.lights) h.remove();
    this.lights.length = 0;
    this.overlays.destroy();
    this.flameImgs.destroy();
    this.glowImgs.destroy();
    this.looks.clear();
  }
}

function nearView(sprite: Sprite, view: Phaser.Geom.Rectangle): boolean {
  const m = VIEW_MARGIN + sprite.displayWidth / 2;
  return sprite.x > view.x - m && sprite.x < view.right + m && sprite.y > view.y - VIEW_MARGIN && sprite.y - sprite.displayHeight < view.bottom + VIEW_MARGIN;
}

function pick<T>(items: readonly T[], idx: ReadonlySet<number>): T[] {
  return items.filter((_, i) => idx.has(i));
}
