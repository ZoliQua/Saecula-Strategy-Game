import { TOWER_PLATFORM_Z } from '../../../../config/visual';
import { HW, type IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { crest, R } from '../facade';
import { needleSpire } from '../kits/needleSpire';
import { chimney, torch } from '../parts';
import { finial, helm } from '../roofs';
import type { ArchStyle } from '../style';
import { styledGable } from '../styledRoofs';
import { archer } from '../towerParts';
import type { BuildingArt } from '../types';
import type { Block } from './biskupinParts';
import { brickBlock, buttressRight, cornerPinnacles, crownRing, diaper, lancet, stringCourse } from './krakowParts';

/*
 * Kraków brick Gothic (Polish age 2). The town centre is St Mary's on
 * the market square: a steep-roofed brick basilica whose west front
 * carries two uneven towers — the taller (Hejnalica) under a spire helm
 * ringed by eight pinnacle turrets and girt with a gilded crown, the
 * lower under a Renaissance lantern helm. Houses are diapered brick
 * tenements under steep plain tiles with plain (never stepped) gables;
 * the tower is a brick belfry with corner pinnacles round its spire.
 */

const NAVE: Block = [0.85, 0.2, 1.95, 2.1];
const NAVE_WALL = 74;
const TALL: Block = [0.5, 2.05, 1.12, 2.67];
const LOW: Block = [1.62, 2.1, 2.16, 2.64];

function nave(p: IsoPainter, s: ArchStyle): void {
  const c = s.palette;
  const [u0, v0, u1, v1] = NAVE;
  brickBlock(p, s, NAVE, 0, NAVE_WALL, undefined, (w) => {
    const n = 5;
    for (let i = 0; i < n; i++) lancet(p, s, (w / n) * (i + 0.5) - 4, -16, 8, 40, R);
  }, [12]);
  for (let i = 0; i <= 5; i++) buttressRight(p, s, u1, v0 + ((v1 - v0) * i) / 5, NAVE_WALL - 6);
  p.material = 'tile';
  styledGable(p, s, u0, v0, u1, v1, NAVE_WALL, 62, c.roof, c.brick, 'v', 0.1, (w, rise) => diaper(p.ctx, w, rise, c.brick, 1));
  // A slender ridge turret (sygnaturka) over the crossing.
  const z = NAVE_WALL + 62 * s.roof.pitch;
  helm(p, (u0 + u1) / 2, 0.9, z - 8, [[0, 0.06], [16, 0.06], [18, 0.075], [22, 0.075], [44, 0.01]], c.metal);
}

/** The taller tower: shaft, a white-cornice gallery, pinnacle turrets, the spire helm and its gilded crown. */
function tallTower(p: IsoPainter, s: ArchStyle, team: number): number {
  const c = s.palette;
  const shaft = 196;
  const [u0, v0, u1, v1] = TALL;
  brickBlock(p, s, TALL, 0, shaft, (w) => {
    lancet(p, s, w / 2 - 4, -shaft + 30, 8, 24, 1);
    lancet(p, s, w / 2 - 4, -shaft + 78, 8, 22, 1, false);
    p.ctx.fillStyle = '#20140c';
    p.ctx.fillRect(w / 2 - 1.5, -60, 3, 12);
  }, (w) => {
    lancet(p, s, w / 2 - 4, -shaft + 30, 8, 24, R);
    lancet(p, s, w / 2 - 4, -shaft + 78, 8, 22, R, false);
  }, [44, 100, 150, shaft - 4]);
  const top: Block = [u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03];
  p.box(top[0], top[1], top[2], top[3], shaft, shaft + 5, { color: c.trim }, c.trim);
  const uc = (u0 + u1) / 2;
  const vc = (v0 + v1) / 2;
  const inset: Block = [top[0] + 0.05, top[1] + 0.05, top[2] - 0.05, top[3] - 0.05];
  cornerPinnacles(p, s, inset, shaft + 5, 38, 0.06, 'back');
  const rise = 104;
  needleSpire(p, uc, vc, 0.22, shaft + 5, rise, c.metal, 'copper', 8);
  cornerPinnacles(p, s, inset, shaft + 5, 38, 0.06, 'front');
  // The gilded crown girding the spire a third of the way up.
  const k = 0.42;
  const [x, y] = p.p(uc, vc, shaft + 5 + rise * k);
  crownRing(p.ctx, x, y, 0.22 * (1 - k) * Math.SQRT2 * HW + 3);
  finial(p, uc, vc, shaft + 5 + rise, 12, false);
  p.flag(uc, vc, shaft + 5 + rise + 8, 16, team, true);
  return shaft + 5 + rise;
}

/** The lower tower under a Renaissance lantern helm. */
function lowTower(p: IsoPainter, s: ArchStyle): void {
  const c = s.palette;
  const shaft = 146;
  const [u0, v0, u1, v1] = LOW;
  brickBlock(p, s, LOW, 0, shaft, (w) => {
    lancet(p, s, w / 2 - 4, -shaft + 26, 8, 22, 1);
    lancet(p, s, w / 2 - 3, -shaft + 70, 6, 18, 1, false);
  }, (w) => lancet(p, s, w / 2 - 4, -shaft + 26, 8, 22, R), [44, 100, shaft - 4]);
  p.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, shaft, shaft + 4, { color: c.trim }, c.trim);
  const uc = (u0 + u1) / 2;
  const vc = (v0 + v1) / 2;
  helm(p, uc, vc, shaft + 4, [[0, 0.24], [6, 0.24], [20, 0.18], [30, 0.08], [34, 0.07], [44, 0.07], [46, 0.09], [54, 0.04], [74, 0.005]], c.metal);
  finial(p, uc, vc, shaft + 78, 10, false);
}

