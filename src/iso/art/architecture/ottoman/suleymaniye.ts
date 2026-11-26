import type { IsoPainter } from '../../isoPainter';
import { shade } from '../../palette';
import { crest, R } from '../facade';
import { leadDome } from '../kits/leadDome';
import { pencilMinaret } from '../kits/minaret';
import { octPrism } from '../kits/tentRoof';
import { logPile, plankStack } from '../parts';
import { helm } from '../roofs';
import type { ArchStyle } from '../style';
import type { WonderArt } from '../types';
import { WONDER_STAGES } from '../wonder';
import { crane, scaffold } from '../wonderParts';
import { ashlarBlock, domeRow, pointedWindow, terrace, type Block } from './ottomanParts';

/*
 * The Ottoman Wonder: the Süleymaniye. At the back the prayer hall
 * steps up in cascades — corner domes on the hall's terrace, two big
 * flanking half-domes, the raised core with weight turrets and the
 * great lead dome on its windowed drum. Before it the arcaded forecourt
 * (avlu): ranges of small domes round a court with a domed ablution
 * fountain. Four pencil minarets stand at the court's corners, the two
 * by the hall taller with three balconies, the front two with two.
 * Stages: footings, stone and a crane; the walls risen halfway in
 * scaffolding; full walls with the dome's drum and the minaret shafts
 * scaffolded, no lead and no lit window.
 */

type Stage = 1 | 2 | 3 | 4;

const HALL: Block = [0.3, 0.3, 3.7, 2.25];
const CORE: Block = [1.25, 0.6, 2.75, 1.95];
const COURT: Block = [0.55, 2.25, 3.45, 3.75];
const WALL = 54;
const CORE_TOP = WALL + 18;
const MINARET_R = 0.07;

function hall(p: IsoPainter, s: ArchStyle, stage: Stage): void {
  const c = s.palette;
  const lit = stage === 4;
  const top = stage === 2 ? WALL / 2 : WALL;
  ashlarBlock(p, s, HALL, 0, top, (w) => {
    if (stage < 3) return;
    for (let i = 0; i < 9; i++) pointedWindow(p, c.trim, 10 + (i * (w - 26)) / 8, -16, 7, 13, 1, false);
    for (let i = 0; i < 4; i++) pointedWindow(p, c.trim, 30 + (i * (w - 66)) / 4, -36, 6, 10, 1, lit);
  }, (w) => {
    if (stage < 3) return;
    for (let i = 0; i < 6; i++) pointedWindow(p, c.trim, 10 + (i * (w - 24)) / 5, -16, 7, 13, R, lit);
  });
  terrace(p, HALL, top, stage === 4 ? c.metal : c.ashlar, c.ashlar);
  if (stage < 4) {
    scaffold(p, HALL[0], HALL[1], HALL[2], HALL[3], 0, top);
    return;
  }
  // Corner domes behind the core.
  for (const [u, v] of [[0.62, 0.62], [3.38, 0.62]] as const) leadDome(p, u, v, 0.2, WALL, c.metal, { rise: 0.9, drum: 5, drumColor: c.ashlar, seams: 4 });
}

function core(p: IsoPainter, s: ArchStyle, stage: Stage): void {
  const c = s.palette;
  if (stage < 3) return;
  // The flanking half-domes, then the raised core.
  if (stage === 4) leadDome(p, 0.95, 1.28, 0.42, WALL, c.metal, { rise: 0.9, drum: 6, drumColor: c.ashlar, windows: 5, seams: 7 });
  ashlarBlock(p, s, CORE, WALL, CORE_TOP, (w) => {
    for (let i = 0; i < 5; i++) pointedWindow(p, c.trim, 8 + (i * (w - 22)) / 4, -3, 6, 10, 1, stage === 4);
  }, undefined, c.ashlar);
  terrace(p, CORE, CORE_TOP, c.metal, c.ashlar);
  const uc = (CORE[0] + CORE[2]) / 2;
  const vc = (CORE[1] + CORE[3]) / 2;
  const turret = (u: number, v: number) => {
    octPrism(p, u, v, 0.08, CORE_TOP, CORE_TOP + 18, c.ashlar, 'plain');
    if (stage === 4) helm(p, u, v, CORE_TOP + 18, [[0, 0.1], [18, 0.004]], c.metal, false);
  };
  turret(CORE[0] + 0.06, CORE[1] + 0.06);
  turret(CORE[2] - 0.06, CORE[1] + 0.06);
  turret(CORE[0] + 0.06, CORE[3] - 0.06);
  if (stage === 4) leadDome(p, uc, vc, 0.66, CORE_TOP, c.metal, { rise: 0.95, drum: 18, drumColor: c.ashlar, windows: 13, seams: 15, alem: true });
  else {
    helm(p, uc, vc, CORE_TOP, [[0, 0.69], [18, 0.69]], c.ashlar, false);
    scaffold(p, uc - 0.7, vc - 0.7, uc + 0.7, vc + 0.7, CORE_TOP, CORE_TOP + 30);
  }
  turret(CORE[2] - 0.06, CORE[3] - 0.06);
  if (stage === 4) leadDome(p, 3.05, 1.28, 0.42, WALL, c.metal, { rise: 0.9, drum: 6, drumColor: c.ashlar, windows: 5, seams: 7 });
  if (stage === 4) for (const [u, v] of [[0.62, 1.95], [3.38, 1.95]] as const) leadDome(p, u, v, 0.2, WALL, c.metal, { rise: 0.9, drum: 5, drumColor: c.ashlar, seams: 4 });
}

