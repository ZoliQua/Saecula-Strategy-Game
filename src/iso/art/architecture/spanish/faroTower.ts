import { TOWER_PLATFORM_Z } from '../../../../config/visual';
import type { Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { R } from '../facade';
import { BRAZIER_LIGHT } from '../../lighting/buildingLights';
import { drumOpening, drumWall } from '../kits/drum';
import { finial, helm } from '../roofs';
import { archer } from '../towerParts';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';

/*
 * Spanish age-1 tower: the Roman lighthouse of Brigantium (the Tower of
 * Hercules at A Coruña) in stepped set-backs: a wide whitewashed base
 * stage, a granite step, a slim square shaft wound by the band of its
 * outer ramp, a corniced gallery at the gameplay height (no merlons) and
 * a centred octagonal lantern under a small dome, its beacon glowing.
 */

const GRANITE = 0xa69e8f;

/** The outer ramp's band climbing a face (face-local): diagonal strips from the foot to the top. */
function ramp(ctx: Ctx, w: number, h: number, light: number, phase: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, -h, w, h);
  ctx.clip();
  const rise = 26;
  for (let y0 = -phase; y0 < h + w; y0 += rise * 1.6) {
    ctx.fillStyle = css(shade(GRANITE, light * 1.16));
    ctx.beginPath();
    ctx.moveTo(0, -y0);
    ctx.lineTo(w, -y0 - rise);
    ctx.lineTo(w, -y0 - rise - 5);
    ctx.lineTo(0, -y0 - 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = css(shade(GRANITE, light * 0.62), 0.8);
    ctx.beginPath();
    ctx.moveTo(0, -y0);
    ctx.lineTo(w, -y0 - rise);
    ctx.lineTo(w, -y0 - rise + 1.4);
    ctx.lineTo(0, -y0 + 1.4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Plain low coped wall round the back or front edges of the platform (no merlons: a lighthouse gallery). */
function gallery(p: IsoPainter, [u0, v0, u1, v1]: readonly [number, number, number, number], z: number, side: 'back' | 'front'): void {
  const wall = { color: shade(GRANITE, 1.05) };
  const cap = shade(GRANITE, 1.15);
  const t = 0.035;
  if (side === 'back') {
    p.box(u0, v0, u1, v0 + t, z, z + 6, wall, cap);
    p.box(u0, v0, u0 + t, v1, z, z + 6, wall, cap);
  } else {
    p.box(u0, v1 - t, u1, v1, z, z + 6, wall, cap);
    p.box(u1 - t, v0, u1, v1, z, z + 6, wall, cap);
  }
}

function paintFaro(p: IsoPainter, s: ArchStyle, team: number): void {
  const z = TOWER_PLATFORM_Z[1];
  const c = s.palette;
  const wall = { color: GRANITE, detail: 'stone' as const };
  p.footShadow();
  // Wide whitewashed base stage on a red-ochre plinth, then a granite set-back, then the slim shaft.
  p.box(0.06, 0.06, 0.94, 0.94, 0, 20, { color: c.plaster, detail: 'plaster' }, shade(c.plaster, 1.04));
  p.leftFace(0.06, 0.94, 0.94, 0, (w) => {
    p.ctx.fillStyle = css(c.plasterDeep);
    p.ctx.fillRect(0, -6, w, 6);
    p.door(w / 2 - 6, 12, 16, shade(team, 0.8));
  }, 20);
  p.rightFace(0.06, 0.94, 0.94, 0, (w) => {
    p.ctx.fillStyle = css(shade(c.plasterDeep, R));
    p.ctx.fillRect(0, -6, w, 6);
  }, 20);
  p.box(0.16, 0.16, 0.84, 0.84, 20, 34, { color: shade(GRANITE, 0.92), detail: 'stone' }, GRANITE);
  p.box(0.24, 0.24, 0.76, 0.76, 34, z - 6, wall);
  p.leftFace(0.24, 0.76, 0.76, 34, (w, h) => {
    ramp(p.ctx, w, h, 1, 0);
    p.window(w * 0.5 - 3.5, -h + 18, 7, 11, true);
    p.window(w * 0.5 - 3.5, -h * 0.45, 7, 11, true);
  }, z - 40);
  p.rightFace(0.24, 0.76, 0.76, 34, (w, h) => {
    ramp(p.ctx, w, h, R, 13);
    p.window(w * 0.5 - 3.5, -h + 44, 7, 11, true);
  }, z - 40);
  // Projecting cornice and the gallery round the platform.
  const deck = [0.18, 0.18, 0.82, 0.82] as const;
  p.box(deck[0], deck[1], deck[2], deck[3], z - 6, z, { color: shade(GRANITE, 1.1) }, 0x8c8478);
  gallery(p, deck, z, 'back');
  // Centred octagonal lantern with its fire, a cornice ring, the dome and a finial.
  drumWall(p, 0.5, 0.5, 0.15, z, z + 30, GRANITE, 'ashlar');
  drumOpening(p, 0.5, 0.5, 0.15, Math.PI / 4, 4.5, z + 6, 18, shade(GRANITE, 1.1), 'fire');
  helm(p, 0.5, 0.5, z + 30, [[0, 0.18], [4, 0.18]], shade(GRANITE, 1.12), false);
  helm(p, 0.5, 0.5, z + 34, [[0, 0.16], [6, 0.15], [12, 0.12], [18, 0.07], [21, 0.02]], shade(GRANITE, 0.95), false);
  finial(p, 0.5, 0.5, z + 55, 10, false);
  p.addLight(0.9, 1.1, BRAZIER_LIGHT);
  archer(p, 0.66, 0.74, z, team, 'galea');
  gallery(p, deck, z, 'front');
  p.flag(0.79, 0.21, z + 6, 26, team);
}

/** The Spanish age-1 tower: the Roman lighthouse (Tower of Hercules). */
export function faroTower(s: ArchStyle): BuildingArt {
  return { size: 1, maxHeight: 210, paint: (p, team) => paintFaro(p, s, team) };
}
