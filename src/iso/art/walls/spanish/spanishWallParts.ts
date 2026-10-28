import type { Ctx } from '../../canvas';
import { HW, type IsoPainter } from '../../isoPainter';
import { baked } from '../../lighting/normalLayer';
import { SCREEN_PER_WORLD_HEIGHT, slopeNormal } from '../../lighting/viewSpace';
import { css, shade } from '../../palette';

/*
 * Details of the Spanish wall styles: the rough capstones of Celtiberian
 * dry-stone walls, the courses and putlog holes of rammed-earth (tapial)
 * walls, and the stepped pyramidal merlons (almenas) of Almohad and
 * Mudéjar curtains — big enough that their sawtooth reads on the skyline.
 */

type Pt = readonly [number, number];

/** Big irregular blocks in a dry-stone face: lighter faces with dark, unmortared joints. */
export function rubbleFace(ctx: Ctx, w: number, h: number, light: number, stone: number, rand: () => number): void {
  ctx.fillStyle = css(shade(stone, light * 0.5), 0.8);
  ctx.fillRect(0, -h, w, h);
  for (let y = 1, row = 0; y < h; row++) {
    const rh = 6 + rand() * 5;
    for (let x = (row % 2) * -5; x < w; ) {
      const bw = 8 + rand() * 12;
      ctx.fillStyle = css(shade(stone, light * (0.86 + rand() * 0.26)));
      ctx.fillRect(x + 0.8, -y - rh + 0.8, bw - 1.6, rh - 1.6);
      ctx.fillStyle = css(shade(stone, light * 1.2), 0.5);
      ctx.fillRect(x + 1, -y - rh + 0.8, bw - 2, 0.9);
      x += bw;
    }
    y += rh;
  }
  // Dark foot where the stones sit in the earth.
  ctx.fillStyle = 'rgba(40,30,20,.35)';
  ctx.fillRect(0, -2.5, w, 2.5);
}

/**
 * Rammed-earth (tapial) face: lime-crusted horizontal lifts of the
 * formwork, the square putlog holes (mechinales) of its needles in rows
 * on each lift joint, and the faint vertical joints between boxes.
 */
export function tapialFace(ctx: Ctx, w: number, h: number, light: number, earth: number, lift = 10): void {
  for (let y = lift, row = 0; y < h - 1; y += lift, row++) {
    ctx.fillStyle = css(shade(earth, light * 1.14), 0.75);
    ctx.fillRect(0, -y - 1.6, w, 1.6);
    ctx.fillStyle = css(shade(earth, light * 0.66), 0.7);
    ctx.fillRect(0, -y, w, 0.8);
    for (let x = 9 + (row % 2) * 14; x < w - 4; x += 28) {
      ctx.fillStyle = css(shade(earth, light * 0.42));
      ctx.fillRect(x - 1, -y - 1, 2, 2);
    }
    for (let x = 30 + (row % 2) * 22; x < w - 2; x += 44) {
      ctx.fillStyle = css(shade(earth, light * 0.8), 0.5);
      ctx.fillRect(x, -y - lift + 0.8, 0.9, lift - 2.4);
    }
  }
  ctx.fillStyle = 'rgba(60,36,20,.25)';
  ctx.fillRect(0, -4, w, 4);
}

/**
 * Square pyramid standing on (u0, v0)–(u1, v1) at z, rising `rise` px:
 * the two faces the viewer sees, lit and with slope normals, and its
 * apex as a shadow volume point.
 */
export function pyramid(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, z: number, rise: number, color: number): void {
  const apex = p.p((u0 + u1) / 2, (v0 + v1) / 2, z + rise);
  const c = p.p(u1, v1, z);
  const faces: ReadonlyArray<readonly [Pt[], number, number, number]> = [
    [[p.p(u0, v1, z), c, apex], baked(1.04), 0, 1],
    [[c, p.p(u1, v0, z), apex], baked(0.74), 1, 0],
  ];
  const run = (u1 - u0) / 2;
  for (const [pts, light, du, dv] of faces) {
    p.fillPoly(pts, css(shade(color, light)));
    p.normals.fill(pts, slopeNormal(du, dv, run * HW * Math.SQRT2, rise / SCREEN_PER_WORLD_HEIGHT));
    p.strokePoly(pts, css(shade(color, 0.45), 0.45), 0.9);
  }
  p.addVolumePoint((u0 + u1) / 2, (v0 + v1) / 2, z + rise);
}

/**
 * Stepped pyramidal merlon (almena) centred on (u, v) on a parapet at z,
 * `a` tiles square, 26 px tall: a block, a narrower step, and a pyramid cap — the
 * Almohad / Mudéjar sawtooth.
 */
export function almena(p: IsoPainter, u: number, v: number, z: number, a: number, color: number, top: number): void {
  const h = a / 2;
  p.box(u - h, v - h, u + h, v + h, z, z + 9, { color }, top);
  const s = h * 0.66;
  p.box(u - s, v - s, u + s, v + s, z + 9, z + 14, { color: shade(color, 1.03) }, top);
  pyramid(p, u - s, v - s, u + s, v + s, z + 14, 12, shade(color, 1.05));
}

/** Toledan brick lacing at both edges of a tapial face: long-and-short brick quoins. */
export function brickQuoins(ctx: Ctx, w: number, h: number, light: number, brick: number): void {
  for (let y = 0, i = 0; y < h - 3; y += 5, i++) {
    const qw = i % 2 ? 4 : 7;
    ctx.fillStyle = css(shade(brick, light * (i % 2 ? 0.92 : 1)));
    ctx.fillRect(0, -y - 4.4, qw, 4);
    ctx.fillRect(w - qw, -y - 4.4, qw, 4);
  }
}
