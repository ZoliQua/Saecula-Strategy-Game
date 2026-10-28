import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { clockFace, crest } from '../facade';
import { lantern } from '../parts';
import { dormerLeft, dormerRight, mansardRoof } from '../roofs';
import type { ArchStyle } from '../style';
import type { WonderArt } from '../types';
import { WONDER_STAGES } from '../wonder';
import { crane, fountain, parterre, scaffold, statue } from '../wonderParts';
import { tallStack } from './gothicParts';
import { equestrian, GILT, giltLine, GROUND, NOBLE, palaceBlock, roofBalustrade, royalGate, sunburst, type Block, type FaceSpec } from './versaillesParts';

/*
 * The French Wonder: a palace after Versailles, entered from the viewer's
 * side. The corps de logis closes the back of the cour d'honneur under a
 * slate mansard with gilt dormers and tall stacks; the avant-corps in its
 * middle carries the clock between statues and the sun; two long wings
 * with balustrades and statues on their flat roofs frame the court; the
 * gilded royal gate with Louis XIV's sun closes it, the king rides in
 * bronze on the place d'armes, and parterres with clipped hedges and
 * topiaries flank the forecourt. Stages: footings and the ground storey
 * of the corps with a crane, then the shells risen in scaffolding, then
 * the roofed corps with the wings still scaffolded.
 */

const Z0 = 6;
const CORPS: Block = [0.3, 0.35, 3.7, 1.3];
const CENTRE: Block = [1.55, 1.3, 2.45, 1.62];
const LEFT: Block = [0.3, 1.3, 1.05, 3.25];
const RIGHT: Block = [2.95, 1.3, 3.7, 3.25];
const CORPS_TOP = 96;
const CENTRE_TOP = 104;
const WING_TOP = 90;
const GATE_V = 3.24;

/** The corps' court face is hidden behind both wings and the avant-corps. */
const CORPS_FRONT: FaceSpec = { bays: 13, hidden: [[0, 0.225], [0.365, 0.635], [0.775, 1]] };
const RAW: FaceSpec = { bays: 4, raw: true };

function mansard(p: IsoPainter, s: ArchStyle, [u0, v0, u1, v1]: Block, eave: number, lower: number, upper: number, inset: number, gilt: boolean): number {
  const k = s.roof.pitch;
  const prev = p.material;
  p.material = 'slate';
  mansardRoof(p, u0, v0, u1, v1, eave, lower * k, inset, upper * k, s.palette.roof, s.palette.roof, 0.05, gilt ? GILT : s.palette.trim);
  p.material = prev;
  const curb = eave + lower * k;
  if (gilt) giltLine(p.ctx, [p.p(u0 + inset, v1 - inset, curb + 1), p.p(u1 - inset, v1 - inset, curb + 1), p.p(u1 - inset, v0 + inset, curb + 1)], 2);
  return curb;
}

function corps(p: IsoPainter, s: ArchStyle, stage: number): void {
  const c = s.palette;
  const done = stage > WONDER_STAGES;
  if (stage <= 2) {
    palaceBlock(p, s, CORPS, Z0, stage === 1 ? Z0 + GROUND : CORPS_TOP, RAW, RAW);
    scaffold(p, ...CORPS, Z0, stage === 1 ? Z0 + GROUND : CORPS_TOP);
    return;
  }
  palaceBlock(p, s, CORPS, Z0, CORPS_TOP, CORPS_FRONT, { bays: 4 });
  const curb = mansard(p, s, CORPS, CORPS_TOP, 30, 10, 0.22, done);
  const z = CORPS_TOP + 8 * s.roof.pitch;
  for (const u of [1.3, 2.7]) dormerLeft(p, u, CORPS[3] - 0.08, z, 0.16, 15, c.trim, c.roof, 'slate');
  for (const v of [0.62, 1.02]) dormerRight(p, CORPS[2] - 0.08, v, z, 0.16, 15, c.trim, c.roof, 'slate');
  if (!done) return;
  for (const [u, v] of [[0.75, 0.75], [1.35, 0.72], [2.65, 0.72], [3.25, 0.75]] as const) tallStack(p, u, v, curb - 4, curb + 34, shade(c.trim, 0.95));
}

