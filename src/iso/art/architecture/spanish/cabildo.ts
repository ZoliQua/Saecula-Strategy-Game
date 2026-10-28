import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { clockFace, quoins, R } from '../facade';
import { arcade, basin, patioFloor, pot } from '../kits/patio';
import { lantern } from '../parts';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';
import { espadana, framedCrest, portal, windowAt } from './hispaniaOrnament';
import { block, hip, type Block } from './hispaniaParts';

/*
 * Spanish age-3 town centre: a colonial cabildo on its plaza mayor — a
 * whitewashed two-storey town hall with an arcade (soportales) along the
 * ground storey, iron balconies on the upper one, ochre quoins and a
 * plateresque portal with the owner's arms, under low terracotta hips;
 * over its front rises a great espadaña with three bells and a clock.
 * A one-storey wing closes the plaza, which has its fountain and lamps.
 */

const MAIN: Block = [0.3, 0.35, 2.7, 1.45];
const WING: Block = [2.1, 1.45, 2.7, 2.7];
const TOP = 70;
const GROUND = 30;

function paintCabildo(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0xb9ab8c);
  patioFloor(p, 0.2, 1.45, 2.85, 2.9, 0, { color: 0xcdbd99, pattern: 'flags', cell: 0.32 });
  block(p, s, MAIN, 0, TOP, (w, h) => {
    quoins(ctx, w, h, c.plasterDeep, 1);
    // Soportales: the ground-storey arcade either side of the portal.
    p.leftFace(MAIN[0], MAIN[0] + 0.95, MAIN[3], 0, (aw, ah) => arcade(ctx, aw, ah, { bays: 3, head: 'round', wall: c.plaster, column: c.plasterDeep, light: 1, rise: 0.86 }), GROUND);
    p.leftFace(MAIN[2] - 0.95, MAIN[2], MAIN[3], 0, (aw, ah) => arcade(ctx, aw, ah, { bays: 3, head: 'round', wall: c.plaster, column: c.plasterDeep, light: 1, rise: 0.86 }), GROUND);
    ctx.fillStyle = css(shade(c.plasterDeep, 1));
    ctx.fillRect(0, -GROUND - 3, w, 3);
    // The wing's hip hides the far end of the upper storey (u > 2): no window there.
    for (const x of [0.1, 0.24, 0.62]) windowAt(p, s, w * x, -h + 14, 9, 16, 1, true);
    portal(p, s, w / 2 - 10, 20, 34, team, 1);
    framedCrest(p, s, w / 2, -h + 22, 7, team, 1);
  }, (w, h) => {
    quoins(ctx, w, h, c.plasterDeep, R);
    for (const x of [0.25, 0.65]) windowAt(p, s, w * x, -h + 14, 9, 16, R, true);
    for (const x of [0.25, 0.65]) windowAt(p, s, w * x, -GROUND + 6, 9, 14, R);
  });
  hip(p, s, MAIN, TOP, 30);
  // The great espadaña across the ridge: three bells over the clock.
  const vm = (MAIN[1] + MAIN[3]) / 2;
  const base = TOP + 30 * s.roof.pitch - 4;
  espadana(p, s, 1.05, 1.95, vm, base, 92, 3);
  p.leftFace(1.05, 1.95, vm, base, (w) => clockFace(ctx, w / 2, -18, 7), 30);
  p.flag(2.3, vm, TOP + 30 * s.roof.pitch - 6, 26, team, true);
  // Plaza: fountain, pots and lamps.
  basin(p, 1.15, 2.2, 0, 0.26, c.plasterDeep, 16);
  for (const [u, v] of [[0.45, 1.75], [1.85, 1.75], [0.45, 2.65]] as const) pot(p, u, v, 0);
  // The wing closing the plaza.
  block(p, s, WING, 0, 40, (w, h) => {
    quoins(ctx, w, h, c.plasterDeep, 1);
    windowAt(p, s, w * 0.4, -h + 12, 9, 16, 1);
  }, (w, h) => {
    for (const x of [0.15, 0.45, 0.75]) windowAt(p, s, w * x, -h + 12, 9, 16, R);
  });
  hip(p, s, WING, 40, 24);
  lantern(p, 0.7, 2.75, 26, 0.7, 2.9);
  lantern(p, 1.7, 2.75, 26, 1.7, 2.9);
  for (const u of [0.7, 1.7]) {
    const [x, y] = p.p(u, 2.75, 0);
    ctx.fillStyle = '#1f1b1a';
    ctx.fillRect(x - 0.8, y - 26, 1.6, 26);
  }
}

/** The Spanish age-3 town centre: a bell-gabled cabildo on its plaza. */
export function cabildo(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 190, paint: (p, team) => paintCabildo(p, s, team) };
}
