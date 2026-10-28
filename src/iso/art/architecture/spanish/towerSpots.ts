import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { cornice, quoins, R } from '../facade';
import { archPath } from '../kits/patio';
import { finial, helm } from '../roofs';
import type { ArchStyle } from '../style';
import { kitsOf } from './courtyardKits';
import { glazedDiscs, ironBalcony, tileBand } from './hispaniaOrnament';
import type { Block } from './hispaniaParts';

/*
 * What rises in the courtyard layouts' tower spots (CourtyardKits.towers):
 * - a square Mudéjar brick tower (after Teruel and the Toledo miradors):
 *   a brick shaft laced with glazed bands and discs, a belfry stage of
 *   horseshoe openings and a low pyramid of glazed tile;
 * - a whitewashed colonial mirador (after the watch towers of Cádiz):
 *   ochre quoins, a balconied window, a balustraded top and a domed
 *   garita on its front corner.
 */

const GLAZED_ROOF = 0x3f7a5c;

/** Belfry openings on a face of a tower stage (face-local): `n` horseshoe arches in a brick alfiz. */
function belfry(p: IsoPainter, s: ArchStyle, w: number, h: number, n: number, light: number): void {
  const ctx = p.ctx;
  const bay = w / n;
  for (let i = 0; i < n; i++) {
    const x = i * bay + bay * 0.2;
    const bw = bay * 0.6;
    ctx.fillStyle = css(shade(s.palette.brick, light * 1.12));
    ctx.fillRect(x - 1.5, -h + 2, bw + 3, h - 5);
    ctx.fillStyle = css(shade(0x241a14, light));
    ctx.save();
    ctx.translate(0, -3);
    archPath(ctx, x, bw, h - 8, 'horseshoe');
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Brick tower on block b from z0 to z1 (z1 = top of the belfry stage),
 * with a pyramid cap of `cap` px rise (scaled by the style's pitch).
 * Returns the cap's top height.
 */
export function brickTower(p: IsoPainter, s: ArchStyle, b: Block, z0: number, z1: number, cap = 22): number {
  const [u0, v0, u1, v1] = b;
  const c = s.palette;
  const wall = { color: c.brick, detail: 'brick' as const };
  const stage = 18;
  p.box(u0, v0, u1, v1, z0, z1 - stage, wall);
  const shaft = (light: number) => (w: number, h: number) => {
    tileBand(p.ctx, w, h - 3, 3.5, light);
    glazedDiscs(p.ctx, [w * 0.25, w * 0.5, w * 0.75], -h + 12, light);
    tileBand(p.ctx, w, h * 0.45, 3, light);
  };
  p.leftFace(u0, u1, v1, z0, shaft(1), z1 - stage - z0);
  p.rightFace(v0, v1, u1, z0, shaft(R), z1 - stage - z0);
  // Belfry stage, a little proud of the shaft.
  const o = 0.025;
  p.box(u0 - o, v0 - o, u1 + o, v1 + o, z1 - stage, z1, wall);
  const n = u1 - u0 > 0.45 ? 2 : 1;
  p.leftFace(u0 - o, u1 + o, v1 + o, z1 - stage, (w, h) => belfry(p, s, w, h, n, 1), stage);
  p.rightFace(v0 - o, v1 + o, u1 + o, z1 - stage, (w, h) => belfry(p, s, w, h, n, R), stage);
  // Corbelled eave and the glazed pyramid.
  p.box(u0 - o * 2, v0 - o * 2, u1 + o * 2, v1 + o * 2, z1, z1 + 3, { color: shade(c.brick, 1.08) });
  const prev = p.material;
  p.material = 'tile';
  const rise = cap * Math.max(1, s.roof.pitch + 0.3);
  p.hipRoof(u0, v0, u1, v1, z1 + 3, rise, GLAZED_ROOF, 0.06);
  p.material = prev;
  const [x, y] = p.p((u0 + u1) / 2, (v0 + v1) / 2, z1 + 3 + rise);
  const ctx = p.ctx;
  ctx.fillStyle = '#1e1a18';
  ctx.fillRect(x - 0.7, y - 10, 1.4, 10);
  ctx.fillStyle = '#d9b14a';
  for (const dy of [3, 6.5]) {
    ctx.beginPath();
    ctx.arc(x, y - dy, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  p.addVolumePoint((u0 + u1) / 2, (v0 + v1) / 2, z1 + 3 + rise + 10);
  return z1 + 3 + rise;
}

/**
 * Domed garita (sentry box) at (u, v) standing at z: an ochre corbel, a
 * drum with a slit, the dome and its finial. Returns the finial's tip
 * height (art px), for a caller's shadow volume.
 */
export function garita(p: IsoPainter, s: ArchStyle, u: number, v: number, z: number, r = 0.11): number {
  const wall = s.palette.plaster;
  helm(p, u, v, z - 10, [[0, r * 0.27], [4, r * 0.64], [8, r * 0.9], [10, r]], s.palette.plasterDeep, false);
  helm(p, u, v, z, [[0, r], [r * 145, r]], wall, false);
  const [x, y] = p.p(u, v, z + 4);
  p.ctx.fillStyle = '#2a211b';
  p.ctx.fillRect(x - 1, y - r * 80, 2, r * 64);
  const top = z + r * 145;
  helm(p, u, v, top, [[0, r * 1.18], [2, r * 1.18], [6, r], [10, r * 0.64], [12, r * 0.27], [13, 0.005]], wall, false);
  finial(p, u, v, top + 13, 7, false);
  // Dome (13 px) plus finial (7 px).
  return top + 20;
}

/** Whitewashed mirador on block b from z0 to z1: quoins, a balconied light, a balustraded top with a garita on the front corner. */
export function mirador(p: IsoPainter, s: ArchStyle, b: Block, z0: number, z1: number): number {
  const [u0, v0, u1, v1] = b;
  const c = s.palette;
  p.box(u0, v0, u1, v1, z0, z1, { color: c.plaster, detail: 'plaster' });
  const face = (light: number) => (w: number, h: number) => {
    quoins(p.ctx, w, h, c.plasterDeep, light);
    cornice(p.ctx, w, h - 3, c.plasterDeep, light, 4);
    p.window(w / 2 - 4, -h + 12, 8, 12);
    ironBalcony(p.ctx, w / 2 - 4, -h + 24, 8, light);
  };
  p.leftFace(u0, u1, v1, z0, face(1), z1 - z0);
  p.rightFace(v0, v1, u1, z0, face(R), z1 - z0);
  p.ground(u0, v0, u1, v1, 0xd9cdb3, z1);
  const rail = { color: shade(c.plaster, 0.98) };
  p.box(u0, v0, u1, v0 + 0.03, z1, z1 + 6, rail, c.plaster);
  p.box(u0, v0, u0 + 0.03, v1, z1, z1 + 6, rail, c.plaster);
  p.box(u0, v1 - 0.03, u1, v1, z1, z1 + 6, rail, c.plaster);
  p.box(u1 - 0.03, v0, u1, v1, z1, z1 + 6, rail, c.plaster);
  garita(p, s, u1 - 0.08, v1 - 0.08, z1, 0.09);
  return z1 + 30;
}

/** The style's tower in a layout's tower spot (nothing when its towers are 'none'). */
export function towerSpot(p: IsoPainter, s: ArchStyle, b: Block, z0: number, z1: number, cap = 22): void {
  const towers = kitsOf(s).towers;
  if (towers === 'brick') brickTower(p, s, b, z0, z1, cap);
  else if (towers === 'mirador') mirador(p, s, b, z0, z1 - 8);
}
