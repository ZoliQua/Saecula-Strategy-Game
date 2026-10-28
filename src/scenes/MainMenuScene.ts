import Phaser from 'phaser';
import { menuDioramaCivs } from '../config/civs';
import { BUILDING_SPECS } from '../ecs/archetypes/building';
import { MENU_PHASE } from '../config/visual';
import { ART_SCALE, BUILDING_BOTTOM_PAD } from '../iso/art/canvas';
import { LightManager, lit } from '../iso/art/lighting/LightManager';
import { frameIndex, headingSlot, unitSheetLayout, WALK_CYCLE_TILES } from '../iso/art/units/layout';
import { pumpUnitArt } from '../iso/art/units/UnitArt';
import { createUnitSprites, setUnitFrame, syncTeamSprite, type UnitSprites } from '../iso/art/units/unitSprite';
import { PLAYER_COLORS } from '../game/Player';
import { tileToScreen, type TileCoord } from '../iso/coordinates';
import { tileDepth } from '../iso/depth';
import { BUILDING_LIGHT, buildingTexture } from '../iso/buildingTextures';
import { FogOfWarData } from '../map/FogOfWarData';
import { generateMap } from '../map/generator';
import { TERRAIN } from '../map/TerrainTypes';
import { TileMap } from '../map/TileMap';
import { directionFromDelta, type BuildingType, type CivId, type Direction, type UnitType } from '../types';
import { paintNextCivPreview } from '../ui/civPreview';
import { MainMenu, MENU_ENTRANCE_MS } from '../ui/screens/MainMenu';
import { SaveSlots } from '../ui/screens/SaveSlots';
import { SettingsScreen } from '../ui/screens/SettingsScreen';
import { slotRows } from '../ui/screens/slotRows';
import { browserSaveStore } from '../save/browserStore';
import { SaveStorage } from '../save/storage';
import { startFromSlot } from './game/MatchStart';
import type { SetupReturn } from './GameSetupScene';

const MENU_MAP_SIZE = 48;
const MENU_SEED = 7;
/** The diorama shows off the grand Enlightenment-era town the player builds towards. */
const MENU_AGE = 3;
/** Pond (a few overlapping discs for an irregular shore) and rock outcrop, relative to the settlement (tiles). */
const MENU_POND: ReadonlyArray<{ tx: number; ty: number; r: number }> = [
  { tx: 7, ty: 7, r: 2.6 },
  { tx: 9.5, ty: 7.5, r: 2.1 },
  { tx: 6, ty: 9.8, r: 1.7 },
];
const MENU_ROCK = { tx: -9, ty: -3, r: 2.6 } as const;

/** One civ's corner of the diorama: its settlement, in its own player colour, offset from the map centre (tiles). */
interface Quarter {
  readonly civ: CivId;
  readonly playerId: number;
  readonly at: TileCoord;
  readonly buildings: ReadonlyArray<readonly [BuildingType, number, number]>;
  readonly walkers: readonly UnitType[];
}

/** Front and back quarters of the diorama (civs: menuDioramaCivs). */
type QuarterLayout = Omit<Quarter, 'civ'>;

/** Two playable civs side by side: the menu civ's town in front, another civ's up the slope behind it. */
const LAYOUTS: readonly [QuarterLayout, QuarterLayout] = [
  {
    playerId: 1,
    at: { tx: 0, ty: 0 },
    buildings: [
      ['town_center', -1, -1],
      ['house', 3, -2],
      ['house', -4, 2],
      ['barracks', 3, 2],
      ['farm', -4, -2],
    ],
    walkers: ['villager', 'villager', 'swordsman', 'villager'],
  },
  {
    playerId: 2,
    at: { tx: -4, ty: -9 },
    buildings: [
      ['town_center', -1, -1],
      ['house', -4, -1],
      ['house', 3, 0],
      ['barracks', 1, -5],
      ['farm', -1, 3],
    ],
    walkers: ['villager', 'archer', 'villager'],
  },
];
/** Times the menu has been shown: each visit pairs the menu civ with the next civ (menuDioramaCivs). */
let menuVisits = 0;

