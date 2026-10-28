import { helm } from '../../architecture/roofs';
import type { Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';

/*
 * Details of the French wall styles: the beam ends of the murus
 * gallicus (timber lacing showing through the stone face), its wattle
 * breastwork, the machicolation corbels of the Loire curtain, dark
 * loops, and the Vauban échauguette (a corbelled stone sentry box under
 * a stone dome).
 */

/** Rows of square beam ends (timber lacing) in a stone face, staggered row to row. */
export function beamEnds(ctx: Ctx, w: number, h: number, light: number, wood: number): void {
  let row = 0;
  for (let y = 8; y < h - 4; y += 10, row++) {
    for (let x = 7 + (row % 2) * 8; x < w - 3; x += 16) {
      ctx.fillStyle = css(shade(wood, light * 0.9));
      ctx.fillRect(x - 1.8, -y - 1.8, 3.6, 3.6);
      ctx.fillStyle = 'rgba(20,12,6,.55)';
      ctx.fillRect(x - 1.8, -y + 1.2, 3.6, 0.8);
      // An iron spike (the nails of Caesar's description) at the joint.
      ctx.fillStyle = 'rgba(40,40,44,.7)';
      ctx.fillRect(x - 0.5, -y - 0.5, 1, 1);
    }
  }
}

/** Woven wattle: alternating diagonal withies between darker uprights. */
export function wattleFace(ctx: Ctx, w: number, h: number, light: number, color: number): void {
  for (let x = 0; x < w; x += 7) {
    ctx.fillStyle = css(shade(color, light * 0.62));
    ctx.fillRect(x, -h, 1.4, h);
  }
  ctx.strokeStyle = css(shade(color, light * 1.15), 0.8);
  ctx.lineWidth = 1;
  for (let y = 1.5; y < h - 0.5; y += 2.6) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 3.5) ctx.lineTo(x, -y - ((x / 3.5 + y) % 2 > 1 ? 0.8 : 0));
    ctx.stroke();
  }
}

/** Beam ends around the visible half of a drum (r tiles on uc, vc) between z0 and z1. */
export function drumBeamEnds(p: IsoPainter, uc: number, vc: number, r: number, z0: number, z1: number, wood: number): void {
  const ctx = p.ctx;
  let row = 0;
  for (let z = z0 + 9; z < z1 - 4; z += 13, row++) {
    for (let a = -Math.PI / 4 + 0.35 + (row % 2) * 0.3; a < (3 * Math.PI) / 4 - 0.25; a += 0.6) {
      const [x, y] = p.p(uc + r * Math.cos(a), vc + r * Math.sin(a), z);
      ctx.fillStyle = css(shade(wood, 0.85 + 0.3 * Math.cos(a - Math.PI / 2)));
      ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    }
  }
}

/** Machicolations: corbel teeth under the oversailing parapet, dark drop-holes between them. */
export function machicolations(ctx: Ctx, w: number, h: number, light: number, stone: number): void {
  ctx.fillStyle = 'rgba(28,24,22,.55)';
  ctx.fillRect(0, -2.5, w, 2.5);
  for (let x = 1; x < w - 2; x += 6) {
    ctx.fillStyle = css(shade(stone, light * 0.8));
    ctx.fillRect(x, -h + 1, 3, h - 1.5);
    ctx.fillStyle = css(shade(stone, light * 1.05));
    ctx.fillRect(x, -h + 1, 3, 1.2);
  }
}

/** A dark arrow loop with a small cross-slit, centred at x, bottom at y. */
export function loop(ctx: Ctx, x: number, y: number, h: number): void {
  ctx.fillStyle = '#18130f';
  ctx.fillRect(x - 1.1, y - h, 2.2, h);
  ctx.fillRect(x - 3, y - h * 0.62, 6, 1.6);
}

/**
 * Vauban échauguette at (u, v): a stepped corbel (cul-de-lampe) from the
 * bastion face, a round stone box with a sight slit, a stone dome with a
 * ball finial. Returns the finial's height (art px).
 */
export function echauguette(p: IsoPainter, u: number, v: number, z: number, stone: number, dressing: number): number {
  helm(p, u, v, z - 14, [[0, 0.02], [6, 0.065], [11, 0.115], [14, 0.14]], dressing, false);
  // The box stands tall enough that its dome clears the parapet crest by a good margin at zoom 1.
  const box = 25;
  helm(p, u, v, z, [[0, 0.13], [box, 0.13]], stone, false);
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, z + 15);
  ctx.fillStyle = '#17120e';
  ctx.fillRect(x - 1.3, y - 6, 2.6, 12);
  helm(p, u, v, z + box, [[0, 0.15], [3, 0.145]], dressing, false);
  helm(p, u, v, z + box + 3, [[0, 0.135], [4, 0.125], [7.5, 0.095], [10, 0.055], [11.2, 0.018]], shade(dressing, 0.94), false);
  helm(p, u, v, z + box + 14, [[0, 0.014], [1.4, 0.036], [3, 0.036], [4.4, 0.01]], dressing, false);
  for (const [du, dv] of [[-0.13, 0], [0.13, 0], [0, -0.13], [0, 0.13]] as const) p.addVolumePoint(u + du, v + dv, z + box + 3);
  p.addVolumePoint(u, v, z + box + 18);
  return z + box + 18;
}
