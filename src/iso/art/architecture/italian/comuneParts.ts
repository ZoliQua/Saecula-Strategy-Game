import type { Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { R } from '../facade';
import { swallowtailCrown, swallowtailRun, type SwallowtailOpts } from '../kits/swallowtail';
import type { ArchStyle } from '../style';
import { banner, block, brickWall, machicolation, putlogs, type Block, type FaceDraw } from './italianParts';

/*
 * Pieces of the Comune family (Italian age 2): the brick tower-house
 * (casa-torre) with its stone foot, putlog holes and a forked crown;
 * Sienese brick blocks on a stone ground storey; and coped yard walls
 * topped with swallowtail merlons.
 */

/** The age's merlons: brick with travertine coping. */
export function merlons(s: ArchStyle, scale = 1): SwallowtailOpts {
  return { color: s.palette.brick, cap: s.palette.ashlar, parapet: 4 * scale, body: 6 * scale, horn: 5.5 * scale, width: 0.12 * scale, gap: 0.08 * scale };
}

/** Pointed (Sienese) arch opening, dark inside, in a stone ring (face-local). */
export function pointedOpening(ctx: Ctx, x: number, w: number, h: number, ring: number, light: number, inner = 0x22170e): void {
  const path = (d: number) => {
    ctx.beginPath();
    ctx.moveTo(x - d, 0);
    ctx.lineTo(x - d, -h + w * 0.55);
    ctx.quadraticCurveTo(x - d, -h - d * 0.6, x + w / 2, -h - d * 1.4);
    ctx.quadraticCurveTo(x + w + d, -h - d * 0.6, x + w + d, -h + w * 0.55);
    ctx.lineTo(x + w + d, 0);
    ctx.closePath();
  };
  ctx.fillStyle = css(shade(ring, light));
  path(2.5);
  ctx.fill();
  ctx.fillStyle = css(shade(inner, light));
  path(0);
  ctx.fill();
}

export interface TowerHouseOpts {
  /** Crown: swallowtail merlons on corbels, or a plain flat top with a stone coping. */
  readonly crown: 'swallowtail' | 'plain';
  /** Lit windows near the top (left face). */
  readonly lit?: number;
  /** Owner's banner hung from the upper window. */
  readonly team?: number;
}

/** Tower-house (casa-torre) on b from the ground to `top`: stone foot, brick shaft with putlog holes, a forked or plain crown. */
export function towerHouse(p: IsoPainter, s: ArchStyle, b: Block, top: number, o: TowerHouseOpts): void {
  const c = s.palette;
  const [u0, v0, u1, v1] = b;
  const foot = 16;
  block(p, b, 0, foot, { color: c.stone, detail: 'stone' }, undefined, undefined, c.stone);
  const face = (light: number, lit: number): FaceDraw => (w, h) => {
    const ctx = p.ctx;
    putlogs(ctx, w, h, light);
    for (let i = 0; i < 2; i++) {
      const y = -h + 16 + i * 30;
      ctx.fillStyle = css(shade(c.ashlar, light));
      ctx.fillRect(w / 2 - 5, y - 2, 10, 16);
      if (i < lit) p.window(w / 2 - 3, y, 6, 12, true);
      else pointedOpening(ctx, w / 2 - 3, 6, 12, c.ashlar, light);
    }
    if (light === 1 && o.team !== undefined) banner(ctx, w / 2 + 6, -h + 18, 6, 15, o.team, light);
  };
  block(p, b, foot, top, brickWall(s), face(1, o.lit ?? 1), face(R, 0));
  if (o.crown === 'plain') {
    p.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, top, top + 4, { color: c.ashlar }, shade(c.brick, 0.8));
    return;
  }
  const slab = machicolation(p, b, top, 9, 0.04, c.ashlar);
  const m = merlons(s, Math.min(1, (u1 - u0) / 0.5));
  swallowtailCrown(p, ...slab, top, 'back', m);
  swallowtailCrown(p, ...slab, top, 'front', m);
}

/** Brick block on a stone ground storey (`ground` px) up to `top`, faces handed on. */
export function sieneseBlock(p: IsoPainter, s: ArchStyle, b: Block, ground: number, top: number, left?: FaceDraw, right?: FaceDraw, upperLeft?: FaceDraw, upperRight?: FaceDraw): void {
  const c = s.palette;
  block(p, b, 0, ground, { color: c.stone, detail: 'stone' }, left, right);
  block(p, b, ground, top, brickWall(s), upperLeft, upperRight);
}

/** Flat roof behind a swallowtail parapet on b at z (back edges, then front edges; contents between). */
export function crenellatedRoof(p: IsoPainter, s: ArchStyle, b: Block, z: number, contents?: () => void): void {
  const [u0, v0, u1, v1] = b;
  p.ground(u0, v0, u1, v1, 0x9a7a62, z);
  swallowtailCrown(p, u0, v0, u1, v1, z, 'back', merlons(s));
  contents?.();
  swallowtailCrown(p, u0, v0, u1, v1, z, 'front', merlons(s));
}

/** Yard wall along u (at v) or along v (at u) with swallowtail merlons, `h` px to the merlons. */
export function yardWall(p: IsoPainter, s: ArchStyle, axis: 'u' | 'v', from: number, to: number, at: number, h: number): void {
  const c = s.palette;
  const t = 0.06;
  if (axis === 'u') p.box(from, at, to, at + t, 0, h, brickWall(s), c.ashlar);
  else p.box(at, from, at + t, to, 0, h, brickWall(s), c.ashlar);
  swallowtailRun(p, axis, from, to, at, h, { ...merlons(s, 0.85), parapet: 0, thickness: t });
}
