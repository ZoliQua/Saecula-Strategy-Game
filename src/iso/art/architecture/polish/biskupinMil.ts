import { ellipse } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { anvil, bowRack } from '../kits/workshopProps';
import { forgeLight, haystack, logPile, post, strawButt } from '../parts';
import type { ArchStyle } from '../style';
import { archer } from '../towerParts';
import type { BuildingArt } from '../types';
import { breastwork, corduroy, cribRampart, oakWalls, reedHip, reedRoof, rowHouses, type Block } from './biskupinParts';
import { shieldRack } from './workParts';

/*
 * Biskupin workshops (Polish age 1, M22): the barracks, archery range,
 * stable and smithy of the stilt settlement, which until M22 were the
 * shared medieval layouts under reed. Everything is split oak, reed
 * thatch, log corduroy and the earth-filled crib rampart:
 * - barracks: the warriors' terraces on their plank street, a drill
 *   yard with a rack of round team shields, and a crib-built lookout at
 *   the corner of the rampart;
 * - archery range: a long open reed shooting shed, straw butts backed
 *   by a stretch of crib rampart, and a bow rack;
 * - stable: a long log byre with wide stall doors under one reed roof, a
 *   tall granary on stilts at its corner, a staked paddock, hay and a
 *   hollow-log trough;
 * - smithy: a small oak workshop and a clay bloomery shaft glowing at
 *   its mouth, with charcoal, an anvil and a tub.
 * Sizes and height budgets are those of the medieval painters they replace.
 */

const EARTH = 0x8a7a5a;

/** Crib-built lookout at block b: crib foot to `foot`, an oak shaft, an open platform at `deck`, a reed hip; returns the apex. */
function lookout(p: IsoPainter, s: ArchStyle, b: Block, foot: number, deck: number, team: number): number {
  const c = s.palette;
  const [u0, v0, u1, v1] = b;
  cribRampart(p, s, b, foot);
  const shaft: Block = [u0 + 0.1, v0 + 0.1, u1 - 0.1, v1 - 0.1];
  oakWalls(p, s, shaft, foot, deck - 6);
  p.leftFace(shaft[0], shaft[2], shaft[3], foot, (w, h) => {
    p.ctx.fillStyle = '#18120d';
    p.ctx.fillRect(w / 2 - 1.5, -h + 10, 3, 10);
  }, deck - 6 - foot);
  const g: Block = [u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02];
  p.box(g[0], g[1], g[2], g[3], deck - 6, deck, { color: c.planks, detail: 'planks' }, c.planks);
  const roofZ = deck + 28;
  for (const [u, v] of [[g[0] + 0.04, g[1] + 0.04], [g[2] - 0.04, g[1] + 0.04], [g[0] + 0.04, g[3] - 0.04]] as const) post(p, u, v, deck, roofZ, 2.4, c.timber);
  archer(p, (u0 + u1) / 2 + 0.06, (v0 + v1) / 2 - 0.06, deck, team, 'kettle');
  breastwork(p, s, g[0], g[3], g[2], g[3], deck, 10);
  breastwork(p, s, g[2], g[1], g[2], g[3], deck, 10);
  post(p, g[2] - 0.04, g[3] - 0.04, deck, roofZ, 2.4, c.timber);
  return reedHip(p, s, [g[0] - 0.04, g[1] - 0.04, g[2] + 0.04, g[3] + 0.04], roofZ, 30, 0.06);
}

function paintBarracks(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.04, 0.04, 2.96, 2.96, EARTH);
  // The lookout at the back corner of the rampart, over the warriors' terrace.
  const top = lookout(p, s, [2.14, 0.12, 2.88, 0.86], 26, 84, team);
  p.flag(2.51, 0.49, top - 4, 18, team);
  const ridge = rowHouses(p, s, [0.18, 0.16, 2.04, 0.84], 3, 26, 46);
  p.addSmoke(0.7, 0.5, ridge - 4);
  corduroy(p, s, [0.1, 0.9, 2.44, 1.3], 'u');
  // A shorter terrace on the near side of the street.
  rowHouses(p, s, [0.18, 1.36, 1.46, 2.0], 2, 26, 42);
  corduroy(p, s, [0.1, 2.08, 1.5, 2.48], 'u');
  // The crib rampart down the right flank.
  cribRampart(p, s, [2.5, 0.9, 2.96, 2.96], 26);
  breastwork(p, s, 2.94, 0.92, 2.94, 2.94, 26, 11);
  // Drill yard: two pells and the rack of team shields.
  p.ground(1.56, 1.36, 2.44, 2.9, shade(EARTH, 1.08), 0.5);
  for (const [u, v] of [[1.8, 1.62], [2.2, 1.62]] as const) post(p, u, v, 0, 20, 3, shade(c.darkWood, 1.1));
  shieldRack(p, 1.7, 2.34, 2.3, c.timber, team);
  p.flag(0.24, 2.7, 0, 30, team);
}

