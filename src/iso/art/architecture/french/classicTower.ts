import { TOWER_PLATFORM_Z } from '../../../../config/visual';
import type { IsoPainter } from '../../isoPainter';
import { shade } from '../../palette';
import { cornice, crest, quoins, R } from '../facade';
import { pavilionRoof } from '../kits/pavilionRoof';
import type { ArchStyle } from '../style';
import { lookout, parapet } from '../towerParts';
import type { BuildingArt } from '../types';

/*
 * French age-3 tower: a square limestone belvedere — rusticated foot,
 * quoined shaft with the crest, a balustraded platform, and four stone
 * piers carrying a tall slate pavilion roof over the archer.
 */

function paintClassicTower(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const z = TOWER_PLATFORM_Z[3];
  const stone = { color: c.plaster, detail: 'stone' as const };
  p.footShadow();
  p.box(0.08, 0.08, 0.92, 0.92, 0, 30, { color: c.stone, detail: 'stone' }, c.stone);
  p.box(0.13, 0.13, 0.87, 0.87, 30, z - 8, stone);
  const face = (light: number, front: boolean) => (w: number, h: number) => {
    quoins(p.ctx, w, h, c.trim, light);
    cornice(p.ctx, w, h * 0.5, c.trim, light, 3);
    p.window(w / 2 - 4, -h + 18, 8, 18, true);
    if (front) crest(p.ctx, s, w / 2, -h * 0.32, 7, team);
    else p.window(w / 2 - 3.5, -h * 0.3, 7, 14, true);
  };
  p.leftFace(0.13, 0.87, 0.87, 30, face(1, true), z - 38);
  p.rightFace(0.13, 0.87, 0.87, 30, face(R, false), z - 38);
  p.leftFace(0.08, 0.92, 0.92, 0, (w) => p.door(w / 2 - 6, 12, 24, c.doors.main), 30);
  p.box(0.06, 0.06, 0.94, 0.94, z - 8, z, { color: c.trim }, c.trim);
  const trim = { color: c.trim };
  parapet(p, 0.06, 0.06, 0.94, 0.94, z, trim, 'back', 0);
  // Back piers, the archer, front piers.
  const pier = (u: number, v: number) => p.box(u - 0.05, v - 0.05, u + 0.05, v + 0.05, z, z + 34, { color: c.ashlar }, c.ashlar);
  pier(0.14, 0.14);
  pier(0.86, 0.14);
  pier(0.14, 0.86);
  lookout(p, 0.06, 0.94, z, team, 'tricorn');
  parapet(p, 0.06, 0.06, 0.94, 0.94, z, trim, 'front', 0);
  pier(0.86, 0.86);
  p.box(0.08, 0.08, 0.92, 0.92, z + 34, z + 40, { color: shade(c.trim, 0.96) }, c.trim);
  const prev = p.material;
  p.material = 'slate';
  pavilionRoof(p, s, 0.08, 0.08, 0.92, 0.92, z + 40, 50, c.roof, 0.04, { v: false, u: false });
  p.material = prev;
  p.flag(0.5, 0.5, z + 92, 20, team, true);
}

/** The French age-3 tower: a belvedere under a tall slate pavilion roof. */
export function classicTower(s: ArchStyle): BuildingArt {
  return { size: 1, maxHeight: 180 + s.headroom, paint: (p, team) => paintClassicTower(p, s, team) };
}
