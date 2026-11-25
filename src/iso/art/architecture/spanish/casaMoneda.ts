import type { IsoPainter } from '../../isoPainter';
import { FURNACE_LIGHT } from '../../lighting/buildingLights';
import { css, shade } from '../../palette';
import { quoins, R } from '../facade';
import { furnaceMouth } from '../foundry';
import { arcade, patioFloor, pot, well } from '../kits/patio';
import { chimney, goldPile } from '../parts';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';
import { kitsOf } from './courtyardKits';
import { framedCrest, portal, windowAt } from './hispaniaOrnament';
import { block, hip, ridgeBells, type Block } from './hispaniaParts';
import { grilledLight, pressHall, screwPress, strongroomDoor } from './mintParts';

/*
 * Spanish landmark (M17): the Pénzverde, a royal mint after the Real
 * Casa de Moneda of Segovia and Seville's Casa de la Moneda. A
 * whitewashed two-storey range under a low tile hip holds the assay and
 * melting rooms, its furnace glowing at the end and a tall brick stack
 * rising behind; an arcaded courtyard with its well and heaps of fresh
 * coin opens before it to the street. On one side
 * the strongroom wing shows its iron-bound door and grilled lights; on
 * the other an open arcaded hall shelters the screw press (volante). The
 * owner's arms stand over the portal. The Mudéjar age dresses it with
 * horseshoe lights, glazed bands and merlons, the colonial one with
 * ochre quoins, a plateresque portal and an espadaña on the ridge.
 */

const MAIN: Block = [0.22, 0.22, 2.78, 1.1];
const WING: Block = [0.22, 1.1, 0.98, 2.72];
const HALL: Block = [2.06, 1.1, 2.78, 2.5];
const MAIN_H = 74;
const WING_H = 48;
const HALL_EAVE = 52;
const BRICK = 0xb5683f;

/** The mint is whitewashed in every age; the age's other dressings (bands, portals, windows) stay. */
function whitewashed(s: ArchStyle): ArchStyle {
  return { ...s, kits: { ...s.kits, courtyard: { ...kitsOf(s), walls: 'whitewash' } } };
}

function main(p: IsoPainter, s: ArchStyle, team: number): void {
  const ctx = p.ctx;
  const c = s.palette;
  const ochre = kitsOf(s).portal === 'plateresque';
  block(p, s, MAIN, 0, MAIN_H, (w, h) => {
    if (ochre) quoins(ctx, w, h, c.plasterDeep, 1);
    // The courtyard arcade (u 0.98 .. 2.06) on the ground storey, the portal in its middle.
    const x0 = (WING[2] - MAIN[0]) * 64;
    const x1 = (HALL[0] - MAIN[0]) * 64;
    ctx.save();
    ctx.translate(x0, 0);
    arcade(ctx, x1 - x0, 30, { bays: 3, head: kitsOf(s).portal === 'alfiz' ? 'horseshoe' : 'round', wall: c.plaster, column: c.plasterDeep, light: 1, rise: 0.9 });
    ctx.restore();
    ctx.fillStyle = css(shade(c.plasterDeep, 0.95));
    ctx.fillRect(x0, -33, x1 - x0, 3);
    const mid = (x0 + x1) / 2;
    for (const x of [x0 + 15, x1 - 24]) windowAt(p, s, x, -h + 14, 9, 17, 1, true);
    portal(p, s, mid - 10, 20, 34, team, 1);
    framedCrest(p, s, mid, -h + 24, 8, team, 1);
  }, (w, h) => {
    if (ochre) quoins(ctx, w, h, c.plasterDeep, R);
    // The melting furnace at the end of the range, the assay office above it.
    furnaceMouth(p, c.plasterDeep, w * 0.55 - 11, 22, 28, R);
    windowAt(p, s, w * 0.2, -h + 14, 9, 17, R, true);
    windowAt(p, s, w * 0.62, -h + 14, 9, 17, R, true);
  });
  hip(p, s, MAIN, MAIN_H, 32);
  ridgeBells(p, s, MAIN, MAIN_H, 32, 34);
  p.addLight(2.95, 0.7, FURNACE_LIGHT);
}

function strongroom(p: IsoPainter, s: ArchStyle): void {
  const ctx = p.ctx;
  const c = s.palette;
  block(p, s, WING, 0, WING_H, (w, h) => {
    strongroomDoor(ctx, s, w * 0.5 - 12, 24, 32, 1);
    for (const x of [w * 0.14, w * 0.86 - 8]) grilledLight(ctx, s, x, -h + 12, 8, 10, 1);
  }, (w, h) => {
    // The courtyard gallery along the wing.
    arcade(ctx, w, h - 16, { bays: 4, head: kitsOf(s).portal === 'alfiz' ? 'horseshoe' : 'round', wall: c.plaster, column: c.plasterDeep, light: R, rise: 0.92 });
    for (const x of [0.2, 0.62]) grilledLight(ctx, s, w * x, -h + 8, 7, 8, R);
  });
  hip(p, s, WING, WING_H, 26);
}

function courtyard(p: IsoPainter, s: ArchStyle): void {
  const c = s.palette;
  well(p, 1.45, 1.55, 0, c.ashlar);
  goldPile(p, 1.75, 2.15);
  goldPile(p, 1.25, 2.3);
  p.crate(1.85, 1.45, 10, 0x6a4a2a);
  p.crate(1.88, 1.66, 8, 0x6a4a2a);
  pot(p, 1.08, 1.25, 0);
  pot(p, 1.95, 1.22, 0);
}

function paintMint(p: IsoPainter, base: ArchStyle, team: number): void {
  const s = whitewashed(base);
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0xb5a78a);
  patioFloor(p, 0.98, 1.1, 2.06, 2.84, 0, { color: 0xcdbd99, pattern: 'flags', cell: 0.27 });
  // The furnace stack behind the range.
  chimney(p, 2.2, 0.3, 2.48, 0.58, 0, 168, { color: BRICK, detail: 'brick' });
  main(p, s, team);
  p.flag(0.7, (MAIN[1] + MAIN[3]) / 2, MAIN_H + 32 * s.roof.pitch - 6, 28, team, true);
  strongroom(p, s);
  courtyard(p, s);
  pressHall(p, s, HALL, HALL_EAVE, () => screwPress(p, s, 2.48, 1.9, 4));
}

/** The Spanish landmark: the Pénzverde royal mint, in the age style's palette. */
export function casaMonedaArt(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 180 + s.headroom, paint: (p, team) => paintMint(p, s, team) };
}
