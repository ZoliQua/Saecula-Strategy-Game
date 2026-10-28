import type { IsoPainter } from '../../isoPainter';
import { lerp } from '../../isoProps';
import { baked } from '../../lighting/normalLayer';
import { css, shade } from '../../palette';
import type { RoofMaterial } from '../../roofCover';
import type { ArchStyle } from '../style';

type Pt = readonly [number, number];

/*
 * Needle spire kit (Spitzhelm): a tall, thin octagonal (or square)
 * pyramid of slate or copper over a tower, keep or roof turret, with a
 * gilt ball and a weathercock on a rod. Styles switch it on with
 * kits.needleSpires; the families that carry a cap (keep tops, stair
 * turrets, roof cupolas) call it in place of their own.
 */

/** Whether the style caps its towers and cupolas with needle spires. */
export function hasNeedleSpires(s: ArchStyle): boolean {
  return s.kits?.needleSpires === true;
}

/** Extra canvas height (art px) a family adds for a needle spire of `px` when the style has them. */
export function spireRoom(s: ArchStyle, px: number): number {
  return hasNeedleSpires(s) ? px : 0;
}

/** Gilt ball, rod and a small weathercock above (x, y) (canvas px). */
function weathercock(p: IsoPainter, x: number, y: number, size: number): void {
  const ctx = p.ctx;
  ctx.fillStyle = '#3a2e22';
  ctx.fillRect(x - 0.6, y - size * 2.4, 1.2, size * 2.4);
  const g = ctx.createRadialGradient(x - 1, y - size * 0.9, 0.3, x, y - size * 0.7, size * 0.7);
  g.addColorStop(0, '#fff0b0');
  g.addColorStop(1, '#a8781e');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y - size * 0.7, size * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d9b14a';
  const cy = y - size * 2.2;
  ctx.beginPath();
  ctx.moveTo(x - size * 0.9, cy + size * 0.2);
  ctx.quadraticCurveTo(x - size * 0.2, cy - size * 0.5, x + size * 0.5, cy - size * 0.55);
  ctx.lineTo(x + size * 0.8, cy - size * 0.2);
  ctx.lineTo(x + size * 0.4, cy + size * 0.25);
  ctx.closePath();
  ctx.fill();
  p.normalCylinder(x - size, cy - size * 0.6, size * 2, y - cy + size * 0.6);
}

/**
 * Needle spire on a base of half-width `r` tiles centred on (uc, vc) at
 * height z, rising `rise` art px. `sides` 8 paints an octagonal helm, 4
 * a square pyramid. Paints far faces first; records the slopes' normals
 * and the apex for the shadow. Returns the apex height.
 */
export function needleSpire(
  p: IsoPainter,
  uc: number,
  vc: number,
  r: number,
  z: number,
  rise: number,
  color: number,
  material: RoofMaterial = 'slate',
  sides: 4 | 8 = 8,
): number {
  const prev = p.material;
  p.material = material;
  const apex = p.p(uc, vc, z + rise);
  const corner = (k: number): readonly [number, number] => {
    const a = ((k + 0.5) / sides) * Math.PI * 2;
    const rr = sides === 4 ? r * Math.SQRT2 : r / Math.cos(Math.PI / sides);
    return [uc + Math.cos(a) * rr, vc + Math.sin(a) * rr];
  };
  const faces = Array.from({ length: sides }, (_, k) => {
    const mid = ((k + 1) / sides) * Math.PI * 2;
    return { k, du: Math.cos(mid), dv: Math.sin(mid) };
  }).sort((a, b) => a.du + a.dv - (b.du + b.dv));
  for (const f of faces) {
    const [au, av] = corner(f.k);
    const [bu, bv] = corner(f.k + 1);
    const a = p.p(au, av, z);
    const b = p.p(bu, bv, z);
    const tri: Pt[] = [a, b, apex];
    const normal = p.slope(f.du, f.dv, r, rise);
    // Lit towards +v, shaded towards +u (IsoPainter's light).
    const light = baked(0.86 + 0.2 * f.dv - 0.12 * f.du);
    if (f.du + f.dv < -0.2) {
      p.fillPoly(tri, css(shade(color, light)));
      p.normals.fill(tri, normal);
    } else p.roofSlope(tri, color, light, normal, (t) => [lerp(apex, a, t), lerp(apex, b, t)]);
  }
  p.material = prev;
  for (let k = 0; k < sides; k += sides / 4) {
    const [u, v] = corner(k);
    p.addVolumePoint(u, v, z);
  }
  p.addVolumePoint(uc, vc, z + rise);
  // Eave line, then the finial.
  const ctx = p.ctx;
  ctx.strokeStyle = css(shade(color, 0.55), 0.8);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = 0; k <= sides; k++) {
    const [u, v] = corner(k);
    const [x, y] = p.p(u, v, z);
    if (k === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  weathercock(p, apex[0], apex[1], Math.max(2.4, Math.min(4.5, r * 14)));
  return z + rise;
}
