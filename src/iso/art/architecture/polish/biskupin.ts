import { TOWER_PLATFORM_Z } from '../../../../config/visual';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { crest } from '../facade';
import { logPile, post, torch } from '../parts';
import type { ArchStyle } from '../style';
import { archer } from '../towerParts';
import type { BuildingArt } from '../types';
import { breastwork, corduroy, cribRampart, oakWalls, reedHip, rowHouses, type Block } from './biskupinParts';

/*
 * Biskupin (Polish age 1): the Lusatian stilt settlement on its lake
 * island. Houses stand in long terraces under one reed roof, door after
 * door along log corduroy streets; the town centre is the gate tower in
 * the box rampart of earth-filled oak cribs, with a terrace behind it;
 * the watchtower is a crib-built lookout.
 */

const ROW: Block = [0.14, 0.3, 1.86, 1.22];

function paintHouse(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.06, 0.06, 1.94, 1.94, 0x8a7a5a);
  const ridge = rowHouses(p, s, ROW, 3, 26, 50);
  p.addSmoke(0.5, 0.76, ridge - 4);
  corduroy(p, s, [0.06, 1.36, 1.94, 1.86], 'u');
  logPile(p, 1.62, 1.6, 5, shade(c.darkWood, 0.95), 0xd9b88a);
  // A drying rack of reeds and a pot by the first door.
  post(p, 0.3, 1.5, 0, 22, 2, c.timber);
  post(p, 0.7, 1.5, 0, 22, 2, c.timber);
  const [ax, ay] = p.p(0.3, 1.5, 20);
  const [bx, by] = p.p(0.7, 1.5, 20);
  p.ctx.strokeStyle = css(shade(c.thatch, 0.9));
  p.ctx.lineWidth = 3;
  p.ctx.beginPath();
  p.ctx.moveTo(ax, ay);
  p.ctx.lineTo(bx, by);
  p.ctx.stroke();
  p.flag(1.9, 0.5, 0, 34, team);
}

/** The gate tower: crib base with the gate passage, an oak chamber and an open fighting gallery under a reed hip. */
function gateTower(p: IsoPainter, s: ArchStyle, b: Block, team: number): number {
  const c = s.palette;
  const [u0, v0, u1, v1] = b;
  cribRampart(p, s, b, 50);
  p.leftFace(u0, u1, v1, 0, (w) => {
    // Gate passage with a plank-lined arch of logs.
    const gw = w * 0.5;
    p.ctx.fillStyle = css(shade(c.timber, 0.8));
    p.ctx.fillRect(w / 2 - gw / 2 - 3, -38, gw + 6, 38);
    p.ctx.fillStyle = '#140e08';
    p.ctx.fillRect(w / 2 - gw / 2, -32, gw, 32);
    p.ctx.fillStyle = css(shade(c.doors.gate, 1));
    p.ctx.fillRect(w / 2 - gw / 2 + 1, -28, gw * 0.42, 28);
    p.ctx.fillStyle = css(shade(c.doors.gate, 0.85));
    p.ctx.fillRect(w / 2 + gw * 0.08, -28, gw * 0.42, 28);
  }, 50);
  oakWalls(p, s, [u0 + 0.06, v0 + 0.06, u1 - 0.06, v1 - 0.06], 50, 124);
  p.leftFace(u0 + 0.06, u1 - 0.06, v1 - 0.06, 50, (w) => {
    crest(p.ctx, s, w / 2, -22, 7, team);
    p.window(w * 0.16, -28, 6, 6);
    p.window(w * 0.76, -28, 6, 6);
    p.window(w / 2 - 3, -58, 6, 6);
  }, 74);
  p.rightFace(v0 + 0.06, v1 - 0.06, u1 - 0.06, 50, (w) => p.window(w / 2 - 3, -28, 6, 6), 74);
  // Open fighting gallery: a plank floor overhanging on all sides, posts and a stake breastwork.
  const g: Block = [u0 - 0.05, v0 - 0.05, u1 + 0.05, v1 + 0.05];
  p.box(g[0], g[1], g[2], g[3], 124, 128, { color: c.planks, detail: 'planks' }, c.planks);
  const roofZ = 154;
  for (const [u, v] of [[g[0] + 0.04, g[1] + 0.04], [g[2] - 0.04, g[1] + 0.04], [g[0] + 0.04, g[3] - 0.04]] as const) post(p, u, v, 128, roofZ, 2.6, c.timber);
  breastwork(p, s, g[0], g[3], g[2], g[3], 128, 12);
  breastwork(p, s, g[2], g[1], g[2], g[3], 128, 12);
  post(p, g[2] - 0.04, g[3] - 0.04, 128, roofZ, 2.6, c.timber);
  return reedHip(p, s, [g[0] - 0.04, g[1] - 0.04, g[2] + 0.04, g[3] + 0.04], roofZ, 62, 0.1);
}

