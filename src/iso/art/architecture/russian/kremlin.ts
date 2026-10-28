import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { crest, R } from '../facade';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';
import { wellHouse } from './hillfort';
import { izbaWindow, logBlock, plankGable, stoneBlock, towerTop, type Block } from './izbaParts';
import { fiveDomes, soborCube } from './soborParts';

/*
 * Russian age-2 town centre: a white-stone kremlin. Merloned curtain
 * walls close the back; the gate tower at the front corner carries an
 * octagon and a tall green tent roof with a watch lantern; behind it the
 * cathedral — a white cube with round-arched zakomary — lifts its five
 * gilt onions on drums; a log terem stands in the yard.
 */

const WALL_H = 44;
const GATE: Block = [0.3, 1.9, 0.98, 2.58];
const SOBOR: Block = [1.38, 0.62, 2.5, 1.74];
const TEREM: Block = [2.12, 2.12, 2.76, 2.76];

/** Curtain wall from (u0,v0) to (u1,v1) of thickness `t`, merlons on top. */
function curtain(p: IsoPainter, s: ArchStyle, b: Block, along: 'u' | 'v'): void {
  stoneBlock(p, s, b, 0, WALL_H);
  const [u0, v0, u1, v1] = b;
  const n = Math.round(((along === 'u' ? u1 - u0 : v1 - v0) / 0.16));
  for (let i = 0; i < n; i += 2) {
    const t0 = i / n;
    const t1 = (i + 1) / n;
    const m: Block = along === 'u' ? [u0 + (u1 - u0) * t0, v1 - 0.08, u0 + (u1 - u0) * t1, v1] : [u1 - 0.08, v0 + (v1 - v0) * t0, u1, v0 + (v1 - v0) * t1];
    p.box(m[0], m[1], m[2], m[3], WALL_H, WALL_H + 9, { color: s.palette.ashlar }, s.palette.ashlar);
  }
}

function paintKremlin(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0xb5aa90);
  curtain(p, s, [0.1, 0.12, 2.92, 0.36], 'u');
  curtain(p, s, [0.12, 0.36, 0.36, 1.86], 'v');
  // The cathedral.
  soborCube(p, s, SOBOR, 0, 78, 3, [0, 1]);
  fiveDomes(p, s, SOBOR, 78, { centre: 0.22, corner: 0.13, drum: 48, onion: { color: c.metal } });
  // The gate tower.
  stoneBlock(p, s, GATE, 0, 98, (w, h) => {
    const ctx = p.ctx;
    ctx.fillStyle = css(shade(c.ashlar, 0.8));
    ctx.beginPath();
    ctx.moveTo(w / 2 - 14, 0);
    ctx.lineTo(w / 2 - 14, -26);
    ctx.arc(w / 2, -26, 14, Math.PI, 0);
    ctx.lineTo(w / 2 + 14, 0);
    ctx.fill();
    p.door(w / 2 - 11, 22, 38, c.doors.main);
    crest(ctx, s, w / 2, -54, 9, team);
    izbaWindow(p, s, w / 2 - 3, -h + 18, 6, 10, 1);
  }, (w, h) => {
    p.ctx.fillStyle = '#2a221c';
    p.ctx.fillRect(w / 2 - 2, -h + 18, 4, 12);
  });
  // Machicolated parapet ring.
  p.box(GATE[0] - 0.06, GATE[1] - 0.06, GATE[2] + 0.06, GATE[3] + 0.06, 98, 112, { color: c.ashlar, detail: 'plaster' }, c.ashlar);
  const loops = (w: number) => {
    p.ctx.fillStyle = '#2a221c';
    for (let x = 7; x < w - 6; x += 12) p.ctx.fillRect(x, -10, 3, 6);
  };
  p.leftFace(GATE[0] - 0.06, GATE[2] + 0.06, GATE[3] + 0.06, 98, loops, 14);
  p.rightFace(GATE[1] - 0.06, GATE[3] + 0.06, GATE[2] + 0.06, 98, loops, 14);
  const top = towerTop(p, s, GATE, 112, { oct: 20, tent: 84 });
  p.flag(0.64, 2.24, top, 22, team, true);
  // The log terem in the yard.
  logBlock(p, s, TEREM, 0, 40, (w, h) => {
    for (const x of [0.2, 0.62]) izbaWindow(p, s, w * x, -h + 14, 8, 10, 1);
  }, (w, h) => {
    p.door(w * 0.5, 12, 26, c.doors.main);
    izbaWindow(p, s, w * 0.15, -h + 14, 8, 10, R, false);
  });
  plankGable(p, s, TEREM, 40, 44, 'v');
  wellHouse(p, s, 1.5, 2.4);
}

/** The Russian age-2 town centre: a white kremlin with a tented gate tower and a five-domed cathedral. */
export function kremlin(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 300, paint: (p, team) => paintKremlin(p, s, team) };
}
