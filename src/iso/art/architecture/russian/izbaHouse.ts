import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { R } from '../facade';
import { logPile } from '../parts';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';
import { footing, izbaWindow, logBlock, logTown, plankGable, poleFence, towerTop, type Block } from './izbaParts';

/*
 * Russian house: an izba with its carved gable to the street — three
 * shuttered windows under the steep plank roof, bargeboards, towel
 * board and ridge horse — a porch on the long side, a woodpile and a
 * pole fence. In age 2 it stands on a white-stone ground storey and a
 * log terem tower with a green tent and a gilt onion rises at the back.
 */

const BODY: Block = [0.32, 0.36, 1.42, 1.6];
const TEREM: Block = [1.48, 0.18, 1.86, 0.56];

/** Gabled porch (kryltso) against the +u face between v0 and v1, its floor at z. */
function porch(p: IsoPainter, s: ArchStyle, v0: number, v1: number, u: number, z: number): void {
  const c = s.palette;
  const depth = 0.24;
  p.box(u, v0, u + depth, v1, 0, z, { color: c.timber, detail: 'planks' }, c.board);
  for (const v of [v0 + 0.03, v1 - 0.03]) {
    const [x, y] = p.p(u + depth - 0.03, v, z);
    p.ctx.fillStyle = css(shade(c.board, 0.85));
    p.ctx.fillRect(x - 1.5, y - 20, 3, 20);
  }
  p.material = 'shingle';
  p.gableRoof(u - 0.02, v0 - 0.04, u + depth + 0.04, v1 + 0.04, z + 20, 13, c.roof, c.board, 'u', 0.03);
}

function paintIzba(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const k = logTown(s);
  p.footShadow();
  p.ground(0.1, 0.1, 1.9, 1.9, 0x8d7d5e);
  if (k.tents) {
    // The terem tower behind the house (painted first: it stands behind).
    footing(p, s, TEREM, 26);
    logBlock(p, s, TEREM, 26, 96, (w, h) => izbaWindow(p, s, w / 2 - 3, -h + 14, 6, 8, 1, false), undefined, 0.05);
    towerTop(p, s, TEREM, 96, { oct: 14, tent: 54 });
  }
  const low = k.masonry === 'whiteStone';
  const cellar = (w: number) => {
    for (const x of [0.2, 0.62]) {
      p.ctx.fillStyle = '#2c241c';
      p.ctx.fillRect(w * x, -16, 7, 7);
    }
  };
  const top0 = footing(p, s, BODY, low ? 24 : 6, cellar, (w) => p.door(w * 0.18, 11, 18, c.doors.main));
  const top = top0 + (low ? 36 : 44);
  logBlock(
    p,
    s,
    BODY,
    top0,
    top,
    (w, h) => {
      for (const x of [0.13, 0.43, 0.73]) izbaWindow(p, s, w * x, -h + (low ? 10 : 14), 9, 11, 1);
    },
    (w, h) => {
      izbaWindow(p, s, w * 0.12, -h + (low ? 10 : 14), 8, 10, R, false);
      if (!low) p.door(w * 0.5, 12, 26, c.doors.main);
    },
  );
  plankGable(p, s, BODY, top, 60, 'v', { window: true });
  if (low) {
    // Stair up to the upper storey's door.
    p.box(1.42, 0.92, 1.66, 1.2, 0, top0, { color: c.timber, detail: 'planks' }, c.board);
    porch(p, s, 0.88, 1.24, 1.42, top0);
  } else porch(p, s, 0.88, 1.24, 1.42, 6);
  logPile(p, 1.52, 1.72, 6, shade(c.darkWood, 0.9), 0xd9b07a);
  poleFence(p, 0.14, 1.88, 1.0, 1.88, 11);
  poleFence(p, 1.88, 0.62, 1.88, 1.4, 11);
  p.flag(0.18, 1.84, 0, 30, team);
}

/** The Russian house of ages 1-2. */
export function izbaHouse(s: ArchStyle): BuildingArt {
  return { size: 2, maxHeight: logTown(s).tents ? 230 : 150, paint: (p, team) => paintIzba(p, s, team) };
}
