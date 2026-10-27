import Phaser from 'phaser';
import { ART_SCALE } from '../iso/art/canvas';
import { BUSH_VARIANTS, ROCK_VARIANTS } from '../iso/art/decor';
import { hash2, tileVariant } from '../iso/art/palette';
import { TERRAIN_LOOK } from '../config/visual';
import { TerrainSurface } from './TerrainSurface';
import { buildWaterMask, hasWater } from './waterMask';
import { marchRelief } from './cliffRelief';
import { CliffOccluders } from './CliffOccluders';
import type { CliffField } from '../iso/art/cliffArt';
import { lit } from '../iso/art/lighting/LightManager';
import { ChunkStreamer } from './ChunkStreamer';
import { mapWorldBounds, TerrainBake, type WorldBounds } from './TerrainBake';
import { tileToScreen, type TileCoord } from '../iso/coordinates';
import { tileDepth } from '../iso/depth';
import type { CoverSource } from '../iso/coverage';
import { DECOR_ORIGIN_Y, decorKeys, FX_KEYS } from '../iso/textures';
import type { MapData } from './MapData';
import { TERRAIN } from './TerrainTypes';
import { FogLayer } from './FogLayer';
import { ForestLayer } from './ForestLayer';
import type { FogOfWarData } from './FogOfWarData';
import { liveView, type ViewRect } from '../iso/liveView';

/** Decor sprites this far (world px) outside the view stay drawn (their art overhangs the tile). */
const DECOR_CULL_MARGIN = 80;
const HIGHLIGHT_DEPTH_OFFSET = 0.5;
const CLOUD_DEPTH = 9_000;
/** Cloud pattern repeat scale in world px per texture px. */
const CLOUD_SCALE_X = 3;
const CLOUD_SCALE_Y = 1.6;
/**
 * The cloud TileSprite is this fraction of the screen, scaled back up. In
 * WebGL Phaser draws it from its repeat pattern; its own canvas texture
 * (screen-sized, ~8 MB at DPR 2) is allocated but never sampled, so a
 * small one changes nothing on screen.
 */
const CLOUD_LAYER_RES = 1 / 8;
/** Screen px of cloud layer beyond each view edge. */
const CLOUD_PAD = 64;
const DECOR_DEPTH_OFFSET = 0.1;
const HOVER_COLOR = 0xf5a857;

interface Decor {
  sprite: Phaser.GameObjects.Image;
  kind: 'gold' | 'bush' | 'stump';
}

/**
 * Renders the isometric world: painted terrain chunks, per-tile decor
 * (trees, gold rocks, berry bushes), a soft fog-of-war layer and
 * drifting cloud shadows. Call update() every frame for the ambient
 * animation (tree sway, clouds, fog fades).
 */
export class TileMap {
  public readonly width: number;
  public readonly height: number;

  private readonly scene: Phaser.Scene;
  private readonly mapData: MapData;
  private readonly chunks: ChunkStreamer;
  private readonly decor = new Map<number, Decor>();
  private forest!: ForestLayer;
  private readonly cliffs: CliffField | null;
  private readonly occluders: CliffOccluders | null;
  private readonly surface: TerrainSurface;
  private readonly clouds: Phaser.GameObjects.TileSprite;
  /** Cloud drift in texture px. */
  private readonly cloudDrift = { x: 0, y: 0 };
  private readonly fog: FogLayer;
  private highlight: Phaser.GameObjects.Graphics | null = null;
  private selection: Phaser.GameObjects.Graphics | null = null;

  /** `bake`: a finished TerrainBake (spread over frames by the caller); baked here at once when omitted. */
  constructor(scene: Phaser.Scene, mapData: MapData, bake: TerrainBake = new TerrainBake(scene, mapData).runAll()) {
    this.scene = scene;
    this.mapData = mapData;
    this.width = mapData.width;
    this.height = mapData.height;

    if (!bake.finished) throw new Error('TileMap needs a finished terrain bake');
    this.cliffs = bake.cliffs;
    this.chunks = new ChunkStreamer(scene, bake.chunks);
    const plan = bake.plan;
    this.occluders = this.cliffs && plan ? new CliffOccluders(scene, this.cliffs, plan) : null;
    this.placeDecor();
    this.surface = new TerrainSurface(
      scene,
      this.computeWorldBounds(),
      mapData,
      TERRAIN_LOOK.surfaceRes,
      this.cliffs?.relief ?? null,
      hasWater(mapData) ? buildWaterMask(mapData, TERRAIN_LOOK.surfaceRes) : null,
    );

    // Camera-sized layer (a map-sized TileSprite allocates a canvas of the
    // whole world, >100 MB on large maps); update() keeps it over the view
    // and offsets the pattern so the clouds stay fixed to the ground.
    this.clouds = scene.add
      .tileSprite(0, 0, cloudLayerSize(scene.scale.width), cloudLayerSize(scene.scale.height), FX_KEYS.clouds)
      .setOrigin(0, 0)
      .setDepth(CLOUD_DEPTH)
      .setAlpha(0.2);
    const relief = this.cliffs?.relief;
    const w = mapData.width;
    // Fog over raised rock follows the rock's own tile (no cliff silhouettes leaking at fog borders).
    const rockAt = relief
      ? (u: number, v: number) => {
          const hit = marchRelief(relief, u, v);
          return hit ? hit.ty * w + hit.tx : -1;
        }
      : null;
    this.fog = new FogLayer(scene, mapData.width, mapData.height, rockAt);
    scene.events.on(Phaser.Scenes.Events.PRE_RENDER, this.cullBeforeRender, this);
  }

