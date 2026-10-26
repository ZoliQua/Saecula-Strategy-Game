/**
 * LIGHTING CONTRACT (Task 3) — every world-art task follows this.
 *
 * 1. Albedo + normal map. World art is painted on a canvas as before and
 *    registered with a same-size normal map (view space: x right, y up,
 *    z to viewer; helpers in viewSpace.ts):
 *      - IsoPainter faces paint normals automatically (box walls, roofs,
 *        ground, footShadow, normalCylinder for columns); finish with
 *        `painter.result()` → LitArt {canvas, normal, volume, glows} and
 *        register via textures.ts registerLitArt (attachNormalMap).
 *      - Free-form art (units, decor, VFX props): `normalMapFor(canvas,
 *        null, FOLIAGE_DERIVE | ROCK_DERIVE | UNIT_DERIVE)` derives a
 *        pillow + luminance-bump normal map; attachNormalMap(scene, key, n).
 *      - Team-colour variants: shareNormalMap(scene, baseKey, variantKey).
 *        Variants share ONE TextureSource with the base: removing either
 *        texture destroys the shared normal map for all of them, so never
 *        remove/re-register a base or variant texture mid-game.
 * 2. Pipeline. Lit GameObjects call `lit(gameObject)` (sets the
 *    IsoLight2D pipeline when lighting is active; no-op otherwise).
 *    UI, fog, particles, glows and shadows stay unlit.
 * 3. Lights. `LightManager.of(scene)`:
 *      - addLight({x, y, color, radius, intensity, flicker}) → handle
 *        (persistent; x/y is the GROUND point under the light; scaled
 *        up at night). handle.remove() / handle.setPosition().
 *      - flash(x, y, color, radius, durationMs, intensity?) — pooled
 *        (FLASH_POOL_SIZE), oldest recycled; for muzzle flashes, blasts.
 *        Active flashes always render: persistent lights only get the
 *        MAX_LIGHTS − activeFlashes slots left (nearest the view centre).
 *      - attachBuilding()/attachCaster() wire buildings/units/trees to
 *        shadows, window glows and the BUILDING_LIGHTS table.
 * 4. Shadows. Upright casters register a blurred silhouette
 *    (registerShadowSilhouette(scene, baseKey) at texture time, then
 *    shadows.addSilhouette(sprite, baseKey)); buildings register their
 *    painter volume (shadows.addVolume). Shadows follow the sun.
 * 5. Toggle: config/visual.ts LIGHTING_ENABLED=false restores the
 *    original baked look (no normals, shadows, glows or lights).
 */
import Phaser from 'phaser';
import {
  DAY_CYCLE_MS,
  FLASH_POOL_SIZE,
  LIGHTING_ENABLED,
  MAX_LIGHTS,
  NIGHT_LIGHT_GAIN,
} from '../../../config/visual';
import type { BuildingType } from '../../../types';
import { BUILDING_LIGHTS, type AnchoredLight } from './buildingLights';
import { CastShadows } from './CastShadows';
import { FlashPool, persistentBudget, selectPersistentLights } from './flashPool';
import { ISO_LIGHT_PIPELINE, setSceneSun } from './IsoLightPipeline';
import type { GlowPoint } from './normalLayer';
import type { VolumePoint } from './shadowGeometry';
import { shadowVector, sunAt, wrapPhase, type SunState } from './sun';
import { WindowGlows } from './WindowGlows';

export interface LightOptions {
  x: number;
  y: number;
  color: number;
  radius: number;
  intensity: number;
  /** 0 = steady; 0.2–0.4 = flame flicker. */
  flicker?: number;
}

export interface LightHandle {
  setPosition(x: number, y: number): void;
  setEnabled(on: boolean): void;
  remove(): void;
}

interface Persistent {
  light: Phaser.GameObjects.Light;
  base: number;
  flicker: number;
  seed: number;
  enabled: boolean;
}

