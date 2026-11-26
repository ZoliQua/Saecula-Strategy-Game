import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { crest, R } from '../facade';
import { needleSpire } from '../kits/needleSpire';
import { strawButt, torch } from '../parts';
import { finial } from '../roofs';
import type { ArchStyle } from '../style';
import { styledGable } from '../styledRoofs';
import type { BuildingArt } from '../types';
import type { Block } from './biskupinParts';
import { brickBlock, buttressLeft, cornerPinnacles, diaper, lancet } from './krakowParts';

/*
 * Kraków's military buildings (Polish age 2): long diapered brick halls
 * under steep plain-tile roofs with white-capped buttresses, each
 * marked by a slender brick turret whose spire is ringed by pinnacles
 * (the town's skyline repeated): the barracks' arsenal with its gate,
 * the stable's hall of arched stalls, the archery range's butts before
 * a small brick shooting house.
 */

/** A slender square brick turret at b, rising to `shaft`, under a spire ringed by four pinnacles; returns the apex. */
function spireTurret(p: IsoPainter, s: ArchStyle, b: Block, shaft: number, rise: number, team: number): number {
  const c = s.palette;
  brickBlock(p, s, b, 0, shaft, (w) => lancet(p, s, w / 2 - 2.5, -shaft + 22, 5, 12, 1, false), (w) => lancet(p, s, w / 2 - 2.5, -shaft + 22, 5, 12, R, false), [shaft - 3]);
  const top: Block = [b[0] - 0.02, b[1] - 0.02, b[2] + 0.02, b[3] + 0.02];
  p.box(top[0], top[1], top[2], top[3], shaft, shaft + 4, { color: c.trim }, c.trim);
  const inset: Block = [top[0] + 0.03, top[1] + 0.03, top[2] - 0.03, top[3] - 0.03];
  const uc = (b[0] + b[2]) / 2;
  const vc = (b[1] + b[3]) / 2;
  cornerPinnacles(p, s, inset, shaft + 4, 22, 0.04, 'back');
  const apex = needleSpire(p, uc, vc, (b[2] - b[0]) * 0.42, shaft + 4, rise, c.metal, 'copper', 8);
  cornerPinnacles(p, s, inset, shaft + 4, 22, 0.04, 'front');
  finial(p, uc, vc, apex, 8, false);
  p.flag(uc, vc, apex + 6, 14, team);
  return apex;
}

/** A long brick hall along u: walls to `wall`, buttresses on the +v face, a steep plain-tile gable. */
function hall(p: IsoPainter, s: ArchStyle, b: Block, wall: number, rise: number, left: (w: number, h: number) => void, right?: (w: number, h: number) => void): void {
  const c = s.palette;
  brickBlock(p, s, b, 0, wall, left, right, [14]);
  const n = Math.max(3, Math.round((b[2] - b[0]) / 0.5));
  for (let i = 1; i < n; i++) buttressLeft(p, s, b[0] + ((b[2] - b[0]) * i) / n, b[3], wall - 4);
  p.material = 'tile';
  styledGable(p, s, b[0], b[1], b[2], b[3], wall, rise, c.roof, c.brick, 'u', 0.08, (w, r) => diaper(p.ctx, w, r, c.brick, R));
}

function paintBarracks(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0xa89c86);
  const b: Block = [0.3, 0.3, 2.7, 1.55];
  hall(p, s, b, 58, 56, (w) => {
    const n = 5;
    for (let i = 0; i < n; i++) {
      const x = (w / n) * (i + 0.5);
      if (i === 2) crest(p.ctx, s, x, -36, 8, team);
      else lancet(p, s, x - 4, -22, 8, 22, 1);
    }
  }, (w) => {
    // The arsenal gate in the gable end.
    lancet(p, s, w / 2 - 12, -2, 24, 34, R, false);
    p.door(w / 2 - 10, 20, 26, c.doors.gate);
  });
  // Drill yard with a brick wall and the turret at its corner.
  p.ground(0.4, 1.7, 2.6, 2.75, 0xb7aa90, 0.5);
  brickBlock(p, s, [0.85, 2.82, 2.9, 2.94], 0, 18, undefined, undefined, [16]);
  brickBlock(p, s, [2.78, 1.7, 2.9, 2.82], 0, 18, undefined, undefined, [16]);
  spireTurret(p, s, [0.2, 2.3, 0.62, 2.72], 104, 62, team);
  torch(p, 2.7, 0.75, 30, 2.95, 0.75);
  torch(p, 2.7, 1.1, 30, 2.95, 1.1);
}

