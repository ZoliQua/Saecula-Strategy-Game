import { HW, type IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { helm, type HelmProfile } from '../roofs';

/*
 * Low dome kit (any civ with masonry domes): a hemispherical or saucer
 * dome swept on the lathe (roofs.ts helm), with lead-sheet meridian
 * seams on its lit front, an optional windowed drum below and an
 * optional gilded finial with an upturned crescent (alem) on top.
 * Unlike the onion dome (kits/onionDome.ts) it never swells past its
 * base: the widest ring is the foot, so it reads low and heavy.
 */

export interface DomeOpts {
  /** Dome height as a fraction of its screen radius: 1 = hemisphere, ~0.5 = saucer. */
  readonly rise?: number;
  /** Drum height (art px) under the dome; 0 = none. */
  readonly drum?: number;
  /** Drum colour (default the dome's colour lightened). */
  readonly drumColor?: number;
  /** Dark arched openings round the drum's front half. */
  readonly windows?: number;
  /** Gilded finial with an upturned crescent on the crown. */
  readonly alem?: boolean;
  /** Seams down the dome's front (lead sheets, brick ribs). */
  readonly seams?: number;
}

/** Screen radius (px) of a ring of r tiles. */
export const ringPx = (r: number): number => r * Math.SQRT2 * HW;

/** Height (art px) of a dome of radius r tiles with its drum and alem. */
export function domeHeight(r: number, o: DomeOpts = {}): number {
  return (o.drum ?? 0) + ringPx(r) * (o.rise ?? 1) + (o.alem ? 12 : 0);
}

/** Gilded finial with an upturned crescent standing on (u, v, z). */
export function alem(p: IsoPainter, u: number, v: number, z: number, height = 12): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, z);
  ctx.fillStyle = '#c99b34';
  ctx.fillRect(x - 0.7, y - height + 3, 1.4, height - 3);
  ctx.fillStyle = '#e6c25a';
  ctx.beginPath();
  ctx.arc(x, y - 2, 1.9, 0, Math.PI * 2);
  ctx.arc(x, y - height * 0.55, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e6c25a';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(x, y - height - 0.5, 2.6, 0.12 * Math.PI, 0.88 * Math.PI);
  ctx.stroke();
}

/**
 * Low dome of radius r tiles centred on (uc, vc), its drum (if any)
 * standing on z. Returns the height of the dome's crown (without alem).
 */
export function leadDome(p: IsoPainter, uc: number, vc: number, r: number, z: number, color: number, o: DomeOpts = {}): number {
  const drum = o.drum ?? 0;
  const rise = o.rise ?? 1;
  const rx = ringPx(r);
  const h = rx * rise;
  if (drum > 0) {
    const dr = r * 1.04;
    const dc = o.drumColor ?? shade(color, 1.18);
    helm(p, uc, vc, z, [[0, dr], [drum, dr]], dc, false);
    const n = o.windows ?? 0;
    const ctx = p.ctx;
    const [x, y] = p.p(uc, vc, z);
    const drx = ringPx(dr);
    for (let k = 0; k < n; k++) {
      const a = Math.PI * (0.18 + (0.64 * (k + 0.5)) / n);
      const wx = x + Math.cos(a) * drx * 0.86;
      const wy = y + Math.sin(a) * drx * 0.43 - drum * 0.25;
      const ww = Math.max(1.4, 3.2 * Math.sin(a));
      const wh = drum * 0.5;
      ctx.fillStyle = '#1c1612';
      ctx.beginPath();
      ctx.moveTo(wx - ww / 2, wy);
      ctx.lineTo(wx - ww / 2, wy - wh + ww / 2);
      ctx.arc(wx, wy - wh + ww / 2, ww / 2, Math.PI, 0);
      ctx.lineTo(wx + ww / 2, wy);
      ctx.closePath();
      ctx.fill();
    }
    // Cornice where the dome springs.
    helm(p, uc, vc, z + drum - 1, [[0, dr * 1.04], [3, dr * 1.04]], shade(dc, 1.08), false);
  }
  const z0 = z + drum + (drum > 0 ? 2 : 0);
  const steps = 10;
  const profile: Array<readonly [number, number]> = [];
  for (let i = 0; i <= steps; i++) {
    const e = (i / steps) * (Math.PI / 2);
    profile.push([h * Math.sin(e), Math.max(0.002, r * Math.cos(e))]);
  }
  helm(p, uc, vc, z0, profile as HelmProfile, color, false);
  // Seams down the lit front: meridians of the sphere.
  const seams = o.seams ?? 7;
  const ctx = p.ctx;
  ctx.strokeStyle = css(shade(color, 0.68), 0.55);
  ctx.lineWidth = 0.8;
  for (let k = 0; k < seams; k++) {
    const phi = Math.PI * (-0.25 + (k + 0.5) / seams);
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const e = (i / 8) * (Math.PI / 2) * 0.94;
      const [px, py] = p.p(uc + r * Math.cos(e) * Math.cos(phi), vc + r * Math.cos(e) * Math.sin(phi), z0 + h * Math.sin(e));
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  for (const [du, dv] of [[-r, 0], [r, 0], [0, -r], [0, r]] as const) p.addVolumePoint(uc + du, vc + dv, z0);
  if (o.alem) alem(p, uc, vc, z0 + h - 0.5);
  return z0 + h;
}
