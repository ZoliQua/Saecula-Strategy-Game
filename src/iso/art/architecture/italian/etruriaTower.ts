import { TOWER_PLATFORM_Z } from '../../../../config/visual';
import type { Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { R } from '../facade';
import { stringCourse } from '../kits/insula';
import { archer } from '../towerParts';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';
import { brickWall, lowHip } from './italianParts';
import { loggia } from './loggia';

/*
 * Italian age-1 tower: a Roman brick tower of the city walls (after the
 * Aurelian walls). A battered travertine foot, a brick shaft with arched
 * slit windows, a corniced gallery at the gameplay height and an open
 * arcaded fighting room under a broad, low terracotta pyramid crowned by
 * a gilt eagle (aquila) — the sky shows through the arches.
 */

/** Gilt legionary eagle with spread wings on a short staff, at canvas point (x, y). */
export function aquila(ctx: Ctx, x: number, y: number, k = 1): void {
  ctx.fillStyle = '#9c7a2e';
  ctx.fillRect(x - 0.8, y - 8 * k, 1.6, 8 * k);
  ctx.fillStyle = '#e2bd52';
  ctx.beginPath();
  ctx.moveTo(x, y - 8 * k);
  ctx.quadraticCurveTo(x - 6 * k, y - 10 * k, x - 9 * k, y - 18 * k);
  ctx.quadraticCurveTo(x - 4 * k, y - 15 * k, x - 1.5 * k, y - 15 * k);
  ctx.lineTo(x, y - 19 * k);
  ctx.lineTo(x + 1.5 * k, y - 15 * k);
  ctx.quadraticCurveTo(x + 4 * k, y - 15 * k, x + 9 * k, y - 18 * k);
  ctx.quadraticCurveTo(x + 6 * k, y - 10 * k, x, y - 8 * k);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#b8932f';
  ctx.fillRect(x - 3 * k, y - 9 * k, 6 * k, 1.6 * k);
}

function paintRomanTower(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const z = TOWER_PLATFORM_Z[1];
  const ctx = p.ctx;
  p.footShadow();
  p.box(0.06, 0.06, 0.94, 0.94, 0, 16, { color: c.ashlar, detail: 'stone' }, c.ashlar);
  p.box(0.13, 0.13, 0.87, 0.87, 16, z - 5, brickWall(s));
  const face = (light: number) => (w: number, h: number) => {
    stringCourse(ctx, w, h * 0.45, c.ashlar, light, 3);
    for (const y of [h * 0.3, h * 0.72]) {
      ctx.fillStyle = css(shade(c.ashlar, light));
      ctx.fillRect(w / 2 - 5, -y - 15, 10, 16);
      p.window(w / 2 - 3, -y - 13, 6, 13, true);
    }
  };
  p.leftFace(0.13, 0.87, 0.87, 16, face(1), z - 21);
  p.rightFace(0.13, 0.87, 0.87, 16, face(R), z - 21);
  p.leftFace(0.06, 0.94, 0.94, 0, (w) => p.door(w / 2 - 6, 12, 15, shade(team, 0.8)), 16);
  // Corniced gallery floor, wider than the shaft.
  p.box(0.08, 0.08, 0.92, 0.92, z - 5, z, { color: c.ashlar }, shade(c.ashlar, 0.92));
  const room = [0.1, 0.1, 0.9, 0.9] as const;
  const o = { wall: brickWall(s), trim: c.ashlar, bays: [3, 3] as const, pier: 0.04, band: 6 };
  loggia(p, room, z, z + 40, 'back', o);
  archer(p, 0.46, 0.6, z, team, 'galea');
  loggia(p, room, z, z + 40, 'front', o);
  const apex = lowHip(p, s, [0.1, 0.1, 0.9, 0.9], z + 40, 30, c.roof, 0.05);
  aquila(ctx, apex[0], apex[1], 1.1);
  p.addVolumePoint(0.5, 0.5, z + 40 + 30 * s.roof.pitch + 20);
}

/** The Italian age-1 tower: a Roman wall tower with an open arcaded top under a low pyramid. */
export function romanBrickTower(s: ArchStyle): BuildingArt {
  return { size: 1, maxHeight: 215, paint: (p, team) => paintRomanTower(p, s, team) };
}