function paintStable(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0xa8986e);
  const b: Block = [0.3, 0.35, 2.7, 1.85];
  hall(p, s, b, 46, 58, (w) => {
    const n = 5;
    for (let i = 0; i < n; i++) {
      const x = (w / n) * i + 8;
      const sw = w / n - 16;
      lancet(p, s, x, -2, sw, 30, 1, false);
      p.ctx.fillStyle = css(c.doors.gate);
      p.ctx.fillRect(x, -15, sw, 15);
    }
  }, (w) => {
    // Hay-loft hatch in the gable end.
    p.ctx.fillStyle = '#2a1a10';
    p.ctx.fillRect(w / 2 - 8, -40, 16, 14);
    p.ctx.fillStyle = 'rgba(230,190,90,.85)';
    p.ctx.fillRect(w / 2 - 6, -30, 12, 4);
  });
  // A ridge turret over the hall, with the owner's colour.
  const ridge = 46 + 58 * s.roof.pitch;
  const apex = needleSpire(p, 1.5, 1.1, 0.07, ridge - 10, 46, c.metal, 'copper', 8);
  p.flag(1.5, 1.1, apex + 2, 14, team);
  // Paddock rails and a water trough.
  const ctx = p.ctx;
  ctx.strokeStyle = css(shade(c.timber, 1.1));
  ctx.lineWidth = 2;
  for (const z of [8, 15]) {
    const a = p.p(0.3, 2.85, z);
    const m = p.p(2.85, 2.85, z);
    const e = p.p(2.85, 2.05, z);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(m[0], m[1]);
    ctx.lineTo(e[0], e[1]);
    ctx.stroke();
  }
  p.box(1.0, 2.2, 1.6, 2.36, 0, 7, { color: c.planks, detail: 'planks' }, 0x4f7f9a);
}

function paintRange(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0x8fa06a);
  const b: Block = [0.3, 0.3, 1.7, 1.2];
  hall(p, s, b, 40, 44, (w) => {
    lancet(p, s, w * 0.16 - 4, -12, 8, 20, 1);
    p.door(w * 0.62, 14, 24, c.doors.main);
  }, (w) => lancet(p, s, w / 2 - 4, -12, 8, 20, R, false));
  spireTurret(p, s, [1.78, 0.32, 2.12, 0.66], 86, 50, team);
  // Shooting lane: butts along the far side, a white line to shoot from.
  for (const [u, v] of [[2.5, 1.3], [2.5, 1.9], [2.5, 2.5]] as const) strawButt(p, u, v);
  const a = p.p(0.6, 1.5, 0.5);
  const e = p.p(0.6, 2.8, 0.5);
  p.ctx.strokeStyle = css(shade(c.trim, 0.95), 0.9);
  p.ctx.lineWidth = 1.6;
  p.ctx.beginPath();
  p.ctx.moveTo(a[0], a[1]);
  p.ctx.lineTo(e[0], e[1]);
  p.ctx.stroke();
}

export function krakowBarracks(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 200 + s.headroom, paint: (p, team) => paintBarracks(p, s, team) };
}

export function krakowStable(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 190 + s.headroom, paint: (p, team) => paintStable(p, s, team) };
}

export function krakowRange(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 170 + s.headroom, paint: (p, team) => paintRange(p, s, team) };
}
