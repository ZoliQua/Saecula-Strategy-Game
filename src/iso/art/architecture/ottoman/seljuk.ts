import { TOWER_PLATFORM_Z } from '../../../../config/visual';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { crest, R } from '../facade';
import { lowHip } from '../kits/lowHip';
import { octPrism, tentRoof } from '../kits/tentRoof';
import { post, torch } from '../parts';
import type { ArchStyle } from '../style';
import { archer } from '../towerParts';
import type { BuildingArt } from '../types';
import { ashlarBlock, frieze, kumbet, pishtaqFace, pointedPath, terrace, type Block, type Face } from './ottomanParts';

/*
 * Seljuk Anatolia (Ottoman age 2): honey-coloured coursed ashlar with
 * turquoise tile friezes. The town centre is a caravanserai — four
 * ranges round a court, buttress drums at its corners, a tall carved
 * portal (pishtaq) projecting from the front range and a kümbet rising
 * from the court under its stone cone. The tower is a kümbet lookout:
 * an octagonal shaft whose archer stands under a conical cap on posts.
 * House, barracks and stable each front a portal; barracks and the
 * town centre add a kümbet, so the cones and portals repeat the age.
 */

/** Pointed window in a carved surround (face-local), lit or dark. */
export function lancet(p: IsoPainter, s: ArchStyle, x: number, y: number, w: number, h: number, light: number, lit = true): void {
  const ctx = p.ctx;
  ctx.fillStyle = css(shade(s.palette.ashlar, light * 1.15));
  pointedPath(ctx, x - 1.6, y + 1, w + 3.2, h + 2.6);
  ctx.fill();
  if (lit) p.window(x, y - h, w, h, true);
  else {
    ctx.fillStyle = '#21160e';
    pointedPath(ctx, x, y, w, h);
    ctx.fill();
  }
}

/** A portal block projecting from a +v face: pishtaq on its front, plain ashlar on its side, a frieze and crenels on top. */
export function portalLeft(p: IsoPainter, s: ArchStyle, b: Block, h: number, door = true): void {
  const [u0, v0, u1, v1] = b;
  const c = s.palette;
  p.box(u0, v0, u1, v1, 0, h, { color: c.ashlar }, c.ashlar);
  p.leftFace(u0, u1, v1, 0, (w, fh) => pishtaqFace(p, s, w, fh, 1, door), h);
  p.rightFace(v0, v1, u1, 0, (w, fh) => {
    pishtaqSide(p, s, w, fh, R);
  }, h);
}

/** A portal block projecting from a +u face. */
export function portalRight(p: IsoPainter, s: ArchStyle, b: Block, h: number, door = true): void {
  const [u0, v0, u1, v1] = b;
  const c = s.palette;
  p.box(u0, v0, u1, v1, 0, h, { color: c.ashlar }, c.ashlar);
  p.leftFace(u0, u1, v1, 0, (w, fh) => pishtaqSide(p, s, w, fh, 1), h);
  p.rightFace(v0, v1, u1, 0, (w, fh) => pishtaqFace(p, s, w, fh, R, door), h);
}

function pishtaqSide(p: IsoPainter, s: ArchStyle, w: number, h: number, light: number): void {
  const ctx = p.ctx;
  ctx.fillStyle = css(shade(s.palette.ashlar, light * 0.72), 0.45);
  for (let y = 7; y < h; y += 7) ctx.fillRect(0, -y, w, 0.7);
  frieze(ctx, w, -h + 6, s.palette.trim, light);
}

/** Ashlar range with a tile frieze, lit pointed windows on its faces. */
function range(p: IsoPainter, s: ArchStyle, b: Block, h: number, left?: Face, right?: Face): void {
  ashlarBlock(p, s, b, 0, h, left, right, s.palette.ashlar, s.palette.trim);
  terrace(p, b, h, s.palette.roof, s.palette.ashlar);
}

function paintCaravanserai(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const h = 44;
  p.footShadow();
  p.ground(0.04, 0.04, 2.96, 2.96, 0xc6ad80);
  // Back ranges, the court, the kümbet in it, then the front ranges.
  octPrism(p, 0.3, 0.3, 0.13, 0, h + 6, c.ashlar, 'stone');
  range(p, s, [0.3, 0.3, 2.7, 0.8], h);
  octPrism(p, 2.7, 0.3, 0.13, 0, h + 6, c.ashlar, 'stone');
  range(p, s, [0.3, 0.8, 0.8, 2.66], h);
  p.ground(0.8, 0.8, 2.2, 2.16, shade(c.ashlar, 0.86), 2);
  kumbet(p, s, 1.45, 1.35, 0.38, 0, 118, 76);
  range(p, s, [2.2, 0.8, 2.7, 2.66], h, undefined, (w) => {
    for (const x of [0.2, 0.5, 0.8]) lancet(p, s, w * x - 3, -22, 6, 12, R);
  });
  range(p, s, [0.8, 2.16, 2.2, 2.66], h, (w) => {
    lancet(p, s, w * 0.1 - 3, -22, 6, 12, 1, false);
    lancet(p, s, w * 0.9 - 3, -22, 6, 12, 1, false);
    crest(p.ctx, s, w * 0.1, -36, 5, team);
  });
  octPrism(p, 0.3, 2.66, 0.13, 0, h + 6, c.ashlar, 'stone');
  // The portal, projecting and towering over the front range.
  portalLeft(p, s, [1.12, 2.5, 1.88, 2.86], 78);
  terrace(p, [1.12, 2.5, 1.88, 2.86], 78, c.roof, c.ashlar);
  octPrism(p, 2.7, 2.66, 0.13, 0, h + 6, c.ashlar, 'stone');
  torch(p, 1.04, 2.92, 30, 1.04, 3.1);
  torch(p, 1.96, 2.92, 30, 1.96, 3.1);
  p.flag(1.5, 2.68, 78, 26, team, true);
}

