import Phaser from 'phaser';
import { SHADOW } from '../../../config/visual';
import { RockFootprintIndex, type RockFootprint } from '../../../map/rockFootprints';
import { shadowKey } from './litTextures';
import { inflate, projectVolumeShadow, shearQuad, type Pt2, type VolumePoint } from './shadowGeometry';
import type { ShadowVector } from './sun';

/** Shadows sit just above the terrain chunks (depth −1000), under everything else. */
export const SHADOW_DEPTH = -990;
const HULL_REDRAW_MS = 200;
/** Soft edge: stacked outline rings from wide/faint to tight (scales about the centroid). */
const RING_SCALES = [1.09, 1.07, 1.05, 1.035, 1.02, 1.005, 0.99, 0.97];
/** Per-ring alpha so the stacked core reaches ≈ the shadow alpha. */
const RING_ALPHA = 1 - Math.pow(1 - 0.8, 1 / RING_SCALES.length);
/** Ambient-occlusion halo around building footprints (sun-independent). */
const AO_SCALES = [1.14, 1.1, 1.07, 1.04, 1.02];
const AO_ALPHA = 0.045;

type Caster = Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;

interface VolumeEntry {
  readonly sprite: Caster;
  readonly volume: readonly VolumePoint[];
  readonly footprint: { readonly w: number; readonly h: number };
  readonly heightScale: () => number;
}

/**
 * A caster's blurred silhouette laid on the ground along the sun
 * (see shearQuad). Pull model: every frame it reads the caster's
 * position, frame, flip, scale and visibility, so callers never sync it.
 */
class SilhouetteShadow extends Phaser.GameObjects.Image {
  constructor(
    scene: Phaser.Scene,
    readonly caster: Caster,
    private readonly owner: CastShadows,
    baseKey: string,
  ) {
    super(scene, 0, 0, shadowKey(baseKey));
    this.setDepth(SHADOW_DEPTH + 1);
  }

  renderWebGL(renderer: Phaser.Renderer.WebGL.WebGLRenderer, _src: this, camera: Phaser.Cameras.Scene2D.Camera): void {
    const c = this.caster;
    const sv = this.owner.vector;
    if (!c.visible || c.alpha < 0.05 || sv.strength < 0.02) return;
    const name = c.frame.name;
    if (this.frame.name !== name) {
      if (!this.texture.has(name)) return;
      this.setFrame(name);
    }
    const f = this.frame;
    const sx = Math.abs(c.scaleX);
    const sy = Math.abs(c.scaleY);
    // Geometry follows the caster's frame, so shadow textures may be lower resolution.
    const w = c.frame.cutWidth * sx;
    const h = c.frame.cutHeight * sy;
    const left = -c.originX * w;
    const top = -c.originY * h;
    const view = camera.worldView;
    const reach = (h + w) * (1 + SHADOW.maxLength);
    if (c.x + reach < view.x || c.x - reach > view.right || c.y + reach < view.y || c.y - reach > view.bottom) return;
    const q = shearQuad(left, top, left + w, 0, sv);
    let u0 = f.u0;
    let u1 = f.u1;
    if (c.flipX) [u0, u1] = [u1, u0];
    const v0 = f.v0;
    const v1 = f.v0 + (f.v1 - f.v0) * c.originY;
    // BaseCamera.matrix exists at runtime but is not in Phaser's typings.
    const m = (camera as unknown as { matrix: Phaser.GameObjects.Components.TransformMatrix }).matrix;
    const ox = c.x - camera.scrollX;
    const oy = c.y - camera.scrollY;
    const X = (p: Pt2) => m.getX(ox + p[0], oy + p[1]);
    const Y = (p: Pt2) => m.getY(ox + p[0], oy + p[1]);
    const pipeline = renderer.pipelines.set(this.pipeline, this) as Phaser.Renderer.WebGL.Pipelines.MultiPipeline;
    const unit = pipeline.setGameObject(this, f);
    const tint = Phaser.Renderer.WebGL.Utils.getTintAppendFloatAlpha(0xffffff, camera.alpha * c.alpha * SHADOW.alpha * sv.strength);
    const [tl, bl, br, tr] = q;
    pipeline.batchQuad(this, X(tl), Y(tl), X(bl), Y(bl), X(br), Y(br), X(tr), Y(tr), u0, v0, u1, v1, tint, tint, tint, tint, 0, f.glTexture, unit);
  }
}

/**
 * Cast shadows for the lighting contract:
 *  - addSilhouette(): upright casters (units, trees) — blurred silhouette
 *    texture `shadowKey(baseKey)` sheared along the sun;
 *  - addVolume(): buildings — painter-recorded volume points projected
 *    onto the ground (convex hull, soft rings) plus an AO halo.
 * Both return a remover. Shadows are drawn under all casters.
 */
export class CastShadows {
  vector: ShadowVector = { x: 0, y: 0, px: 1, py: 0, strength: 0 };
  private readonly silhouettes = new Set<SilhouetteShadow>();
  private readonly volumes = new Set<VolumeEntry>();
  private readonly hulls: Phaser.GameObjects.Graphics;
  /** Raised rock near building shadows, cut out of them (stencil mask, inverted). */
  private readonly rockMask: Phaser.GameObjects.Graphics;
  private readonly rockCut: Phaser.Display.Masks.GeometryMask;
  private rock = new RockFootprintIndex([]);
  private sinceRedraw = HULL_REDRAW_MS;

