import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { crest, R } from '../facade';
import { needleSpire } from '../kits/needleSpire';
import { lantern, logPile, plankStack } from '../parts';
import { finial, helm } from '../roofs';
import type { ArchStyle } from '../style';
import type { WonderArt } from '../types';
import { WONDER_STAGES } from '../wonder';
import { crane, parterre, scaffold } from '../wonderParts';
import type { Block } from './biskupinParts';
import { lancet } from './krakowParts';
import { arcade, CASTLE, CASTLE_ROOF, GILT, HILL, hill, wawelClock, wing } from './wawelParts';

/*
 * The Polish Wonder: Wawel hill. On a brick-revetted hill the royal
 * castle's wings close round the Renaissance courtyard, whose back
 * wings show their three tiers of arcades over the low front ranges;
 * at the hill's right end the cathedral's ashlar nave carries the
 * Sigismund Chapel, a cube under a gilded dome and lantern, beside the
 * tall clock tower with its baroque helm. Stages: the hill and the
 * wings' footings with stone piles; the wings and the nave risen
 * halfway inside scaffolding; full walls under roofs, the clock tower's
 * shaft scaffolded and the chapel waiting for its dome, no window lit.
 */

const Z = HILL;
const NORTH: Block = [0.35, 0.35, 2.4, 0.9];
const WEST: Block = [0.35, 0.9, 0.9, 2.45];
const EAST: Block = [1.95, 0.9, 2.4, 2.45];
const SOUTH: Block = [0.9, 2.0, 1.95, 2.45];
const NAVE: Block = [2.6, 0.55, 3.72, 1.35];
const CHAPEL: Block = [2.95, 1.35, 3.55, 1.95];
const CLOCK: Block = [2.55, 1.4, 2.92, 1.77];
const WING_TOP = Z + 94;
const LOW_TOP = Z + 40;
const NAVE_TOP = Z + 80;
const CLOCK_TOP = Z + 168;

type Stage = 1 | 2 | 3 | 4;

function castle(p: IsoPainter, s: ArchStyle, stage: Stage): void {
  const lit = stage === 4;
  const top = stage === 2 ? Z + 44 : WING_TOP;
  const roof = stage >= 3;
  // The back wings: their court faces carry the arcades.
  wing(p, s, NORTH, Z, top, (w, h) => arcade(p, w, h, 1, lit), undefined, roof);
  wing(p, s, WEST, Z, top, undefined, (w, h) => arcade(p, w, h, R, lit), roof);
  // Courtyard paving.
  p.ground(0.9, 0.9, 1.95, 2.0, 0xcfc3a8, Z);
  const low = stage === 2 ? Z + 26 : LOW_TOP;
  wing(p, s, EAST, Z, low, undefined, (w) => {
    if (!lit) return;
    for (const x of [0.2, 0.45, 0.7]) p.window(w * x, -24, 6, 10);
  }, roof);
  wing(p, s, SOUTH, Z, low, (w) => {
    if (!lit) return;
    for (const x of [0.15, 0.4, 0.65]) p.window(w * x, -24, 6, 10);
    p.door(w * 0.85 - 6, 12, 22, s.palette.doors.main);
  }, undefined, roof);
  if (stage < 4) {
    scaffold(p, NORTH[0], NORTH[1], NORTH[2], NORTH[3], Z, top);
    if (stage === 2) scaffold(p, SOUTH[0], SOUTH[1], SOUTH[2], SOUTH[3], Z, low);
  }
}