function paintHouse(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.1, 0.1, 1.9, 1.9, 0xbca57c);
  const b: Block = [0.3, 0.35, 1.7, 1.55];
  range(p, s, b, 46, (w) => {
    lancet(p, s, w * 0.12, -18, 8, 13, 1);
    for (const x of [0.12, 0.72]) lancet(p, s, w * x, -33, 7, 10, 1);
  }, (w) => {
    lancet(p, s, w * 0.25, -18, 8, 13, R);
    lancet(p, s, w * 0.62, -34, 7, 10, R);
  });
  // A timber roof pavilion (çardak) on the terrace.
  const t = c.timber;
  for (const [u, v] of [[0.5, 0.55], [1.1, 0.55], [0.5, 1.0], [1.1, 1.0]] as const) post(p, u, v, 46, 66, 2.2, t);
  lowHip(p, s, [0.45, 0.5, 1.15, 1.05], 66, 16, c.roof, 0.08);
  portalLeft(p, s, [0.92, 1.45, 1.48, 1.72], 64);
  p.flag(0.22, 1.8, 0, 36, team);
}

function paintTower(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const z = TOWER_PLATFORM_Z[2];
  p.footShadow();
  octPrism(p, 0.5, 0.5, 0.36, 0, 14, shade(c.ashlar, 0.88), 'stone');
  octPrism(p, 0.5, 0.5, 0.32, 14, z, c.ashlar, 'stone', (w, h, light) => {
    const ctx = p.ctx;
    ctx.fillStyle = '#20160e';
    pointedPath(ctx, w / 2 - 2.5, -h + 40, 5, 12);
    ctx.fill();
    frieze(ctx, w, -h + 8, c.trim, light, 3);
    if (light > 0.95) p.door(w / 2 - 5, 10, 18, c.doors.main);
  });
  p.ground(0.14, 0.14, 0.86, 0.86, shade(c.ashlar, 0.9), z);
  const cap = 30;
  for (const [u, v] of [[0.22, 0.22], [0.78, 0.22], [0.22, 0.78]] as const) post(p, u, v, z, z + cap, 2.6, c.ashlar);
  archer(p, 0.56, 0.44, z, team, 'kettle');
  post(p, 0.78, 0.78, z, z + cap, 2.6, c.ashlar);
  tentRoof(p, 0.5, 0.5, 0.36, z + cap, 46, c.metal, { material: 'slate', eave: 0.04 });
  p.addVolumePoint(0.5, 0.5, z + cap + 46);
  p.flag(0.5, 0.5, z + cap + 46, 14, team);
}

function paintBarracks(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0xbca57c);
  const hall: Block = [0.3, 0.3, 2.5, 1.9];
  ashlarBlock(p, s, hall, 0, 48, () => {
    for (let i = 0; i < 5; i++) lancet(p, s, 14 + i * 26, -20, 7, 13, 1, false);
  }, undefined, undefined, c.trim);
  lowHip(p, s, hall, 48, 26);
  portalRight(p, s, [2.4, 0.75, 2.72, 1.45], 84);
  terrace(p, [2.4, 0.75, 2.72, 1.45], 84, c.roof, c.ashlar);
  p.rightFace(0.75, 1.45, 2.72, 0, (w) => crest(p.ctx, s, w / 2, -74, 5, team), 84);
  kumbet(p, s, 0.62, 2.35, 0.28, 0, 62, 48);
  torch(p, 2.75, 1.6, 40, 2.95, 1.6);
  p.flag(2.8, 2.8, 0, 40, team, true);
}

function paintStable(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0xb8a072);
  const b: Block = [0.3, 0.3, 2.7, 1.85];
  ashlarBlock(p, s, b, 0, 42, (w) => {
    for (const x of [0.06, 0.2, 0.68, 0.82]) {
      lancet(p, s, w * x, -2, 14, 26, 1, false);
      p.door(w * x + 1, 12, 20, c.doors.gate);
    }
  }, undefined, undefined, c.trim);
  lowHip(p, s, b, 42, 24);
  portalLeft(p, s, [1.2, 1.78, 1.8, 2.06], 76);
  terrace(p, [1.2, 1.78, 1.8, 2.06], 76, c.roof, c.ashlar);
  for (const u of [0.5, 0.9]) p.box(u, 2.3, u + 0.35, 2.65, 0, 14, { color: 0xd9b55a }, 0xe8c873);
  kumbet(p, s, 2.45, 2.4, 0.22, 0, 46, 38);
  p.flag(2.85, 2.0, 0, 36, team);
}

export function caravanserai(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 230 + s.headroom, paint: (p, team) => paintCaravanserai(p, s, team) };
}

export function seljukHouse(s: ArchStyle): BuildingArt {
  return { size: 2, maxHeight: 110 + s.headroom, paint: (p, team) => paintHouse(p, s, team) };
}

export function kumbetTower(s: ArchStyle): BuildingArt {
  return { size: 1, maxHeight: 250 + s.headroom, paint: (p, team) => paintTower(p, s, team) };
}

export function seljukBarracks(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 140 + s.headroom, paint: (p, team) => paintBarracks(p, s, team) };
}

export function seljukStable(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 120 + s.headroom, paint: (p, team) => paintStable(p, s, team) };
}