  constructor(private readonly scene: Phaser.Scene) {
    this.hulls = scene.add.graphics().setDepth(SHADOW_DEPTH);
    this.rockMask = scene.make.graphics({}, false);
    this.rockCut = new Phaser.Display.Masks.GeometryMask(scene, this.rockMask).setInvertAlpha(true);
  }

  /**
   * Raised rock (TileMap.rockFootprints): building shadows and AO are
   * projected onto the ground plane, so they are kept off the plateaus
   * (nothing stands on them) — which also matches the unshadowed cliff
   * occluder copies drawn above the shadow layer.
   */
  setRock(rock: readonly RockFootprint[]): void {
    this.rock = new RockFootprintIndex(rock);
    this.sinceRedraw = HULL_REDRAW_MS;
  }

  addSilhouette(caster: Caster, baseKey: string): () => void {
    if (!this.scene.textures.exists(shadowKey(baseKey))) return () => undefined;
    const s = new SilhouetteShadow(this.scene, caster, this, baseKey);
    this.scene.add.existing(s);
    this.silhouettes.add(s);
    return () => {
      this.silhouettes.delete(s);
      s.destroy();
    };
  }

  addVolume(
    sprite: Caster,
    volume: readonly VolumePoint[],
    footprint: { w: number; h: number },
    heightScale: () => number = () => 1,
  ): () => void {
    const e: VolumeEntry = { sprite, volume, footprint, heightScale };
    this.volumes.add(e);
    this.sinceRedraw = HULL_REDRAW_MS;
    return () => {
      this.volumes.delete(e);
      this.sinceRedraw = HULL_REDRAW_MS;
    };
  }

  update(deltaMs: number, vector: ShadowVector): void {
    this.vector = vector;
    for (const s of this.silhouettes) {
      if (s.caster.active) continue;
      this.silhouettes.delete(s);
      s.destroy();
    }
    this.sinceRedraw += deltaMs;
    if (this.sinceRedraw < HULL_REDRAW_MS) return;
    this.sinceRedraw = 0;
    this.redrawHulls();
  }

  private redrawHulls(): void {
    const g = this.hulls;
    g.clear();
    const drawn: Phaser.Math.Vector2[][] = [];
    const alpha = SHADOW.alpha * this.vector.strength;
    for (const e of this.volumes) {
      const s = e.sprite;
      if (!s.active || !s.visible) continue;
      const toWorld = (p: Pt2) => new Phaser.Math.Vector2(s.x + (p[0] - s.displayOriginX) * s.scaleX, s.y + (p[1] - s.displayOriginY) * s.scaleY);
      // AO halo: footprint diamond, front corner at the sprite position.
      const { w, h } = e.footprint;
      const diamond: Pt2[] = [
        [s.x, s.y],
        [s.x + 32 * h, s.y - 16 * h],
        [s.x - 32 * w + 32 * h, s.y - 16 * (w + h)],
        [s.x - 32 * w, s.y - 16 * w],
      ];
      g.fillStyle(0x0a0e08, AO_ALPHA);
      for (const f of AO_SCALES) {
        const ring = inflate(diamond, f).map(([x, y]) => new Phaser.Math.Vector2(x, y));
        g.fillPoints(ring, true);
        if (f === AO_SCALES[0]) drawn.push(ring);
      }
      if (alpha < 0.01 || e.volume.length === 0) continue;
      const hull = projectVolumeShadow(e.volume, this.vector, e.heightScale());
      g.fillStyle(0x060a10, (alpha / 0.8) * RING_ALPHA);
      for (const scale of RING_SCALES) {
        const ring = inflate(hull, scale).map(toWorld);
        g.fillPoints(ring, true);
        if (scale === RING_SCALES[0]) drawn.push(ring);
      }
    }
    this.cutRock(drawn);
  }

  /** Masks the rock footprints the drawn shadow outlines overlap (no mask, no stencil pass, when none). */
  private cutRock(drawn: readonly Phaser.Math.Vector2[][]): void {
    const m = this.rockMask;
    m.clear();
    const near = new Set<RockFootprint>();
    if (!this.rock.empty) {
      for (const ring of drawn) {
        const xs = ring.map((p) => p.x);
        const ys = ring.map((p) => p.y);
        const box = { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
        for (const p of this.rock.near(box)) near.add(p);
      }
    }
    if (near.size === 0) {
      this.hulls.clearMask();
      return;
    }
    m.fillStyle(0xffffff, 1);
    for (const p of near) m.fillPoints(p.points.map(([x, y]) => new Phaser.Math.Vector2(x, y)), true);
    this.hulls.setMask(this.rockCut);
  }

  destroy(): void {
    for (const s of this.silhouettes) s.destroy();
    this.silhouettes.clear();
    this.volumes.clear();
    this.hulls.destroy();
    this.rockCut.destroy();
    this.rockMask.destroy();
  }
}
