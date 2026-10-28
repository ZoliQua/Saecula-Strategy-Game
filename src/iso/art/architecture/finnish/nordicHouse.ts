import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { R } from '../facade';
import { chimney, logPile } from '../parts';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';
import { aitta, footing, mainRoof, nDoor, nordic, nWindow, riukuaita, wallBlock, type Block } from './nordicParts';

/*
 * Finnish house: a low, wide dwelling with its long side to the lane
 * and a storehouse on stilts (aitta) in the yard behind, a woodpile and
 * a slanted pole fence. Age 1 is a smoke cabin (savupirtti) of grey
 * logs under a thick turf roof, venting through the roof; age 2 a red
 * ochre log house of one and a half storeys under shingles with a brick
 * stack; age 3 a falu-red board house with white corners and window
 * frames under a shingled gambrel.
 */

const STORE: Block = [1.2, 0.1, 1.74, 0.46];

/** Walls, roof rise and windows of the dwelling by age. */
function body(s: ArchStyle): { b: Block; wall: number } {
  const k = nordic(s);
  if (k.roofs === 'gambrel') return { b: [0.24, 0.52, 1.72, 1.56], wall: 36 };
  if (k.roofs === 'shingle') return { b: [0.3, 0.55, 1.62, 1.55], wall: 44 };
  return { b: [0.3, 0.55, 1.66, 1.6], wall: 30 };
}

function paintHouse(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const k = nordic(s);
  const { b, wall } = body(s);
  p.footShadow();
  p.ground(0.08, 0.08, 1.92, 1.92, 0x86795c);
  aitta(p, s, STORE, 'u', 11);
  const z0 = footing(p, s, b, k.roofs === 'turf' ? 4 : 6);
  const top = z0 + wall;
  const lights = k.roofs === 'gambrel' ? [0.14, 0.42, 0.7] : k.roofs === 'shingle' ? [0.18, 0.56] : [0.3];
  const ww = k.roofs === 'turf' ? 7 : 9;
  wallBlock(
    p,
    s,
    b,
    z0,
    top,
    (w, h) => {
      for (const x of lights) nWindow(p, s, w * x, -h + 13, ww, ww * (k.roofs === 'turf' ? 0.8 : 1.15), 1);
    },
    (w, h) => {
      nDoor(p, s, w * 0.36, 11, k.roofs === 'turf' ? 20 : 24, c.doors.main, R);
      if (k.roofs !== 'turf') nWindow(p, s, w * 0.72, -h + 14, 7, 9, R, false);
    },
  );
  const ridge = mainRoof(p, s, b, top, 'u');
  if (k.roofs === 'turf') {
    // The smoke cabin vents through a hole in the turf.
    p.addSmoke(0.75, (b[1] + b[3]) / 2, ridge);
  } else {
    const stack = k.walls === 'boards' ? { color: c.stack, detail: 'plaster' as const } : { color: c.brick, detail: 'brick' as const };
    const vm = (b[1] + b[3]) / 2;
    chimney(p, 0.86, vm - 0.07, 1.0, vm + 0.07, top, ridge + 12, stack);
  }
  logPile(p, 1.5, 1.8, 6, shade(c.darkWood, 0.9), 0xd9b88a);
  riukuaita(p, 0.12, 1.86, 1.2, 1.86, 13);
  p.flag(0.16, 1.82, 0, 30, team);
  if (k.walls === 'boards') {
    // A white bench by the door: the yard is kept.
    const [x, y] = p.p(1.82, 1.0, 0);
    p.ctx.fillStyle = css(shade(c.trim, 0.9));
    p.ctx.fillRect(x - 7, y - 7, 14, 2.4);
  }
}

/** The Finnish house of every age. */
export function nordicHouse(s: ArchStyle): BuildingArt {
  return { size: 2, maxHeight: nordic(s).roofs === 'turf' ? 110 : 150, paint: (p, team) => paintHouse(p, s, team) };
}
