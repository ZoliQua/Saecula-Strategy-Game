import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { baroqueBlock } from '../baroqueParts';
import { archedOpening, baroqueWindow, clockFace, cornice, crest, R } from '../facade';
import { atticRoof } from '../kits/atticParapet';
import { chimney, lantern, torch } from '../parts';
import { finial, helm } from '../roofs';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';
import type { Block } from './biskupinParts';

/*
 * Zamość houses (Polish age 3): two narrow burgher houses side by side
 * on the market square, each rendered in its own colour, their ground
 * floors opening in an arcade, their roofs hidden behind tall crested
 * attics. The first house wears the style's render, the second a
 * painted neighbour's. The town centre is the Zamość town hall: a block
 * under a tall crested attic, a slender clock tower rising from its
 * front under a three-stage baroque helm, and the fan of steps
 * climbing to the tower's portal.
 */

/** The neighbour's render: a pale green, as on the Zamość market. */
const NEIGHBOUR = 0x9fbf98;
const WALL = 66;
const ARCADE = 26;

/** Arcaded ground floor and two storeys of white-framed windows on a +v face (face-local). */
function front(p: IsoPainter, s: ArchStyle, w: number, colour: number, light: number, bays: number): void {
  const ctx = p.ctx;
  const c = s.palette;
  const bay = w / bays;
  for (let i = 0; i < bays; i++) {
    const x = bay * i;
    // Arcade: a round arch on piers, the shop door lit behind.
    ctx.fillStyle = '#21160d';
    ctx.beginPath();
    ctx.moveTo(x + 3, 0);
    ctx.lineTo(x + 3, -ARCADE + bay / 2 - 1);
    ctx.arc(x + bay / 2, -ARCADE + bay / 2 - 1, bay / 2 - 3, Math.PI, 0);
    ctx.lineTo(x + bay - 3, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = css(shade(c.trim, light));
    ctx.lineWidth = 1.4;
    ctx.stroke();
    if (i === 1) p.window(x + bay / 2 - 3, -14, 6, 10);
    // Upper storeys.
    for (const y of [-ARCADE - 18, -ARCADE - 36]) {
      ctx.fillStyle = css(shade(c.trim, light));
      ctx.fillRect(x + bay / 2 - 5.5, y - 1.5, 11, 15);
      p.window(x + bay / 2 - 4, y, 8, 12);
    }
  }
  cornice(ctx, w, -ARCADE, c.trim, light, 3);
  ctx.fillStyle = css(shade(colour, light * 0.85), 0.5);
  ctx.fillRect(0, -WALL, w, 2);
}

function townHouse(p: IsoPainter, s: ArchStyle, b: Block, colour: number, bays: number): void {
  const [u0, v0, u1, v1] = b;
  p.box(u0, v0, u1, v1, 0, WALL, { color: colour, detail: 'plaster' });
  p.leftFace(u0, u1, v1, 0, (w) => front(p, s, w, colour, 1, bays), WALL);
  p.rightFace(v0, v1, u1, 0, (w) => {
    for (const x of [0.3, 0.7]) {
      p.ctx.fillStyle = css(shade(s.palette.trim, R));
      p.ctx.fillRect(w * x - 5.5, -ARCADE - 19.5, 11, 15);
      p.window(w * x - 4, -ARCADE - 18, 8, 12);
    }
  }, WALL);
  const vm = (v0 + v1) / 2;
  chimney(p, u0 + 0.12, vm - 0.06, u0 + 0.24, vm + 0.06, WALL, WALL + 30, { color: s.palette.stack, detail: 'brick' });
  p.addSmoke(u0 + 0.18, vm, WALL + 30);
  // Each house has its own attic, the colour carried up into it.
  atticRoof(p, { ...s, palette: { ...s.palette, plaster: colour } }, u0, v0, u1, v1, WALL, 24, s.palette.roof);
}

function paintHouse(p: IsoPainter, s: ArchStyle, team: number): void {
  p.footShadow();
  p.ground(0.06, 0.06, 1.94, 1.94, 0xc2b49a);
  townHouse(p, s, [0.18, 0.3, 0.98, 1.66], NEIGHBOUR, 2);
  townHouse(p, s, [0.98, 0.3, 1.78, 1.66], s.palette.plaster, 2);
  lantern(p, 1.0, 1.8, 26, 1.0, 2.0);
  // A team-coloured awning over the corner shop.
  const [x, y] = p.p(1.78, 1.66, ARCADE - 4);
  p.ctx.fillStyle = css(team);
  p.ctx.beginPath();
  p.ctx.moveTo(x, y);
  p.ctx.lineTo(x + 10, y - 5);
  p.ctx.lineTo(x + 12, y + 1);
  p.ctx.lineTo(x + 2, y + 6);
  p.ctx.closePath();
  p.ctx.fill();
  p.flag(1.9, 0.3, 0, 36, team);
}

export function zamoscHouse(s: ArchStyle): BuildingArt {
  return { size: 2, maxHeight: 130, paint: (p, team) => paintHouse(p, s, team) };
}

const HALL_TOP = 84;
const TOWER: Block = [1.28, 2.02, 1.72, 2.42];
const TOWER_TOP = 196;

/** Fan stairs: steps widening down from the tower's portal towards the square. */
function fanStairs(p: IsoPainter, s: ArchStyle): void {
  const c = s.palette;
  const steps = 5;
  for (let i = 0; i < steps; i++) {
    const k = steps - i;
    const half = 0.24 + k * 0.08;
    const z = k * 4;
    p.box(1.5 - half, 2.42, 1.5 + half, 2.46 + k * 0.09, z - 4, z, { color: c.ashlar }, shade(c.ashlar, 1.08));
  }
}

function paintTownHall(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0xc2b49a);
  // Market paving.
  ctx.strokeStyle = 'rgba(90,80,64,.22)';
  ctx.lineWidth = 1;
  for (let t = 0.3; t < 2.95; t += 0.25) {
    for (const [a, b] of [[p.p(t, 0.05, 0), p.p(t, 2.95, 0)], [p.p(0.05, t, 0), p.p(2.95, t, 0)]] as const) {
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
  }
  // The hall: windows only where the tower leaves the front face clear.
  baroqueBlock(p, s, 0.35, 0.4, 2.65, 2.02, 0, HALL_TOP, {
    bays: 6,
    left: (w, h, l) => {
      cornice(ctx, w, 34, c.trim, l, 4);
      for (const x of [0.07, 0.17, 0.68, 0.79, 0.9]) {
        p.window(w * x - 5, -29, 10, 17, true);
        baroqueWindow(p, s, w * x - 6, -h + 18, 12, 22, l);
      }
    },
    right: (w, h, l) => {
      cornice(ctx, w, 34, c.trim, l, 4);
      for (const x of [0.15, 0.38, 0.62, 0.85]) {
        p.window(w * x - 5, -29, 10, 17, true);
        baroqueWindow(p, s, w * x - 6, -h + 18, 12, 22, l);
      }
    },
  });
  atticRoof(p, s, 0.35, 0.4, 2.65, 2.02, HALL_TOP, 30, c.roof);
  // The clock tower with its portal over the fan stairs.
  const [u0, v0, u1, v1] = TOWER;
  baroqueBlock(p, s, u0, v0, u1, v1, 0, TOWER_TOP - 40, {
    left: (w, h, l) => {
      archedOpening(ctx, w / 2 - 9, 18, 30, c.trim, 0x2a1c12, l);
      p.door(w / 2 - 7, 14, 26, c.doors.main);
      crest(ctx, s, w / 2, -58, 8, team);
      baroqueWindow(p, s, w / 2 - 5, -h + 30, 10, 18, l);
    },
    right: (w, h, l) => baroqueWindow(p, s, w / 2 - 5, -h + 30, 10, 18, l),
  });
  baroqueBlock(p, s, u0 + 0.04, v0 + 0.04, u1 - 0.04, v1 - 0.04, TOWER_TOP - 40, TOWER_TOP, {
    plinth: 0,
    left: (w, h) => clockFace(ctx, w / 2, -h / 2, 7),
    right: (w, h) => clockFace(ctx, w / 2, -h / 2, 6),
  });
  fanStairs(p, s);
  const uc = (u0 + u1) / 2;
  const vc = (v0 + v1) / 2;
  // Three-stage baroque helm: a bell, an open lantern, a smaller bell and a spike.
  helm(p, uc, vc, TOWER_TOP, [[0, 0.2], [8, 0.19], [16, 0.13], [20, 0.07], [30, 0.07], [32, 0.1], [40, 0.06], [44, 0.04], [52, 0.06], [60, 0.02], [76, 0.004]], c.metal);
  finial(p, uc, vc, TOWER_TOP + 76, 10, false);
  p.flag(uc, vc, TOWER_TOP + 86, 18, team, true);
  torch(p, 1.05, 2.5, 24, 1.0, 2.7);
  torch(p, 1.95, 2.5, 24, 2.0, 2.7);
}

export function zamoscTownHall(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 300, paint: (p, team) => paintTownHall(p, s, team) };
}
