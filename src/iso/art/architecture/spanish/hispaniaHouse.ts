import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { R } from '../facade';
import { arcade, basin, patioFloor, patioShade, pool, pot, roundTree, well } from '../kits/patio';
import { chimney } from '../parts';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';
import { towerSpot } from './towerSpots';
import { kitsOf, wallOf } from './courtyardKits';
import { ajimez, portal, windowAt } from './hispaniaOrnament';
import { block, roofOver, type Block } from './hispaniaParts';

/*
 * House of the courtyard families (casa-patio): a two-storey back range
 * whose gallery opens on the patio, a one-storey street range with the
 * door in the owner's colour, and a patio walled on its two open sides
 * with its water (impluvium, well or fountain), an orange tree and pots.
 * Flat terraces in ages 1-2, low hips in age 3; the back corner's tower
 * spot raises a brick tower in age 2 and a whitewashed mirador with a
 * domed garita in age 3.
 */

const BACK: Block = [0.22, 0.2, 1.8, 0.78];
const SIDE: Block = [0.22, 0.78, 0.78, 1.78];
const PATIO: Block = [0.78, 0.78, 1.8, 1.78];
const UPPER = 60;
const LOWER = 34;
const PATIO_WALL = 18;

/** Patio water by age: Roman impluvium, a well head, or a basin fountain. */
function patioWater(p: IsoPainter, s: ArchStyle): void {
  const water = kitsOf(s).water;
  if (water === 'impluvium') pool(p, 1.08, 1.0, 1.5, 1.38, 0, s.palette.ashlar);
  else if (water === 'well') well(p, 1.28, 1.2, 0, s.palette.trim);
  else basin(p, 1.28, 1.22, 0, 0.17, s.palette.plasterDeep, 12);
}

function paintHouse(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const k = kitsOf(s);
  const ctx = p.ctx;
  p.footShadow();
  p.ground(0.1, 0.1, 1.9, 1.9, 0xb7a988);
  // Back range: gallery on the patio below, two lit rooms above.
  block(p, s, BACK, 0, UPPER, (w, h) => {
    const upper = (x: number) => (k.towers === 'brick' ? ajimez(p, s, x, -h + 12, 12, 13, 1) : windowAt(p, s, x, -h + 12, 9, 12, 1, true));
    upper(w * 0.55);
    upper(w * 0.8);
  }, (w, h) => windowAt(p, s, w * 0.45, -h + 12, 9, 12, R, true));
  const [pu0, pv0, pu1, pv1] = PATIO;
  p.leftFace(pu0, pu1, pv0, 0, (w, h) => arcade(ctx, w, h, { bays: 3, head: k.portal === 'alfiz' ? 'horseshoe' : 'round', wall: wallOf(s).color, column: k.portal === 'alfiz' ? undefined : c.ashlar, light: 1, alfiz: k.portal === 'alfiz' ? c.trim : undefined }), LOWER - 4);
  towerSpot(p, s, [0.24, 0.22, 0.6, 0.58], UPPER, UPPER + 38, 20);
  roofOver(p, s, BACK, UPPER);
  chimney(p, 1.5, 0.3, 1.64, 0.44, UPPER - 6, UPPER + (s.roof.form === 'hip' ? 26 : 18), wallOf(s));
  // Patio.
  patioFloor(p, pu0, pv0, pu1, pv1, 0, { color: k.walls === 'toledan' ? 0xb27b56 : 0xcdbf9f, pattern: k.walls === 'toledan' ? 'checker' : 'flags', alt: 0x2f7a58, cell: 0.17 });
  patioShade(p, pu0, pv0, pu1, pv1, 0, 0.22);
  patioWater(p, s);
  roundTree(p, 1.62, 0.98, 0, 16, 'orange');
  for (const [u, v] of [[0.9, 0.92], [1.62, 1.6], [0.92, 1.58]] as const) pot(p, u, v, 0);
  // Street range with the door, and its window on the patio.
  block(p, s, SIDE, 0, LOWER, (w) => {
    portal(p, s, w * 0.42, 14, 24, team, 1);
    windowAt(p, s, w * 0.12, -24, 8, 10, 1);
  }, (w) => windowAt(p, s, w * 0.4, -24, 8, 10, R));
  roofOver(p, s, SIDE, LOWER);
  // The two patio walls (coped), the front one with a cart gate.
  const wall = wallOf(s);
  p.box(pu0, pv1 - 0.06, pu1, pv1, 0, PATIO_WALL, wall, shade(wall.color, 1.05));
  p.box(pu1 - 0.06, pv0, pu1, pv1, 0, PATIO_WALL, wall, shade(wall.color, 1.05));
  p.leftFace(pu0, pu1, pv1, 0, (w) => {
    ctx.fillStyle = css(shade(c.plasterDeep, 1));
    if (k.walls !== 'toledan') ctx.fillRect(0, -5, w, 5);
    ctx.fillStyle = css(shade(c.doors.gate, 1));
    ctx.fillRect(w * 0.45, -15, 17, 15);
  }, PATIO_WALL);
  // Owner's colours on the street front.
  p.flag(SIDE[0] + 0.05, SIDE[3] - 0.05, LOWER + 7, 18, team);
}

/** The courtyard families' house (casa-patio). */
export function hispaniaHouse(s: ArchStyle): BuildingArt {
  return { size: 2, maxHeight: 140, paint: (p, team) => paintHouse(p, s, team) };
}
