import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { crest, R } from '../facade';
import { stringCourse } from '../kits/insula';
import { pool } from '../kits/patio';
import { swallowtailCrown } from '../kits/swallowtail';
import { lantern } from '../parts';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';
import { banner, block, brickWall, lowHip, machicolation, putlogs, type Block } from './italianParts';
import { merlons, pointedOpening, sieneseBlock } from './comuneParts';
import { loggia } from './loggia';

/*
 * Italian age-2 town centre: the Palazzo Pubblico on its Campo (after
 * Siena). A long brick palace on a stone ground storey of pointed
 * arches, three-light Gothic windows, swallowtail merlons along the top
 * and a raised middle block; at its left end the slender Torre del
 * Mangia — a brick shaft, a stone machicolated crown and an open
 * belfry under a small cusp; the chapel loggia at its foot, the Fonte
 * Gaia on the brick piazza.
 */

const PALACE: Block = [0.95, 0.4, 2.75, 1.4];
const MIDDLE: Block = [1.5, 0.4, 2.2, 1.4];
const PALACE_TOP = 86;
const MIDDLE_TOP = 108;
const MANGIA: Block = [0.38, 0.6, 0.86, 1.08];
const SHAFT_TOP = 206;

/** Three-light Gothic window (trifora) in a stone frame under a pointed arch (face-local). */
function trifora(p: IsoPainter, s: ArchStyle, x: number, y: number, light: number, lit: boolean): void {
  const ctx = p.ctx;
  ctx.fillStyle = css(shade(s.palette.ashlar, light));
  ctx.beginPath();
  ctx.moveTo(x - 2, y + 18);
  ctx.lineTo(x - 2, y + 4);
  ctx.quadraticCurveTo(x + 7, y - 6, x + 16, y + 4);
  ctx.lineTo(x + 16, y + 18);
  ctx.closePath();
  ctx.fill();
  if (lit) p.window(x, y + 3, 14, 13, false);
  else {
    ctx.fillStyle = css(shade(0x2a1d14, light));
    ctx.fillRect(x, y + 3, 14, 13);
  }
  ctx.fillStyle = css(shade(s.palette.ashlar, light * 1.05));
  for (const dx of [4.4, 9.2]) ctx.fillRect(x + dx, y + 3, 1.4, 13);
}

function palace(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  const upper = (light: number, lit: boolean, team: number | null) => (w: number, h: number) => {
    stringCourse(ctx, w, h - 34, c.ashlar, light, 2.4);
    const n = Math.max(2, Math.round(w / 30));
    for (let i = 0; i < n; i++) trifora(p, s, ((i + 0.5) * w) / n - 7, -h + 12, light, lit && i % 2 === 1);
    for (let i = 0; i < n; i++) trifora(p, s, ((i + 0.5) * w) / n - 7, -h + 44, light, false);
    if (team !== null) {
      crest(ctx, s, w / 2, -h + 34, 6, team);
      banner(ctx, w * 0.1, -h + 30, 7, 20, team, light);
      banner(ctx, w * 0.9 - 7, -h + 30, 7, 20, team, light);
    }
  };
  const ground = (light: number) => (w: number) => {
    const n = Math.max(2, Math.round(w / 26));
    for (let i = 0; i < n; i++) pointedOpening(ctx, ((i + 0.5) * w) / n - 7, 14, 20, c.ashlar, light);
  };
  sieneseBlock(p, s, PALACE, 26, PALACE_TOP, ground(1), ground(R), upper(1, true, team), upper(R, false, null));
  p.ground(PALACE[0], PALACE[1], PALACE[2], PALACE[3], 0x9a7a62, PALACE_TOP);
  swallowtailCrown(p, ...PALACE, PALACE_TOP, 'back', merlons(s));
  // Raised middle block over the palace roof.
  block(p, MIDDLE, PALACE_TOP - 4, MIDDLE_TOP, brickWall(s), (w, h) => {
    for (const x of [0.2, 0.6]) trifora(p, s, w * x, -h + 6, 1, false);
  });
  swallowtailCrown(p, ...MIDDLE, MIDDLE_TOP, 'back', merlons(s));
  p.ground(MIDDLE[0], MIDDLE[1], MIDDLE[2], MIDDLE[3], 0x9a7a62, MIDDLE_TOP);
  swallowtailCrown(p, ...MIDDLE, MIDDLE_TOP, 'front', merlons(s));
  swallowtailCrown(p, ...PALACE, PALACE_TOP, 'front', merlons(s));
}

