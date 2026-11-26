import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { crest, R } from '../facade';
import { leadDome, ringPx } from '../kits/leadDome';
import { lantern } from '../parts';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';
import { ashlarBlock, bandedBlock, pointedWindow, roundPath, terrace, type Block, type Face } from './ottomanParts';

/*
 * Ottoman landmark (M21): the hamam. A domed hot room at the back, its
 * low dome studded with glass eyes (fil gözü) that light the steam
 * below, a pair of small domes over the warm room, and in front the
 * tall entrance hall (camekân) under the largest dome and a lantern.
 * Behind, the furnace's stack and a steam vent breathe white vapour;
 * bath towels (peştemal) in the owner's colour dry on a line by the
 * door. The walls follow the age — banded opus mixtum, honey ashlar or
 * pale limestone — and the domes take the age's dome cover.
 */

const HOT: Block = [0.35, 0.35, 1.65, 1.5];
const WARM: Block = [1.65, 0.5, 2.4, 1.35];
const HALL: Block = [0.55, 1.5, 2.45, 2.62];

function block(p: IsoPainter, s: ArchStyle, b: Block, h: number, left?: Face, right?: Face): void {
  if (s.family === 'byzantine') bandedBlock(p, s, b, 0, h, left, right);
  else ashlarBlock(p, s, b, 0, h, left, right, undefined, s.family === 'seljuk' ? s.palette.trim : undefined);
  terrace(p, b, h, s.palette.metal, s.family === 'byzantine' ? s.palette.stone : s.palette.ashlar);
}

/** Glass eyes on a dome's lit front: small pale discs in rings. */
function glassEyes(p: IsoPainter, uc: number, vc: number, r: number, z0: number, h: number): void {
  const ctx = p.ctx;
  for (const [e, n] of [[0.28, 7], [0.55, 5], [0.8, 3]] as const) {
    for (let k = 0; k < n; k++) {
      const phi = Math.PI * (-0.2 + (1.4 * (k + 0.5)) / n);
      const [x, y] = p.p(uc + r * Math.cos(e) * Math.cos(phi), vc + r * Math.cos(e) * Math.sin(phi), z0 + h * Math.sin(e));
      ctx.fillStyle = 'rgba(40,40,44,.7)';
      ctx.beginPath();
      ctx.ellipse(x, y, 2.1, 1.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d6eef2';
      ctx.beginPath();
      ctx.ellipse(x - 0.2, y - 0.2, 1.4, 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Curling white vapour rising from canvas point (x, y). */
function steam(p: IsoPainter, x: number, y: number, h: number): void {
  const ctx = p.ctx;
  for (let i = 0; i < 4; i++) {
    const t = i / 3;
    ctx.fillStyle = `rgba(245,248,250,${0.55 - t * 0.35})`;
    ctx.beginPath();
    ctx.ellipse(x + Math.sin(t * 4) * 4, y - 4 - t * h, 3.5 + t * 4, 2.6 + t * 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintHamam(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const domeColor = c.metal;
  const drumColor = s.family === 'byzantine' ? c.stone : c.ashlar;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0xc8bca2);
  // Furnace stack behind the hot room.
  p.box(0.2, 0.75, 0.42, 0.97, 0, 64, { color: c.brick, detail: 'brick' }, c.brick);
  p.addSmoke(0.31, 0.86, 64);
  // Hot room under its glass-eyed dome, with the steam vent.
  block(p, s, HOT, 32);
  const hr = 0.5;
  const ht = leadDome(p, 1.0, 0.92, hr, 32, domeColor, { rise: 0.72, seams: 0 });
  glassEyes(p, 1.0, 0.92, hr, 32, ringPx(hr) * 0.72);
  p.box(1.0 - 0.05, 0.92 - 0.05, 1.0 + 0.05, 0.92 + 0.05, ht - 3, ht + 6, { color: drumColor }, drumColor);
  const [vx, vy] = p.p(1.0, 0.92, ht + 6);
  steam(p, vx, vy, 26);
  // Warm room: two small domes.
  block(p, s, WARM, 28);
  for (const u of [1.84, 2.2]) {
    const top = leadDome(p, u, 0.92, 0.16, 28, domeColor, { rise: 0.75, seams: 0 });
    glassEyes(p, u, 0.92, 0.16, 28, top - 28);
  }
  // Entrance hall in front, the tallest, under the big dome and lantern.
  block(p, s, HALL, 46, (w) => {
    pointedWindow(p, c.trim, w * 0.12, -20, 8, 14, 1);
    pointedWindow(p, c.trim, w * 0.8, -20, 8, 14, 1);
    p.door(w / 2 - 8, 16, 26, c.doors.main);
    crest(p.ctx, s, w / 2, -36, 6, team);
  }, (w) => {
    // A public fountain niche (çeşme) with its basin.
    const ctx = p.ctx;
    ctx.fillStyle = css(shade(c.trim, R * 1.05));
    roundPath(ctx, w / 2 - 9, -2, 18, 30);
    ctx.fill();
    ctx.fillStyle = css(shade(c.trim, R * 0.55));
    roundPath(ctx, w / 2 - 6, -6, 12, 22);
    ctx.fill();
    ctx.fillStyle = '#6aa6b8';
    ctx.fillRect(w / 2 - 7, -7, 14, 3);
    pointedWindow(p, c.trim, w * 0.15, -20, 7, 12, R);
  });
  const et = leadDome(p, 1.5, 2.06, 0.5, 46, domeColor, { rise: 0.8, drum: 8, drumColor, windows: 6, seams: 0 });
  glassEyes(p, 1.5, 2.06, 0.5, 46 + 10, et - 56);
  leadDome(p, 1.5, 2.06, 0.09, et - 2, domeColor, { rise: 0.9, drum: 7, drumColor, alem: true, seams: 0 });
  // Towels drying on a line by the door: the owner's colour.
  const a = p.p(0.7, 2.86, 26);
  const b = p.p(1.25, 2.86, 26);
  const ctx = p.ctx;
  ctx.fillStyle = css(c.timber);
  ctx.fillRect(a[0] - 1, a[1], 2, 26);
  ctx.fillRect(b[0] - 1, b[1], 2, 26);
  ctx.strokeStyle = '#d8d0bc';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const t = 0.2 + i * 0.3;
    const x = a[0] + (b[0] - a[0]) * t;
    const y = a[1] + (b[1] - a[1]) * t;
    ctx.fillStyle = css(i === 1 ? 0xf2efe6 : team);
    ctx.fillRect(x - 3, y, 6, 12);
    ctx.fillStyle = css(shade(i === 1 ? 0xf2efe6 : team, 0.7));
    ctx.fillRect(x - 3, y + 9, 6, 1.4);
  }
  lantern(p, 2.55, 2.7, 26, 2.55, 2.95);
  p.flag(2.75, 2.75, 0, 34, team, true);
}

/** The Ottoman landmark: the hamam, in the age style's palette. */
export function hamamArt(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 190 + s.headroom, paint: (p, team) => paintHamam(p, s, team) };
}