/** Civ previews for the setup card are painted once the menu's entrance has played (plus a frame or three of slack). */
const PREVIEW_DELAY_MS = MENU_ENTRANCE_MS + 50;

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
/** The load list's and the settings card's exit animation (pause.css `.leaving`). */
const CARD_LEAVE_MS = 180;

/**
 * Main menu: a live diorama of the world (swaying trees, drifting
 * clouds, two civs' quarters with walking villagers — the menu civ and,
 * visit by visit, each other playable civ in turn)
 * under a slow camera drift, with the DOM hero overlay on top. Once the
 * hero has entered it also paints the setup card's civ previews.
 */
export class MainMenuScene extends Phaser.Scene {
  private tileMap: TileMap | null = null;
  private lighting: LightManager | null = null;
  private menu: MainMenu | null = null;
  private readonly walkers: Walker[] = [];
  private focus = { sx: 0, sy: 0 };
  private menuMs = 0;
  private previewsDone = false;
  /** The setup card is open (it paints any missing preview itself, after its entrance). */
  private away = false;
  /** The load list ("Betöltés"), while open. */
  private slots: SaveSlots | null = null;
  /** The settings card ("Beállítások"), while open. */
  private settings: SettingsScreen | null = null;
  private readonly storage = new SaveStorage(browserSaveStore());

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  /** `notice` alone: a line shown on the menu; with `config`: back to the setup card with that message. */
  create(data?: Partial<SetupReturn>): void {
    this.cameras.main.setBackgroundColor('#090c12');
    const civs = menuDioramaCivs(menuVisits++);
    const QUARTERS: readonly Quarter[] = LAYOUTS.map((layout, i) => ({ ...layout, civ: civs[i] ?? civs[0] }));
    this.menuMs = 0;
    this.previewsDone = false;
    this.away = false;
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
      for (const q of QUARTERS) {
        if (Math.abs(tx - start.tx - q.at.tx) + Math.abs(ty - start.ty - q.at.ty) <= 6) map.setTile(tx, ty, TERRAIN.grass);
      }
      // A pond and a rock outcrop in view show off the animated water and the raised cliffs.
      const pond = Math.min(...MENU_POND.map((p) => Math.hypot(tx - p.tx - start.tx, ty - p.ty - start.ty) - p.r));
      if (pond <= 0) map.setTile(tx, ty, TERRAIN.water);
      else if (pond <= 1.6 && map.getTile(tx, ty) === TERRAIN.forest) map.setTile(tx, ty, TERRAIN.grass);
      if (Math.hypot(tx - MENU_ROCK.tx - start.tx, ty - MENU_ROCK.ty - start.ty) <= MENU_ROCK.r) map.setTile(tx, ty, TERRAIN.cliff);
    });
    this.lighting = new LightManager(this, { phase: MENU_PHASE, fixed: true });
    this.tileMap = new TileMap(this, map);
    const fog = new FogOfWarData(map.width, map.height);
    map.forEachTile(({ tx, ty }) => fog.markVisible(tx, ty));
    this.tileMap.applyFog(fog);

    const place = (q: Quarter, type: BuildingType, tx: number, ty: number) => {
      const spec = BUILDING_SPECS[type];
      const front = tileToScreen({ tx: tx + spec.width - 1, ty: ty + spec.height - 1 });
      const key = buildingTexture(this, type, MENU_AGE, q.playerId, q.civ);
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
    let delay = 0;
    for (const q of QUARTERS) {
      const ox = start.tx + q.at.tx;
      const oy = start.ty + q.at.ty;
      for (const [type, dx, dy] of q.buildings) place(q, type, ox + dx, oy + dy);
      q.walkers.forEach((u, i) => {
        const a = { tx: ox - 3 + (i % 3) * 3, ty: oy + 2 + Math.floor(i / 3) * 2 };
        const b = { tx: a.tx + 2 + (i % 2), ty: a.ty - 3 };
        this.walk(u, q, a, b, delay);
        delay += 700;
      });
    }

    // Frame both quarters, shifted right of centre so the hero copy on the left keeps clear ground.
    const mid = tileToScreen({
      tx: start.tx + QUARTERS.reduce((s, q) => s + q.at.tx, 0) / QUARTERS.length,
      ty: start.ty + QUARTERS.reduce((s, q) => s + q.at.ty, 0) / QUARTERS.length,
    });
    this.focus = { sx: mid.sx - 250, sy: mid.sy - 12 };
    this.cameras.main.setZoom(1.15);
    this.cameras.main.centerOn(this.focus.sx, this.focus.sy);
    if (this.game.renderer.type === Phaser.WEBGL) {
      this.cameras.main.postFX.addVignette(0.6, 0.5, 0.95, 0.3);
    }

    this.menu = new MainMenu(
      () => {
        this.away = true;
        this.menu?.setAway(true);
        this.scene.launch('GameSetupScene');
      },
      () => this.openLoadList(),
      () => this.openSettings(),
    );
    // A start that failed (no valid map) comes straight back to the setup card;
    // a notice alone (a save that could not be loaded) shows on the menu.
    if (data?.config && data.notice) {
      this.away = true;
      this.menu.setAway(true);
      this.scene.launch('GameSetupScene', { config: data.config, notice: data.notice });
    } else if (data?.notice) {
      this.menu.notice(data.notice);
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.menu?.destroy();
      this.menu = null;
      this.slots?.destroy();
      this.slots = null;
      this.settings?.destroy();
      this.settings = null;
      this.tileMap?.destroy();
      this.tileMap = null;
      this.lighting?.destroy();
      this.lighting = null;
      this.walkers.length = 0;
    });
  }

  /** The setup card was closed: bring the hero copy back. */
  showMenu(): void {
    this.away = false;
    this.menu?.setAway(false);
  }

  /** The settings card over the diorama; back (or Esc) brings the hero back. */
  private openSettings(): void {
    if (this.settings || this.slots) return;
    this.away = true;
    this.menu?.setAway(true);
    const settings: SettingsScreen = new SettingsScreen(() => {
      // A card already closing (Esc within its exit animation) must not close the next one.
      if (this.settings !== settings) return;
      settings.leave();
      this.settings = null;
      this.away = false;
      this.menu?.setAway(false);
      this.menu?.focusButton('settings');
      window.setTimeout(() => settings.destroy(), CARD_LEAVE_MS);
    });
    this.settings = settings;
  }

  /** The load list over the diorama; picking a save starts GameScene on it (startFromSlot). */
  private openLoadList(): void {
    if (this.slots || this.settings) return;
    this.away = true;
    this.menu?.setAway(true);
    const slots: SaveSlots = new SaveSlots('load', [], {
      onPick: async (slot): Promise<void> => {
        const started = await startFromSlot(this, this.storage, slot, (message) => slots.notice(message, 'error'));
        if (!started && this.slots === slots) slots.setRows(slotRows(await this.storage.list(), 'load'));
      },
      onBack: () => {
        // A card already closing (Esc within its exit animation) must not close the next one.
        if (this.slots !== slots) return;
        slots.leave();
        this.slots = null;
        this.away = false;
        this.menu?.setAway(false);
        this.menu?.focusButton('load');
        window.setTimeout(() => slots.destroy(), CARD_LEAVE_MS);
      },
    });
    this.slots = slots;
    void this.storage.list().then((summaries) => {
      if (this.slots === slots) slots.setRows(slotRows(summaries, 'load'));
    });
  }

  /** Fades the diorama out, then runs `done` (used when the game starts). */
  fadeOutThen(done: () => void): void {
    this.cameras.main.fadeOut(350, 9, 12, 18);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, done);
  }

  /** A unit strolling back and forth between two tiles. */
  private walk(type: UnitType, q: Quarter, a: TileCoord, b: TileCoord, delay: number): void {
    const pa = tileToScreen(a);
    const pb = tileToScreen(b);
    const sprites = createUnitSprites(this, type, q.civ, PLAYER_COLORS[q.playerId - 1] ?? 0xffffff, true);
    const sprite = sprites.body.setPosition(pa.sx, pa.sy).setDepth(tileDepth(a) + 0.3);
    this.lighting?.attachCaster(sprite, sprites.key);
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
    this.menuMs += delta;
    // One setup-card civ preview per frame, after the hero's entrance (skipped once all are painted).
    if (this.menuMs >= PREVIEW_DELAY_MS && !this.previewsDone && !this.away) this.previewsDone = paintNextCivPreview() === null;
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
