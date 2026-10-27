import Phaser from 'phaser';
import { MENU_CIV } from '../config/civs';
import { BUILDING_SPECS } from '../ecs/archetypes/building';
import { AGE_STYLED_BUILDINGS } from '../iso/art/architecture/ageStyle';
import { ART_SCALE, BUILDING_BOTTOM_PAD } from '../iso/art/canvas';
import { LightManager, lit } from '../iso/art/lighting/LightManager';
import { BUILDING_LIGHT, buildingTexture, wallTexture, wonderStageTexture } from '../iso/buildingTextures';
import { FX_KEYS } from '../iso/textures';
import { PLAYER_COLORS } from '../game/Player';
import { wallNeighbourMaskBy } from '../game/wallNeighbours';
import { tileToScreen } from '../iso/coordinates';
import { wallBannerAnchor } from '../iso/art/walls/paintWall';
import { WALL_BANNER_ORIGIN } from '../iso/art/walls/wallBanner';
import { pieceHasPost, wallPiece } from '../iso/art/walls/wallPiece';
import type { AgeId, BuildingType, CivId } from '../types';

export interface BuildingShowcaseOptions {
  types?: BuildingType[];
  ages?: AgeId[];
  zoom?: number;
  /** Day-cycle phase (0.4 noon, 0.7 dusk, 0.85 night). */
  phase?: number;
  playerId?: number;
  /** Whose architecture to show (default Hungarian). */
  civ?: CivId;
  /** Several civs: one row per age and civ (civs of an age adjacent), for side-by-side comparison. */
  civs?: CivId[];
  /** Lay out wall rings, diagonal runs and gaps (one block per age) instead of the grid. */
  walls?: boolean;
  /** Show the Wonder's construction stages and the finished basilica side by side. */
  wonder?: boolean;
}

const CELL_W = 250;
const CELL_H = 270;

/**
 * DEV ONLY: building types × age styles on grass plots, for art review
 * screenshots. Start it from the console with `__showBuildings()`.
 */
export class BuildingShowcaseScene extends Phaser.Scene {
  private opts: BuildingShowcaseOptions = {};
  private lighting: LightManager | null = null;

  constructor() {
    super({ key: 'BuildingShowcaseScene' });
  }

  private get civ(): CivId {
    return this.opts.civ ?? MENU_CIV;
  }

