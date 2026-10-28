import type { IsoPainter } from '../../isoPainter';
import { shade } from '../../palette';
import { drumWall } from '../kits/drum';
import { disc, ringBack } from '../towerParts';

/*
 * Castilian castle pieces: bartizans (garitones) corbelled out from the
 * corners of keeps, and the round cubos of curtain walls, both ringed by
 * merlons — in brick for the Mudéjar castles (Coca, La Mota).
 */

/** Merlons on the back or front half of a ring of radius r at (uc, vc, z). */
export function ringMerlons(p: IsoPainter, uc: number, vc: number, r: number, z: number, color: number, half: 'back' | 'front', n = 8, h = 7): void {
  const a = Math.max(0.03, r * 0.3);
  const angles = [...Array(n).keys()].map((k) => ((k + 0.5) / n) * Math.PI * 2).sort((x, y) => Math.cos(x) + Math.sin(x) - (Math.cos(y) + Math.sin(y)));
  for (const t of angles) {
    const front = Math.cos(t) + Math.sin(t) > 0;
    if (front !== (half === 'front')) continue;
    const u = uc + r * Math.cos(t);
    const v = vc + r * Math.sin(t);
    p.box(u - a / 2, v - a / 2, u + a / 2, v + a / 2, z, z + h, { color }, shade(color, 1.1));
    p.box(u - a * 0.3, v - a * 0.3, u + a * 0.3, v + a * 0.3, z + h, z + h + 3, { color }, shade(color, 1.1));
  }
}

/**
 * Bartizan: a round turret corbelled out at (uc, vc) from z0 (the foot
 * of the corbel) rising `h` px, ringed by merlons.
 */
export function bartizan(p: IsoPainter, uc: number, vc: number, r: number, z0: number, h: number, color: number): void {
  // Stepped corbel courses shrinking downwards.
  for (let i = 0; i < 4; i++) drumWall(p, uc, vc, r * (0.45 + i * 0.15), z0 + i * 3, z0 + i * 3 + 3, shade(color, 0.9 + i * 0.03), 'brick');
  const zb = z0 + 12;
  drumWall(p, uc, vc, r, zb, zb + h, color, 'brick');
  disc(p, uc, vc, r - 0.01, zb + h, 0x7a6a58);
  ringBack(p, uc, vc, r, zb + h, 3, color);
  ringMerlons(p, uc, vc, r, zb + h, color, 'back', 8, 6);
  ringMerlons(p, uc, vc, r, zb + h, color, 'front', 8, 6);
  p.addVolumePoint(uc, vc, zb + h + 9);
}

/** Round curtain tower (cubo) at (uc, vc) from the ground, `h` px, ringed by merlons. */
export function cubo(p: IsoPainter, uc: number, vc: number, r: number, h: number, color: number, base: number): void {
  drumWall(p, uc, vc, r + 0.02, 0, 10, base, 'stone');
  drumWall(p, uc, vc, r, 10, h, color, 'brick');
  disc(p, uc, vc, r - 0.01, h, 0x7a6a58);
  ringBack(p, uc, vc, r, h, 3, color);
  ringMerlons(p, uc, vc, r, h, color, 'back', 10, 7);
  ringMerlons(p, uc, vc, r, h, color, 'front', 10, 7);
  p.addVolumePoint(uc, vc, h + 10);
}
