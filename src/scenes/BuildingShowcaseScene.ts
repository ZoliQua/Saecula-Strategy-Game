import Phaser from 'phaser';
import { BUILDING_SPECS } from '../ecs/archetypes/building';
import { AGE_STYLED_BUILDINGS } from '../iso/art/architecture/ageStyle';
import { ART_SCALE, BUILDING_BOTTOM_PAD } from '../iso/art/canvas';
import { LightManager, lit } from '../iso/art/lighting/LightManager';
import { BUILDING_LIGHT, buildingTexture } from '../iso/textures';
import type { AgeId, BuildingType } from '../types';

export interface BuildingShowcaseOptions {
  types?: BuildingType[];
  ages?: AgeId[];
  zoom?: number;
  /** Day-cycle phase (0.4 noon, 0.7 dusk, 0.85 night). */
  phase?: number;
  playerId?: number;
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

  init(opts: BuildingShowcaseOptions): void {
    this.opts = opts ?? {};
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#2c3a22');
    this.lighting = new LightManager(this, { phase: this.opts.phase ?? 0.4, fixed: true });
    const types = this.opts.types ?? [...AGE_STYLED_BUILDINGS];
    const ages = this.opts.ages ?? [1, 2, 3];
    const ground = this.add.graphics().setDepth(-1);
    ages.forEach((age, row) => {
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
        const key = buildingTexture(this, type, age, this.opts.playerId ?? 1);
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
    cam.centerOn((types.length * CELL_W) / 2, (ages.length * CELL_H) / 2);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.lighting?.destroy();
      this.lighting = null;
    });
  }

  override update(_time: number, delta: number): void {
    this.lighting?.update(delta);
  }
}
