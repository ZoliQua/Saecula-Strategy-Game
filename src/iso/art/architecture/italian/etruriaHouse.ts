import type { IsoPainter } from '../../isoPainter';
import { shade } from '../../palette';
import { balcony, insula, type InsulaOpts } from '../kits/insula';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';
import { banner, brickWall, cypress, lowHip, pergola, stuccoWall, type Block } from './italianParts';

/*
 * Italian age-1 house: an insula. A four-storey block, brick shops below
 * and ochre stucco storeys above a wooden balcony, under a low terracotta
 * hip; in front a two-storey shop range whose flat roof
 * carries a vine pergola.
 */

const TALL: Block = [0.25, 0.22, 1.78, 1.15];
const WING: Block = [0.25, 1.15, 1.1, 1.78];
const STOREY = 26;

export function insulaOpts(s: ArchStyle, storeys: number, shops: readonly [number, number], windows: readonly [number, number]): InsulaOpts {
  return { ground: brickWall(s), upper: brickWall(s), trim: s.palette.ashlar, shutter: s.palette.shutter, storey: STOREY, storeys, shops, windows };
}

function paintInsulaHouse(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.1, 0.1, 1.9, 1.9, 0xb3a58a);
  const top = STOREY * 4;
  // The wing hides the left face's first upper storey: light the right face, and on the left one window above the wing.
  insula(p, TALL, 0, { ...insulaOpts(s, 4, [2, 2], [2, 2]), upper: stuccoWall(s), lit: [0, 1] }, (w) => {
    banner(p.ctx, w * 0.06, -top + 40, 7, 16, team, 1);
    p.window(w * 0.75 - 4.5, -3 * STOREY + 6, 9, STOREY * 0.48, true);
  });
  balcony(p, TALL[0] + 0.05, TALL[2] - 0.05, TALL[3], STOREY * 2, 0.12, c.timber);
  lowHip(p, s, TALL, top, 22, c.roof, 0.1);
  // Front shop range with the owner's door and a pergola on its terrace.
  const wingTop = insula(p, WING, 0, insulaOpts(s, 2, [0, 1], [1, 1]), (w) => p.door(w * 0.32, 13, 19, shade(team, 0.75)));
  p.ground(WING[0], WING[1], WING[2], WING[3], 0xc9b79a, wingTop);
  p.box(WING[0], WING[3] - 0.05, WING[2], WING[3], wingTop, wingTop + 5, { color: c.brick }, c.ashlar);
  p.box(WING[2] - 0.05, WING[1], WING[2], WING[3], wingTop, wingTop + 5, { color: c.brick }, c.ashlar);
  pergola(p, WING[0] + 0.08, WING[1] + 0.06, WING[2] - 0.1, WING[3] - 0.1, wingTop, 16);
  cypress(p, 0.14, 1.86, 0, 70);
}

/** The Italian age-1 house: an insula with shops, a balcony and a roof pergola. */
export function insulaHouse(s: ArchStyle): BuildingArt {
  return { size: 2, maxHeight: 150, paint: (p, team) => paintInsulaHouse(p, s, team) };
}
