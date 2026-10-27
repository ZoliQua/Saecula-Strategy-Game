import Phaser from 'phaser';
import { SHADOW, TERRAIN_LOOK } from '../config/visual';
import { ART_SCALE } from '../iso/art/canvas';
import { LightManager, lit } from '../iso/art/lighting/LightManager';
import { shadowKey } from '../iso/art/lighting/litTextures';
import { shearQuad, type Pt2 } from '../iso/art/lighting/shadowGeometry';
import { SHADOW_DEPTH } from '../iso/art/lighting/CastShadows';
import { TREE_VARIANTS } from '../iso/art/trees';
import type { Box, CoverSource, PlacedCover } from '../iso/coverage';
import { frameCover } from '../iso/frameCover';
import { DECOR_ORIGIN_Y, decorKeys } from '../iso/textures';
import { depthRow, lowerBound, treePlacement, visibleRows, type ForestSource } from './forestLayout';
import { FOG_UNEXPLORED, type FogOfWarData } from './FogOfWarData';
import { TERRAIN } from './TerrainTypes';

/** Trees draw just above units' ground decals on their row (units sit at +0.3). */
const TREE_DEPTH_OFFSET = 0.1;
/** Screen reach of a tree sprite around its trunk base (art 104×156 at ≤ 1.3 × 0.5 scale). */
const REACH_X = 48;
const REACH_UP = 112;
const REACH_DOWN = 16;

type Matrix = Phaser.GameObjects.Components.TransformMatrix;
type WebGL = Phaser.Renderer.WebGL.WebGLRenderer;
type Pipeline = Phaser.Renderer.WebGL.Pipelines.MultiPipeline;

interface Row {
  readonly obj: TreeRow;
  /** Tree ids sorted by x, and their x for the binary search. */
  readonly ids: Int32Array;
  readonly xs: Float32Array;
}

/**
 * One display-list entry per depth row: it batches every visible tree of
 * that row through the lit pipeline (one atlas texture, so no flushes),
 * keeping units correctly interleaved with the forest row by row.
 */
class TreeRow extends Phaser.GameObjects.Image {
  constructor(
    scene: Phaser.Scene,
    private readonly layer: ForestLayer,
    readonly index: number,
  ) {
    super(scene, 0, 0, decorKeys.trees, 0);
    this.setDepth(index + TREE_DEPTH_OFFSET);
  }

  renderWebGL(renderer: WebGL, _src: this, camera: Phaser.Cameras.Scene2D.Camera): void {
    this.layer.drawRow(this.index, this, renderer, camera);
  }

  /** Canvas renderer fallback: plain unlit, unswayed trees. */
  renderCanvas(renderer: Phaser.Renderer.Canvas.CanvasRenderer, _src: this, camera: Phaser.Cameras.Scene2D.Camera): void {
    this.layer.drawRowCanvas(this.index, this, renderer.currentContext, camera);
  }
}

/** All tree cast shadows in one batch, under every caster. */
class TreeShadows extends Phaser.GameObjects.Image {
  constructor(
    scene: Phaser.Scene,
    private readonly layer: ForestLayer,
  ) {
    super(scene, 0, 0, shadowKey(decorKeys.trees), 0);
    this.setDepth(SHADOW_DEPTH + 1);
  }

  renderWebGL(renderer: WebGL, _src: this, camera: Phaser.Cameras.Scene2D.Camera): void {
    this.layer.drawShadows(this, renderer, camera);
  }

  /** Cast shadows are WebGL-only (see LightManager). */
  renderCanvas(): void {
    return;
  }
}

/**
 * Renders every forest tile's tree without a GameObject per tree:
 * placement data lives in typed arrays, depth rows draw only what the
 * camera sees, trees sway in the vertex positions, and one object draws
 * all tree shadows. Removing a tree (chopped) just marks it dead.
 */
