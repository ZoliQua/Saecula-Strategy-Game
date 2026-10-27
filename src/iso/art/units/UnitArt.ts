import Phaser from 'phaser';
import { UNIT_SHADOW_DOWNSCALE } from '../../../config/visual';
import { UNIT_SPECS } from '../../../ecs/archetypes/unit';
import type { CivId, UnitType } from '../../../types';
import { civArtGroupsInUse, unitArtKey } from '../artKeys';
import { shadowKey, shareNormalMap } from '../lighting/litTextures';
import { PAINTED_HEADINGS } from './layout';
import { spendPaintBudget } from './paintBudget';
import { createSheet, frameBox, frameRect, paintSome, type DirtyFrame, type UnitSheet } from './sheet';

/**
 * Lazy unit textures. The first time a unit type is needed its sheets
 * are allocated and the first idle frame of every heading is painted
 * synchronously; pumpUnitArt() paints the rest within one shared
 * per-frame budget and uploads only the changed frames.
 * Frames that are not painted yet fall back to the heading's idle frame.
 *
 * Textures (per type and civ — artKeys unitArtKey — shared by every
 * player of that civ):
 *  - `key`          albedo, team parts in neutral grey, normal map attached;
 *  - `maskKey(key)` team mask (same frames at half resolution, shares the normal map), drawn
 *                   on top and tinted with the player colour;
 *  - `shadowKey(key)` cast-shadow silhouette at 1 / UNIT_SHADOW_DOWNSCALE resolution.
 */
export interface UnitArt {
  readonly type: UnitType;
  readonly civ: CivId;
  readonly key: string;
  readonly maskKey: string;
  readonly sheet: UnitSheet;
  /** Sprite origin Y (feet) per frame, in its logical box; boxes differ per animation. */
  readonly originY: Float32Array;
}

const arts = new Map<string, UnitArt>();
const pending = new Set<UnitArt>();
/** Worst per-frame costs seen (dev diagnostics, see unitArtStats). */
const timing = { paintMax: 0, uploadMax: 0, createMax: 0 };
/** New sheets (allocation + texture upload, ~15 ms each) per game frame. */
const NEW_SHEETS_PER_FRAME = 1;
const perFrame = { frame: -1, sheets: 0 };

function frameBudget(scene: Phaser.Scene): typeof perFrame {
  const frame = scene.game.loop.frame;
  if (perFrame.frame !== frame) {
    perFrame.frame = frame;
    perFrame.sheets = 0;
  }
  return perFrame;
}

export function teamMaskKey(key: string): string {
  return `${key}#team`;
}

/** Texture key of a unit type's sheet for a civ. */
export function unitTextureKey(type: UnitType, civ: CivId): string {
  return unitArtKey(UNIT_SPECS[type].textureKey, civ);
}

/**
 * Returns the art of a unit type for a civ (in the civ's unit look,
 * looks.ts unitLook), creating its textures on first use. Returns null when this frame already created
 * a sheet (callers retry next frame) unless `force` (scene set-up, where
 * a hitch is harmless).
 */
export function unitArt(scene: Phaser.Scene, type: UnitType, civ: CivId, force = false): UnitArt | null {
  const key = unitTextureKey(type, civ);
  const hit = arts.get(key);
  if (hit && scene.textures.exists(key)) return hit;
  const budget = frameBudget(scene);
  if (!hit && !force && budget.sheets >= NEW_SHEETS_PER_FRAME) return null;
  budget.sheets++;
  const created = performance.now();
  const sheet = hit?.sheet ?? createSheet(type, civ);
  // A new unit is never invisible: finish the first idle frame of every
  // heading now (~5 frames, bounded by one new type per game frame).
  if (!hit) paintSome(sheet, Infinity, PAINTED_HEADINGS.length);
  const originY = new Float32Array(sheet.layout.frameCount);
  for (let k = 0; k < originY.length; k++) {
    const b = frameBox(sheet, k);
    originY[k] = b.feetY / b.h;
  }
  const art: UnitArt = { type, civ, key, maskKey: teamMaskKey(key), sheet, originY };
  register(scene, art);
  arts.set(key, art);
  timing.createMax = Math.max(timing.createMax, performance.now() - created);
  if (sheet.queue.length > 0) pending.add(art);
  return art;
}

/**
 * Drops the cached sheets (CPU canvases, pending paints) of civs not in
 * `civsInPlay`; their textures go with releaseAbsentCivArt. A later
 * request (e.g. the menu after the game) simply paints them again.
 */
export function forgetUnitArt(civsInPlay: ReadonlySet<CivId>, inUse: ReadonlySet<string>): void {
  // Same rule as releaseAbsentCivArt: a sheet stays while its albedo, mask or shadow is shown.
  const shown = civArtGroupsInUse(inUse);
  for (const [key, art] of arts) {
    if (civsInPlay.has(art.civ) || shown.has(key)) continue;
    arts.delete(key);
    pending.delete(art);
  }
}

/** Frame to show for `k`: itself once painted, else the heading's first idle frame. */
export function readyFrame(art: UnitArt, k: number): number {
  if (art.sheet.painted[k]) return k;
  return Math.floor(k / art.sheet.layout.perHeading) * art.sheet.layout.perHeading;
}

