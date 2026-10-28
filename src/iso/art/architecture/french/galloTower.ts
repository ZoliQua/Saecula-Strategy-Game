import { TOWER_PLATFORM_Z } from '../../../../config/visual';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { drumWall } from '../kits/drum';
import type { ArchStyle } from '../style';
import { disc, lookout, ringBack } from '../towerParts';
import type { BuildingArt } from '../types';

/*
 * French age-1 tower: a round tower of a Gallo-Roman town wall (Le Mans,
 * Senlis) — pale limestone drum laced with courses of red Roman brick,
 * round-headed lights in brick arches, and an open crenellated platform
 * whose merlons ring the archer.
 */

const R0 = 0.4;
/** Red Roman brick of the lacing courses (the style's brick is pale limestone). */
const ROMAN_BRICK = 0xb26a4c;

/** Merlons on the half of the ring facing (front) or away from (back) the viewer. */
function merlons(p: IsoPainter, z: number, stone: number, half: 'back' | 'front'): void {
  const n = 12;
  const order = [...Array(n).keys()].map((k) => ((k + 0.5) / n) * Math.PI * 2).sort((a, b) => Math.cos(a) + Math.sin(a) - (Math.cos(b) + Math.sin(b)));
  for (const a of order) {
    const front = Math.cos(a) + Math.sin(a) > 0;
    if (front !== (half === 'front')) continue;
    const u = 0.5 + (R0 + 0.01) * Math.cos(a);
    const v = 0.5 + (R0 + 0.01) * Math.sin(a);
    p.box(u - 0.045, v - 0.045, u + 0.045, v + 0.045, z, z + 11, { color: stone }, shade(stone, 1.08));
  }
}

function paintGalloTower(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const stone = c.ashlar;
  const z = TOWER_PLATFORM_Z[1];
  const ctx = p.ctx;
  p.footShadow();
  drumWall(p, 0.5, 0.5, R0 + 0.04, 0, 12, shade(stone, 0.88), 'stone');
  // Petit appareil in limestone, laced every few feet with three courses of brick.
  for (let z0 = 12; z0 < z - 6; z0 += 26) {
    drumWall(p, 0.5, 0.5, R0, z0, Math.min(z - 6, z0 + 20), stone, 'ashlar');
    if (z0 + 20 < z - 6) drumWall(p, 0.5, 0.5, R0 + 0.004, z0 + 20, Math.min(z - 6, z0 + 26), ROMAN_BRICK, 'brick');
  }
  for (const [a, h] of [[0.45, 40], [1.55, 40], [1.0, 90]] as const) {
    const [x, y] = p.p(0.5 + R0 * Math.cos(a), 0.5 + R0 * Math.sin(a), h);
    ctx.fillStyle = css(ROMAN_BRICK);
    ctx.beginPath();
    ctx.arc(x, y - 14, 6.5, Math.PI, 0);
    ctx.lineTo(x + 6.5, y);
    ctx.lineTo(x - 6.5, y);
    ctx.fill();
    p.ctx.save();
    p.ctx.translate(x, y);
    p.window(-3.5, -16, 7, 15, true);
    p.ctx.restore();
  }
  drumWall(p, 0.5, 0.5, R0 + 0.03, z - 6, z, shade(stone, 1.05), 'ashlar');
  disc(p, 0.5, 0.5, R0 + 0.02, z, 0x8c8478);
  ringBack(p, 0.5, 0.5, R0 + 0.03, z, 4, stone);
  merlons(p, z, stone, 'back');
  lookout(p, 0.14, 0.86, z, team, 'galea');
  merlons(p, z, stone, 'front');
  p.flag(0.24, 0.24, z + 11, 30, team, true);
}

/** The French age-1 tower: a round Gallo-Roman wall tower with brick lacing courses. */
export function galloTower(s: ArchStyle): BuildingArt {
  return { size: 1, maxHeight: 200 + s.headroom, paint: (p, team) => paintGalloTower(p, s, team) };
}