export class ForestLayer implements CoverSource {
  private readonly x: Float32Array;
  private readonly y: Float32Array;
  private readonly scale: Float32Array;
  private readonly phase: Float32Array;
  private readonly frame: Uint8Array;
  private readonly alive: Uint8Array;
  private readonly rows: Row[] = [];
  /** rows by depth-row index (sparse). */
  private readonly rowAt: Array<Row | undefined> = [];
  private readonly shadows: TreeShadows | null = null;
  private readonly originY: number;
  private time = 0;
  private sway = true;
  /** Trees on never-explored tiles are not drawn (their crowns would poke out of the flat fog). */
  private fog: FogOfWarData | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: ForestSource,
  ) {
    const n = map.width * map.height;
    this.x = new Float32Array(n);
    this.y = new Float32Array(n);
    this.scale = new Float32Array(n);
    this.phase = new Float32Array(n);
    this.frame = new Uint8Array(n);
    this.alive = new Uint8Array(n);
    this.originY = DECOR_ORIGIN_Y.get(decorKeys.trees) ?? 0.9;
    const byRow: number[][] = Array.from({ length: map.width + map.height - 1 }, () => []);
    for (let ty = 0; ty < map.height; ty++) {
      for (let tx = 0; tx < map.width; tx++) {
        if (map.getTile(tx, ty) !== TERRAIN.forest) continue;
        const id = ty * map.width + tx;
        const p = treePlacement(map, tx, ty, TREE_VARIANTS);
        this.x[id] = p.x;
        this.y[id] = p.y;
        this.scale[id] = p.scale / ART_SCALE;
        this.phase[id] = p.phase;
        this.frame[id] = p.frame;
        this.alive[id] = 1;
        byRow[depthRow(tx, ty)]?.push(id);
      }
    }
    byRow.forEach((ids, index) => {
      if (ids.length === 0) return;
      ids.sort((a, b) => (this.x[a] ?? 0) - (this.x[b] ?? 0));
      const obj = lit(new TreeRow(scene, this, index));
      scene.add.existing(obj);
      const row: Row = { obj, ids: Int32Array.from(ids), xs: Float32Array.from(ids, (id) => this.x[id] ?? 0) };
      this.rows.push(row);
      this.rowAt[index] = row;
    });
    const lights = LightManager.of(scene);
    if (lights?.shadows && scene.textures.exists(shadowKey(decorKeys.trees))) {
      this.shadows = new TreeShadows(scene, this);
      scene.add.existing(this.shadows);
    }
  }

  /** Live fog of the viewing player (TileMap.applyFog). */
  setFog(fog: FogOfWarData): void {
    this.fog = fog;
  }

  private hidden(id: number): boolean {
    const w = this.map.width;
    return this.fog !== null && this.fog.get(id % w, Math.floor(id / w)) === FOG_UNEXPLORED;
  }

  /** True when the tile still shows a standing tree. */
  has(tx: number, ty: number): boolean {
    return this.alive[ty * this.map.width + tx] === 1;
  }

  /** The tree on this tile is gone (chopped down). */
  remove(tx: number, ty: number): void {
    this.alive[ty * this.map.width + tx] = 0;
  }

  /** Standing, seen trees drawn in front of `minDepth` whose sprite overlaps `box` (sway ignored). */
  collectCovers(box: Box, minDepth: number, out: PlacedCover[]): void {
    const texture = this.scene.textures.get(decorKeys.trees);
    const first = Math.max(0, Math.floor(minDepth - TREE_DEPTH_OFFSET) + 1);
    // A tree's sprite reaches REACH_UP above its row's ground line (16 px per row).
    const last = Math.min(this.rowAt.length - 1, first + Math.ceil((box.bottom - box.top + REACH_UP) / 16) + 1);
    for (let r = first; r <= last; r++) {
      const row = this.rowAt[r];
      if (!row) continue;
      for (let k = lowerBound(row.xs, box.left - REACH_X); k < row.ids.length && (row.xs[k] ?? Infinity) <= box.right + REACH_X; k++) {
        const id = row.ids[k] ?? 0;
        if (this.alive[id] !== 1 || this.hidden(id)) continue;
        const f = texture.get(this.frame[id] ?? 0);
        const s = this.scale[id] ?? 1;
        const left = (this.x[id] ?? 0) - 0.5 * f.cutWidth * s;
        const top = (this.y[id] ?? 0) - this.originY * f.cutHeight * s;
        if (left >= box.right || left + f.cutWidth * s <= box.left || top >= box.bottom || top + f.cutHeight * s <= box.top) continue;
        const cover = frameCover(f);
        if (cover) out.push({ cover, left, top, scale: s, flipX: false, depth: r + TREE_DEPTH_OFFSET });
      }
    }
  }

  /** Per frame: the sway clock. */
  update(time: number): void {
    this.time = time;
    this.sway = this.scene.cameras.main.zoom >= TERRAIN_LOOK.swayMinZoom;
  }

  /** Row culling against `view` (TileMap passes the live camera view, again right before render). */
  cull(view: { readonly y: number; readonly bottom: number }): void {
    const { first, last } = visibleRows(view.y, view.bottom, this.map.width + this.map.height - 1, REACH_UP, REACH_DOWN);
    for (const r of this.rows) r.obj.setVisible(r.obj.index >= first && r.obj.index <= last);
  }

  /** Called by a row object while the renderer walks the display list. */
  drawRow(index: number, obj: TreeRow, renderer: WebGL, camera: Phaser.Cameras.Scene2D.Camera): void {
    const row = this.rowAt[index];
    if (!row) return;
    const view = camera.worldView;
    const pipeline = renderer.pipelines.set(obj.pipeline, obj) as Pipeline;
    const tex = obj.texture;
    const unit = pipeline.setGameObject(obj, obj.frame);
    const tint = Phaser.Renderer.WebGL.Utils.getTintAppendFloatAlpha(0xffffff, camera.alpha * obj.alpha);
    const m = (camera as unknown as { matrix: Matrix }).matrix;
    const end = view.right + REACH_X;
    for (let k = lowerBound(row.xs, view.x - REACH_X); k < row.ids.length && (row.xs[k] ?? Infinity) <= end; k++) {
      const id = row.ids[k] ?? 0;
      if (this.alive[id] !== 1 || this.hidden(id)) continue;
      const f = tex.get(this.frame[id] ?? 0);
      const s = this.scale[id] ?? 1;
      const w = f.cutWidth * s;
      const h = f.cutHeight * s;
      const left = -0.5 * w;
      const top = -this.originY * h;
      const ph = this.phase[id] ?? 0;
      const rot = this.sway ? Math.sin(this.time * 0.0011 + ph) * 0.025 + Math.sin(this.time * 0.0031 + ph * 2) * 0.008 : 0;
      const c = Math.cos(rot);
      const sn = Math.sin(rot);
      const ox = (this.x[id] ?? 0) - camera.scrollX;
      const oy = (this.y[id] ?? 0) - camera.scrollY;
      const X = (lx: number, ly: number) => m.getX(ox + lx * c - ly * sn, oy + lx * sn + ly * c);
      const Y = (lx: number, ly: number) => m.getY(ox + lx * c - ly * sn, oy + lx * sn + ly * c);
      const right = left + w;
      const bottom = top + h;
      pipeline.batchQuad(
        obj,
        X(left, top), Y(left, top),
        X(left, bottom), Y(left, bottom),
        X(right, bottom), Y(right, bottom),
        X(right, top), Y(right, top),
        f.u0, f.v0, f.u1, f.v1,
        tint, tint, tint, tint, 0, f.glTexture, unit,
      );
    }
  }

  drawRowCanvas(index: number, obj: TreeRow, ctx: CanvasRenderingContext2D, camera: Phaser.Cameras.Scene2D.Camera): void {
    const row = this.rowAt[index];
    if (!row) return;
    const view = camera.worldView;
    const m = (camera as unknown as { matrix: Matrix }).matrix;
    ctx.save();
    ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
    ctx.translate(-camera.scrollX, -camera.scrollY);
    ctx.globalAlpha = camera.alpha * obj.alpha;
    const end = view.right + REACH_X;
    for (let k = lowerBound(row.xs, view.x - REACH_X); k < row.ids.length && (row.xs[k] ?? Infinity) <= end; k++) {
      const id = row.ids[k] ?? 0;
      if (this.alive[id] !== 1 || this.hidden(id)) continue;
      const f = obj.texture.get(this.frame[id] ?? 0);
      const s = this.scale[id] ?? 1;
      const w = f.cutWidth * s;
      const h = f.cutHeight * s;
      const img = f.source.image as CanvasImageSource;
      ctx.drawImage(img, f.cutX, f.cutY, f.cutWidth, f.cutHeight, (this.x[id] ?? 0) - w / 2, (this.y[id] ?? 0) - this.originY * h, w, h);
    }
    ctx.restore();
  }

  drawShadows(obj: TreeShadows, renderer: WebGL, camera: Phaser.Cameras.Scene2D.Camera): void {
    const sv = LightManager.of(this.scene)?.shadows?.vector;
    if (!sv || sv.strength < 0.02) return;
    const view = camera.worldView;
    const reach = (REACH_UP + REACH_X) * (1 + SHADOW.maxLength);
    const { first, last } = visibleRows(view.y, view.bottom, this.map.width + this.map.height - 1, reach, reach);
    const pipeline = renderer.pipelines.set(obj.pipeline, obj) as Pipeline;
    const unit = pipeline.setGameObject(obj, obj.frame);
    const tint = Phaser.Renderer.WebGL.Utils.getTintAppendFloatAlpha(0xffffff, camera.alpha * SHADOW.alpha * sv.strength);
    const m = (camera as unknown as { matrix: Matrix }).matrix;
    const tex = obj.texture;
    for (const row of this.rows) {
      if (row.obj.index < first || row.obj.index > last) continue;
      const end = view.right + reach;
      for (let k = lowerBound(row.xs, view.x - reach); k < row.ids.length && (row.xs[k] ?? Infinity) <= end; k++) {
        const id = row.ids[k] ?? 0;
        if (this.alive[id] !== 1 || this.hidden(id)) continue;
        const f = tex.get(this.frame[id] ?? 0);
        const s = this.scale[id] ?? 1;
        const w = f.cutWidth * s;
        const h = f.cutHeight * s;
        const left = -0.5 * w;
        const q = shearQuad(left, -this.originY * h, left + w, 0, sv);
        const ox = (this.x[id] ?? 0) - camera.scrollX;
        const oy = (this.y[id] ?? 0) - camera.scrollY;
        const X = (p: Pt2) => m.getX(ox + p[0], oy + p[1]);
        const Y = (p: Pt2) => m.getY(ox + p[0], oy + p[1]);
        const [tl, bl, br, tr] = q;
        const v1 = f.v0 + (f.v1 - f.v0) * this.originY;
        pipeline.batchQuad(obj, X(tl), Y(tl), X(bl), Y(bl), X(br), Y(br), X(tr), Y(tr), f.u0, f.v0, f.u1, v1, tint, tint, tint, tint, 0, f.glTexture, unit);
      }
    }
  }

  destroy(): void {
    for (const r of this.rows) r.obj.destroy();
    this.rows.length = 0;
    this.shadows?.destroy();
  }
}