export interface BuildingAttachment {
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  type: BuildingType;
  footprint: { w: number; h: number };
  volume: readonly VolumePoint[];
  glows: readonly GlowPoint[];
  /** Painter-recorded torches etc. (added to any hand-placed BUILDING_LIGHTS for the type). */
  lights?: readonly AnchoredLight[];
  /** Finished and alive (glows + torches on). */
  isComplete: () => boolean;
  /** 0..1 shadow height while under construction. */
  heightScale: () => number;
}

/** True when the IsoLight2D pipeline can be used in this scene. */
export function lightingActive(scene: Phaser.Scene): boolean {
  if (!LIGHTING_ENABLED || scene.game.renderer.type !== Phaser.WEBGL) return false;
  const renderer = scene.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
  return renderer.pipelines.has(ISO_LIGHT_PIPELINE);
}

/** Puts a world GameObject on the lit pipeline (no-op when lighting is off). */
export function lit<T extends Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Pipeline>(go: T): T {
  if (lightingActive(go.scene)) go.setPipeline(ISO_LIGHT_PIPELINE);
  return go;
}

const managers = new WeakMap<Phaser.Scene, LightManager>();

/**
 * Per-scene lighting: day cycle (sun, ambient), persistent and flash
 * point lights, cast shadows and window glows. Purely cosmetic; reads
 * render proxies, never the ECS. Call update(delta) every frame.
 */
export class LightManager {
  readonly shadows: CastShadows | null;
  readonly glows: WindowGlows | null;
  readonly active: boolean;
  private phase: number;
  private readonly fixed: boolean;
  private state: SunState;
  private readonly persistent = new Set<Persistent>();
  private readonly pool = new FlashPool(FLASH_POOL_SIZE);
  private readonly flashLights: Phaser.GameObjects.Light[] = [];
  /** Per-frame enable checks for building-anchored lights. */
  private readonly syncers = new Set<() => void>();

  static of(scene: Phaser.Scene): LightManager | null {
    return managers.get(scene) ?? null;
  }

  constructor(
    private readonly scene: Phaser.Scene,
    opts: { phase: number; fixed?: boolean },
  ) {
    this.phase = wrapPhase(opts.phase);
    this.fixed = opts.fixed ?? false;
    this.state = sunAt(this.phase);
    this.active = lightingActive(scene);
    this.shadows = this.active ? new CastShadows(scene) : null;
    this.glows = this.active ? new WindowGlows(scene) : null;
    managers.set(scene, this);
    if (!this.active) return;
    scene.lights.enable();
    for (let i = 0; i < FLASH_POOL_SIZE; i++) {
      this.flashLights.push(scene.lights.addLight(0, 0, 1, 0xffffff, 0).setVisible(false));
    }
    this.apply(0);
    if (import.meta.env.DEV) {
      (window as unknown as { __lighting?: LightManager }).__lighting = this;
    }
  }

  get sun(): SunState {
    return this.state;
  }

  /** Dev / screenshot hook: jump the day cycle. */
  setPhase(phase: number): void {
    this.phase = wrapPhase(phase);
    this.apply(0);
  }

  getPhase(): number {
    return this.phase;
  }

  addLight(o: LightOptions): LightHandle {
    if (!this.active) return { setPosition: () => undefined, setEnabled: () => undefined, remove: () => undefined };
    const light = this.scene.lights.addLight(o.x, o.y, o.radius, o.color, o.intensity);
    const p: Persistent = { light, base: o.intensity, flicker: o.flicker ?? 0, seed: Math.random() * 100, enabled: true };
    this.persistent.add(p);
    return {
      setPosition: (x, y) => light.setPosition(x, y),
      setEnabled: (on) => {
        p.enabled = on;
      },
      remove: () => {
        this.persistent.delete(p);
        this.scene.lights.removeLight(light);
      },
    };
  }

