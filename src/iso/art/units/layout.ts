import { baseUnitType } from '../../../game/civUnits';
import type { BaseUnitType, Direction, UnitType } from '../../../types';

/**
 * Frame layout of a unit sprite sheet (pure, no DOM).
 *
 * Every unit type has one albedo sheet (and a same-layout team-colour
 * mask sheet): one row per painted heading, one column per animation
 * frame. Five headings are painted; the three others are the mirror
 * images (flipX) of E, NE and N — mirroring a screen image swaps the
 * tile axes, so S ↔ E, SW ↔ NE, W ↔ N, while SE and NW mirror onto
 * themselves.
 */
export type UnitAnim = 'idle' | 'walk' | 'attack' | 'work' | 'death';

/** Frames per animation (CLAUDE.md 3.4 ranges). */
export const ANIM_FRAMES: Readonly<Record<UnitAnim, number>> = {
  idle: 2,
  walk: 6,
  attack: 5,
  work: 4,
  death: 4,
};

/** Headings painted as rows, in row order. */
export const PAINTED_HEADINGS: readonly Direction[] = ['SE', 'E', 'NE', 'N', 'NW'];

const MIRRORED: Partial<Record<Direction, Direction>> = { S: 'E', SW: 'NE', W: 'N' };

/** Sheet row and flip for a facing. */
export function headingSlot(dir: Direction): { slot: number; flip: boolean } {
  const mirror = MIRRORED[dir];
  const painted = mirror ?? dir;
  return { slot: Math.max(0, PAINTED_HEADINGS.indexOf(painted)), flip: mirror !== undefined };
}

export interface SheetLayout {
  readonly anims: readonly UnitAnim[];
  /** Column of each animation's first frame. */
  readonly offsets: Readonly<Partial<Record<UnitAnim, number>>>;
  /** Columns per row. */
  readonly perHeading: number;
  /** Albedo frames in the sheet (rows × columns). */
  readonly frameCount: number;
}

export function sheetLayout(anims: readonly UnitAnim[]): SheetLayout {
  const offsets: Partial<Record<UnitAnim, number>> = {};
  let col = 0;
  for (const a of anims) {
    offsets[a] = col;
    col += ANIM_FRAMES[a];
  }
  return { anims, offsets, perHeading: col, frameCount: col * PAINTED_HEADINGS.length };
}

/** Animations a sheet lacks fall back to these (villager-only `work`). */
const FALLBACK: Record<UnitAnim, UnitAnim> = {
  idle: 'idle',
  walk: 'idle',
  attack: 'idle',
  work: 'attack',
  death: 'idle',
};

/** Frame number (texture frame name) of animation frame `i` in a heading row. */
export function frameIndex(layout: SheetLayout, slot: number, anim: UnitAnim, i: number): number {
  let a = anim;
  while (layout.offsets[a] === undefined && a !== 'idle') a = FALLBACK[a];
  const n = ANIM_FRAMES[a];
  const k = Math.min(n - 1, Math.max(0, Math.floor(i)));
  return slot * layout.perHeading + (layout.offsets[a] ?? 0) + k;
}

/** Inverse of frameIndex: what frame `k` shows. */
export function frameContent(layout: SheetLayout, k: number): { slot: number; anim: UnitAnim; i: number } {
  const slot = Math.floor(k / layout.perHeading);
  const col = k % layout.perHeading;
  for (const a of layout.anims) {
    const o = layout.offsets[a] ?? 0;
    if (col >= o && col < o + ANIM_FRAMES[a]) return { slot, anim: a, i: col - o };
  }
  return { slot, anim: 'idle', i: 0 };
}

/**
 * Lazy painting order: the first idle frame of every heading (so a new
 * unit is never invisible), then walking, then everything else.
 */
export function paintOrder(layout: SheetLayout): number[] {
  const rows = PAINTED_HEADINGS.length;
  const order: number[] = [];
  const push = (anim: UnitAnim, from: number, to: number) => {
    if (layout.offsets[anim] === undefined) return;
    for (let i = from; i < to; i++) for (let s = 0; s < rows; s++) order.push(frameIndex(layout, s, anim, i));
  };
  push('idle', 0, 1);
  push('walk', 0, ANIM_FRAMES.walk);
  push('idle', 1, ANIM_FRAMES.idle);
  for (const a of ['attack', 'work', 'death'] as const) push(a, 0, ANIM_FRAMES[a]);
  return order;
}

/** Villagers also have a work (tool swing) animation. */
export function unitAnims(type: UnitType): readonly UnitAnim[] {
  return type === 'villager' ? ['idle', 'walk', 'attack', 'work', 'death'] : ['idle', 'walk', 'attack', 'death'];
}

/** Ground covered by one walk / gallop / wheel cycle (tiles), so feet don't skate. */
export const WALK_CYCLE_TILES: Readonly<Record<BaseUnitType, number>> = {
  villager: 0.85,
  swordsman: 0.85,
  archer: 0.85,
  pikeman: 0.85,
  crossbowman: 0.85,
  musketeer: 0.85,
  scout: 1.9,
  knight: 1.7,
  cavalry: 1.9,
  cannon: 0.5,
};

/** Walk-cycle ground length of a unit type (unique units use their base unit's). */
export function walkCycleTiles(type: UnitType): number {
  return WALK_CYCLE_TILES[baseUnitType(type)];
}

const layouts = new Map<UnitType, SheetLayout>();

/** The (cached) sheet layout of a unit type. */
export function unitSheetLayout(type: UnitType): SheetLayout {
  let l = layouts.get(type);
  if (!l) {
    l = sheetLayout(unitAnims(type));
    layouts.set(type, l);
  }
  return l;
}