function mangia(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  block(p, MANGIA, 0, 24, { color: c.stone, detail: 'stone' }, undefined, undefined, c.stone);
  const face = (light: number) => (w: number, h: number) => {
    putlogs(ctx, w, h, light);
    for (const y of [0.3, 0.55, 0.8]) {
      ctx.fillStyle = css(shade(0x2a1d14, light));
      ctx.fillRect(w / 2 - 2, -h * y, 4, 9);
    }
  };
  block(p, MANGIA, 24, SHAFT_TOP, brickWall(s), face(1), face(R));
  // Stone machicolated crown, its merlons, then the open belfry and its cusp.
  const slab = machicolation(p, MANGIA, SHAFT_TOP, 14, 0.07, c.ashlar);
  const crownZ = SHAFT_TOP;
  swallowtailCrown(p, ...slab, crownZ, 'back', { ...merlons(s), color: c.ashlar, cap: shade(c.ashlar, 1.08) });
  const bell: Block = [MANGIA[0] + 0.1, MANGIA[1] + 0.1, MANGIA[2] - 0.1, MANGIA[3] - 0.1];
  const o = { wall: { color: c.ashlar, detail: 'stone' as const }, trim: shade(c.ashlar, 0.9), bays: [1, 1] as const, pier: 0.05, band: 5 };
  loggia(p, bell, crownZ, crownZ + 30, 'back', o);
  const [bx, by] = p.p(0.62, 0.84, crownZ + 22);
  ctx.fillStyle = '#7a6230';
  ctx.beginPath();
  ctx.arc(bx, by, 4.5, Math.PI, 0);
  ctx.lineTo(bx + 5, by + 5);
  ctx.lineTo(bx - 5, by + 5);
  ctx.fill();
  loggia(p, bell, crownZ, crownZ + 30, 'front', o);
  const apex = lowHip(p, s, bell, crownZ + 30, 26 / s.roof.pitch, c.ashlar, 0.04);
  swallowtailCrown(p, ...slab, crownZ, 'front', { ...merlons(s), color: c.ashlar, cap: shade(c.ashlar, 1.08) });
  ctx.fillStyle = '#c99b34';
  ctx.fillRect(apex[0] - 0.8, apex[1] - 12, 1.6, 12);
  ctx.beginPath();
  ctx.arc(apex[0], apex[1] - 13, 2.4, 0, Math.PI * 2);
  ctx.fill();
  p.flag((slab[0] + slab[2]) / 2 + 0.12, slab[1] + 0.06, crownZ + 4, 22, team);
}

function paintPalazzo(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  // The Campo: herringbone brick in travertine strips.
  p.ground(0.05, 0.05, 2.95, 2.95, 0xb57a58);
  const ctx = p.ctx;
  ctx.strokeStyle = css(c.ashlar, 0.85);
  ctx.lineWidth = 1.6;
  for (const t of [0.3, 0.7, 1.1, 1.5]) {
    const a = p.p(0.6 + t, 1.5, 0);
    const b = p.p(0.1 + t * 1.6, 2.95, 0);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  mangia(p, s, team);
  palace(p, s, team);
  // Chapel loggia at the tower's foot.
  const chapel: Block = [0.3, 1.12, 0.92, 1.62];
  const o = { wall: { color: c.ashlar, detail: 'stone' as const }, trim: c.trim, bays: [2, 2] as const, pier: 0.045 };
  loggia(p, chapel, 0, 34, 'back', o);
  loggia(p, chapel, 0, 34, 'front', o);
  lowHip(p, s, chapel, 34, 16, c.roof, 0.05);
  pool(p, 1.35, 2.15, 2.35, 2.5, 0, c.ashlar);
  lantern(p, 1.2, 1.42, 30, 1.2, 1.9);
  lantern(p, 2.4, 1.42, 30, 2.4, 1.9);
}

/** The Italian age-2 town centre: the Palazzo Pubblico and the Torre del Mangia. */
export function palazzoPubblico(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 300, paint: (p, team) => paintPalazzo(p, s, team) };
}
