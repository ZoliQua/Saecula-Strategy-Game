import { ellipse } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { crest, R } from '../facade';
import { leadDome } from '../kits/leadDome';
import { lowHip } from '../kits/lowHip';
import { chimney, column, forgeLight, forgeMouth, lantern, post, strawButt, target, torch } from '../parts';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';
import { arched } from './byzantine';
import { ashlarBlock, bandedBlock, kumbet, pointedPath, pointedWindow, terrace, type Block } from './ottomanParts';
import { lancet, portalLeft, portalRight } from './seljuk';

/*
 * Ottoman workshops (M22): the archery ranges and smithies of all three
 * ages and the Osmanlı stable, which until M22 were the shared Roman,
 * medieval and baroque layouts recoloured.
 * - Byzantine (age 1): banded opus mixtum halls under low tile, an
 *   arcaded shooting loggia with a domed corner bay; a smithy whose
 *   forge sits in a small domed house beside its brick stack.
 * - Seljuk (age 2): honey ashlar with turquoise friezes, a projecting
 *   pishtaq portal on the range and on the smithy, kümbet cones — the
 *   smithy's forge house is itself a kümbet.
 * - Osmanlı (age 3): pale limestone under wide-eaved low hips, lead
 *   domes and white trim: the range's open pointed arcade faces a domed
 *   kiosk and the record stones (nişan taşı) of the shooting field; the
 *   imperial stable has a domed gate pavilion, ridge cupolas and a
 *   fountain trough; the smithy's forge is a domed house.
 * Sizes and height budgets are those of the painters they replace.
 */

/** Anvil on its block with a quenching tub beside it, at (u, v). */
function anvil(p: IsoPainter, u: number, v: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 0);
  ctx.fillStyle = '#5a3b20';
  ctx.fillRect(x - 5, y - 8, 10, 8);
  ctx.fillStyle = '#34343a';
  ctx.fillRect(x - 9, y - 12, 18, 4.5);
  ctx.fillRect(x - 3, y - 9, 6, 2);
  const [bx, by] = p.p(u + 0.12, v + 0.36, 0);
  ctx.fillStyle = '#6b4526';
  ctx.fillRect(bx - 6, by - 9, 12, 9);
  ellipse(ctx, bx, by - 9, 6, 3);
  ctx.fillStyle = css(0x24303a);
  ctx.fill();
}

/** Rack of strung bows on two posts along v from (u, v0) to (u, v1). */
function bowRack(p: IsoPainter, u: number, v0: number, v1: number, wood: number): void {
  const ctx = p.ctx;
  post(p, u, v0, 0, 22, 2.2, wood);
  post(p, u, v1, 0, 22, 2.2, wood);
  const a = p.p(u, v0, 20);
  const b = p.p(u, v1, 20);
  ctx.strokeStyle = css(wood);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  for (let k = 1; k < 4; k++) {
    const x = a[0] + ((b[0] - a[0]) * k) / 4;
    const y = a[1] + ((b[1] - a[1]) * k) / 4;
    ctx.strokeStyle = '#4a2e18';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(x + 3, y + 8, 8, Math.PI * 0.6, Math.PI * 1.4);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(235,225,200,.8)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(x - 1.6, y + 0.6);
    ctx.lineTo(x - 1.6, y + 15.4);
    ctx.stroke();
  }
}

/** Ottoman record stone (nişan taşı): a slender marble stele with a turban top, at (u, v). */
function recordStone(p: IsoPainter, u: number, v: number, h: number, stone: number): void {
  const ctx = p.ctx;
  p.box(u - 0.05, v - 0.05, u + 0.05, v + 0.05, 0, 4, { color: shade(stone, 0.85) }, shade(stone, 0.85));
  p.box(u - 0.03, v - 0.03, u + 0.03, v + 0.03, 4, h, { color: stone }, stone);
  const [x, y] = p.p(u, v, h);
  ellipse(ctx, x, y - 3, 3.4, 3.6);
  ctx.fillStyle = css(shade(stone, 1.06));
  ctx.fill();
  ctx.strokeStyle = css(shade(stone, 0.7), 0.7);
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(x - 3, y - 2);
  ctx.quadraticCurveTo(x, y - 6.5, x + 3, y - 3.5);
  ctx.stroke();
}

/* ------------------------------------------------------------------ */
/* Byzantine (age 1)                                                    */
/* ------------------------------------------------------------------ */

