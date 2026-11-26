import { TOWER_PLATFORM_Z } from '../../../../config/visual';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { crest, R, timberFrame } from '../facade';
import { leadDome } from '../kits/leadDome';
import { lowHip } from '../kits/lowHip';
import { pencilMinaret } from '../kits/minaret';
import { octPrism } from '../kits/tentRoof';
import { column, post, torch } from '../parts';
import { helm } from '../roofs';
import type { ArchStyle } from '../style';
import { archer } from '../towerParts';
import type { BuildingArt } from '../types';
import { ashlarBlock, domeRow, pointedWindow, terrace, type Block } from './ottomanParts';

/*
 * Classical Ottoman (age 3). The town centre is a mosque: a pale ashlar
 * hall stepping up to a raised core under a hemispherical lead dome on
 * a windowed drum, small domes on its corners and weight turrets round
 * the core, a portico of small domes on columns before its door and a
 * pencil minaret beside it. The house is timber-framed and whitewashed
 * over a stone ground storey, its upper storey and bay (cumba) jutting
 * out under a low, wide-eaved hip. The tower is a stone shaft with a
 * domed kiosk; the barracks a long hall under rows of small lead domes.
 */

/** Small octagonal weight turret with a lead cone at (u, v) standing on z. */
function weightTurret(p: IsoPainter, s: ArchStyle, u: number, v: number, z: number): void {
  octPrism(p, u, v, 0.06, z, z + 12, s.palette.ashlar, 'plain');
  helm(p, u, v, z + 12, [[0, 0.075], [12, 0.004]], s.palette.metal, false);
}

function paintMosque(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.04, 0.04, 2.96, 2.96, 0xd2c8b2);
  // The minaret first: it stands behind the hall's right corner.
  pencilMinaret(p, 2.64, 0.4, 0.065, 0, 176, c.ashlar, c.metal, { balconies: 2 });
  const hall: Block = [0.6, 0.6, 2.35, 2.3];
  const wall = 46;
  ashlarBlock(p, s, hall, 0, wall, (w) => {
    for (const x of [0.08, 0.2, 0.74, 0.86]) pointedWindow(p, c.trim, w * x, -18, 7, 13, 1);
    p.door(w / 2 - 8, 16, 26, c.doors.main);
  }, (w) => {
    for (const x of [0.12, 0.3, 0.5, 0.7, 0.88]) pointedWindow(p, c.trim, w * x - 3.5, -18, 7, 13, R);
    for (const x of [0.3, 0.7]) pointedWindow(p, c.trim, w * x - 3, -36, 6, 8, R, false);
  });
  terrace(p, hall, wall, c.metal, c.ashlar);
  // Corner domes behind the core.
  leadDome(p, 0.84, 0.84, 0.16, wall, c.metal, { rise: 0.9, drum: 5, drumColor: c.ashlar, seams: 4 });
  leadDome(p, 2.11, 0.84, 0.16, wall, c.metal, { rise: 0.9, drum: 5, drumColor: c.ashlar, seams: 4 });
  // The raised core with its weight turrets and the great dome.
  const core: Block = [1.0, 1.0, 1.95, 1.9];
  ashlarBlock(p, s, core, wall, wall + 14, undefined, undefined, c.ashlar);
  terrace(p, core, wall + 14, c.metal, c.ashlar);
  weightTurret(p, s, 1.04, 1.04, wall + 14);
  weightTurret(p, s, 1.91, 1.04, wall + 14);
  weightTurret(p, s, 1.04, 1.86, wall + 14);
  leadDome(p, 1.475, 1.45, 0.47, wall + 14, c.metal, { rise: 0.95, drum: 12, drumColor: c.ashlar, windows: 9, seams: 11, alem: true });
  weightTurret(p, s, 1.91, 1.86, wall + 14);
  leadDome(p, 0.84, 2.06, 0.16, wall, c.metal, { rise: 0.9, drum: 5, drumColor: c.ashlar, seams: 4 });
  leadDome(p, 2.11, 2.06, 0.16, wall, c.metal, { rise: 0.9, drum: 5, drumColor: c.ashlar, seams: 4 });
  // The portico: a lintel on columns carrying a row of small domes.
  const porch: Block = [0.6, 2.3, 2.35, 2.74];
  p.box(porch[0], porch[1], porch[2], porch[3], 28, 34, { color: c.ashlar }, c.ashlar);
  p.leftFace(porch[0], porch[2], porch[3], 28, (w) => crest(p.ctx, s, w / 2, -3, 3, team), 6);
  terrace(p, porch, 34, c.metal, c.ashlar);
  domeRow(p, 0.82, 2.52, 2.13, 2.52, 4, 0.17, 34, c.metal, 4);
  for (const u of [0.66, 1.1, 1.53, 1.97, 2.3]) column(p, u, 2.72, 0, 28, 2.6, c.trim);
  torch(p, 0.5, 2.85, 24, 0.5, 3.1);
  p.flag(2.64, 0.4, 0, 30, team, true);
}

