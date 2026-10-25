import Phaser from 'phaser';
import { BUILDING_SPECS } from '../ecs/archetypes/building';
import { UNIT_SPECS } from '../ecs/archetypes/unit';
import { MENU_PHASE } from '../config/visual';
import { ART_SCALE, BUILDING_BOTTOM_PAD } from '../iso/art/canvas';
import { LightManager, lit } from '../iso/art/lighting/LightManager';
import { UNIT_FRAMES, UNIT_ORIGIN_Y } from '../iso/art/units';
import { tileToScreen, type TileCoord } from '../iso/coordinates';
import { tileDepth } from '../iso/depth';
import { BUILDING_LIGHT } from '../iso/textures';
import { FogOfWarData } from '../map/FogOfWarData';
import { generateMap } from '../map/generator';
import { TERRAIN } from '../map/TerrainTypes';
import { TileMap } from '../map/TileMap';
import type { BuildingType, UnitType } from '../types';
import { MainMenu } from '../ui/screens/MainMenu';

const MENU_MAP_SIZE = 48;
const MENU_SEED = 7;

interface Walker {
  sprite: Phaser.GameObjects.Sprite;
}

/**
 * Main menu: a live diorama of the world (swaying trees, drifting
 * clouds, a small settlement with walking villagers) under a slow
 * camera drift, with the DOM hero overlay on top.
 */
export class MainMenuScene extends Phaser.Scene {
  private tileMap: TileMap | null = null;
  private lighting: LightManager | null = null;
  private menu: MainMenu | null = null;
  private readonly walkers: Walker[] = [];
  private focus = { sx: 0, sy: 0 };

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#090c12');
    const { map } = generateMap({
      template: 'meadow',
      width: MENU_MAP_SIZE,
      height: MENU_MAP_SIZE,
      seed: MENU_SEED,
      playerCount: 2,
    });
    // The settlement sits mid-map so the drifting camera never sees the rim.
    const start = { tx: Math.floor(MENU_MAP_SIZE / 2), ty: Math.floor(MENU_MAP_SIZE / 2) };
    // Clear a settlement clearing before the map is painted.
    map.forEachTile(({ tx, ty }) => {
      if (Math.abs(tx - start.tx) + Math.abs(ty - start.ty) <= 6) map.setTile(tx, ty, TERRAIN.grass);
    });
    this.lighting = new LightManager(this, { phase: MENU_PHASE, fixed: true });
    this.tileMap = new TileMap(this, map);
    const fog = new FogOfWarData(map.width, map.height);
    map.forEachTile(({ tx, ty }) => fog.markVisible(tx, ty));
    this.tileMap.applyFog(fog);

    const place = (type: BuildingType, tx: number, ty: number) => {
      const spec = BUILDING_SPECS[type];
      const front = tileToScreen({ tx: tx + spec.width - 1, ty: ty + spec.height - 1 });
      const img = this.add.image(front.sx, front.sy + 16, spec.textureKey);
      img.setScale(1 / ART_SCALE).setOrigin(0.5, 1 - BUILDING_BOTTOM_PAD / img.height);
      img.setDepth(tx + spec.width - 1 + ty + spec.height - 1 + 0.2);
      lit(img);
      const info = BUILDING_LIGHT.get(spec.textureKey);
      this.lighting?.attachBuilding({
        sprite: img,
        type,
        footprint: { w: spec.width, h: spec.height },
        volume: info?.volume ?? [],
        glows: info?.glows ?? [],
        isComplete: () => true,
        heightScale: () => 1,
      });
    };
    place('town_center', start.tx - 1, start.ty - 1);
    place('house', start.tx + 3, start.ty - 2);
    place('house', start.tx - 4, start.ty + 2);
    place('barracks', start.tx + 3, start.ty + 2);
    place('farm', start.tx - 4, start.ty - 2);

    const units: UnitType[] = ['villager', 'villager', 'villager', 'swordsman', 'archer', 'villager'];
    units.forEach((u, i) => {
      const a = { tx: start.tx - 3 + (i % 3) * 3, ty: start.ty + 2 + Math.floor(i / 3) * 2 };
      const b = { tx: a.tx + 2 + (i % 2), ty: a.ty - 3 };
      this.walk(u, a, b, i * 700);
    });

    const center = tileToScreen(start);
    this.focus = { sx: center.sx - 140, sy: center.sy + 20 };
    this.cameras.main.setZoom(1.25);
    this.cameras.main.centerOn(this.focus.sx, this.focus.sy);
    if (this.game.renderer.type === Phaser.WEBGL) {
      this.cameras.main.postFX.addVignette(0.6, 0.5, 0.95, 0.3);
    }

    this.menu = new MainMenu(() => {
      this.cameras.main.fadeOut(350, 9, 12, 18);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('GameScene'));
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.menu?.destroy();
      this.menu = null;
      this.tileMap?.destroy();
      this.tileMap = null;
      this.lighting?.destroy();
      this.lighting = null;
      this.walkers.length = 0;
    });
  }

  /** A unit strolling back and forth between two tiles. */
  private walk(type: UnitType, a: TileCoord, b: TileCoord, delay: number): void {
    const pa = tileToScreen(a);
    const pb = tileToScreen(b);
    const sprite = this.add
      .sprite(pa.sx, pa.sy, UNIT_SPECS[type].textureKey, UNIT_FRAMES.idle)
      .setScale(1 / ART_SCALE)
      .setOrigin(0.5, UNIT_ORIGIN_Y)
      .setDepth(tileDepth(a) + 0.3);
    lit(sprite);
    this.lighting?.attachCaster(sprite, UNIT_SPECS[type].textureKey);
    this.walkers.push({ sprite });
    this.tweens.add({
      targets: sprite,
      x: pb.sx,
      y: pb.sy,
      duration: 4200,
      delay,
      yoyo: true,
      repeat: -1,
      hold: 1400,
      repeatDelay: 1400,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        sprite.setDepth((sprite.y / 16) + 0.3);
      },
      onYoyo: () => sprite.setFlipX(pb.sx > pa.sx),
      onRepeat: () => sprite.setFlipX(pb.sx < pa.sx),
    });
    sprite.setFlipX(pb.sx < pa.sx);
  }

  override update(time: number, delta: number): void {
    this.tileMap?.update(time, delta);
    this.lighting?.update(delta);
    for (const w of this.walkers) {
      const moving = w.sprite.getData('lx') !== w.sprite.x;
      w.sprite.setData('lx', w.sprite.x);
      w.sprite.setFrame(moving ? (Math.floor(time / 160) % 2 ? UNIT_FRAMES.walkA : UNIT_FRAMES.walkB) : UNIT_FRAMES.idle);
    }
    const cam = this.cameras.main;
    cam.centerOn(this.focus.sx + Math.sin(time / 9000) * 90, this.focus.sy + Math.cos(time / 11000) * 40);
  }
}