/**
 * Continues lazy painting within `budgetMs` and re-uploads what changed.
 * Call once per frame from any scene that shows units.
 */
export function pumpUnitArt(scene: Phaser.Scene, budgetMs = 5): void {
  spendPaintBudget(pending, budgetMs, (art, remainingMs) => {
    const t0 = performance.now();
    const painted = paintSome(art.sheet, remainingMs);
    const t1 = performance.now();
    if (painted > 0) refresh(scene, art);
    if (art.sheet.queue.length === 0) pending.delete(art);
    timing.paintMax = Math.max(timing.paintMax, t1 - t0);
    timing.uploadMax = Math.max(timing.uploadMax, performance.now() - t1);
    // A frame left half-rasterized also counts as this frame's work.
    return { worked: painted > 0 || art.sheet.active >= 0 };
  });
}

/** Paints everything now (dev showcase, tests of the look). */
export function paintAllUnitArt(scene: Phaser.Scene, art: UnitArt): void {
  paintSome(art.sheet, Infinity);
  pending.delete(art);
  refresh(scene, art);
}

/** Worst per-frame paint / upload / first-use costs so far (ms). */
export function unitArtTiming(): Readonly<typeof timing> {
  return { ...timing };
}

/** Painting statistics per type (dev: window.__unitArt). */
export function unitArtStats(): Array<{ type: UnitType; frames: number; totalMs: number; maxMs: number; bytes: number }> {
  return [...arts.values()].map((a) => {
    const s = a.sheet;
    const px = (c: HTMLCanvasElement | null) => (c ? c.width * c.height * 4 : 0);
    return { type: a.type, ...s.stats, bytes: px(s.albedo) + px(s.mask) + px(s.normal) + px(s.shadow) };
  });
}

function register(scene: Phaser.Scene, art: UnitArt): void {
  const { sheet } = art;
  const tm = scene.textures;
  // Each frame is its packed rectangle, trimmed back into its logical box, so origin and feet line stay put.
  const frames = (tex: Phaser.Textures.Texture, div: number) => {
    for (let k = 0; k < sheet.layout.frameCount; k++) {
      const { x, y, w, h, ox, oy } = frameRect(sheet, k);
      const b = frameBox(sheet, k);
      tex.add(k, 0, x / div, y / div, w / div, h / div)?.setTrim(b.w / div, b.h / div, ox / div, oy / div, w / div, h / div);
    }
  };
  // `width` / `height`: the size UVs are computed against (a half-size mask keeps the albedo's UVs).
  const create = (key: string, canvas: HTMLCanvasElement, width = canvas.width, height = canvas.height): Phaser.Textures.Texture | null => {
    if (tm.exists(key)) tm.remove(key);
    return tm.create(key, canvas, width, height);
  };
  const albedo = create(art.key, sheet.albedo);
  if (!albedo) return;
  frames(albedo, 1);
  // The normal map is half size; Light2D samples it with the albedo's UVs.
  if (sheet.normal) albedo.setDataSource(sheet.normal);
  // The team mask is half size too: its frames use the albedo's rectangles (same UVs), the GPU texture is a quarter.
  const mask = create(art.maskKey, sheet.mask, sheet.albedo.width, sheet.albedo.height);
  if (mask) {
    frames(mask, 1);
    shareNormalMap(scene, art.key, art.maskKey);
  }
  if (sheet.shadow) {
    const shadow = create(shadowKey(art.key), sheet.shadow);
    if (shadow) frames(shadow, UNIT_SHADOW_DOWNSCALE);
  }
  // Creating the textures uploaded everything painted so far.
  sheet.dirty = [];
}

/**
 * Uploads the frames painted since the last call. WebGL gets only the
 * changed rectangles (texSubImage2D) — re-uploading whole sheets every
 * frame costs more than the painting itself.
 */
function refresh(scene: Phaser.Scene, art: UnitArt): void {
  const dirty = art.sheet.dirty;
  art.sheet.dirty = [];
  const tm = scene.textures;
  if (!tm.exists(art.key)) return;
  const renderer = scene.game.renderer;
  if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return;
  const gl = renderer.gl;
  const albedo = tm.get(art.key);
  const targets: Array<[Phaser.Textures.TextureSource | undefined, (d: DirtyFrame) => ImageData | null, number]> = [
    [albedo.source[0], (d) => d.albedo, 1],
    [albedo.dataSource[0], (d) => d.normal, 2],
    [tm.exists(art.maskKey) ? tm.get(art.maskKey).source[0] : undefined, (d) => d.mask, 2],
    [tm.exists(shadowKey(art.key)) ? tm.get(shadowKey(art.key)).source[0] : undefined, (d) => d.shadow, UNIT_SHADOW_DOWNSCALE],
  ];
  gl.activeTexture(gl.TEXTURE0);
  const previous = gl.getParameter(gl.TEXTURE_BINDING_2D) as WebGLTexture | null;
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  for (const [source, pick, div] of targets) {
    const tex = source?.glTexture?.webGLTexture;
    if (!tex) continue;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    for (const d of dirty) {
      const img = pick(d);
      if (img) gl.texSubImage2D(gl.TEXTURE_2D, 0, d.x / div, d.y / div, gl.RGBA, gl.UNSIGNED_BYTE, img);
    }
  }
  gl.bindTexture(gl.TEXTURE_2D, previous);
}
