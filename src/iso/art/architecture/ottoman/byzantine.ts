import { TOWER_PLATFORM_Z } from '../../../../config/visual';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { crest, R } from '../facade';
import { leadDome } from '../kits/leadDome';
import { lowHip } from '../kits/lowHip';
import { column, torch } from '../parts';
import type { ArchStyle } from '../style';
import { archer, parapet } from '../towerParts';
import type { BuildingArt } from '../types';
import { bandedBlock, roundPath, terrace, type Block } from './ottomanParts';

/*
 * Romano-Byzantine Anatolia (Ottoman age 1). Every hall is banded opus
 * mixtum — red brick courses laced through pale limestone — and the
 * halls carry low saucer domes in terracotta tile on windowed drums.
 * The town centre is a domed cross-in-square church-hall with a
 * colonnaded narthex; the house is a banded two-storey block under a
 * low tiled hip; the tower is a square Theodosian wall tower; barracks
 * and stable are banded halls with a domed gatehouse and arcades.
 */

/** Round-headed opening in a brick surround (face-local), lit or dark. */
function arched(p: IsoPainter, s: ArchStyle, x: number, y: number, w: number, h: number, light: number, lit = true): void {
  const ctx = p.ctx;
  ctx.fillStyle = css(shade(s.palette.brick, light * 0.9));
  roundPath(ctx, x - 1.8, y, w + 3.6, h + 1.8);
  ctx.fill();
  if (lit) p.window(x, y - h, w, h, true);
  else {
    ctx.fillStyle = '#21160e';
    roundPath(ctx, x, y, w, h);
    ctx.fill();
  }
}

function paintChurch(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.04, 0.04, 2.96, 2.96, 0xc2b597);
  // Apse at the back, then the hall with a flat tiled terrace.
  const hall: Block = [0.4, 0.4, 2.45, 2.3];
  const wall = 56;
  leadDome(p, 0.4, 1.35, 0.32, 0, c.brick, { rise: 0.5, seams: 0 });
  bandedBlock(p, s, hall, 0, wall, (w) => {
    for (const x of [0.12, 0.3, 0.7, 0.88]) arched(p, s, w * x - 4, -18, 8, 16, 1);
    for (const x of [0.22, 0.78]) arched(p, s, w * x - 3, -38, 6, 10, 1, false);
    arched(p, s, w / 2 - 10, -2, 20, 32, 1, false);
    p.door(w / 2 - 9, 18, 28, c.doors.main);
  }, (w) => {
    for (const x of [0.2, 0.5, 0.8]) arched(p, s, w * x - 4, -18, 8, 16, R);
  });
  terrace(p, hall, wall, c.roof, c.stone);
  // Small domes over the corner chapels, behind the core.
  leadDome(p, 0.65, 0.65, 0.17, wall, c.metal, { rise: 0.55, drum: 6, drumColor: c.stone, seams: 4 });
  leadDome(p, 2.2, 0.65, 0.17, wall, c.metal, { rise: 0.55, drum: 6, drumColor: c.stone, seams: 4 });
  // The cross-in-square core rising through the terrace.
  const core: Block = [0.83, 0.75, 2.02, 1.95];
  bandedBlock(p, s, core, wall, wall + 34, (w) => {
    for (const x of [0.2, 0.8]) arched(p, s, w * x - 3, -4, 6, 12, 1, false);
    crest(p.ctx, s, w / 2, -11, 6, team);
  }, (w) => arched(p, s, w / 2 - 3, -4, 6, 12, R, false));
  terrace(p, core, wall + 34, c.roof, c.stone);
  leadDome(p, 1.425, 1.35, 0.56, wall + 34, c.metal, { rise: 0.6, drum: 20, drumColor: c.stone, windows: 7, seams: 9 });
  // Narthex: a colonnade with a low lean-to roof along the front.
  for (const u of [0.55, 0.95, 1.35, 1.75, 2.15]) column(p, u, 2.62, 0, 34, 2.8, c.trim);
  p.box(0.4, 2.3, 2.45, 2.66, 34, 40, { color: c.stone }, c.stone);
  lowHip(p, s, [0.4, 2.3, 2.45, 2.66], 40, 10, c.roof, 0.05);
  torch(p, 0.45, 2.85, 26, 0.45, 3.1);
  torch(p, 2.4, 2.85, 26, 2.4, 3.1);
  p.flag(2.35, 0.55, wall + 4, 30, team, true);
}

