import { TOWER_PLATFORM_Z } from '../../../../config/visual';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { cornice, quoins, R } from '../facade';
import type { ArchStyle } from '../style';
import { archer, brazier, parapet } from '../towerParts';
import type { BuildingArt } from '../types';
import { espadana, framedCrest, portal } from './hispaniaOrnament';
import { garita } from './towerSpots';

/*
 * Spanish age-3 tower: a whitewashed colonial bastion tower (after the
 * forts of Cartagena de Indias and San Juan) — a battered base, ochre
 * quoins and cornice, domed garitas (sentry boxes) corbelled from the
 * platform corners, and an espadaña with the alarm bell rising from the
 * back parapet.
 */

function paintTower(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const z = TOWER_PLATFORM_Z[3];
  const wall = { color: c.plaster, detail: 'plaster' as const };
  p.footShadow();
  // Battered (sloping) base in ochre stone.
  for (let i = 0; i < 4; i++) {
    const o = 0.06 + i * 0.025;
    p.box(o, o, 1 - o, 1 - o, i * 6, i * 6 + 6, { color: shade(c.stone, 0.92 + i * 0.03), detail: 'stone' }, c.stone);
  }
  p.box(0.16, 0.16, 0.84, 0.84, 24, z, wall);
  const face = (light: number, front: boolean) => (w: number, h: number) => {
    const ctx = p.ctx;
    quoins(ctx, w, h, c.plasterDeep, light);
    cornice(ctx, w, h - 6, c.plasterDeep, light, 5);
    p.window(w / 2 - 3.5, -h + 26, 7, 12, true);
    if (front) {
      framedCrest(p, s, w / 2, -h * 0.55, 6, team, light);
      portal(p, s, w / 2 - 7, 14, 24, team, light);
    } else {
      ctx.fillStyle = css(shade(0x2a211b, light));
      ctx.fillRect(w / 2 - 1.5, -h * 0.5, 3, 10);
    }
  };
  p.leftFace(0.16, 0.84, 0.84, 24, face(1, true), z - 24);
  p.rightFace(0.16, 0.84, 0.84, 24, face(R, false), z - 24);
  p.box(0.12, 0.12, 0.88, 0.88, z - 4, z, { color: shade(c.plasterDeep, 1.05) }, 0x9a8a72);
  const solid = { color: c.plaster };
  parapet(p, 0.12, 0.12, 0.88, 0.88, z, solid, 'back', 0);
  espadana(p, s, 0.3, 0.7, 0.2, z + 10, 34, 1);
  garita(p, s, 0.14, 0.86, z);
  garita(p, s, 0.86, 0.14, z);
  brazier(p, 0.32, 0.36, z, 0.6, 1.1);
  archer(p, 0.6, 0.48, z, team, 'tricorn');
  parapet(p, 0.12, 0.12, 0.88, 0.88, z, solid, 'front', 0);
  garita(p, s, 0.86, 0.86, z);
}

/** The Spanish age-3 tower: a whitewashed bastion tower with domed garitas and an alarm espadaña. */
export function colonialTower(s: ArchStyle): BuildingArt {
  return { size: 1, maxHeight: 240, paint: (p, team) => paintTower(p, s, team) };
}