function cathedral(p: IsoPainter, s: ArchStyle, stage: Stage, team: number | null): void {
  const c = s.palette;
  const lit = stage === 4;
  const top = stage === 2 ? Z + 40 : NAVE_TOP;
  const [u0, v0, u1, v1] = NAVE;
  p.box(u0, v0, u1, v1, Z, top, { color: c.ashlar, detail: 'stone' }, c.ashlar);
  p.rightFace(v0, v1, u1, Z, (w) => {
    if (stage >= 3) for (const x of [0.25, 0.65]) lancet(p, s, w * x - 4, -10, 8, 36, R, lit);
  }, top - Z);
  if (stage >= 3) {
    const prev = p.material;
    p.material = 'copper';
    p.gableRoof(u0, v0, u1, v1, top, 64, c.metal, c.ashlar, 'u', 0.08);
    p.material = prev;
  } else scaffold(p, u0, v0, u1, v1, Z, top);
  // The clock tower at the west front.
  const clockTop = stage === 2 ? Z + 60 : stage === 3 ? Z + 120 : CLOCK_TOP;
  const [cu0, cv0, cu1, cv1] = CLOCK;
  p.box(cu0, cv0, cu1, cv1, Z, clockTop, { color: c.ashlar, detail: 'stone' }, c.ashlar);
  if (stage === 4) {
    p.leftFace(cu0, cu1, cv1, Z, (w, h) => {
      wawelClock(p.ctx, w / 2, -h + 26, 7, 1);
      lancet(p, s, w / 2 - 3, -h + 64, 6, 18, 1, true);
    }, clockTop - Z);
    p.rightFace(cv0, cv1, cu1, Z, (w, h) => wawelClock(p.ctx, w / 2, -h + 26, 7, R), clockTop - Z);
    const uc = (cu0 + cu1) / 2;
    const vc = (cv0 + cv1) / 2;
    // Baroque helm: a bell, a lantern, a smaller bell and a spike.
    helm(p, uc, vc, clockTop, [[0, 0.24], [10, 0.2], [18, 0.12], [22, 0.07], [30, 0.07], [32, 0.1], [40, 0.05], [44, 0.04], [50, 0.06], [58, 0.02], [72, 0.004]], c.metal);
    finial(p, uc, vc, clockTop + 72, 10, false);
    if (team !== null) p.flag(uc, vc, clockTop + 82, 20, team, true);
  } else scaffold(p, cu0, cv0, cu1, cv1, Z, clockTop);
  // Sigismund Chapel: an ashlar cube, a drum, the gilded dome and its lantern.
  const [hu0, hv0, hu1, hv1] = CHAPEL;
  const chapelTop = stage === 2 ? Z + 30 : Z + 56;
  p.box(hu0, hv0, hu1, hv1, Z, chapelTop, { color: shade(c.ashlar, 1.04), detail: 'stone' }, c.ashlar);
  if (stage >= 3) {
    p.leftFace(hu0, hu1, hv1, Z, (w) => {
      if (lit) p.window(w / 2 - 4, -46, 8, 12, true);
      if (team !== null) crest(p.ctx, s, w / 2, -22, 7, team);
    }, chapelTop - Z);
    const uc = (hu0 + hu1) / 2;
    const vc = (hv0 + hv1) / 2;
    helm(p, uc, vc, chapelTop, [[0, 0.24], [14, 0.24]], c.ashlar, false);
    if (stage === 4) {
      helm(p, uc, vc, chapelTop + 14, [[0, 0.27], [10, 0.26], [20, 0.21], [27, 0.13], [31, 0.05], [33, 0.05], [42, 0.05], [46, 0.02], [56, 0.0]], GILT);
      finial(p, uc, vc, chapelTop + 56, 8, false);
    }
  }
}

function paintWawel(p: IsoPainter, s: ArchStyle, team: number | null, stage: Stage): void {
  const c = s.palette;
  p.footShadow();
  hill(p, s);
  if (stage === 1) {
    // Footings of the wings and the nave, stone and timber waiting.
    for (const b of [NORTH, WEST, EAST, SOUTH, NAVE]) p.box(b[0], b[1], b[2], b[3], Z, Z + 14, { color: c.stone, detail: 'fieldstone' }, c.stone);
    plankStack(p, 2.7, 2.4, 3.3, 2.8, 12);
    logPile(p, 1.4, 3.3, 8, 0x7a5434, 0xd9b88a);
    crane(p, 1.4, 1.4, 150, 2.0, 1.0, Z + 30);
    return;
  }
  castle(p, s, stage);
  cathedral(p, s, stage, team);
  // The round Thieves' Tower at the castle's front corner.
  const tc = { u: 0.62, v: 2.72 };
  helm(p, tc.u, tc.v, Z, [[0, 0.22], [stage === 2 ? 40 : 96, 0.22]], CASTLE, false);
  if (stage >= 3) helm(p, tc.u, tc.v, Z + 96, [[0, 0.26], [44, 0.0]], CASTLE_ROOF);
  if (stage === 4) {
    const [x, y] = p.p(tc.u, tc.v, Z + 66);
    p.ctx.fillStyle = css(shade(0xffd27a, 1));
    p.ctx.fillRect(x - 2, y - 6, 4, 7);
    p.addGlow(x, y - 3, 6);
  }
  // The approach: the gatehouse at the hill's front edge, under a red hip.
  const gate: Block = [1.95, 3.45, 2.55, 3.85];
  p.box(gate[0], gate[1], gate[2], gate[3], Z, Z + 34, { color: c.brick, detail: 'brick' }, c.brick);
  p.leftFace(gate[0], gate[2], gate[3], Z, (w) => {
    p.ctx.fillStyle = css(shade(c.trim, 1));
    p.ctx.fillRect(w / 2 - 8, -24, 16, 24);
    p.ctx.fillStyle = '#1e140c';
    p.ctx.fillRect(w / 2 - 6, -21, 12, 21);
  }, 34);
  if (stage >= 3) wing(p, s, gate, Z + 34, Z + 48, undefined, undefined, true);
  if (stage < 4) {
    crane(p, 1.4, 1.4, stage === 2 ? 210 : 260, 2.0, 1.0, (stage === 2 ? Z + 44 : WING_TOP) + 30);
    return;
  }
  parterre(p, 2.75, 2.6, 3.72, 3.72, Z + 0.6);
  needleSpire(p, 3.6, 0.7, 0.1, NAVE_TOP + 20, 60, c.metal, 'copper', 8);
  lantern(p, 2.4, 3.3, Z + 24, 2.4, 3.6);
  if (team !== null) p.flag(1.4, 0.6, WING_TOP + 34, 24, team, true);
}

/** The Polish Wonder (age-3 style): Wawel hill, finished in the team colour, or a construction stage. */
export function wawel(s: ArchStyle): WonderArt {
  return {
    size: 4,
    maxHeight: 380,
    paint: (p, team) => paintWawel(p, s, team, (WONDER_STAGES + 1) as Stage),
    // No team colour shows while it is being built.
    paintStage: (p, stage) => paintWawel(p, s, null, stage as Stage),
  };
}
