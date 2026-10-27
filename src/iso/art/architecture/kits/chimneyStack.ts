import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import type { ArchStyle } from '../style';

/**
 * Brick chimney stack (Tudor clustered flues): a brick base from z0, a corbelled band and
 * `shafts` separate flues with diagonal brick patterns, capped; records
 * the smoke anchor. Domestic stacks follow the chimneys ornament; forge
 * stacks always stand.
 */
export function brickStack(
  p: IsoPainter,
  s: ArchStyle,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  z0: number,
  z1: number,
  shafts = 2,
  kind: 'domestic' | 'forge' = 'domestic',
): void {
  if (kind === 'domestic' && !s.ornaments.chimneys) return;
  const brick = s.palette.stack;
  const zc = z1 - 18;
  p.box(u0, v0, u1, v1, z0, zc, { color: brick, detail: 'brick' }, shade(brick, 0.9));
  p.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, zc, zc + 3.5, { color: shade(brick, 0.82) }, shade(brick, 0.95));
  const alongU = u1 - u0 >= v1 - v0;
  const len = alongU ? u1 - u0 : v1 - v0;
  const side = Math.min(0.1, (len / shafts) * 0.8);
  for (let i = 0; i < shafts; i++) {
    const t = (len / shafts) * (i + 0.5);
    const cu = alongU ? u0 + t : (u0 + u1) / 2;
    const cv = alongU ? (v0 + v1) / 2 : v0 + t;
    const [a0, b0, a1, b1] = [cu - side / 2, cv - side / 2, cu + side / 2, cv + side / 2];
    p.box(a0, b0, a1, b1, zc + 3.5, z1, { color: brick }, brick);
    const twist = (light: number) => (w: number, h: number) => {
      p.ctx.strokeStyle = css(shade(brick, light * 0.62), 0.8);
      p.ctx.lineWidth = 1;
      p.ctx.beginPath();
      for (let y = -2; y > -h - w; y -= 3.5) {
        p.ctx.moveTo(0, y);
        p.ctx.lineTo(w, y - w * 0.7);
      }
      p.ctx.stroke();
    };
    p.leftFace(a0, a1, b1, zc + 3.5, twist(1), z1 - zc - 3.5);
    p.rightFace(b0, b1, a1, zc + 3.5, twist(0.72), z1 - zc - 3.5);
    p.box(a0 - 0.02, b0 - 0.02, a1 + 0.02, b1 + 0.02, z1 - 2.5, z1 + 1.5, { color: shade(brick, 0.78) }, 0x241c18);
  }
  p.addSmoke((u0 + u1) / 2, (v0 + v1) / 2, z1 + 2);
}