function minaret(p: IsoPainter, s: ArchStyle, u: number, v: number, stage: Stage, tall: boolean): void {
  const c = s.palette;
  const h = tall ? 232 : 176;
  if (stage === 1) return;
  if (stage < 4) {
    const zh = stage === 2 ? h * 0.3 : h * 0.7;
    helm(p, u, v, 0, [[0, MINARET_R * 1.5], [zh, MINARET_R * 1.5]], c.ashlar, false);
    scaffold(p, u - 0.12, v - 0.12, u + 0.12, v + 0.12, 0, zh);
    return;
  }
  pencilMinaret(p, u, v, MINARET_R, 0, h, c.ashlar, c.metal, { balconies: tall ? 3 : 2 });
}

/** The forecourt: side ranges and the front range under rows of small domes, the court and its fountain. */
function forecourt(p: IsoPainter, s: ArchStyle, stage: Stage, team: number | null): void {
  const c = s.palette;
  const [u0, v0, u1, v1] = COURT;
  const d = 0.36;
  const h = stage === 2 ? 14 : 30;
  const left: Block = [u0, v0, u0 + d, v1];
  const right: Block = [u1 - d, v0, u1, v1];
  const front: Block = [u0 + d, v1 - d, u1 - d, v1];
  const done = stage === 4;
  const arcade = (light: number) => (w: number) => {
    if (stage < 3) return;
    for (let x = 4; x < w - 10; x += 16) pointedWindow(p, c.trim, x, -3, 10, 20, light, false);
  };
  ashlarBlock(p, s, left, 0, h, undefined, arcade(R));
  terrace(p, left, h, done ? c.metal : c.ashlar, c.ashlar);
  if (done) domeRow(p, u0 + d / 2, v0 + 0.2, u0 + d / 2, v1 - 0.2, 6, 0.15, h, c.metal, 3);
  p.ground(u0 + d, v0, u1 - d, v1 - d, shade(c.ashlar, 0.95), 1);
  if (stage >= 3) {
    // The ablution fountain (şadırvan) in the court.
    octPrism(p, 2.0, 2.95, 0.22, 1, 16, c.ashlar, 'plain');
    if (done) leadDome(p, 2.0, 2.95, 0.26, 16, c.metal, { rise: 0.8, seams: 5, alem: true });
  }
  ashlarBlock(p, s, right, 0, h, undefined, arcade(R));
  terrace(p, right, h, done ? c.metal : c.ashlar, c.ashlar);
  if (done) domeRow(p, u1 - d / 2, v0 + 0.2, u1 - d / 2, v1 - 0.2, 6, 0.15, h, c.metal, 3);
  ashlarBlock(p, s, front, 0, h, (w) => {
    arcade(1)(w);
    if (team !== null) crest(p.ctx, s, w / 2, -h + 6, 5, team);
  });
  terrace(p, front, h, done ? c.metal : c.ashlar, c.ashlar);
  if (done) domeRow(p, u0 + d + 0.25, v1 - d / 2, u1 - d - 0.25, v1 - d / 2, 5, 0.15, h, c.metal, 3);
  if (stage < 4) scaffold(p, front[0], front[1], front[2], front[3], 0, h);
}

function paintSuleymaniye(p: IsoPainter, s: ArchStyle, team: number | null, stage: Stage): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.08, 0.08, 3.92, 3.92, 0xd6ccb6);
  if (stage === 1) {
    for (const b of [HALL, COURT]) p.box(b[0], b[1], b[2], b[3], 0, 14, { color: shade(c.stone, 0.8), detail: 'stone' }, shade(c.stone, 0.85));
    plankStack(p, 3.0, 3.1, 3.6, 3.6, 12);
    logPile(p, 0.6, 3.3, 8, 0x7a5434, 0xd9b88a);
    crane(p, 2.0, 1.3, 150, 2.4, 1.6, 40);
    return;
  }
  hall(p, s, stage);
  core(p, s, stage);
  minaret(p, s, COURT[0] + 0.06, COURT[1] + 0.06, stage, true);
  minaret(p, s, COURT[2] - 0.06, COURT[1] + 0.06, stage, true);
  forecourt(p, s, stage, team);
  minaret(p, s, COURT[0] + 0.06, COURT[3] - 0.06, stage, false);
  minaret(p, s, COURT[2] - 0.06, COURT[3] - 0.06, stage, false);
  if (stage < 4) {
    crane(p, 2.0, 1.3, stage === 2 ? 170 : 230, 2.4, 1.6, (stage === 2 ? WALL / 2 : CORE_TOP) + 30);
    return;
  }
  if (team !== null) p.flag(COURT[2] - 0.06, COURT[3] - 0.06, 60, 22, team, true);
}

/** The Ottoman Wonder (age-3 style): the Süleymaniye, finished in the team colour, or a construction stage. */
export function suleymaniye(s: ArchStyle): WonderArt {
  return {
    size: 4,
    maxHeight: 340,
    paint: (p, team) => paintSuleymaniye(p, s, team, (WONDER_STAGES + 1) as Stage),
    // No team colour shows while it is being built.
    paintStage: (p, stage) => paintSuleymaniye(p, s, null, stage as Stage),
  };
}
