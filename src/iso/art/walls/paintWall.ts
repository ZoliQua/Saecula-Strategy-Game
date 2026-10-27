import {
  WALL_E,
  WALL_N,
  WALL_NE,
  WALL_NW,
  WALL_S,
  WALL_SE,
  WALL_SW,
  WALL_W,
} from '../../../game/wallNeighbours';
import type { AgeId, CivId } from '../../../types';
import { ART_SCALE } from '../canvas';
import { HH, IsoPainter } from '../isoPainter';
import type { LitArt } from '../lighting/normalLayer';
import type { UV } from './prism';
import { pieceArms, pieceHasPost } from './wallPiece';
import { wallStyleFor, type Arm, type WallAgeStyle } from './wallStyles';

/** Far end of each arm (tile edge midpoint or corner, shared with the neighbour). */
const ARM_ENDS: ReadonlyArray<readonly [number, UV]> = [
  [WALL_N, [0.5, 0]],
  [WALL_E, [1, 0.5]],
  [WALL_S, [0.5, 1]],
  [WALL_W, [0, 0.5]],
  [WALL_NE, [1, 0]],
  [WALL_SE, [1, 1]],
  [WALL_SW, [0, 1]],
  [WALL_NW, [0, 0]],
];
const CENTRE: UV = [0.5, 0.5];
/** Banner pole above the post top, art px. */
const POLE = 26;

/**
 * Where the team banner hangs on a post (top of its pole), world px from
 * the sprite anchor (the tile's front corner).
 */
export function wallBannerAnchor(age: AgeId, civ: CivId): readonly [number, number] {
  return [0, -(HH + wallStyleFor(age, civ).postTop + POLE) / ART_SCALE];
}

/**
 * Paints one wall piece (wallPiece: joined arms + optional post) in an
 * age style: Roman timber palisade, Medieval stone curtain, Enlightenment
 * brick bastion. Arms run from the post (or the tile centre) to the
 * shared tile edge / corner, so neighbouring pieces meet seamlessly in
 * straight and 45° runs. Parts are painted back to front. No team
 * colour: banners are a tinted overlay (RenderSystem), so one texture
 * per (piece, age, civ) serves every player.
 */
export function paintWallPiece(piece: number, age: AgeId, civ: CivId): LitArt {
  const style = wallStyleFor(age, civ);
  const p = new IsoPainter(1, 1, wallMaxHeight(style), 4211 + piece * 7 + age * 131);
  paintWallPieceInto(p, piece, style);
  return p.result();
}

/** Tallest painted point of a wall piece in a style (canvas sizing). */
export function wallMaxHeight(style: WallAgeStyle): number {
  return style.postTop + POLE + 12;
}

/** Paints a wall piece in a style into a 1×1 painter (see paintWallPiece). */
export function paintWallPieceInto(p: IsoPainter, piece: number, style: WallAgeStyle): void {
  const post = pieceHasPost(piece);
  const arms: Arm[] = [];
  for (const [bit, end] of ARM_ENDS) {
    if (!(pieceArms(piece) & bit)) continue;
    const diagonal = bit > WALL_W;
    const du = end[0] - CENTRE[0];
    const dv = end[1] - CENTRE[1];
    const full = Math.hypot(du, dv);
    // Arms start at the post's face (its corner on diagonals) so they never paint over it.
    const start = post ? style.postHalf * (diagonal ? Math.SQRT2 : 1) : 0;
    const k = start / full;
    arms.push({ a: [CENTRE[0] + du * k, CENTRE[1] + dv * k], b: end, full, diagonal, girth: diagonal ? 1.25 : 1 });
  }
  for (const arm of arms) style.shadow(p, arm);
  const depth = (arm: Arm) => (arm.a[0] + arm.b[0] + arm.a[1] + arm.b[1]) / 2;
  const behind = arms.filter((arm) => depth(arm) <= 1.001).sort((x, y) => depth(x) - depth(y));
  const before = arms.filter((arm) => depth(arm) > 1.001).sort((x, y) => depth(x) - depth(y));
  for (const arm of behind) style.arm(p, arm);
  if (post) {
    style.post(p, pieceArms(piece));
    banner(p, style.postTop);
  }
  for (const arm of before) style.arm(p, arm);
}

/** Pole for the team banner overlay on top of a post. */
function banner(p: IsoPainter, z: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(0.5, 0.5, z);
  ctx.strokeStyle = '#2a1e14';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - POLE - 2);
  ctx.stroke();
  ctx.fillStyle = '#d9b45a';
  ctx.beginPath();
  ctx.arc(x, y - POLE - 2.5, 1.8, 0, Math.PI * 2);
  ctx.fill();
}
