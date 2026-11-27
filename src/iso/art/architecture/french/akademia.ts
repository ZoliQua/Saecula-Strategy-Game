import type { IsoPainter } from '../../isoPainter';
import { css, mix, shade } from '../../palette';
import { baroqueBlock } from '../baroqueParts';
import { basin } from '../kits/patio';
import { baroqueWindow, cornice } from '../facade';
import type { ArchStyle } from '../style';
import { styledHip } from '../styledRoofs';
import { parapet } from '../towerParts';
import type { BuildingArt } from '../types';
import { DOME_H, DRUM_H, domeAndObservatory, parterre, portico, railing, yew } from './akademiaParts';

/*
 * French landmark (M17): the Akadémia, a classical academy of the
 * Institut de France / Collège des Quatre-Nations kind with the Paris
 * Observatory's cupola. A corps de logis with a balustraded flat roof
 * carries the drum and the tall lead dome, crowned by an observatory
 * drum with its telescope; a pedimented portico with the crest stands
 * before it; two symmetric wings under the style's roofs frame a formal
 * forecourt of parterres, clipped yews and a fountain behind an iron
 * railing. The stone, slate and windows follow the age style (Loire
 * tuffeau and lancets in the Középkor, pale limestone, pavilion roofs and
 * casements in the Felvilágosodás).
 */

type Block = readonly [u0: number, v0: number, u1: number, v1: number];

const LEFT: Block = [0.2, 0.22, 0.86, 1.86];
const RIGHT: Block = [2.14, 0.22, 2.8, 1.86];
const CORPS: Block = [0.86, 0.3, 2.14, 1.24];
const WING_H = 62;
const CORPS_H = 76;
const WING_RISE = 22;

/** Two storeys of windows at face x positions: arched below the string course, segmental-headed above. */
function storeys(p: IsoPainter, s: ArchStyle, w: number, h: number, light: number, xs: readonly number[], head = 13): void {
  cornice(p.ctx, w, 30, s.palette.trim, light, 3);
  for (const x of xs) {
    p.window(x - 4, -25, 8, 17, true);
    baroqueWindow(p, s, x - 4.5, -h + head, 9, 18, light);
  }
}

/** Evenly spaced bay centres along a face of width w. */
const bays = (w: number, n: number): number[] => [...Array(n).keys()].map((i) => (w / n) * (i + 0.5));

function wing(p: IsoPainter, s: ArchStyle, [u0, v0, u1, v1]: Block, side: 'left' | 'right'): void {
  baroqueBlock(p, s, u0, v0, u1, v1, 0, WING_H, {
    bays: 2,
    left: (w, h, l) => storeys(p, s, w, h, l, bays(w, 2)),
    // The left wing's +u face shows only in front of the corps (x from the front up to the corps).
    right: (w, h, l) => storeys(p, s, w, h, l, side === 'right' ? bays(w, 6) : bays((v1 - CORPS[3]) * 64, 2)),
  });
  styledHip(p, s, u0, v0, u1, v1, WING_H, WING_RISE, s.palette.roof, 0.06);
}

/** The corps de logis: windows in the right outer bay (the portico projects over the rest), a balustrade round the flat. */
function corps(p: IsoPainter, s: ArchStyle): void {
  const c = s.palette;
  const [u0, v0, u1, v1] = CORPS;
  baroqueBlock(p, s, u0, v0, u1, v1, 0, CORPS_H, {
    bays: 4,
    left: (w, h, l) => storeys(p, s, w, h, l, [w * 0.9], 19),
  });
  p.ground(u0, v0, u1, v1, shade(c.ashlar, 0.85), CORPS_H);
  parapet(p, u0, v0, u1, v1, CORPS_H, { color: c.trim }, 'back', 0);
}

function forecourt(p: IsoPainter, s: ArchStyle): void {
  const c = s.palette;
  const ctx = p.ctx;
  const gravel = mix(c.ashlar, 0xc8bc9c, 0.5);
  p.ground(0.05, 0.05, 2.95, 2.95, shade(gravel, 0.9));
  p.ground(0.12, 1.24, 2.88, 2.92, gravel);
  // The axial path, then four parterres either side of it.
  p.ground(1.38, 1.24, 1.62, 2.92, shade(gravel, 1.08));
  ctx.strokeStyle = css(shade(gravel, 0.75), 0.5);
  ctx.lineWidth = 1;
  for (const u of [1.38, 1.62]) {
    const a = p.p(u, 1.3, 0);
    const b = p.p(u, 2.9, 0);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  parterre(p, 0.3, 2.02, 1.24, 2.74);
  parterre(p, 1.76, 2.02, 2.7, 2.74);
}

function paintAkademia(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  forecourt(p, s);
  wing(p, s, LEFT, 'left');
  corps(p, s);
  const [u0, v0, u1, v1] = CORPS;
  domeAndObservatory(p, s, (u0 + u1) / 2, (v0 + v1) / 2 - 0.04, CORPS_H + 4, team);
  parapet(p, u0, v0, u1, v1, CORPS_H, { color: c.trim }, 'front', 0);
  portico(p, s, 1.24, 1.76, v1, 0.36, 50, team);
  wing(p, s, RIGHT, 'right');
  basin(p, 1.5, 2.3, 0, 0.2, c.ashlar, 18);
  for (const [u, v] of [[0.38, 2.1], [1.16, 2.1], [0.38, 2.66], [1.16, 2.66], [1.84, 2.1], [2.62, 2.1], [1.84, 2.66], [2.62, 2.66]] as const) yew(p, u, v, 20);
  railing(p, s, 0.14, 2.86, 2.9, 1.34, 1.66);
}

/** The French landmark: the Akadémia, in the age style's palette. */
export function akademiaArt(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: CORPS_H + 4 + DRUM_H + DOME_H + 60 + s.headroom, paint: (p, team) => paintAkademia(p, s, team) };
}

