import type { IsoPainter } from '../../isoPainter';
import { baked } from '../../lighting/normalLayer';
import { N_LEFT, N_RIGHT } from '../../lighting/viewSpace';
import { css, shade } from '../../palette';
import { HW } from '../../isoPainter';
import { onionDome, type OnionOpts } from '../kits/onionDome';
import type { ArchStyle } from '../style';
import type { Block } from './izbaParts';

type Pt = readonly [number, number];

/*
 * Pieces of a Russian stone church (sobor): a white cube divided into
 * bays by flat pilaster strips (lopatki), each bay crowned by a
 * round-arched gable (zakomara) over the roof line, and the five-dome
 * cluster — a tall central drum and four corner drums with onions.
 */

/** Round-arched gables (zakomary) standing on a face's top edge, n per face. */
export function zakomary(p: IsoPainter, b: Block, z: number, n: number, color: number): void {
  const [u0, v0, u1, v1] = b;
  const face = (axis: 'u' | 'v') => {
    const [a0, a1] = axis === 'u' ? [u0, u1] : [v0, v1];
    const span = (a1 - a0) / n;
    const half = (span * HW) / 2;
    for (let i = 0; i < n; i++) {
      const pts: Pt[] = [];
      for (let k = 0; k <= 12; k++) {
        const th = (k / 12) * Math.PI;
        const a = a0 + span * i + span * (0.5 - 0.5 * Math.cos(th));
        const zz = z + Math.sin(th) * half * 0.9;
        pts.push(axis === 'u' ? p.p(a, v1, zz) : p.p(u1, a, zz));
      }
      const light = axis === 'u' ? 1 : baked(0.72);
      p.fillPoly(pts, css(shade(color, light)));
      p.normals.fill(pts, axis === 'u' ? N_LEFT : N_RIGHT);
      p.strokePoly(pts, css(shade(color, 0.55), 0.7), 1);
      // Recessed tympanum.
      const inner = pts.map(([x, y], k) => {
        const [cx, cy] = pts[6]!;
        const t = k === 0 || k === 12 ? 0.78 : 0.7;
        return [cx + (x - cx) * t, cy + (y - cy) * t + 3] as Pt;
      });
      p.fillPoly(inner, css(shade(color, light * 0.82)));
    }
    const [ma0, ma1] = axis === 'u' ? [u0 + (u1 - u0) / 2, v1] : [u1, v0 + (v1 - v0) / 2];
    p.addVolumePoint(axis === 'u' ? ma0 : ma0, axis === 'u' ? ma1 : ma1, z + half * 0.9);
  };
  face('u');
  face('v');
}

/** White church cube with pilaster strips and slit windows (lit on the left face), roof plate on top. */
export function soborCube(p: IsoPainter, s: ArchStyle, b: Block, z0: number, z1: number, bays: number, litLeft: number[]): void {
  const [u0, v0, u1, v1] = b;
  const c = s.palette.ashlar;
  p.box(u0, v0, u1, v1, z0, z1, { color: c, detail: 'plaster' }, s.palette.roofAlt);
  const strips = (light: number, lit: number[]) => (w: number, h: number) => {
    const ctx = p.ctx;
    for (let i = 0; i <= bays; i++) {
      const x = (w * i) / bays;
      ctx.fillStyle = css(shade(c, light * 1.1));
      ctx.fillRect(Math.min(w - 4, Math.max(0, x - 2)), -h, 4, h);
    }
    ctx.fillStyle = css(shade(c, light * 0.85));
    ctx.fillRect(0, -h * 0.55, w, 1.4);
    for (let i = 0; i < bays; i++) {
      const x = (w * (i + 0.5)) / bays;
      if (lit.includes(i)) p.window(x - 2.5, -h + 14, 5, 15, true);
      else {
        ctx.fillStyle = css(shade(0x2a221c, light));
        ctx.fillRect(x - 2.5, -h + 14, 5, 15);
        ctx.beginPath();
        ctx.arc(x, -h + 14, 2.5, Math.PI, 0);
        ctx.fill();
      }
    }
  };
  p.leftFace(u0, u1, v1, z0, strips(1, litLeft), z1 - z0);
  p.rightFace(v0, v1, u1, z0, strips(baked(0.72), []), z1 - z0);
  zakomary(p, b, z1, bays, c);
}

export interface ClusterOpts {
  readonly centre: number;
  readonly corner: number;
  readonly drum: number;
  readonly onion: Omit<OnionOpts, 'drum'>;
  /** Colour of the four corner onions (else the centre's). */
  readonly cornerColor?: number;
}

/** Five-dome cluster on a cube's roof at height z: four corner drums and the tall central one, back to front. */
export function fiveDomes(p: IsoPainter, s: ArchStyle, b: Block, z: number, o: ClusterOpts): number {
  const [u0, v0, u1, v1] = b;
  const uc = (u0 + u1) / 2;
  const vc = (v0 + v1) / 2;
  const du = (u1 - u0) * 0.29;
  const dv = (v1 - v0) * 0.29;
  const drumColor = s.palette.ashlar;
  const corners: Array<readonly [number, number]> = [[uc - du, vc - dv], [uc + du, vc - dv], [uc - du, vc + dv], [uc + du, vc + dv]];
  const corner = (u: number, v: number) =>
    onionDome(p, u, v, o.corner, z, { ...o.onion, color: o.cornerColor ?? o.onion.color, drum: { h: o.drum * 0.7, color: drumColor }, kokoshnik: drumColor });
  for (const [u, v] of corners.slice(0, 2)) corner(u, v);
  const top = onionDome(p, uc, vc, o.centre, z, { ...o.onion, drum: { h: o.drum, color: drumColor }, kokoshnik: drumColor });
  for (const [u, v] of corners.slice(2)) corner(u, v);
  return top;
}
