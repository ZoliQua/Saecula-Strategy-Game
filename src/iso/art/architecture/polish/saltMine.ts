import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { crest } from '../facade';
import { beam, wheel } from '../landmarkProps';
import { lantern } from '../parts';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';
import type { Block } from './biskupinParts';
import { barrel, horseWhim, saltBlock } from './saltMineParts';

/*
 * Polish landmark (M17 / M21): the Wieliczka salt mine. A timber shaft
 * house stands over the shaft, its steep roof pierced by the headframe —
 * two raking legs carrying the sheave wheel high above; the hauling rope
 * runs down to the horse whim (kierat) beside it, a cone of shingles on
 * posts over the rope drum, the horse walking its circle on the sweep.
 * Salt barrels and grey salt blocks wait by the door for the carts.
 * The palette (walls, roof, trim) follows the age style; the silhouette
 * is the mine's in every age.
 */

const HOUSE: Block = [0.3, 0.3, 1.45, 1.35];
const WALL = 40;
const SHEAVE = 172;
const UC = 0.88;
const VC = 0.82;

/** The shaft house's walls by age: oak logs, brick or render. */
function wallOf(s: ArchStyle): { color: number; detail: 'logs' | 'brick' | 'plaster' } {
  const c = s.palette;
  if (s.roof.form === 'attic') return { color: c.plaster, detail: 'plaster' };
  if (s.roof.material === 'thatch') return { color: c.darkWood, detail: 'logs' };
  return { color: c.brick, detail: 'brick' };
}

function shaftHouse(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const [u0, v0, u1, v1] = HOUSE;
  p.box(u0, v0, u1, v1, 0, WALL, wallOf(s));
  p.leftFace(u0, u1, v1, 0, (w) => {
    p.ctx.fillStyle = css(shade(c.timber, 0.9));
    p.ctx.fillRect(w * 0.55 - 2, -30, 22, 30);
    p.door(w * 0.55, 18, 27, c.doors.work);
    p.window(w * 0.2, -26, 8, 9);
    crest(p.ctx, s, w * 0.38, -30, 6, team);
  }, WALL);
  p.rightFace(v0, v1, u1, 0, (w) => p.window(w * 0.5 - 4, -26, 8, 9), WALL);
  // Steep gable along u, whatever the age's own roof form.
  const prev = p.material;
  p.material = s.roof.material ?? 'shingle';
  p.gableRoof(u0, v0, u1, v1, WALL, 52, c.roof, wallOf(s).color, 'u', 0.12);
  p.material = prev;
}

/** Headframe: an A-frame rising through the shaft house's ridge, a long raking strut from the yard, the sheave wheel on top. */
function headframe(p: IsoPainter, s: ArchStyle): void {
  const c = s.palette;
  const t = c.timber;
  const top: readonly [number, number, number] = [UC, VC, SHEAVE];
  beam(p, [UC - 0.34, VC, WALL + 44], top, t, 4);
  beam(p, [UC + 0.34, VC, WALL + 44], top, t, 4);
  beam(p, [UC - 0.22, VC, 128], [UC + 0.22, VC, 128], t, 2.4);
  // Raking strut braced back to the yard, taking the rope's pull.
  beam(p, [1.78, VC + 0.2, 0], [UC + 0.04, VC + 0.02, SHEAVE - 6], t, 3.4);
  beam(p, [1.62, VC + 0.17, 0], [1.62, VC + 0.17, 46], t, 2.4);
  wheel(p, UC, VC, SHEAVE + 6, 0.2, 19, 'u', shade(t, 1.15), 8, 3);
  // Hauling rope down the shaft and over to the whim's drum.
  beam(p, [UC + 0.2, VC, SHEAVE + 6], [2.15, 1.3, 34], 0xc8b07a, 1.2);
}

function paintSaltMine(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0x9d9480);
  // Spoil of grey salt rock behind the shaft house.
  p.ground(0.1, 0.1, 0.9, 0.5, shade(0xa9ac9e, 0.9));
  shaftHouse(p, s, team);
  headframe(p, s);
  horseWhim(p, 2.15, 1.3, 0.48, c.timber, s.roof.material === 'thatch' ? c.thatch : c.roof, 46);
  // Salt barrels and blocks by the door, a cart track to the gate.
  p.ground(0.9, 1.6, 2.9, 2.0, shade(c.planks, 0.85), 0.5);
  for (const [u, v] of [[0.5, 1.7], [0.62, 1.86], [0.42, 1.94], [0.78, 2.04], [0.56, 2.12]] as const) barrel(p, u, v, 15, c.board);
  saltBlock(p, 1.05, 2.25, 0.3);
  saltBlock(p, 1.2, 2.46, 0.32);
  saltBlock(p, 1.5, 2.3, 0.28);
  // A hand cart loaded with salt.
  p.box(1.9, 2.25, 2.4, 2.55, 6, 14, { color: c.planks, detail: 'planks' }, c.planks);
  wheel(p, 2.15, 2.56, 7, 0.1, 7, 'u', c.timber, 6, 1.6);
  barrel(p, 2.05, 2.4, 10, c.board);
  lantern(p, 1.5, 1.4, 26, 1.5, 1.65);
  p.flag(UC, VC, SHEAVE + 26, 24, team, true);
}

/** The Polish landmark: the Wieliczka salt mine, in the age style's palette. */
export function saltMineArt(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 240, paint: (p, team) => paintSaltMine(p, s, team) };
}