function paintTownCentre(p: IsoPainter, s: ArchStyle, team: number): void {
  p.footShadow();
  p.ground(0.04, 0.04, 2.96, 2.96, 0x8a7a5a);
  // Two terraces behind the rampart, along the ring street.
  // The far terrace's lights hide behind the near one's roof: only its end dwelling shows one.
  rowHouses(p, s, [0.14, 0.1, 2.4, 0.78], 4, 24, 40, (i) => i === 3);
  corduroy(p, s, [0.1, 0.86, 2.44, 1.26], 'u');
  const ridge = rowHouses(p, s, [0.14, 1.32, 2.0, 2.0], 3, 24, 40, (i) => i < 2);
  p.addSmoke(0.6, 1.66, ridge - 4);
  corduroy(p, s, [2.04, 0.86, 2.46, 2.46], 'v');
  // Box rampart: the right flank, then the front with the gate tower in it.
  const H = 34;
  cribRampart(p, s, [2.5, 0.04, 2.96, 2.48], H);
  breastwork(p, s, 2.94, 0.06, 2.94, 2.46, H, 12);
  cribRampart(p, s, [0.04, 2.48, 1.1, 2.96], H);
  breastwork(p, s, 0.06, 2.94, 1.08, 2.94, H, 12);
  const top = gateTower(p, s, [1.1, 2.34, 1.9, 2.96], team);
  cribRampart(p, s, [1.9, 2.48, 2.96, 2.96], H);
  breastwork(p, s, 1.92, 2.94, 2.94, 2.94, H, 12);
  p.flag(1.5, 2.65, top - 6, 22, team, true);
  // Torches either side of the gate.
  torch(p, 1.08, 2.97, 26, 1.0, 3.2);
  torch(p, 1.92, 2.97, 26, 2.0, 3.2);
}

/** Crib-built watchtower: earth-filled crib foot, an oak shaft, and an open lookout under a reed hip. */
function paintTower(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const z = TOWER_PLATFORM_Z[1];
  p.footShadow();
  cribRampart(p, s, [0.14, 0.14, 0.86, 0.86], 30);
  oakWalls(p, s, [0.22, 0.22, 0.78, 0.78], 30, z - 10);
  p.leftFace(0.22, 0.78, 0.78, 30, (w, h) => {
    p.ctx.fillStyle = '#18120d';
    p.ctx.fillRect(w / 2 - 1.5, -h + 14, 3, 11);
    p.ctx.fillRect(w / 2 - 1.5, -h * 0.45, 3, 11);
  }, z - 40);
  p.rightFace(0.22, 0.78, 0.78, 30, (w, h) => {
    p.ctx.fillStyle = '#140e09';
    p.ctx.fillRect(w / 2 - 1.5, -h + 14, 3, 11);
  }, z - 40);
  const g: Block = [0.12, 0.12, 0.88, 0.88];
  p.box(g[0], g[1], g[2], g[3], z - 10, z, { color: c.planks, detail: 'planks' }, c.planks);
  const roofZ = z + 32;
  for (const [u, v] of [[g[0] + 0.04, g[1] + 0.04], [g[2] - 0.04, g[1] + 0.04], [g[0] + 0.04, g[3] - 0.04]] as const) post(p, u, v, z, roofZ, 2.4, c.timber);
  archer(p, 0.58, 0.42, z, team, 'kettle');
  breastwork(p, s, g[0], g[3], g[2], g[3], z, 11);
  breastwork(p, s, g[2], g[1], g[2], g[3], z, 11);
  post(p, g[2] - 0.04, g[3] - 0.04, z, roofZ, 2.4, c.timber);
  const top = reedHip(p, s, [0.06, 0.06, 0.94, 0.94], roofZ, 34, 0.06);
  p.flag(0.5, 0.5, top - 2, 18, team);
}

export function biskupinHouse(s: ArchStyle): BuildingArt {
  return { size: 2, maxHeight: 110, paint: (p, team) => paintHouse(p, s, team) };
}

export function biskupinGate(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 250, paint: (p, team) => paintTownCentre(p, s, team) };
}

export function biskupinTower(s: ArchStyle): BuildingArt {
  return { size: 1, maxHeight: 220, paint: (p, team) => paintTower(p, s, team) };
}
