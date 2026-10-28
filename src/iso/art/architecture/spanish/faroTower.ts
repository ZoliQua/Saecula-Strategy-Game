import { TOWER_PLATFORM_Z } from '../../../../config/visual';
import type { Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { R } from '../facade';
import { brazier, parapet, archer } from '../towerParts';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';

/*
 * Spanish age-1 tower: the Roman lighthouse of Brigantium (the Tower of
 * Hercules at A Coruña) — a tall square granite shaft wound by the band
 * of its outer ramp, an archer's platform at the gameplay height, and a
 * narrower lantern stage on its back corner carrying the beacon fire.
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

function paintFaro(p: IsoPainter, s: ArchStyle, team: number): void {
  const z = TOWER_PLATFORM_Z[1];
  const wall = { color: GRANITE, detail: 'stone' as const };
  p.footShadow();
  p.box(0.06, 0.06, 0.94, 0.94, 0, 10, { color: shade(GRANITE, 0.86), detail: 'stone' }, GRANITE);
  p.box(0.14, 0.14, 0.86, 0.86, 10, z, wall);
  p.leftFace(0.14, 0.86, 0.86, 10, (w, h) => {
    ramp(p.ctx, w, h, 1, 0);
    p.window(w * 0.3, -h + 22, 7, 11, true);
    p.window(w * 0.62, -h * 0.5, 7, 11, true);
    p.door(w / 2 - 6, 12, 20, shade(team, 0.8));
  }, z - 10);
  p.rightFace(0.14, 0.86, 0.86, 10, (w, h) => {
    ramp(p.ctx, w, h, R, 13);
    p.window(w * 0.55, -h + 40, 7, 11, true);
  }, z - 10);
  // Cornice and the platform.
  p.box(0.1, 0.1, 0.9, 0.9, z - 5, z, { color: shade(GRANITE, 1.08) }, 0x8c8478);
  const stone = { color: s.palette.ashlar, detail: 'stone' as const };
  parapet(p, 0.1, 0.1, 0.9, 0.9, z, stone, 'back', 0);
  // Lantern stage on the back corner: a smaller square storey, a cornice and the beacon.
  p.box(0.14, 0.14, 0.5, 0.5, z, z + 34, wall);
  p.leftFace(0.14, 0.5, 0.5, z, (w, h) => p.window(w / 2 - 3, -h + 10, 6, 10, true), 34);
  p.box(0.11, 0.11, 0.53, 0.53, z + 34, z + 38, { color: shade(GRANITE, 1.08) }, 0x7a7266);
  brazier(p, 0.32, 0.32, z + 38, 0.6, 1.1);
  p.addVolumePoint(0.32, 0.32, z + 60);
  archer(p, 0.7, 0.62, z, team, 'galea');
  parapet(p, 0.1, 0.1, 0.9, 0.9, z, stone, 'front', 0);
  p.flag(0.86, 0.14, z + 11, 26, team);
}

/** The Spanish age-1 tower: the Roman lighthouse (Tower of Hercules). */
export function faroTower(s: ArchStyle): BuildingArt {
  return { size: 1, maxHeight: 210, paint: (p, team) => paintFaro(p, s, team) };
}