function paintChurch(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  // Market-square paving.
  p.ground(0.04, 0.04, 2.96, 2.96, 0xb5aa96);
  nave(p, s);
  tallTower(p, s, team);
  // West porch between the towers: a white portal under a small gable.
  const porch: Block = [1.12, 2.2, 1.62, 2.82];
  brickBlock(p, s, porch, 0, 42, (w) => {
    lancet(p, s, w / 2 - 9, -2, 18, 34, 1, false);
    p.door(w / 2 - 7, 14, 26, c.doors.main);
  }, undefined, []);
  p.material = 'tile';
  styledGable(p, s, porch[0], porch[1], porch[2], porch[3], 42, 22, c.roof, c.brick, 'v', 0.06, (w, rise) => {
    p.ctx.fillStyle = css(shade(c.trim, 1));
    p.ctx.fillRect(w / 2 - 0.8, -rise + 2, 1.6, rise - 4);
    crest(p.ctx, s, w / 2, -rise * 0.4, 5, team);
  });
  lowTower(p, s);
  // A white crest over the market and torches by the porch.
  p.leftFace(LOW[0], LOW[2], LOW[3], 0, (w) => crest(p.ctx, s, w / 2, -70, 8, team), 146);
  torch(p, 1.16, 2.86, 26, 1.1, 3.1);
  torch(p, 1.6, 2.86, 26, 1.7, 3.1);
}