function paintHouse(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.1, 0.1, 1.9, 1.9, 0xc4b89c);
  // Stone ground storey.
  const ground: Block = [0.38, 0.45, 1.62, 1.55];
  ashlarBlock(p, s, ground, 0, 30, (w) => {
    p.door(w * 0.18, 13, 21, shade(team, 0.75));
    pointedWindow(p, c.trim, w * 0.62, -8, 8, 11, 1, false);
  }, (w) => pointedWindow(p, c.trim, w * 0.4, -8, 8, 11, R, false));
  // Jutting timber-framed upper storey on brackets.
  const up: Block = [0.3, 0.38, 1.72, 1.72];
  const ctx = p.ctx;
  for (const u of [0.5, 0.9, 1.3]) {
    const [x, y] = p.p(u, 1.55, 22);
    ctx.fillStyle = css(c.timber);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 7, y - 8 + 3.5);
    ctx.lineTo(x + 7, y - 4.5 - 3);
    ctx.lineTo(x, y - 6);
    ctx.closePath();
    ctx.fill();
  }
  const frame = (light: number) => (w: number, h: number) => {
    timberFrame(ctx, w, h, { color: c.timber, bays: 4, braces: false, light });
    for (let i = 0; i < 4; i++) p.window(w * (i / 4) + w / 8 - 4.5, -h + 13, 9, 11);
  };
  p.box(up[0], up[1], up[2], up[3], 30, 58, { color: c.plaster }, c.plaster);
  p.leftFace(up[0], up[2], up[3], 30, frame(1), 28);
  p.rightFace(up[1], up[3], up[2], 30, frame(R), 28);
  // The cumba: a closed bay window jutting from the street front.
  const bay: Block = [0.75, 1.72, 1.25, 1.9];
  p.box(bay[0], bay[1], bay[2], bay[3], 32, 56, { color: c.plaster }, c.plaster);
  p.leftFace(bay[0], bay[2], bay[3], 32, (w, h) => {
    timberFrame(ctx, w, h, { color: c.timber, bays: 2, braces: false });
    for (const x of [0.1, 0.55]) p.window(w * x + 1, -h + 12, w * 0.3, 10);
  }, 24);
  p.rightFace(bay[1], bay[3], bay[2], 32, (w, h) => timberFrame(ctx, w, h, { color: c.timber, bays: 1, braces: false, light: R }), 24);
  // Low hip with wide eaves over everything.
  p.material = 'tile';
  lowHip(p, s, up, 58, 30, c.roof, 0.18);
  p.flag(0.22, 1.86, 0, 36, team);
}

function paintTower(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const z = TOWER_PLATFORM_Z[3];
  p.footShadow();
  ashlarBlock(p, s, [0.14, 0.14, 0.86, 0.86], 0, z, (w) => {
    p.door(w / 2 - 6, 12, 20, c.doors.main);
    pointedWindow(p, c.trim, w / 2 - 3, -z + 50, 6, 12, 1, false);
    pointedWindow(p, c.trim, w / 2 - 3, -z + 96, 6, 12, 1, false);
  }, (w) => pointedWindow(p, c.trim, w / 2 - 3, -z + 50, 6, 12, R, false));
  // A corbelled gallery and the domed kiosk over the archer.
  p.box(0.08, 0.08, 0.92, 0.92, z - 6, z, { color: c.trim }, c.trim);
  p.ground(0.08, 0.08, 0.92, 0.92, shade(c.ashlar, 0.9), z);
  const k = 26;
  for (const [u, v] of [[0.18, 0.18], [0.82, 0.18], [0.18, 0.82]] as const) post(p, u, v, z, z + k, 2.6, c.trim);
  archer(p, 0.56, 0.44, z, team, 'tricorn');
  post(p, 0.82, 0.82, z, z + k, 2.6, c.trim);
  p.box(0.12, 0.12, 0.88, 0.88, z + k, z + k + 5, { color: c.trim }, c.trim);
  // Wide eave of lead round the kiosk.
  helm(p, 0.5, 0.5, z + k + 3, [[0, 0.5], [6, 0.38]], c.metal, false);
  const top = leadDome(p, 0.5, 0.5, 0.33, z + k + 8, c.metal, { rise: 0.95, seams: 6, alem: true });
  p.flag(0.86, 0.14, z, 22, team);
  p.addVolumePoint(0.5, 0.5, top);
}

function paintBarracks(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0xc9bea6);
  const hall: Block = [0.3, 0.3, 2.7, 1.8];
  ashlarBlock(p, s, hall, 0, 42, (w) => {
    for (let i = 0; i < 7; i++) pointedWindow(p, c.trim, 10 + i * (w - 20) / 6.4, -16, 7, 13, 1, false);
  }, (w) => {
    p.door(w / 2 - 12, 24, 32, c.doors.gate);
    for (const bx of [w / 2 - 26, w / 2 + 16]) {
      p.ctx.fillStyle = css(team);
      p.ctx.fillRect(bx, -38, 9, 20);
    }
  });
  terrace(p, hall, 42, c.metal, c.ashlar);
  domeRow(p, 0.62, 0.75, 2.38, 0.75, 5, 0.2, 42, c.metal, 7);
  domeRow(p, 0.62, 1.35, 2.38, 1.35, 5, 0.2, 42, c.metal, 7);
  // Chimneys of the dormitory hearths between the domes.
  for (const u of [0.95, 1.85]) p.box(u, 1.02, u + 0.1, 1.12, 42, 66, { color: c.ashlar }, c.ashlar);
  p.addSmoke(1.9, 1.07, 66);
  torch(p, 2.75, 0.8, 34, 2.95, 0.8);
  p.flag(2.8, 2.8, 0, 40, team, true);
}

export function osmanliMosque(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 250 + s.headroom, paint: (p, team) => paintMosque(p, s, team) };
}

export function cumbaHouse(s: ArchStyle): BuildingArt {
  return { size: 2, maxHeight: 110 + s.headroom, paint: (p, team) => paintHouse(p, s, team) };
}

export function kioskTower(s: ArchStyle): BuildingArt {
  return { size: 1, maxHeight: 250 + s.headroom, paint: (p, team) => paintTower(p, s, team) };
}

export function domedBarracks(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 130 + s.headroom, paint: (p, team) => paintBarracks(p, s, team) };
}