  private placeDecor(): void {
    this.forest = new ForestLayer(this.scene, this.mapData);
    this.mapData.forEachTile(({ tx, ty }) => this.syncDecor(tx, ty));
  }

  private decorFor(tx: number, ty: number): { key: string; kind: Decor['kind'] } | null {
    switch (this.mapData.getTile(tx, ty)) {
      case TERRAIN.gold_mine:
        return { key: decorKeys.gold(tileVariant(tx, ty, ROCK_VARIANTS)), kind: 'gold' };
      case TERRAIN.berries:
        return { key: decorKeys.bush(tileVariant(tx, ty, BUSH_VARIANTS)), kind: 'bush' };
      default:
        return null;
    }
  }

  /** Creates, swaps or removes the decor sprite for one tile (trees: see ForestLayer). */
  private syncDecor(tx: number, ty: number): void {
    const id = ty * this.width + tx;
    if (this.forest.has(tx, ty) && this.mapData.getTile(tx, ty) !== TERRAIN.forest) {
      // A chopped-down tree leaves its stump.
      this.forest.remove(tx, ty);
      this.addDecor(id, tx, ty, decorKeys.stump, 'stump');
      return;
    }
    const want = this.decorFor(tx, ty);
    const have = this.decor.get(id);
    if (have && want && have.sprite.texture.key === want.key) return;
    if (have) {
      if (have.kind === 'stump' && !want) return;
      have.sprite.destroy();
      this.decor.delete(id);
    }
    if (want) this.addDecor(id, tx, ty, want.key, want.kind);
  }

  private addDecor(id: number, tx: number, ty: number, key: string, kind: Decor['kind']): void {
    const { sx, sy } = tileToScreen({ tx, ty });
    // Small jitter breaks up the grid; trees stay inside their tile.
    const jx = (hash2(tx, ty, 201) - 0.5) * 10;
    const jy = (hash2(tx, ty, 202) - 0.5) * 5;
    const scale = 1 / ART_SCALE;
    const sprite = this.scene.add
      .image(sx + jx, sy + jy, key)
      .setOrigin(0.5, DECOR_ORIGIN_Y.get(key) ?? 0.85)
      .setScale(scale)
      .setFlipX(hash2(tx, ty, 204) > 0.5)
      .setDepth(tileDepth({ tx, ty }) + DECOR_DEPTH_OFFSET);
    lit(sprite);
    this.decor.set(id, { sprite, kind });
  }

  /** What draws over units standing behind it (raised rock, trees), for X-ray silhouettes. */
  coverSources(): CoverSource[] {
    return this.occluders ? [this.occluders, this.forest] : [this.forest];
  }

  /** See CliffOccluders.buildingDepth (`depth` unchanged without cliffs). */
  buildingDepthBesideCliffs(fx: number, fy: number, w: number, h: number, depth: number): number {
    return this.occluders?.buildingDepth(fx, fy, w, h, depth) ?? depth;
  }

  /** Re-reads terrain for one tile (e.g. a depleted resource). */
  refreshTile(tx: number, ty: number): void {
    this.syncDecor(tx, ty);
  }

  /** Per-frame ambient animation. */
  update(time: number, delta: number): void {
    const cam = this.scene.cameras.main;
    const view = liveView(cam);
    // Decor, tree rows and occluders are culled once per frame, in PRE_RENDER (cullBeforeRender).
    this.forest.update(time);
    this.surface.update(time);
    this.chunks.update(view, cam.zoom);
    this.updateClouds(view, delta);
    this.fog.update(delta);
  }