  init(opts: BuildingShowcaseOptions): void {
    this.opts = opts ?? {};
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#2c3a22');
    this.lighting = new LightManager(this, { phase: this.opts.phase ?? 0.4, fixed: true });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.lighting?.destroy();
      this.lighting = null;
    });
    const types = this.opts.types ?? [...AGE_STYLED_BUILDINGS];
    const ages = this.opts.ages ?? [1, 2, 3];
    if (this.opts.wonder) {
      this.layWonder();
      return;
    }
    if (this.opts.walls) {
      this.layWalls(ages);
      return;
    }
    const ground = this.add.graphics().setDepth(-1);
    const rows = ages.flatMap((age) => (this.opts.civs ?? [this.civ]).map((civ) => ({ age, civ })));
    rows.forEach(({ age, civ }, row) => {
      types.forEach((type, col) => {
        const spec = BUILDING_SPECS[type];
        const x = col * CELL_W + CELL_W / 2;
        const y = row * CELL_H + CELL_H - 30;
        const n = spec.width + 0.6;
        ground.fillStyle(0x587a3a, 1);
        ground.fillPoints([
          new Phaser.Geom.Point(x, y + 8),
          new Phaser.Geom.Point(x + n * 32, y + 8 - n * 16),
          new Phaser.Geom.Point(x, y + 8 - n * 32),
          new Phaser.Geom.Point(x - n * 32, y + 8 - n * 16),
        ], true);
        const key = buildingTexture(this, type, age, this.opts.playerId ?? 1, civ);
        const img = this.add.image(x, y, key).setScale(1 / ART_SCALE);
        img.setOrigin(0.5, 1 - BUILDING_BOTTOM_PAD / img.height).setDepth(row * 10 + col * 0.01);
        lit(img);
        const info = BUILDING_LIGHT.get(key);
        this.lighting?.attachBuilding({
          sprite: img,
          type,
          footprint: { w: spec.width, h: spec.height },
          volume: info?.volume ?? [],
          glows: info?.glows ?? [],
          lights: info?.lights ?? [],
          isComplete: () => true,
          heightScale: () => 1,
        });
        for (const [dx, dy] of info?.smoke ?? []) {
          this.add.circle(x + dx, y + dy, 2, 0xffffff, 0.8).setDepth(1000);
        }
      });
    });
    const cam = this.cameras.main;
    cam.setZoom(this.opts.zoom ?? 0.6);
    cam.centerOn((types.length * CELL_W) / 2, (rows.length * CELL_H) / 2);
  }

  private layWonder(): void {
    const keys = [1, 2, 3].map((s) => wonderStageTexture(this, s, this.civ));
    keys.push(buildingTexture(this, 'wonder', 3, this.opts.playerId ?? 1, this.civ));
    keys.forEach((key, i) => {
      const x = i * 330 + 165;
      const y = 300;
      const ground = this.add.graphics().setDepth(-1).fillStyle(0x587a3a, 1);
      ground.fillPoints([[x, y + 10], [x + 150, y - 65], [x, y - 140], [x - 150, y - 65]].map(([a, b]) => new Phaser.Geom.Point(a, b)), true);
      const img = lit(this.add.image(x, y, key).setScale(1 / ART_SCALE));
      img.setOrigin(0.5, 1 - BUILDING_BOTTOM_PAD / img.height);
      const info = BUILDING_LIGHT.get(key);
      this.lighting?.attachBuilding({
        sprite: img, type: 'wonder', footprint: { w: 4, h: 4 }, volume: info?.volume ?? [], glows: info?.glows ?? [],
        lights: info?.lights ?? [], isComplete: () => i === 3, heightScale: () => 1,
      });
    });
    this.cameras.main.setZoom(this.opts.zoom ?? 1).centerOn(660, 180);
  }

  /** Per age: a ring with a gap and a tower in one corner, a 45° run, a stair-stepped run. */
  private layWalls(ages: AgeId[]): void {
    const tiles = new Set<string>();
    const ring: Array<[number, number]> = [];
    for (let i = 0; i <= 5; i++) ring.push([i, 0], [i, 4]);
    for (let j = 1; j < 4; j++) ring.push([0, j], [5, j]);
    const layout = [
      ...ring.filter(([u, v]) => !(v === 4 && u === 2) && !(u === 5 && v === 0)),
      ...[0, 1, 2, 3, 4].map((i) => [8 + i, i] as [number, number]),
      ...[0, 1, 2, 3, 4].map((i) => [8 + i, 9 - i] as [number, number]),
      // A cross and a T junction.
      [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [2, 7], [2, 9], [2, 10], [4, 9], [4, 10],
    ] as Array<[number, number]>;
    for (const [u, v] of layout) tiles.add(`${u},${v}`);
    const color = PLAYER_COLORS[((this.opts.playerId ?? 1) - 1) % PLAYER_COLORS.length] ?? 0xffffff;
    const ground = this.add.graphics().setDepth(-1);
    ages.forEach((age, row) => {
      const ox = row * 15;
      const oy = -row * 15;
      ground.fillStyle(0x587a3a, 1);
      const c = (tx: number, ty: number) => tileToScreen({ tx: tx + ox, ty: ty + oy });
      const g = [c(-1.5, -1.5), c(13.5, -1.5), c(13.5, 11.5), c(-1.5, 11.5)];
      ground.fillPoints(g.map((p) => new Phaser.Geom.Point(p.sx, p.sy)), true);
      const tower = buildingTexture(this, 'tower', age, this.opts.playerId ?? 1, this.civ);
      const place = (key: string, tx: number, ty: number): Phaser.GameObjects.Image => {
        const p = c(tx, ty);
        const img = lit(this.add.image(p.sx, p.sy + 16, key).setScale(1 / ART_SCALE));
        img.setOrigin(0.5, 1 - BUILDING_BOTTOM_PAD / img.height).setDepth(tx + ty + ox + oy);
        this.lighting?.attachBuilding({
          sprite: img, type: 'wall', footprint: { w: 1, h: 1 }, volume: BUILDING_LIGHT.get(key)?.volume ?? [],
          glows: BUILDING_LIGHT.get(key)?.glows ?? [], lights: BUILDING_LIGHT.get(key)?.lights ?? [],
          isComplete: () => true, heightScale: () => 1,
        });
        return img;
      };
      place(tower, 5, 0);
      for (const [u, v] of layout) {
        const mask = wallNeighbourMaskBy((x, y) => tiles.has(`${x},${y}`) || (x === 5 && y === 0), { tx: u, ty: v });
        const piece = wallPiece(mask, u + ox, v + oy);
        const img = place(wallTexture(this, piece, age, this.civ), u, v);
        if (!pieceHasPost(piece)) continue;
        const [dx, dy] = wallBannerAnchor(age, this.civ);
        this.add.image(img.x + dx, img.y + dy, FX_KEYS.wallBanner).setScale(1 / ART_SCALE)
          .setOrigin(WALL_BANNER_ORIGIN.x, WALL_BANNER_ORIGIN.y).setTint(color).setDepth(img.depth + 0.001);
      }
    });
    const k = ((ages.length - 1) / 2) * 15;
    const mid = tileToScreen({ tx: 6 + k, ty: 5 - k });
    this.cameras.main.setZoom(this.opts.zoom ?? 0.9).centerOn(mid.sx, mid.sy);
  }

  override update(_time: number, delta: number): void {
    this.lighting?.update(delta);
  }
}