function paintRange(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.04, 0.04, 2.96, 2.96, 0x8f9a66);
  // The long shooting shed: an oak back wall, its field side open on posts under one reed roof.
  const shed: Block = [0.22, 0.2, 1.22, 2.5];
  p.ground(shed[0], shed[1], shed[2] + 0.04, shed[3], shade(c.planks, 0.78), 0.5);
  oakWalls(p, s, [shed[0], shed[1], shed[0] + 0.18, shed[3]], 0, 26);
  oakWalls(p, s, [shed[0], shed[1], shed[2], shed[1] + 0.14], 0, 26);
  for (const v of [0.26, 0.82, 1.38, 1.94, 2.46]) post(p, shed[2] - 0.04, v, 0, 26, 3, c.timber);
  reedRoof(p, s, shed, 26, 40, 'v', 0.12);
  // Butts backed by a stretch of crib rampart (an earth backstop).
  cribRampart(p, s, [2.56, 0.12, 2.94, 2.6], 24);
  breastwork(p, s, 2.92, 0.14, 2.92, 2.58, 24, 10);
  for (const v of [0.6, 1.35, 2.1]) strawButt(p, 2.36, v);
  bowRack(p, 1.5, 0.5, 1.0, c.timber);
  p.flag(1.5, 2.72, 0, 34, team, true);
}

function paintStable(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  p.footShadow();
  p.ground(0.04, 0.04, 2.96, 2.96, 0x9a8c64);
  // The byre: a long log hall, wide stall doors along its street side.
  const b: Block = [0.25, 0.3, 2.6, 1.3];
  oakWalls(p, s, b, 0, 28);
  p.leftFace(b[0], b[2], b[3], 0, (w) => {
    const n = 5;
    const bay = w / n;
    for (let i = 0; i < n; i++) {
      const x = bay * i + bay * 0.2;
      const sw = bay * 0.6;
      ctx.fillStyle = '#1a120b';
      ctx.fillRect(x - 1.5, -24, sw + 3, 24);
      // Plank half-door, the dark stall above it.
      ctx.fillStyle = css(shade(c.doors.gate, 1.05));
      ctx.fillRect(x, -11, sw, 11);
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      for (let k = 4; k < sw; k += 4) ctx.fillRect(x + k, -11, 0.8, 11);
      if (i > 0) {
        ctx.fillStyle = css(shade(c.timber, 0.9));
        ctx.fillRect(bay * i - 1.5, -28, 3, 28);
      }
    }
  }, 28);
  p.rightFace(b[1], b[3], b[2], 0, (w) => {
    // Hay hatch with straw showing.
    ctx.fillStyle = '#21160d';
    ctx.fillRect(w / 2 - 7, -24, 14, 13);
    ctx.fillStyle = 'rgba(226,190,96,.9)';
    ctx.fillRect(w / 2 - 6, -14, 12, 3);
  }, 28);
  const ridge = reedRoof(p, s, b, 28, 50, 'u', 0.14);
  p.addVolumePoint(1.4, 0.8, ridge);
  // A tall granary on stilts at the left corner, its reed hip standing out of the byre's long outline.
  const g: Block = [0.2, 2.2, 0.8, 2.8];
  for (const [u, v] of [[g[0] + 0.04, g[1] + 0.04], [g[2] - 0.04, g[1] + 0.04], [g[0] + 0.04, g[3] - 0.04], [g[2] - 0.04, g[3] - 0.04]] as const) post(p, u, v, 0, 34, 3, c.timber);
  p.box(g[0], g[1], g[2], g[3], 34, 54, { color: c.board, detail: 'planks' });
  reedHip(p, s, [g[0] - 0.06, g[1] - 0.06, g[2] + 0.06, g[3] + 0.06], 54, 34, 0.06);
  logPile(p, 0.5, 1.72, 4, shade(c.darkWood, 0.95), 0xd9b88a);
  // The staked paddock with a hollow-log trough and hay.
  p.ground(1.0, 1.5, 2.86, 2.86, shade(0x9a8c64, 1.08), 0.5);
  breastwork(p, s, 1.0, 1.5, 1.0, 2.86, 0, 11);
  p.box(1.6, 1.76, 2.25, 1.9, 0, 7, { color: c.darkWood, detail: 'logs' }, 0x4f7f9a);
  haystack(p, 1.8, 2.42, 10, 18);
  haystack(p, 2.35, 2.5, 9, 15);
  breastwork(p, s, 1.0, 2.86, 2.86, 2.86, 0, 11);
  p.flag(2.88, 0.2, 0, 34, team);
}