function paintHouse(p: IsoPainter, s: ArchStyle, team: number): void {
  p.footShadow();
  p.ground(0.12, 0.12, 1.88, 1.88, 0xb8ab8e);
  const b: Block = [0.3, 0.4, 1.7, 1.6];
  const wall = 52;
  bandedBlock(p, s, b, 0, wall, (w) => {
    arched(p, s, w * 0.62, -2, 13, 24, 1, false);
    p.door(w * 0.62 + 0.5, 12, 20, shade(team, 0.75));
    arched(p, s, w * 0.18, -16, 9, 12, 1);
    for (const x of [0.16, 0.44, 0.72]) arched(p, s, w * x, -31, 8, 10, 1);
  }, (w) => {
    arched(p, s, w * 0.3, -16, 9, 12, R);
    arched(p, s, w * 0.6, -31, 8, 10, R);
  });
  lowHip(p, s, b, wall, 26);
  p.flag(0.24, 1.8, 0, 36, team);
}

function paintTower(p: IsoPainter, s: ArchStyle, team: number): void {
  const z = TOWER_PLATFORM_Z[1];
  const c = s.palette;
  p.footShadow();
  bandedBlock(p, s, [0.12, 0.12, 0.88, 0.88], 0, z, (w) => {
    arched(p, s, w / 2 - 6, -2, 12, 22, 1, false);
    p.door(w / 2 - 5, 10, 18, c.doors.main);
    arched(p, s, w / 2 - 3, -z + 40, 6, 14, 1, false);
    arched(p, s, w / 2 - 3, -z + 80, 6, 12, 1, false);
  }, (w) => arched(p, s, w / 2 - 3, -z + 40, 6, 14, R, false));
  const wall = { color: c.brick };
  p.box(0.08, 0.08, 0.92, 0.92, z - 5, z, { color: c.stone }, c.stone);
  parapet(p, 0.08, 0.08, 0.92, 0.92, z, wall, 'back');
  p.ground(0.08, 0.08, 0.92, 0.92, c.stone, z);
  archer(p, 0.6, 0.42, z, team, 'galea');
  parapet(p, 0.08, 0.08, 0.92, 0.92, z, wall, 'front');
  p.flag(0.16, 0.16, z + 16, 30, team);
}

function paintBarracks(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0xb3a68a);
  const hall: Block = [0.3, 0.3, 2.1, 1.9];
  bandedBlock(p, s, hall, 0, 50, () => {
    for (let i = 0; i < 5; i++) arched(p, s, 12 + i * 22, -18, 8, 14, 1);
  }, (w) => {
    for (const x of [0.25, 0.65]) arched(p, s, w * x, -18, 8, 14, R);
  });
  p.material = 'tile';
  lowHip(p, s, hall, 50, 22);
  // Domed gatehouse at the right end.
  const gate: Block = [2.05, 0.7, 2.8, 1.6];
  bandedBlock(p, s, gate, 0, 64, (w) => {
    p.ctx.fillStyle = css(team);
    p.ctx.fillRect(w / 2 - 5, -56, 10, 20);
  }, (w) => {
    arched(p, s, w / 2 - 12, -2, 24, 36, R, false);
    p.door(w / 2 - 11, 22, 32, c.doors.gate);
  });
  terrace(p, gate, 64, c.roof, c.stone);
  leadDome(p, 2.425, 1.15, 0.36, 64, c.metal, { rise: 0.62, drum: 14, drumColor: c.stone, windows: 4, seams: 6 });
  torch(p, 2.78, 0.75, 40, 3.0, 0.75);
  // Training yard posts.
  const ctx = p.ctx;
  for (const u of [0.7, 1.4]) {
    const [x, y] = p.p(u, 2.5, 0);
    ctx.fillStyle = '#6b4526';
    ctx.fillRect(x - 1.5, y - 24, 3, 24);
    ctx.fillRect(x - 8, y - 18, 16, 3);
  }
  p.flag(2.8, 2.8, 0, 40, team, true);
}