  /** Short pooled flash (muzzle flash, explosion) at a ground point. */
  flash(x: number, y: number, color: number, radius: number, durationMs: number, intensity = 1.4): void {
    if (!this.active) return;
    this.pool.spawn(this.scene.time.now, x, y, color, radius, durationMs, intensity);
  }

  /** Shadow + glows + torches for a building sprite. Returns a detach function. */
  attachBuilding(a: BuildingAttachment): () => void {
    if (!this.active) return () => undefined;
    const removers: Array<() => void> = [];
    removers.push(this.shadows?.addVolume(a.sprite, a.volume, a.footprint, a.heightScale) ?? (() => undefined));
    removers.push(this.glows?.add(a.sprite, a.glows, a.isComplete) ?? (() => undefined));
    for (const l of [...(BUILDING_LIGHTS[a.type] ?? []), ...(a.lights ?? [])]) {
      const h = this.addLight({ x: a.sprite.x + l.dx, y: a.sprite.y + l.dy, color: l.color, radius: l.radius, intensity: l.intensity, flicker: l.flicker });
      const sync = () => h.setEnabled(a.sprite.active && a.sprite.visible && a.isComplete());
      this.syncers.add(sync);
      removers.push(() => {
        this.syncers.delete(sync);
        h.remove();
      });
    }
    return () => removers.forEach((r) => r());
  }

  /** Silhouette shadow for an upright caster (unit, tree). */
  attachCaster(sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image, baseKey: string): () => void {
    return this.shadows?.addSilhouette(sprite, baseKey) ?? (() => undefined);
  }

  update(deltaMs: number): void {
    if (!this.active) return;
    if (!this.fixed) this.phase = wrapPhase(this.phase + deltaMs / DAY_CYCLE_MS);
    this.apply(deltaMs);
  }

  private apply(deltaMs: number): void {
    const s = (this.state = sunAt(this.phase));
    setSceneSun(this.scene, s.dir, s.color);
    this.scene.lights.ambientColor.set(s.ambient[0], s.ambient[1], s.ambient[2]);
    const now = this.scene.time.now;
    const gain = NIGHT_LIGHT_GAIN.day + (NIGHT_LIGHT_GAIN.night - NIGHT_LIGHT_GAIN.day) * s.night;
    for (const sync of this.syncers) sync();
    const strengths = this.pool.update(now);
    // Flashes get reserved slots; persistent lights share what is left.
    const enabled = [...this.persistent].filter((p) => p.enabled);
    const keep = selectPersistentLights(
      enabled.map((p) => p.light),
      this.scene.cameras.main.worldView,
      persistentBudget(MAX_LIGHTS, this.pool.activeCount()),
    );
    for (const p of this.persistent) p.light.setVisible(false);
    enabled.forEach((p, i) => {
      if (!keep.has(i)) return;
      const wobble = p.flicker * (Math.sin(now * 0.017 + p.seed) * 0.5 + Math.sin(now * 0.041 + p.seed * 2.3) * 0.5);
      p.light.setVisible(true);
      p.light.intensity = p.base * gain * (1 + wobble);
    });
    this.pool.slots.forEach((slot, i) => {
      const light = this.flashLights[i];
      if (!light) return;
      const k = strengths[i] ?? 0;
      light.setVisible(k > 0);
      if (k <= 0) return;
      light.setPosition(slot.x, slot.y);
      light.setColor(slot.color);
      light.radius = slot.radius;
      light.intensity = k;
    });
    this.shadows?.update(deltaMs, shadowVector(s));
    this.glows?.update(now, s.glow);
  }

  destroy(): void {
    this.shadows?.destroy();
    this.glows?.destroy();
    this.persistent.clear();
    this.syncers.clear();
    if (this.active) this.scene.lights.lights.length = 0;
    managers.delete(this.scene);
    const w = window as unknown as { __lighting?: LightManager };
    if (w.__lighting === this) delete w.__lighting;
  }
}
