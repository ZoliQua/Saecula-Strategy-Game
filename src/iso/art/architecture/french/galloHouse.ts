import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { cornice, R } from '../facade';
import { column } from '../parts';
import { porchRoofLeft } from '../roofs';
import { roofOf, type ArchStyle } from '../style';
import { roofChimney, styledHip } from '../styledRoofs';
import type { BuildingArt } from '../types';

/*
 * French age-1 house: a Gallo-Roman town house (domus) — a limewashed
 * limestone block under a steep hipped slate roof, a colonnaded porch
 * (porticus) along the street front, the door in the owner's colour,
 * small shuttered lights and a walled kitchen garden at the side.
 */

function paintHouse(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  const wall = 44;
  p.footShadow();
  p.ground(0.12, 0.12, 1.88, 1.88, 0xb9ae96);
  // Kitchen garden behind a low wall on the +u side.
  p.ground(1.45, 0.25, 1.82, 1.2, 0x6f8a46);
  for (let v = 0.35; v < 1.15; v += 0.14) p.ground(1.5, v, 1.78, v + 0.07, 0x58763a);
  p.box(0.3, 0.25, 1.4, 1.3, 0, 8, { color: shade(c.stone, 0.9), detail: 'stone' }, c.stone);
  p.box(0.34, 0.29, 1.36, 1.26, 8, wall, { color: c.plaster, detail: 'plaster' });
  p.leftFace(0.34, 1.36, 1.26, 8, (w, h) => {
    cornice(ctx, w, h - 5, c.trim, 1, 4);
    ctx.fillStyle = css(shade(c.trim, 1.02));
    ctx.fillRect(w / 2 - 9, -30, 18, 30);
    p.door(w / 2 - 7, 14, 27, shade(team, 0.8));
    for (const x of [0.16, 0.76]) p.window(w * x, -27, 8, 11, true);
  }, wall - 8);
  p.rightFace(0.29, 1.26, 1.36, 8, (w, h) => {
    cornice(ctx, w, h - 5, c.trim, R, 4);
    for (const x of [0.25, 0.62]) p.window(w * x, -27, 8, 11, true);
  }, wall - 8);
  roofChimney(p, s, 0.55, 0.5, 0.72, 0.67, wall - 8, wall + 52, 40, { color: c.stone, detail: 'stone' });
  styledHip(p, s, 0.34, 0.29, 1.36, 1.26, wall, 40, roofOf(s, 'house'), 0.1);
  // Porticus on four columns along the street front.
  p.material = 'slate';
  for (const u of [0.42, 0.72, 0.98, 1.28]) column(p, u, 1.6, 0, 30, 2.4, c.trim);
  porchRoofLeft(p, 0.3, 1.4, 1.27, 0.38, 38, 30, c.roofAlt);
  p.box(1.42, 1.3, 1.48, 1.82, 0, 14, { color: c.plaster, detail: 'plaster' }, c.trim);
  p.box(0.3, 1.78, 0.9, 1.84, 0, 8, { color: c.plaster }, c.trim);
}

/** The French age-1 house: a Gallo-Roman domus with a street porticus. */
export function galloHouse(s: ArchStyle): BuildingArt {
  return { size: 2, maxHeight: 120 + s.headroom, paint: (p, team) => paintHouse(p, s, team) };
}
