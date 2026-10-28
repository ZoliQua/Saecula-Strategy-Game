import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { R } from '../facade';
import type { ArchStyle } from '../style';
import { styleFraming, type FramePattern } from './halfTimber';

/**
 * Jettied upper storey: whitewashed box overhanging the storey below by
 * `jetty` tiles on both visible sides, framed in `pattern`, with a dark
 * bressumer beam and the overhang's shadow baked onto the wall beneath.
 * `left` / `right` paint windows on the faces (face-local, after the frame).
 * A style without jetties (kits.jetties false) builds the storey flush.
 */
export function jettyStorey(
  p: IsoPainter,
  s: ArchStyle,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  z0: number,
  z1: number,
  jetty: number,
  pattern: FramePattern,
  left?: (w: number, h: number) => void,
  right?: (w: number, h: number) => void,
): void {
  const c = s.palette;
  const ctx = p.ctx;
  const jettied = s.kits?.jetties !== false;
  const shadowBand = (w: number) => {
    const g = ctx.createLinearGradient(0, -9, 0, 0);
    g.addColorStop(0, 'rgba(20,14,10,.5)');
    g.addColorStop(1, 'rgba(20,14,10,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, -9, w, 9);
  };
  if (jettied) {
    p.leftFace(u0, u1, v1, z0 - 9, shadowBand, 9);
    p.rightFace(v0, v1, u1, z0 - 9, shadowBand, 9);
  }
  const U = u1 + (jettied ? jetty : 0);
  const V = v1 + (jettied ? jetty : 0);
  p.box(u0, v0, U, V, z0, z1, { color: c.plaster, detail: 'plaster' });
  const frame = (light: number, paint?: (w: number, h: number) => void) => (w: number, h: number) => {
    styleFraming(ctx, s, w, h, pattern, light);
    if (jettied) {
      // Bressumer with joist ends.
      ctx.fillStyle = css(shade(c.timber, light * 1.1));
      ctx.fillRect(0, -5, w, 5);
      ctx.fillStyle = css(shade(c.timber, light * 1.7));
      for (let x = 3; x < w - 2; x += 7) ctx.fillRect(x, -3.4, 2.4, 2.2);
    }
    paint?.(w, h);
  };
  p.leftFace(u0, U, V, z0, frame(1, left), z1 - z0);
  p.rightFace(v0, V, U, z0, frame(R, right), z1 - z0);
}