/** Avant-corps: three portals, the gilt balcony, the clock attic with its statues and the sun. */
function centre(p: IsoPainter, s: ArchStyle, team: number, stage: number): void {
  const c = s.palette;
  const done = stage > WONDER_STAGES;
  const [u0, v0, u1, v1] = CENTRE;
  if (stage <= 2) {
    palaceBlock(p, s, CENTRE, Z0, stage === 1 ? Z0 + GROUND : 80, RAW, RAW);
    return;
  }
  palaceBlock(p, s, CENTRE, Z0, CENTRE_TOP, { bays: 3 }, { bays: 1, hidden: [[0, 1]] });
  const ctx = p.ctx;
  p.leftFace(u0, u1, v1, Z0, (w) => {
    if (!done) return;
    giltLine(ctx, [[0, -NOBLE + 4], [w, -NOBLE + 4]], 1.6);
    for (let x = 4; x < w; x += 3.5) {
      ctx.fillStyle = css(GILT, 0.9);
      ctx.fillRect(x, -NOBLE + 4, 0.8, 7);
    }
    crest(ctx, s, w / 2, -GROUND - 8, 6, team);
  }, CENTRE_TOP - Z0);
  mansard(p, s, CENTRE, CENTRE_TOP, 34, 12, 0.14, done);
  // Clock attic in front of the roof.
  const [a0, a1] = [1.82, 2.18];
  p.box(a0, v1 - 0.1, a1, v1, CENTRE_TOP, CENTRE_TOP + 26, { color: c.plaster }, c.trim);
  p.leftFace(a0, a1, v1, CENTRE_TOP, (w, h) => {
    if (done) clockFace(ctx, w / 2, -h * 0.5, 7);
    ctx.fillStyle = css(shade(c.trim, 1.05));
    ctx.fillRect(-1, -h - 2, w + 2, 3);
  }, 26);
  if (!done) return;
  statue(p, a0, v1, CENTRE_TOP + 26);
  statue(p, a1, v1, CENTRE_TOP + 26);
  const [x, y] = p.p((a0 + a1) / 2, v1, CENTRE_TOP + 34);
  sunburst(ctx, x, y, 5);
  p.addVolumePoint((a0 + a1) / 2, v1, CENTRE_TOP + 44);
  p.flag((u0 + u1) / 2, (v0 + v1) / 2 - 0.1, CENTRE_TOP + 46 * s.roof.pitch, 24, team, true);
}

function wing(p: IsoPainter, s: ArchStyle, b: Block, stage: number): void {
  if (stage <= 2) {
    const top = stage === 1 ? Z0 + 14 : 60;
    palaceBlock(p, s, b, Z0, top, RAW, RAW);
    if (stage === 2) scaffold(p, ...b, Z0, top);
    return;
  }
  // The left wing shows its court face (+u), the right one its outer face; their +v ends face the gate.
  palaceBlock(p, s, b, Z0, WING_TOP, { bays: 2 }, { bays: 5 });
  if (stage > WONDER_STAGES) roofBalustrade(p, b, WING_TOP, true);
  else scaffold(p, ...b, WING_TOP - 30, WING_TOP + 10);
}

function court(p: IsoPainter, s: ArchStyle): void {
  const ctx = p.ctx;
  p.box(0.12, 0.12, 3.88, 3.88, 0, Z0, { color: shade(s.palette.stone, 0.92), detail: 'stone' }, 0xd8cfba);
  // Marble court: black and white flags before the avant-corps.
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 3; j++) {
      if ((i + j) % 2) continue;
      const u = 1.1 + i * 0.3;
      const v = 1.65 + j * 0.2;
      p.ground(u, v, u + 0.3, v + 0.2, 0x45434a, Z0);
    }
  }
  ctx.strokeStyle = 'rgba(110,98,78,.25)';
  ctx.lineWidth = 1;
  for (let t = 0.3; t < 3.85; t += 0.3) {
    const a = p.p(0.12, t, Z0);
    const b = p.p(3.88, t, Z0);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
}

function paintPalace(p: IsoPainter, s: ArchStyle, team: number, stage: number): void {
  const done = stage > WONDER_STAGES;
  p.footShadow();
  p.ground(0.05, 0.05, 3.95, 3.95, 0x7d9150);
  court(p, s);
  corps(p, s, stage);
  centre(p, s, team, stage);
  if (done) fountain(p, 2.0, 2.5, Z0);
  wing(p, s, LEFT, stage);
  wing(p, s, RIGHT, stage);
  if (!done) {
    for (const [u, v] of [[3.2, 3.45], [3.45, 3.5], [3.3, 3.7], [1.6, 3.6]] as const) p.box(u, v, u + 0.18, v + 0.14, Z0, Z0 + 10, { color: 0xe0d7c2 }, 0xeee8da);
    crane(p, 3.55, 3.75, [0, 100, 135, 155][stage] ?? 155, 2.0, 1.0, stage === 3 ? 140 : 70);
    return;
  }
  royalGate(p, s, 1.05, 2.95, GATE_V, Z0, team);
  equestrian(p, s, 2.0, 3.62, Z0);
  parterre(p, 0.2, 3.35, 1.1, 3.9, Z0);
  parterre(p, 2.9, 3.35, 3.8, 3.9, Z0);
  lantern(p, 1.7, GATE_V + 0.04, 34, 1.6, 3.5);
  lantern(p, 2.3, GATE_V + 0.04, 34, 2.4, 3.5);
}

/** The French Wonder (age-3 style): finished in the team colour, or a construction stage. */
export function versaillesPalace(s: ArchStyle): WonderArt {
  return {
    size: 4,
    maxHeight: 190 + s.headroom,
    paint: (p, team) => paintPalace(p, s, team, WONDER_STAGES + 1),
    // No team colour shows while it is being built.
    paintStage: (p, stage) => paintPalace(p, s, 0xffffff, stage),
  };
}