function paintByzantineRange(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0x93a46a);
  p.ground(0.15, 0.2, 1.75, 2.0, 0xc2b597, 0.5);
  // The shooting loggia: a banded hall, its front an open arcade.
  const hall: Block = [0.25, 0.3, 1.6, 1.25];
  bandedBlock(p, s, hall, 0, 40, (w) => {
    for (let i = 0; i < 3; i++) arched(p, s, w * 0.47 + i * w * 0.17, -2, 11, 26, 1, false);
  }, (w) => arched(p, s, w / 2 - 4, -16, 8, 14, R));
  lowHip(p, s, hall, 40, 22);
  // Domed corner bay (the archers' gate).
  const bay: Block = [0.25, 1.25, 0.85, 1.85];
  bandedBlock(p, s, bay, 0, 58, (w) => {
    arched(p, s, w / 2 - 8, -2, 16, 30, 1, false);
    p.door(w / 2 - 7, 14, 24, c.doors.main);
  }, (w) => {
    arched(p, s, w / 2 - 3, -22, 6, 12, R, false);
    crest(p.ctx, s, w / 2, -44, 5, team);
  });
  terrace(p, bay, 58, c.roof, c.stone);
  leadDome(p, 0.55, 1.55, 0.27, 58, c.metal, { rise: 0.62, drum: 11, drumColor: c.stone, windows: 5, seams: 7 });
  torch(p, 0.87, 1.87, 30, 0.95, 2.05);
  bowRack(p, 1.25, 1.55, 1.95, c.timber);
  for (const [u, v] of [[2.5, 0.6], [2.5, 1.4], [2.5, 2.2]] as const) target(p, u, v);
  p.flag(0.4, 2.6, 0, 36, team, true);
}

function paintByzantineSmithy(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.1, 0.1, 1.9, 1.9, 0x7f776a);
  chimney(p, 1.55, 0.33, 1.71, 0.49, 0, 96, { color: c.brick, detail: 'brick' });
  // The workshop hall under low tile.
  const hall: Block = [0.3, 0.55, 1.25, 1.55];
  bandedBlock(p, s, hall, 0, 38, (w) => {
    arched(p, s, w * 0.14, -14, 8, 12, 1);
    arched(p, s, w * 0.56, -2, 16, 26, 1, false);
    p.door(w * 0.56 + 1, 14, 22, c.doors.work);
  }, (w) => arched(p, s, w * 0.2, -14, 7, 11, R, false));
  lowHip(p, s, hall, 38, 24);
  // The forge house: a small banded cell under a saucer dome, its mouth glowing.
  const forge: Block = [1.25, 0.3, 1.75, 0.95];
  bandedBlock(p, s, forge, 0, 44, (w) => forgeMouth(p, w / 2 - 9, 18, 24), (w) => arched(p, s, w / 2 - 3, -20, 6, 11, R, false));
  terrace(p, forge, 44, c.roof, c.stone);
  leadDome(p, 1.5, 0.62, 0.23, 44, c.metal, { rise: 0.6, drum: 8, drumColor: c.stone, seams: 5 });
  forgeLight(p, 1.5, 1.15);
  anvil(p, 1.55, 1.3);
  p.flag(0.22, 1.8, 0, 26, team);
}

/* ------------------------------------------------------------------ */
/* Seljuk (age 2)                                                       */
/* ------------------------------------------------------------------ */

function paintSeljukRange(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0x8d9c64);
  p.ground(0.15, 0.2, 1.95, 2.1, 0xbca57c, 0.5);
  // The hall of the archers' guild: an open pointed arcade on coursed ashlar.
  const hall: Block = [0.25, 0.3, 1.6, 1.25];
  ashlarBlock(p, s, hall, 0, 44, (w) => {
    for (let i = 0; i < 3; i++) lancet(p, s, w * 0.48 + i * w * 0.16, -2, 11, 26, 1, false);
  }, undefined, c.ashlar, c.trim);
  lowHip(p, s, hall, 44, 26);
  // The portal opening on the field, towering over the hall.
  const portal: Block = [1.6, 0.5, 1.9, 1.05];
  portalRight(p, s, portal, 76);
  terrace(p, portal, 76, c.roof, c.ashlar);
  p.leftFace(portal[0], portal[2], portal[3], 0, (w) => crest(p.ctx, s, w / 2, -60, 4, team), 76);
  // A kümbet before the hall.
  kumbet(p, s, 0.6, 1.75, 0.24, 0, 52, 40);
  bowRack(p, 1.35, 1.55, 1.95, c.timber);
  for (const [u, v] of [[2.5, 0.55], [2.55, 1.35], [2.5, 2.15]] as const) strawButt(p, u, v);
  p.flag(0.4, 2.6, 0, 38, team, true);
}

