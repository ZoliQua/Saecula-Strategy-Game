import type { Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { R } from '../facade';
import { lowHip } from '../kits/lowHip';
import type { ArchStyle } from '../style';
import type { Block } from './biskupinParts';

/*
 * Parts of the Wawel (Polish Wonder): the hill's brick-faced
 * revetment, the castle wings with the three-tier arcades of the
 * Renaissance courtyard, and the cathedral's ashlar blocks.
 */

/** Warm white render of the castle wings. */
export const CASTLE = 0xeadfc6;
/** Red tile of the castle's steep hips. */
export const CASTLE_ROOF = 0xa8452c;
/** Gilded copper of the Sigismund Chapel's dome. */
export const GILT = 0xd9a93a;
/** Height of the hilltop the buildings stand on (art px). */
export const HILL = 30;

/** The hill: a limestone crag faced with a brick revetment under a coping, a lawn on top with a paved way. */
export function hill(p: IsoPainter, s: ArchStyle): void {
  const c = s.palette;
  p.box(0.08, 0.08, 3.92, 3.92, 0, HILL, { color: 0xb8ad94, detail: 'fieldstone' }, 0x7f8f52);
  const revetment = (light: number) => (w: number, h: number) => {
    // Brick revetment over the upper crag, with a white coping.
    p.ctx.fillStyle = css(shade(c.brick, light));
    p.ctx.fillRect(0, -h, w, h * 0.45);
    p.ctx.fillStyle = css(shade(c.brick, light * 0.75), 0.6);
    for (let y = h * 0.55 + 3; y < h; y += 3.5) p.ctx.fillRect(0, -y, w, 0.6);
    p.ctx.fillStyle = css(shade(c.trim, light));
    p.ctx.fillRect(0, -h, w, 2.4);
  };
  p.leftFace(0.08, 3.92, 3.92, 0, revetment(1), HILL);
  p.rightFace(0.08, 3.92, 3.92, 0, revetment(R), HILL);
  p.ground(0.12, 0.12, 3.88, 3.88, 0x86a05a, HILL);
  // The paved way from the gate up to the courtyard and the cathedral.
  p.ground(1.95, 2.45, 2.55, 3.88, 0xcfc3a8, HILL + 0.5);
  p.ground(2.55, 2.0, 3.6, 2.45, 0xcfc3a8, HILL + 0.5);
}

/**
 * Three-tier Renaissance arcade along a face (face-local): round arches
 * on the ground floor and first floor, the tall second-floor gallery on
 * slender columns under the eaves. `lit` lights the loggia's doors.
 */
export function arcade(p: IsoPainter, w: number, h: number, light: number, lit: boolean): void {
  const ctx = p.ctx;
  const bays = Math.max(3, Math.round(w / 15));
  const bay = w / bays;
  const tiers: ReadonlyArray<readonly [number, number]> = [[0, h * 0.34], [h * 0.34, h * 0.64], [h * 0.64, h * 0.98]];
  tiers.forEach(([z0, z1], t) => {
    const th = z1 - z0;
    for (let i = 0; i < bays; i++) {
      const x = bay * i;
      const inset = t === 2 ? 1.2 : 2.4;
      ctx.fillStyle = css(shade(0x2a2118, light));
      ctx.beginPath();
      ctx.moveTo(x + inset, -z0);
      ctx.lineTo(x + inset, -z1 + bay / 2);
      ctx.arc(x + bay / 2, -z1 + bay / 2, bay / 2 - inset, Math.PI, 0);
      ctx.lineTo(x + bay - inset, -z0);
      ctx.closePath();
      ctx.fill();
      // Lights in the top loggia only: the low front wings' roofs cover the lower tiers.
      if (lit && t === 2 && i % 2 === 1) p.window(x + bay / 2 - 2.5, -z0 - th * 0.62, 5, th * 0.4);
    }
    // Balustrade and string course of each tier.
    ctx.fillStyle = css(shade(0xf4efe3, light));
    ctx.fillRect(0, -z1 - 1.5, w, 2.6);
    if (t > 0) {
      ctx.fillStyle = css(shade(0xf4efe3, light * 0.92));
      for (let x = 2; x < w; x += 3.2) ctx.fillRect(x, -z0 - 6, 1.2, 6);
      ctx.fillRect(0, -z0 - 7, w, 1.4);
    }
  });
}

/** Clock face with gilt hands (face-local centre x, y). */
export function wawelClock(ctx: Ctx, x: number, y: number, r: number, light: number): void {
  ctx.fillStyle = css(shade(0x23324a, light));
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = css(shade(GILT, light));
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - r * 0.7);
  ctx.moveTo(x, y);
  ctx.lineTo(x + r * 0.5, y + r * 0.2);
  ctx.stroke();
}

/** A castle wing: rendered walls from z0 to z1, painted faces, its steep red hip from z1. */
export function wing(p: IsoPainter, s: ArchStyle, b: Block, z0: number, z1: number, left?: (w: number, h: number) => void, right?: (w: number, h: number) => void, roof = true): void {
  const [u0, v0, u1, v1] = b;
  p.box(u0, v0, u1, v1, z0, z1, { color: CASTLE, detail: 'plaster' }, CASTLE);
  if (left) p.leftFace(u0, u1, v1, z0, left, z1 - z0);
  if (right) p.rightFace(v0, v1, u1, z0, right, z1 - z0);
  if (!roof) return;
  // Steep tiled hips whatever the style's own roofs (the castle keeps its Gothic-Renaissance roofs).
  lowHip(p, { ...s, roof: { ...s.roof, pitch: 1, material: 'tile' } }, b, z1, Math.min(u1 - u0, v1 - v0) * 80, CASTLE_ROOF, 0.06);
}
