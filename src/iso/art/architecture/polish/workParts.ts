import { ellipse } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { R } from '../facade';
import { post } from '../parts';
import type { ArchStyle } from '../style';
import type { Block } from './biskupinParts';

/*
 * Polish-only workshop parts (M22): a rack of spears with round shields
 * painted in the owner's colour, and the brick forge stack banded in
 * white stone shared by the Kraków and Zamość smithies (the anvil and
 * bow rack are shared by all civs, in kits/workshopProps.ts).
 */

type Face = (w: number, h: number) => void;

/**
 * A tall square brick forge stack from 0 to `h`: `body` paints the shaft
 * up to `top` (= h - 6) with the given band faces, which lay broad white
 * stone bands at the fractions `bands` of h; then a white cornice cap, a
 * dark flue top in `brick`, and the smoke.
 */
export function stoneBandedStack(
  p: IsoPainter,
  s: ArchStyle,
  b: Block,
  h: number,
  bands: readonly number[],
  brick: number,
  body: (top: number, left: Face, right: Face) => void,
): void {
  const c = s.palette;
  const [u0, v0, u1, v1] = b;
  const band = (light: number): Face => (w) => {
    p.ctx.fillStyle = css(shade(c.trim, light));
    for (const f of bands) p.ctx.fillRect(0, -h * f - 3, w, 5);
  };
  body(h - 6, band(1), band(R));
  p.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, h - 6, h - 2, { color: c.trim }, c.trim);
  p.box(u0 + 0.01, v0 + 0.01, u1 - 0.01, v1 - 0.01, h - 2, h, { color: shade(brick, 0.8) }, 0x2a2622);
  p.addSmoke((u0 + u1) / 2, (v0 + v1) / 2, h);
}

/** Rack of spears along u from (u0, v) to (u1, v), with round team-coloured shields leaning on it. */
export function shieldRack(p: IsoPainter, u0: number, u1: number, v: number, wood: number, team: number): void {
  const ctx = p.ctx;
  post(p, u0, v, 0, 18, 2.2, wood);
  post(p, u1, v, 0, 18, 2.2, wood);
  const a = p.p(u0, v, 16);
  const b = p.p(u1, v, 16);
  ctx.strokeStyle = css(wood);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  const n = 4;
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n;
    const x = a[0] + (b[0] - a[0]) * t;
    const y = a[1] + (b[1] - a[1]) * t;
    // A spear leaning on the bar.
    ctx.strokeStyle = '#5e4128';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(x - 2, y + 17);
    ctx.lineTo(x + 2, y - 12);
    ctx.stroke();
    ctx.fillStyle = '#b9bcc0';
    ctx.beginPath();
    ctx.moveTo(x + 2, y - 12);
    ctx.lineTo(x + 3.4, y - 18);
    ctx.lineTo(x + 0.8, y - 12.5);
    ctx.closePath();
    ctx.fill();
    // A round shield before it.
    ellipse(ctx, x + 1, y + 9, 5, 6);
    ctx.fillStyle = css(shade(team, k % 2 ? 0.85 : 1));
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,26,14,.8)';
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ellipse(ctx, x + 1, y + 9, 1.4, 1.6);
    ctx.fillStyle = '#c9b68a';
    ctx.fill();
  }
}
