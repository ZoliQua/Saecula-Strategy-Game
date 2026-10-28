import type { IsoPainter } from '../../isoPainter';
import { shade } from '../../palette';
import { R } from '../facade';
import { shutteredDark } from '../kits/insula';
import { well } from '../kits/patio';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';
import { bifora, lowHip } from './italianParts';
import { pointedOpening, sieneseBlock, towerHouse, yardWall } from './comuneParts';

/*
 * Italian age-2 house: a San Gimignano tower-house. The tall brick tower
 * with its forked crown stands on the back corner; the family's house
 * (stone shop arches below, brick storeys with Sienese bifore above,
 * a low tile roof) runs along it, and a small walled court with a well
 * fills the front corner.
 */

const TOWER = [0.18, 0.2, 0.68, 0.7] as const;
const HOUSE = [0.68, 0.25, 1.78, 1.72] as const;
const TOP = 58;

function paintCasaTorre(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  p.footShadow();
  p.ground(0.1, 0.1, 1.9, 1.9, 0xb09a7c);
  towerHouse(p, s, TOWER, 140, { crown: 'swallowtail', lit: 1, team });
  sieneseBlock(p, s, HOUSE, 24, TOP,
    (w) => {
      pointedOpening(ctx, w * 0.12, 16, 18, c.ashlar, 1);
      p.door(w * 0.58, 12, 17, shade(team, 0.75));
    },
    (w) => {
      pointedOpening(ctx, w * 0.15, 16, 18, c.ashlar, R);
      pointedOpening(ctx, w * 0.6, 16, 18, c.ashlar, R);
    },
    (w) => bifora(p, c.ashlar, w * 0.3, -26, 11, 14, 1),
    (w) => {
      bifora(p, c.ashlar, w * 0.22, -26, 11, 14, R);
      shutteredDark(ctx, w * 0.66, -24, 9, 11, c.shutter, R);
    });
  lowHip(p, s, HOUSE, TOP, 22, c.roof, 0.07);
  // Walled court in front of the tower with its well.
  p.ground(0.2, 0.72, 0.66, 1.72, 0xc4ad8a);
  yardWall(p, s, 'v', 0.7, 1.68, 0.18, 16);
  well(p, 0.42, 1.2, 0, c.ashlar);
  yardWall(p, s, 'u', 0.18, 0.68, 1.68, 16);
}

/** The Italian age-2 house: a tower-house with its house and walled court. */
export function casaTorre(s: ArchStyle): BuildingArt {
  return { size: 2, maxHeight: 180, paint: (p, team) => paintCasaTorre(p, s, team) };
}
