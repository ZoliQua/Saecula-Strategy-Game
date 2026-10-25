import Phaser from 'phaser';
import { UNIT_SPECS } from '../ecs/archetypes/unit';
import { PLAYER_COLORS } from '../game/Player';
import { LightManager } from '../iso/art/lighting/LightManager';
import { ANIM_FRAMES, frameIndex, headingSlot, unitSheetLayout, type UnitAnim } from '../iso/art/units/layout';
import { paintAllUnitArt, type UnitArt } from '../iso/art/units/UnitArt';
import { createUnitSprites, setUnitFrame, syncTeamSprite, type UnitSprites } from '../iso/art/units/unitSprite';
import type { Direction, UnitType } from '../types';

export interface ShowcaseOptions {
  anim?: UnitAnim;
  /** Fixed frame; omit to animate. */
  frame?: number;
  zoom?: number;
  phase?: number;
}

const TYPES: UnitType[] = ['villager', 'swordsman', 'archer', 'pikeman', 'crossbowman', 'musketeer', 'scout', 'knight', 'cavalry', 'cannon'];
const HEADINGS: Direction[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const CELL_W = 74;
const CELL_H = 62;
const FRAME_MS: Record<UnitAnim, number> = { idle: 600, walk: 75, attack: 140, work: 160, death: 220 };

interface Cell {
  sprites: UnitSprites;
  dir: Direction;
}

/**
 * DEV ONLY (not in the menu): every unit type × 8 headings playing one
 * animation, for art review screenshots. Start it from the console with
 * `__showUnits({ anim: 'walk' })` (see main.ts).
 */
export class UnitShowcaseScene extends Phaser.Scene {
  private cells: Cell[] = [];
  private opts: ShowcaseOptions = {};
  private lighting: LightManager | null = null;

  constructor() {
    super({ key: 'UnitShowcaseScene' });
  }

  init(opts: ShowcaseOptions): void {
    this.opts = opts ?? {};
    this.cells = [];
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#3d5a2c');
    this.lighting = new LightManager(this, { phase: this.opts.phase ?? 0.4, fixed: true });
    TYPES.forEach((type, row) => {
      HEADINGS.forEach((dir, col) => {
        const color = PLAYER_COLORS[row % PLAYER_COLORS.length] ?? 0xffffff;
        const key = UNIT_SPECS[type].textureKey;
        const sprites = createUnitSprites(this, type, key, color, true);
        sprites.body.setPosition(col * CELL_W + CELL_W / 2, row * CELL_H + CELL_H * 0.72);
        this.lighting?.attachCaster(sprites.body, key);
        this.cells.push({ sprites, dir });
      });
    });
    const painted = new Set<UnitArt>();
    for (const c of this.cells) {
      const art = c.sprites.art;
      if (!art || painted.has(art)) continue;
      painted.add(art);
      paintAllUnitArt(this, art);
    }
    const cam = this.cameras.main;
    cam.setZoom(this.opts.zoom ?? 1.2);
    cam.centerOn((HEADINGS.length * CELL_W) / 2, (TYPES.length * CELL_H) / 2);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.lighting?.destroy();
      this.lighting = null;
    });
  }

  override update(time: number, delta: number): void {
    this.lighting?.update(delta);
    const anim = this.opts.anim ?? 'idle';
    const n = ANIM_FRAMES[anim];
    const i = this.opts.frame ?? Math.floor(time / FRAME_MS[anim]) % n;
    for (const c of this.cells) {
      const { slot, flip } = headingSlot(c.dir);
      setUnitFrame(c.sprites, frameIndex(unitSheetLayout(c.sprites.type), slot, anim, i), flip);
      c.sprites.body.setDepth(c.sprites.body.y);
      syncTeamSprite(c.sprites);
    }
  }
}
