import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { R } from '../facade';
import { patioFloor, patioShade, well } from '../kits/patio';
import { torch } from '../parts';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';
import { bartizan, cubo } from './castleParts';
import { ajimez, framedCrest, portal, tileBand } from './hispaniaOrnament';
import { block, terrace, type Block } from './hispaniaParts';

/*
 * Spanish age-2 town centre: a Castilian castle after Coca and La Mota.
 * A tall square brick keep (torre del homenaje) on a stone talus, with
 * round bartizans corbelled from its corners and stepped merlons, the
 * owner's arms over horseshoe ajimez windows; round cubos at the corners
 * of a crenellated bailey, a hall on its patio and a gate in an alfiz.
 */

const KEEP: Block = [0.95, 0.75, 2.05, 1.85];
const KEEP_TOP = 156;
const CURTAIN = 30;
const T = 0.1;

/** Crenellated curtain wall from (u0, v0) to (u1, v1) (axis-aligned), `T` thick. */
function curtain(p: IsoPainter, s: ArchStyle, b: Block): void {
  block(p, s, b, 0, CURTAIN, undefined, undefined, false);
  terrace(p, s, b, CURTAIN, { parapet: 1, merlons: true });
}

function paintCastle(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const brick = c.brick;
  const stone = c.stone;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0xa89878);
  // Back curtains and the back cubo.
  curtain(p, s, [0.18, 0.18, 2.82, 0.18 + T]);
  curtain(p, s, [0.18, 0.18 + T, 0.18 + T, 2.82]);
  cubo(p, 0.24, 0.24, 0.2, 46, brick, stone);
  patioFloor(p, 0.28, 0.28, 2.82, 2.82, 0, { color: 0xbfae8a, pattern: 'pebble' });
  patioShade(p, 0.28, 0.28, 2.82, 2.82, 0, 0.3);
  // Hall along the back curtain, flat-roofed behind merlons.
  const hall: Block = [2.1, 0.3, 2.78, 1.6];
  block(p, s, hall, 0, 46, undefined, (w) => {
    for (const x of [0.2, 0.62]) ajimez(p, s, w * x, -32, 12, 12, R);
  });
  terrace(p, s, hall, 46);
  // The keep: stone talus, brick shaft, bartizans, merlons.
  const [u0, v0, u1, v1] = KEEP;
  p.box(u0 - 0.06, v0 - 0.06, u1 + 0.06, v1 + 0.06, 0, 20, { color: stone, detail: 'stone' }, shade(stone, 1.08));
  bartizan(p, u0, v0, 0.14, KEEP_TOP - 22, 22, brick);
  block(p, s, KEEP, 20, KEEP_TOP, (w, h) => {
    framedCrest(p, s, w / 2, -h + 40, 9, team, 1);
    ajimez(p, s, w / 2 - 8, -h + 66, 16, 15, 1);
    ajimez(p, s, w / 2 - 8, -h + 104, 16, 15, 1);
    tileBand(p.ctx, w, h * 0.5, 3.5, 1);
  }, (w, h) => {
    ajimez(p, s, w / 2 - 8, -h + 30, 16, 15, R);
    ajimez(p, s, w / 2 - 8, -h + 84, 16, 15, R);
    tileBand(p.ctx, w, h * 0.5, 3.5, R);
  });
  terrace(p, s, KEEP, KEEP_TOP, { parapet: 4, merlons: true });
  for (const [u, v] of [[u0, v1], [u1, v0], [u1, v1]] as const) bartizan(p, u, v, 0.14, KEEP_TOP - 22, 22, brick);
  p.flag((u0 + u1) / 2, (v0 + v1) / 2, KEEP_TOP + 8, 34, team, true);
  well(p, 1.4, 2.3, 0, c.trim);
  // Front curtains, corner cubos and the gate.
  curtain(p, s, [2.82 - T, 0.28, 2.82, 2.82]);
  curtain(p, s, [0.28, 2.82 - T, 1.2, 2.82]);
  curtain(p, s, [1.8, 2.82 - T, 2.72, 2.82]);
  cubo(p, 0.24, 2.76, 0.2, 46, brick, stone);
  cubo(p, 2.76, 0.24, 0.2, 46, brick, stone);
  // Gatehouse with the horseshoe gate in its alfiz and the team's banners.
  const gate: Block = [1.2, 2.66, 1.8, 2.92];
  block(p, s, gate, 0, 50, (w, h) => {
    portal(p, s, w / 2 - 10, 20, 30, team, 1);
    const ctx = p.ctx;
    for (const bx of [4, w - 10]) {
      ctx.fillStyle = css(team);
      ctx.fillRect(bx, -h + 8, 6, 16);
    }
  }, undefined, false);
  terrace(p, s, gate, 50, { parapet: 3, merlons: true });
  cubo(p, 2.76, 2.76, 0.22, 52, brick, stone);
  torch(p, 1.25, 2.93, 32, 1.25, 3.1);
  torch(p, 1.75, 2.93, 32, 1.75, 3.1);
}

/** The Spanish age-2 town centre: a Castilian keep with bartizans in a crenellated bailey. */
export function homenaje(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 220, paint: (p, team) => paintCastle(p, s, team) };
}
