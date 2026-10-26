import Phaser from 'phaser';
import { BUILDING_SPECS } from '../ecs/archetypes/building';
import { UNIT_SPECS } from '../ecs/archetypes/unit';
import { MENU_PHASE } from '../config/visual';
import { ART_SCALE, BUILDING_BOTTOM_PAD } from '../iso/art/canvas';
import { LightManager, lit } from '../iso/art/lighting/LightManager';
import { frameIndex, headingSlot, unitSheetLayout, WALK_CYCLE_TILES } from '../iso/art/units/layout';
import { pumpUnitArt } from '../iso/art/units/UnitArt';
import { createUnitSprites, setUnitFrame, syncTeamSprite, type UnitSprites } from '../iso/art/units/unitSprite';
import { PLAYER_COLORS } from '../game/Player';
import { tileToScreen, type TileCoord } from '../iso/coordinates';
import { tileDepth } from '../iso/depth';
import { BUILDING_LIGHT, buildingTexture } from '../iso/textures';
import { FogOfWarData } from '../map/FogOfWarData';
import { generateMap } from '../map/generator';
import { TERRAIN } from '../map/TerrainTypes';
import { TileMap } from '../map/TileMap';
import { directionFromDelta, type BuildingType, type Direction, type UnitType } from '../types';
import { MainMenu } from '../ui/screens/MainMenu';

const MENU_MAP_SIZE = 48;
const MENU_SEED = 7;
/** The diorama shows off the grand Enlightenment-era town the player builds towards. */
const MENU_AGE = 3;

interface Walker {
  sprites: UnitSprites;
  /** Heading towards b (outbound) and back. */
  out: Direction;
  back: Direction;
  outbound: boolean;
  /** Screen px per ms → walk cycle pace. */
  cycleMs: number;
}

const WALK_MS = 4200;

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
      const key = buildingTexture(this, type, MENU_AGE, 1);
      const img = this.add.image(front.sx, front.sy + 16, key);
      img.setScale(1 / ART_SCALE).setOrigin(0.5, 1 - BUILDING_BOTTOM_PAD / img.height);
      img.setDepth(tx + spec.width - 1 + ty + spec.height - 1 + 0.2);
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
      this.menu?.setAway(true);
      this.scene.launch('GameSetupScene');
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

  /** The setup card was closed: bring the hero copy back. */
  showMenu(): void {
    this.menu?.setAway(false);
  }

  /** Fades the diorama out, then runs `done` (used when the game starts). */
  fadeOutThen(done: () => void): void {
    this.cameras.main.fadeOut(350, 9, 12, 18);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, done);
  }

  /** A unit strolling back and forth between two tiles. */
  private walk(type: UnitType, a: TileCoord, b: TileCoord, delay: number): void {
    const pa = tileToScreen(a);
    const pb = tileToScreen(b);
    const key = UNIT_SPECS[type].textureKey;
    const sprites = createUnitSprites(this, type, key, PLAYER_COLORS[0] ?? 0xffffff, true);
    const sprite = sprites.body.setPosition(pa.sx, pa.sy).setDepth(tileDepth(a) + 0.3);
    this.lighting?.attachCaster(sprite, key);
    const tiles = Math.hypot(b.tx - a.tx, b.ty - a.ty);
    const walker: Walker = {
      sprites,
      out: directionFromDelta(b.tx - a.tx, b.ty - a.ty),
      back: directionFromDelta(a.tx - b.tx, a.ty - b.ty),
      outbound: true,
      // Average tween speed (tiles/ms) sets the stride pace.
      cycleMs: (WALK_CYCLE_TILES[type] / Math.max(0.1, tiles / WALK_MS)) * 0.7,
    };
    this.walkers.push(walker);
    this.tweens.add({
      targets: sprite,
      x: pb.sx,
      y: pb.sy,
      duration: WALK_MS,
      delay,
      yoyo: true,
      repeat: -1,
      hold: 1400,
      repeatDelay: 1400,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        sprite.setDepth(sprite.y / 16 + 0.3);
      },
      onYoyo: () => {
        walker.outbound = false;
      },
      onRepeat: () => {
        walker.outbound = true;
      },
    });
  }

  override update(time: number, delta: number): void {
    this.tileMap?.update(time, delta);
    this.lighting?.update(delta);
    pumpUnitArt(this);
    for (const w of this.walkers) {
      const body = w.sprites.body;
      const moving = body.getData('lx') !== body.x;
      body.setData('lx', body.x);
      const { slot, flip } = headingSlot(w.outbound ? w.out : w.back);
      const layout = unitSheetLayout(w.sprites.type);
      const k = moving
        ? frameIndex(layout, slot, 'walk', Math.floor((time / w.cycleMs) * 6) % 6)
        : frameIndex(layout, slot, 'idle', Math.floor(time / 700) % 2);
      setUnitFrame(w.sprites, k, flip);
      syncTeamSprite(w.sprites);
    }
    const cam = this.cameras.main;
    cam.centerOn(this.focus.sx + Math.sin(time / 9000) * 90, this.focus.sy + Math.cos(time / 11000) * 40);
  }
}