/** A clay bloomery shaft at (u, v): a tapering clay stack `h` high with a glowing tuyère mouth. */
function bloomery(p: IsoPainter, u: number, v: number, h: number, r: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 0);
  const top = y - h;
  const rt = r * 0.55;
  const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
  g.addColorStop(0, '#b58a5c');
  g.addColorStop(0.55, '#97704a');
  g.addColorStop(1, '#6a4c32');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.quadraticCurveTo(x - r * 0.9, y - h * 0.55, x - rt, top);
  ctx.lineTo(x + rt, top);
  ctx.quadraticCurveTo(x + r * 0.9, y - h * 0.55, x + r, y);
  ctx.ellipse(x, y, r, r * 0.5, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  // Clay daub rings.
  ctx.strokeStyle = 'rgba(70,46,26,.35)';
  ctx.lineWidth = 0.8;
  for (let k = 1; k < 4; k++) {
    const yy = y - (h * k) / 4;
    const rr = r - ((r - rt) * k) / 4;
    ctx.beginPath();
    ctx.ellipse(x, yy, rr * 0.98, rr * 0.45, 0, 0.1, Math.PI - 0.1);
    ctx.stroke();
  }
  // A flared clay lip round the throat, so the top reads as a furnace.
  ellipse(ctx, x, top, rt * 1.35, rt * 0.62);
  ctx.fillStyle = '#a57b50';
  ctx.fill();
  ctx.strokeStyle = 'rgba(70,46,26,.6)';
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // The open throat, glowing.
  ellipse(ctx, x, top, rt, rt * 0.5);
  ctx.fillStyle = '#2a120a';
  ctx.fill();
  ellipse(ctx, x, top, rt * 0.6, rt * 0.3);
  ctx.fillStyle = 'rgba(255,150,60,.85)';
  ctx.fill();
  // Tapping arch at the foot.
  ctx.fillStyle = '#1a0d07';
  ctx.beginPath();
  ctx.moveTo(x - 5, y + 2);
  ctx.lineTo(x - 5, y - 6);
  ctx.arc(x, y - 6, 5, Math.PI, 0);
  ctx.lineTo(x + 5, y + 2);
  ctx.closePath();
  ctx.fill();
  const fg = ctx.createRadialGradient(x, y - 3, 0.5, x, y - 3, 8);
  fg.addColorStop(0, '#ffe08a');
  fg.addColorStop(0.5, 'rgba(255,140,50,.85)');
  fg.addColorStop(1, 'rgba(255,90,30,0)');
  ctx.fillStyle = fg;
  ctx.fillRect(x - 8, y - 11, 16, 13);
  p.addGlow(x, y - 3, 7);
  p.addVolumePoint(u, v, h);
  p.addSmoke(u, v, h);
}

function paintSmithy(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  p.footShadow();
  p.ground(0.08, 0.08, 1.92, 1.92, EARTH);
  // The oak workshop, its gable to the street.
  const b: Block = [0.22, 0.26, 1.2, 1.12];
  oakWalls(p, s, b, 0, 24);
  p.leftFace(b[0], b[2], b[3], 0, (w) => {
    ctx.fillStyle = '#1a120b';
    ctx.fillRect(w * 0.18 - 1, -20, 11, 20);
    p.door(w * 0.18, 9, 18, c.doors.work);
    p.window(w * 0.66, -14, 6, 5);
  }, 24);
  p.rightFace(b[1], b[3], b[2], 0, (w) => p.window(w * 0.5 - 3, -14, 6, 5, false), 24);
  reedRoof(p, s, b, 24, 38, 'v', 0.12);
  // The bloomery yard: charcoal, the clay shaft, the anvil.
  corduroy(p, s, [0.14, 1.22, 1.3, 1.5], 'u');
  const [mx, my] = p.p(1.68, 1.02, 0);
  ellipse(ctx, mx, my - 2, 13, 6);
  ctx.fillStyle = '#26211d';
  ctx.fill();
  bloomery(p, 1.75, 0.32, 88, 18);
  forgeLight(p, 1.78, 0.66);
  anvil(p, 1.45, 1.36, 0.3);
  logPile(p, 0.4, 1.66, 4, shade(c.darkWood, 0.95), 0xd9b88a);
  p.flag(1.84, 1.84, 0, 26, team);
}

export function biskupinBarracks(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 176 + s.headroom, paint: (p, team) => paintBarracks(p, s, team) };
}

export function biskupinRange(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 140 + s.headroom, paint: (p, team) => paintRange(p, s, team) };
}

export function biskupinStable(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 150 + s.headroom, paint: (p, team) => paintStable(p, s, team) };
}

export function biskupinSmithy(s: ArchStyle): BuildingArt {
  return { size: 2, maxHeight: 130 + s.headroom, paint: (p, team) => paintSmithy(p, s, team) };
}