function paintSeljukSmithy(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.1, 0.1, 1.9, 1.9, 0x7a7266);
  chimney(p, 1.6, 0.26, 1.76, 0.42, 0, 112, { color: c.ashlar, detail: 'stone' });
  // The forge house is a kümbet: octagonal ashlar under a stone cone.
  kumbet(p, s, 1.45, 0.62, 0.24, 0, 46, 34);
  const hall: Block = [0.28, 0.6, 1.2, 1.55];
  ashlarBlock(p, s, hall, 0, 38, (w) => lancet(p, s, w * 0.84, -14, 7, 12, 1), () => forgeMouth(p, 8, 20, 24), c.ashlar, c.trim);
  lowHip(p, s, hall, 38, 30);
  portalLeft(p, s, [0.5, 1.55, 0.98, 1.76], 58);
  terrace(p, [0.5, 1.55, 0.98, 1.76], 58, c.roof, c.ashlar);
  forgeLight(p, 1.45, 1.15);
  anvil(p, 1.58, 1.28);
  p.flag(1.86, 1.86, 0, 26, team);
}

/* ------------------------------------------------------------------ */
/* Osmanlı (age 3)                                                      */
/* ------------------------------------------------------------------ */

/** Wide-eaved low hip in red pantile (the cumba house's eave). */
function wideHip(p: IsoPainter, s: ArchStyle, b: Block, eave: number, rise: number): void {
  p.material = 'tile';
  lowHip(p, s, b, eave, rise, s.palette.roof, 0.18);
}

function paintOsmanliRange(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0x93a46a);
  p.ground(0.15, 0.2, 1.7, 1.45, 0xd2c8b2, 0.5);
  // The shooting lodge: an open pointed arcade in white trim.
  const hall: Block = [0.25, 0.3, 1.55, 1.25];
  ashlarBlock(p, s, hall, 0, 42, (w) => {
    for (let i = 0; i < 4; i++) pointedWindow(p, c.trim, w * (0.08 + i * 0.23), -2, 12, 27, 1, false);
  }, (w) => pointedWindow(p, c.trim, w / 2 - 4, -16, 8, 14, R));
  wideHip(p, s, hall, 42, 30);
  // The domed kiosk (köşk) on columns at the head of the field.
  const k: Block = [1.82, 0.3, 2.3, 0.78];
  p.box(k[0] - 0.04, k[1] - 0.04, k[2] + 0.04, k[3] + 0.04, 0, 5, { color: c.ashlar }, c.ashlar);
  for (const [u, v] of [[k[0], k[1]], [k[2], k[1]], [k[0], k[3]]] as const) column(p, u, v, 5, 32, 2.4, c.trim);
  column(p, k[2], k[3], 5, 32, 2.4, c.trim);
  p.box(k[0] - 0.06, k[1] - 0.06, k[2] + 0.06, k[3] + 0.06, 32, 37, { color: c.trim }, c.trim);
  leadDome(p, 2.06, 0.54, 0.22, 37, c.metal, { rise: 0.9, drum: 4, drumColor: c.trim, seams: 5, alem: true });
  // Record stones of famous shots, and the targets.
  recordStone(p, 1.8, 1.9, 30, c.trim);
  recordStone(p, 2.05, 2.4, 26, c.trim);
  for (const [u, v] of [[2.6, 1.05], [2.6, 1.75], [2.55, 2.45]] as const) target(p, u, v);
  lantern(p, 1.55, 1.0, 32, 1.72, 1.0);
  p.flag(0.4, 2.6, 0, 40, team, true);
}