  /**
   * Off-screen culling of decor, tree rows and cliff occluders (and terrain
   * chunks) against the live view: Phaser batches every visible object, and
   * the lit pipeline breaks batches per texture, so hidden objects save draw
   * calls. Runs once per frame, right before render (PRE_RENDER), so a
   * camera jump after update() (minimap click) never draws a frame with the
   * destination's trees or rock faces missing.
   */
  private cullToView(view: ViewRect): void {
    const margin = DECOR_CULL_MARGIN;
    for (const d of this.decor.values()) {
      const s = d.sprite;
      const inView = !(s.x < view.x - margin || s.x > view.right + margin || s.y < view.y - margin || s.y > view.bottom + margin * 2);
      s.setVisible(inView);
    }
    this.forest.cull(view);
    this.occluders?.update(view);
  }

  /** Keeps the screen-sized cloud layer over the camera, pattern locked to the world. */
  private updateClouds(view: ViewRect, delta: number): void {
    const cam = this.scene.cameras.main;
    const w = cloudLayerSize(this.scene.scale.width);
    const h = cloudLayerSize(this.scene.scale.height);
    if (this.clouds.width !== w || this.clouds.height !== h) this.clouds.setSize(w, h);
    const k = 1 / cam.zoom;
    const r = CLOUD_LAYER_RES;
    const x = view.x - CLOUD_PAD * k;
    const y = view.y - CLOUD_PAD * k;
    this.cloudDrift.x += delta * 0.006;
    this.cloudDrift.y += delta * 0.0025;
    this.clouds.setScale(k / r).setPosition(x, y).setTileScale(CLOUD_SCALE_X * cam.zoom * r, CLOUD_SCALE_Y * cam.zoom * r);
    this.clouds.tilePositionX = x / CLOUD_SCALE_X + this.cloudDrift.x;
    this.clouds.tilePositionY = y / CLOUD_SCALE_Y + this.cloudDrift.y;
  }

  applyFog(fog: FogOfWarData): void {
    this.fog.setTarget(fog);
    this.forest.setFog(fog);
  }

  setHoverTile(tile: TileCoord | null): void {
    if (!tile) {
      this.highlight?.setVisible(false);
      return;
    }
    if (!this.highlight) this.highlight = this.drawDiamond(HOVER_COLOR, 0.9, 0.12);
    this.placeOverlay(this.highlight, tile);
  }

  setSelectedTile(tile: TileCoord | null): void {
    if (!tile) {
      this.selection?.setVisible(false);
      return;
    }
    if (!this.selection) this.selection = this.drawDiamond(0xffffff, 0.8, 0.06);
    this.placeOverlay(this.selection, tile);
  }

  /** World-coord bounds (sx_min, sy_min, sx_max, sy_max). */
  getWorldBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    return this.computeWorldBounds();
  }

  private computeWorldBounds(): WorldBounds {
    return mapWorldBounds(this.width, this.height);
  }

  private placeOverlay(overlay: Phaser.GameObjects.Graphics, tile: TileCoord): void {
    const { sx, sy } = tileToScreen(tile);
    overlay.setPosition(sx, sy);
    overlay.setDepth(tileDepth(tile) + HIGHLIGHT_DEPTH_OFFSET);
    overlay.setVisible(true);
  }

  private drawDiamond(color: number, lineAlpha: number, fillAlpha: number): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    const hw = 30;
    const hh = 15;
    const pts = [new Phaser.Math.Vector2(0, -hh), new Phaser.Math.Vector2(hw, 0), new Phaser.Math.Vector2(0, hh), new Phaser.Math.Vector2(-hw, 0)];
    g.fillStyle(color, fillAlpha);
    g.fillPoints(pts, true);
    g.lineStyle(1.5, color, lineAlpha);
    g.strokePoints(pts, true);
    g.setVisible(false);
    return g;
  }

  /** PRE_RENDER: chunks, decor, trees and occluders culled against the camera as it will render. */
  private cullBeforeRender(): void {
    const view = liveView(this.scene.cameras.main);
    this.chunks.cull(view);
    this.cullToView(view);
  }

  destroy(): void {
    this.scene.events.off(Phaser.Scenes.Events.PRE_RENDER, this.cullBeforeRender, this);
    this.chunks.destroy();
    this.occluders?.destroy();
    this.surface.destroy();
    for (const d of this.decor.values()) d.sprite.destroy();
    this.forest.destroy();
    this.decor.clear();
    this.clouds.destroy();
    this.fog.destroy();
    this.highlight?.destroy();
    this.selection?.destroy();
  }
}

/** Cloud layer side (layer px) covering a screen side plus the pad. */
function cloudLayerSize(screen: number): number {
  return Math.ceil((screen + CLOUD_PAD * 2) * CLOUD_LAYER_RES);
}