function paintHouse(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.08, 0.08, 1.92, 1.92, 0xb0a48e);
  const b: Block = [0.28, 0.42, 1.74, 1.56];
  const wall = 64;
  brickBlock(p, s, b, 0, wall, (w) => {
    // Ground floor: a white stone portal and a shop window; two storeys of white-framed lights.
    lancet(p, s, w * 0.18, -2, 14, 26, 1, false);
    p.door(w * 0.18, 14, 22, c.doors.main);
    p.window(w * 0.62, -20, 12, 12);
    for (const x of [0.12, 0.42, 0.72]) {
      p.ctx.fillStyle = css(shade(c.trim, 1));
      p.ctx.fillRect(w * x - 1.5, -40, 13, 15);
      p.window(w * x, -38, 10, 12);
      p.ctx.fillStyle = css(shade(c.trim, 1));
      p.ctx.fillRect(w * x - 1.5, -57, 13, 13);
      p.window(w * x, -55, 10, 10);
    }
  }, (w) => {
    p.ctx.fillStyle = css(shade(c.trim, R));
    p.ctx.fillRect(w * 0.42 - 1.5, -40, 13, 15);
    p.window(w * 0.42, -38, 10, 12);
  }, [24, 44]);
  const vm = (b[1] + b[3]) / 2;
  chimney(p, 0.5, vm - 0.24, 0.66, vm - 0.1, wall, wall + 40 * s.roof.pitch + 8, { color: c.brick, detail: 'brick' });
  p.material = 'tile';
  styledGable(p, s, b[0], b[1], b[2], b[3], wall, 40, c.roof, c.brick, 'u', 0.1, (w, rise) => {
    diaper(p.ctx, w, rise, c.brick, R);
    // A plain gable with white coping and a loft hatch.
    p.ctx.fillStyle = '#24160d';
    p.ctx.fillRect(w / 2 - 4, -rise * 0.48, 8, 10);
    stringCourse(p.ctx, w, -2, c.trim, R);
  });
  p.addSmoke(0.58, vm - 0.17, wall + 40 * s.roof.pitch + 8);
  // A shop sign with the owner's colour.
  const [x, y] = p.p(1.0, b[3] + 0.02, 34);
  p.ctx.fillStyle = '#2a1c10';
  p.ctx.fillRect(x - 0.6, y - 1, 9, 1.4);
  p.ctx.fillStyle = css(team);
  p.ctx.fillRect(x + 3, y, 6, 8);
  p.flag(0.2, 1.84, 0, 40, team);
}

/** Brick belfry tower: diapered shaft, an open belfry stage with the archer, pinnacles round a square spire. */
function paintTower(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const z = TOWER_PLATFORM_Z[2];
  const b: Block = [0.2, 0.2, 0.8, 0.8];
  p.footShadow();
  brickBlock(p, s, b, 0, z, (w) => {
    p.door(w / 2 - 6, 12, 20, c.doors.main);
    lancet(p, s, w / 2 - 3, -z + 30, 6, 16, 1, false);
    lancet(p, s, w / 2 - 3, -z + 76, 6, 16, 1, false);
  }, (w) => lancet(p, s, w / 2 - 3, -z + 30, 6, 16, R, false), [40, z - 4]);
  p.ground(b[0], b[1], b[2], b[3], shade(c.trim, 0.9), z);
  // Belfry stage: brick corner piers, the archer between them.
  const pier = (u: number, v: number) => p.box(u, v, u + 0.12, v + 0.12, z, z + 32, { color: c.brick }, c.brick);
  pier(b[0], b[1]);
  pier(b[2] - 0.12, b[1]);
  pier(b[0], b[3] - 0.12);
  archer(p, 0.56, 0.44, z, team, 'kettle');
  pier(b[2] - 0.12, b[3] - 0.12);
  const top: Block = [b[0] - 0.03, b[1] - 0.03, b[2] + 0.03, b[3] + 0.03];
  p.box(top[0], top[1], top[2], top[3], z + 32, z + 40, { color: c.trim }, c.trim);
  const inset: Block = [top[0] + 0.05, top[1] + 0.05, top[2] - 0.05, top[3] - 0.05];
  cornerPinnacles(p, s, inset, z + 40, 30, 0.06, 'back');
  const rise = needleSpire(p, 0.5, 0.5, 0.25, z + 40, 92, c.roof, 'tile', 4);
  cornerPinnacles(p, s, inset, z + 40, 30, 0.06, 'front');
  finial(p, 0.5, 0.5, rise, 10, false);
  p.flag(0.5, 0.5, rise + 8, 14, team);
}

export function krakowChurch(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 340 + s.headroom, paint: (p, team) => paintChurch(p, s, team) };
}

export function krakowHouse(s: ArchStyle): BuildingArt {
  return { size: 2, maxHeight: 150 + s.headroom, paint: (p, team) => paintHouse(p, s, team) };
}

export function krakowTower(s: ArchStyle): BuildingArt {
  return { size: 1, maxHeight: 290 + s.headroom, paint: (p, team) => paintTower(p, s, team) };
}