function paintOsmanliStable(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0xa89a70);
  // The long stall hall: pointed stall doors in white surrounds.
  const hall: Block = [0.3, 0.3, 2.55, 1.8];
  ashlarBlock(p, s, hall, 0, 44, (w) => {
    for (let i = 0; i < 6; i++) {
      const x = w * (0.04 + i * 0.16);
      pointedWindow(p, c.trim, x, -2, 15, 29, 1, false);
      p.door(x + 1.5, 12, 18, c.doors.gate);
    }
  });
  wideHip(p, s, hall, 44, 34);
  // Lead-domed ventilation cupola on the ridge.
  leadDome(p, 1.42, 1.05, 0.13, 44 + 34 * s.roof.pitch - 4, c.metal, { rise: 0.9, drum: 9, drumColor: c.trim, windows: 3, seams: 4, alem: true });
  // The domed gate pavilion with the owner's banners.
  const gate: Block = [2.5, 0.72, 2.86, 1.38];
  ashlarBlock(p, s, gate, 0, 62, (w) => pointedWindow(p, c.trim, w / 2 - 3, -30, 6, 12, 1, false), (w) => {
    ctx.fillStyle = css(shade(c.trim, R));
    pointedPath(ctx, w / 2 - 12, 0, 24, 40);
    ctx.fill();
    ctx.fillStyle = '#22170e';
    pointedPath(ctx, w / 2 - 10, 0, 20, 36);
    ctx.fill();
    p.door(w / 2 - 9, 18, 26, c.doors.gate);
    for (const bx of [3, w - 10]) {
      ctx.fillStyle = css(team);
      ctx.fillRect(bx, -52, 7, 20);
      ctx.fillStyle = css(shade(team, 0.7));
      ctx.fillRect(bx, -34, 7, 2);
    }
  });
  terrace(p, gate, 62, c.metal, c.ashlar);
  leadDome(p, 2.68, 1.05, 0.2, 62, c.metal, { rise: 0.9, drum: 6, drumColor: c.ashlar, seams: 6, alem: true });
  lantern(p, 2.86, 0.8, 38, 3.0, 0.8);
  // Fountain (çeşme) with its trough, and hay.
  const f: Block = [1.35, 2.15, 1.85, 2.28];
  ashlarBlock(p, s, f, 0, 24, (w) => {
    ctx.fillStyle = css(shade(c.ashlar, 0.55));
    pointedPath(ctx, w / 2 - 6, -4, 12, 16);
    ctx.fill();
  });
  terrace(p, f, 24, c.metal, c.ashlar);
  p.box(1.4, 2.28, 1.8, 2.5, 0, 6, { color: c.ashlar }, 0x4a7d96);
  for (const u of [0.5, 0.88]) p.box(u, 2.25, u + 0.33, 2.58, 0, 14, { color: 0xd9b55a }, 0xe8c873);
  p.flag(2.8, 2.8, 0, 40, team, true);
}

function paintOsmanliSmithy(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.1, 0.1, 1.9, 1.9, 0x7f776a);
  chimney(p, 1.58, 0.3, 1.74, 0.46, 0, 118, { color: c.ashlar, detail: 'stone' });
  const hall: Block = [0.3, 0.55, 1.3, 1.55];
  ashlarBlock(p, s, hall, 0, 40, (w) => {
    pointedWindow(p, c.trim, w * 0.16, -14, 8, 13, 1);
    pointedWindow(p, c.trim, w * 0.56, -2, 16, 28, 1, false);
    p.door(w * 0.56 + 1, 14, 22, c.doors.work);
  }, (w) => pointedWindow(p, c.trim, w * 0.16, -14, 7, 12, R, false));
  wideHip(p, s, hall, 40, 30);
  // The forge house under a lead dome.
  const forge: Block = [1.3, 0.3, 1.78, 0.95];
  ashlarBlock(p, s, forge, 0, 44, (w) => forgeMouth(p, w / 2 - 9, 18, 24), (w) => pointedWindow(p, c.trim, w / 2 - 3, -22, 6, 11, R, false));
  terrace(p, forge, 44, c.metal, c.ashlar);
  leadDome(p, 1.54, 0.62, 0.2, 44, c.metal, { rise: 0.9, drum: 5, drumColor: c.ashlar, seams: 5, alem: true });
  forgeLight(p, 1.55, 1.15);
  anvil(p, 1.6, 1.3);
  lantern(p, 0.5, 1.55, 30, 0.5, 1.75);
  p.flag(0.2, 1.84, 0, 28, team);
}

export function byzantineRange(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 120 + s.headroom, paint: (p, team) => paintByzantineRange(p, s, team) };
}

export function byzantineSmithy(s: ArchStyle): BuildingArt {
  return { size: 2, maxHeight: 120 + s.headroom, paint: (p, team) => paintByzantineSmithy(p, s, team) };
}

export function seljukRange(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 140 + s.headroom, paint: (p, team) => paintSeljukRange(p, s, team) };
}

export function seljukSmithy(s: ArchStyle): BuildingArt {
  return { size: 2, maxHeight: 130 + s.headroom, paint: (p, team) => paintSeljukSmithy(p, s, team) };
}

export function osmanliRange(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 150 + s.headroom, paint: (p, team) => paintOsmanliRange(p, s, team) };
}

export function osmanliStable(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 160 + s.headroom, paint: (p, team) => paintOsmanliStable(p, s, team) };
}

export function osmanliSmithy(s: ArchStyle): BuildingArt {
  return { size: 2, maxHeight: 140 + s.headroom, paint: (p, team) => paintOsmanliSmithy(p, s, team) };
}