function paintStable(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0xb0a07a);
  const b: Block = [0.3, 0.3, 2.7, 1.85];
  bandedBlock(p, s, b, 0, 44, () => {
    for (let i = 0; i < 5; i++) {
      arched(p, s, 10 + i * 30, -2, 18, 30, 1, false);
      p.door(11 + i * 30, 16, 24, c.doors.gate);
    }
  });
  lowHip(p, s, b, 44, 22);
  // A small domed fountain house in the yard.
  bandedBlock(p, s, [2.05, 2.15, 2.55, 2.65], 0, 22);
  leadDome(p, 2.3, 2.4, 0.2, 22, c.metal, { rise: 0.55, seams: 4 });
  for (const u of [0.6, 1.0]) p.box(u, 2.25, u + 0.35, 2.6, 0, 14, { color: 0xd9b55a }, 0xe8c873);
  p.flag(0.3, 2.8, 0, 36, team);
}

function paintFarm(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  p.ground(0.05, 0.05, 1.95, 1.95, 0x7a5432);
  // Furrows with young wheat, in front of the granary.
  for (let i = 0; i < 7; i++) {
    const v = 0.8 + i * 0.16;
    const a = p.p(0.12, v, 0);
    const b = p.p(1.88, v, 0);
    ctx.strokeStyle = 'rgba(40,24,10,.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    for (let k = 0; k < 10; k++) {
      const [x, y] = p.p(0.2 + k * 0.17, v + 0.07, 0);
      ctx.strokeStyle = k % 2 ? '#c9b44c' : '#a3bb47';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 1.5, y - 6 - p.random() * 3);
      ctx.stroke();
    }
  }
  // A banded granary with a low tiled roof and a threshing floor.
  const g: Block = [0.15, 0.15, 0.85, 0.65];
  bandedBlock(p, s, g, 0, 26, (w) => arched(p, s, w / 2 - 5, -2, 10, 16, 1, false));
  lowHip(p, s, g, 26, 18);
  p.ground(1.05, 0.15, 1.8, 0.65, shade(c.stone, 0.95), 0.5);
  leadDome(p, 1.42, 0.4, 0.13, 0, 0xd9b55a, { rise: 0.9, seams: 0 });
  p.flag(1.9, 1.9, 0, 22, team);
}

export function byzantineFarm(s: ArchStyle): BuildingArt {
  return { size: 2, maxHeight: 70 + s.headroom, paint: (p, team) => paintFarm(p, s, team) };
}

export function byzantineChurch(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 190 + s.headroom, paint: (p, team) => paintChurch(p, s, team) };
}

export function byzantineHouse(s: ArchStyle): BuildingArt {
  return { size: 2, maxHeight: 110 + s.headroom, paint: (p, team) => paintHouse(p, s, team) };
}

export function byzantineTower(s: ArchStyle): BuildingArt {
  return { size: 1, maxHeight: 200 + s.headroom, paint: (p, team) => paintTower(p, s, team) };
}

export function byzantineBarracks(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 160 + s.headroom, paint: (p, team) => paintBarracks(p, s, team) };
}

export function byzantineStable(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 130 + s.headroom, paint: (p, team) => paintStable(p, s, team) };
}
