import type { IsoPainter } from '../isoPainter';
import { css, shade } from '../palette';
import { baroqueBlock, volutedGable } from './baroqueParts';
import { archedOpening, baroqueWindow, clockFace, cornice } from './facade';
import { lantern } from './parts';
import type { ArchStyle } from './style';
import { styledGable } from './styledRoofs';
import type { WonderArt } from './types';
import { balustrade, crane, dome, fountain, parterre, scaffold, statue, towerHelm } from './wonderParts';

/** Construction stages shown while the Wonder is built; WONDER_STAGES + 1 is the finished basilica. */
export const WONDER_STAGES = 3;

/** Scaffolding stage (1…WONDER_STAGES) for construction progress t in 0..1. */
export function wonderStage(t: number): number {
  return Math.min(WONDER_STAGES, Math.max(1, Math.floor(t * WONDER_STAGES) + 1));
}

const RAW_BRICK = 0xa8603f;
const NAVE_TOP = 96;
const TOWER_TOP = 186;
const FRONT_TOP = 124;

type Block = readonly [u0: number, v0: number, u1: number, v1: number];
const LEFT_ARM: Block = [0.5, 1.05, 1.15, 1.95];
const NAVE: Block = [1.15, 0.45, 2.85, 2.85];
const RIGHT_ARM: Block = [2.85, 1.05, 3.5, 1.95];
const LEFT_TOWER: Block = [0.95, 2.55, 1.55, 3.15];
const FRONT: Block = [1.55, 2.7, 2.45, 3.25];
const RIGHT_TOWER: Block = [2.45, 2.55, 3.05, 3.15];

/** Unplastered brick walls with dark window holes (early stages). */
function rawBlock(p: IsoPainter, s: ArchStyle, [u0, v0, u1, v1]: Block, z1: number): void {
  p.box(u0, v0, u1, v1, 12, z1, { color: RAW_BRICK, detail: 'brick' }, shade(RAW_BRICK, 0.9));
  const holes = (w: number, h: number) => {
    for (let x = 10; x < w - 14; x += 24) if (h > 40) archedOpening(p.ctx, x, 9, Math.min(26, h - 20), s.palette.stone, 0x1d140d);
  };
  p.leftFace(u0, u1, v1, 12, holes, z1 - 12);
  p.rightFace(v0, v1, u1, 12, holes, z1 - 12);
  // Hollow shell: the shadowed inside of the walls shows from above.
  const t = 0.07;
  const inner = [p.p(u0 + t, v0 + t, z1), p.p(u1 - t, v0 + t, z1), p.p(u1 - t, v1 - t, z1), p.p(u0 + t, v1 - t, z1)];
  const ys = inner.map((q) => q[1]);
  const g = p.ctx.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys));
  g.addColorStop(0, css(shade(RAW_BRICK, 0.35)));
  g.addColorStop(1, css(shade(RAW_BRICK, 0.6)));
  p.fillPoly(inner, g);
}

/** Bare roof trusses over the nave (stage 2). */
function trusses(p: IsoPainter): void {
  const ctx = p.ctx;
  const [u0, v0, u1, v1] = NAVE;
  const um = (u0 + u1) / 2;
  ctx.strokeStyle = '#8a6238';
  ctx.lineWidth = 2;
  for (let v = v0 + 0.1; v <= v1; v += 0.3) {
    const a = p.p(u0, v, NAVE_TOP);
    const m = p.p(um, v, NAVE_TOP + 40);
    const b = p.p(u1, v, NAVE_TOP);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(m[0], m[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.lineTo(a[0], a[1]);
    ctx.stroke();
  }
  const r0 = p.p(um, v0, NAVE_TOP + 40);
  const r1 = p.p(um, v1, NAVE_TOP + 40);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(r0[0], r0[1]);
  ctx.lineTo(r1[0], r1[1]);
  ctx.stroke();
}

/** Plastered façade tower: portal storey, clock stage, open belfry; helm when finished. */
function facadeTower(p: IsoPainter, s: ArchStyle, [u0, v0, u1, v1]: Block, done: boolean): void {
  baroqueBlock(p, s, u0, v0, u1, v1, 12, 104, {
    left: (w, h, l) => {
      baroqueWindow(p, s, w / 2 - 6, -h + 18, 12, 24, l);
      p.window(w / 2 - 4, -40, 8, 16, true);
    },
    right: (w, h, l) => baroqueWindow(p, s, w / 2 - 6, -h + 18, 12, 24, l),
  });
  baroqueBlock(p, s, u0 + 0.04, v0 + 0.04, u1 - 0.04, v1 - 0.04, 104, 148, {
    plinth: 0,
    left: (w) => clockFace(p.ctx, w / 2, -24, 9),
    right: (w) => clockFace(p.ctx, w / 2, -24, 8),
  });
  baroqueBlock(p, s, u0 + 0.08, v0 + 0.08, u1 - 0.08, v1 - 0.08, 148, TOWER_TOP, {
    plinth: 0,
    left: (w, h) => archedOpening(p.ctx, w / 2 - 6, 12, h - 8, s.palette.trim, 0x18120d),
    right: (w, h) => archedOpening(p.ctx, w / 2 - 6, 12, h - 8, s.palette.trim, 0x18120d, 0.75),
  });
  if (done) towerHelm(p, s, (u0 + u1) / 2, (v0 + v1) / 2, TOWER_TOP);
}

/** Central frontispiece: portal, great window, team banners and the voluted gable with the crest. */
function frontispiece(p: IsoPainter, s: ArchStyle, team: number, done: boolean): void {
  const [u0, v0, u1, v1] = FRONT;
  const ctx = p.ctx;
  baroqueBlock(p, s, u0, v0, u1, v1, 12, FRONT_TOP, {
    bays: 2,
    left: (w, h, l) => {
      archedOpening(ctx, w / 2 - 13, 26, 40, s.palette.trim, 0x2a1c12, l);
      p.door(w / 2 - 10, 20, 34, 0x4a2a14);
      cornice(ctx, w, 52, s.palette.trim, l, 4);
      baroqueWindow(p, s, w / 2 - 9, -h + 16, 18, 34, l);
      if (!done) return;
      for (const x of [8, w - 16]) {
        ctx.fillStyle = css(shade(team, 1.05));
        ctx.fillRect(x, -h + 14, 8, 40);
        ctx.fillStyle = '#d9b14a';
        ctx.fillRect(x, -h + 14, 8, 2);
        ctx.beginPath();
        ctx.moveTo(x, -h + 54);
        ctx.lineTo(x + 4, -h + 49);
        ctx.lineTo(x + 8, -h + 54);
        ctx.fill();
      }
    },
    right: (w, h, l) => baroqueWindow(p, s, w / 2 - 6, -h + 18, 12, 26, l),
  });
  volutedGable(p, s, u0 + 0.05, u1 - 0.05, v1, FRONT_TOP, 46, s.palette.plaster, team);
  if (!done) return;
  for (const u of [u0 + 0.06, u1 - 0.06]) statue(p, u, v1, FRONT_TOP);
  statue(p, (u0 + u1) / 2, v1, FRONT_TOP + 46);
  lantern(p, u0 + 0.12, v1 + 0.02, 34, u0 + 0.12, v1 + 0.35);
  lantern(p, u1 - 0.12, v1 + 0.02, 34, u1 - 0.12, v1 + 0.35);
}

function transeptArm(p: IsoPainter, s: ArchStyle, [u0, v0, u1, v1]: Block, right: boolean): void {
  baroqueBlock(p, s, u0, v0, u1, v1, 12, 86, {
    left: (w, h, l) => baroqueWindow(p, s, w / 2 - 7, -h + 20, 14, 30, l),
    right: (w, h, l) => baroqueWindow(p, s, w / 2 - 8, -h + 20, 16, 34, l),
  });
  p.material = 'slate';
  styledGable(p, s, u0, v0, u1, v1, 86, 32, s.palette.roofAlt, s.palette.plaster, 'u', 0.08, right ? (w, rise) => {
    p.ctx.fillStyle = css(s.palette.trim);
    p.ctx.beginPath();
    p.ctx.ellipse(w / 2, -rise * 0.42, 6, 7.5, 0, 0, Math.PI * 2);
    p.ctx.fill();
    p.window(w / 2 - 3.5, -rise * 0.42 - 5, 7, 10, true);
  } : undefined);
}

/**
 * The Wonder at a construction stage (1…WONDER_STAGES) or finished
 * (WONDER_STAGES + 1): a baroque basilica on a stone podium —
 * twin onion-helmed façade towers, a voluted frontispiece with the
 * owner's crest and banners, transept, and a copper dome on a windowed
 * drum. Stages: raw brick walls with a crane, then full-height walls
 * under bare trusses, then plastered and roofed with the dome's timber
 * centring and scaffolded towers.
 */
function paintWonder(p: IsoPainter, s: ArchStyle, team: number, stage: number): void {
  const c = s.palette;
  const done = stage > WONDER_STAGES;
  p.footShadow();
  p.box(0.05, 0.05, 3.95, 3.95, 0, 6, { color: shade(c.stone, 0.92), detail: 'stone' }, c.stone);
  p.box(0.2, 0.2, 3.8, 3.8, 6, 12, { color: c.stone, detail: 'stone' }, 0xd2c8b2);
  paving(p);
  if (stage <= 2) {
    const h = stage === 1 ? 50 : NAVE_TOP;
    const towers = stage === 1 ? 50 : 140;
    rawBlock(p, s, LEFT_ARM, stage === 1 ? 50 : 86);
    rawBlock(p, s, NAVE, h);
    if (stage === 2) trusses(p);
    rawBlock(p, s, RIGHT_ARM, stage === 1 ? 50 : 86);
    rawBlock(p, s, LEFT_TOWER, towers);
    rawBlock(p, s, FRONT, stage === 1 ? 50 : FRONT_TOP);
    rawBlock(p, s, RIGHT_TOWER, towers);
    scaffold(p, ...LEFT_TOWER, 12, towers);
    scaffold(p, ...RIGHT_TOWER, 12, towers);
    scaffold(p, FRONT[0], FRONT[1], FRONT[2], FRONT[3], 12, stage === 1 ? 50 : FRONT_TOP);
    stoneBlocks(p);
    crane(p, 0.45, 3.5, 160, 1.6, 2.2, stage === 1 ? 70 : 130);
    return;
  }
  if (done) parterre(p, 0.3, 2.05, 0.88, 3.65, 12);
  transeptArm(p, s, LEFT_ARM, false);
  baroqueBlock(p, s, ...NAVE, 12, NAVE_TOP, {
    bays: 5,
    left: (w, h, l) => baroqueWindow(p, s, w / 2 - 7, -h + 20, 14, 32, l),
    right: (w, h, l) => {
      for (let i = 0; i < 5; i++) baroqueWindow(p, s, (w / 5) * (i + 0.5) - 7, -h + 20, 14, 32, l);
    },
  });
  p.material = 'slate';
  styledGable(p, s, ...NAVE, NAVE_TOP, 40, c.roofAlt, c.plaster, 'v', 0.08);
  transeptArm(p, s, RIGHT_ARM, true);
  dome(p, s, 2.0, 1.5, 118, done);
  facadeTower(p, s, LEFT_TOWER, done);
  frontispiece(p, s, team, done);
  facadeTower(p, s, RIGHT_TOWER, done);
  if (done) {
    parterre(p, 3.1, 2.15, 3.7, 3.7, 12);
    fountain(p, 2.0, 3.55, 12);
    balustrade(p, 0.22, 0.22, 3.78, 3.78, 12);
    return;
  }
  {
    scaffold(p, LEFT_TOWER[0] + 0.08, LEFT_TOWER[1] + 0.08, LEFT_TOWER[2] - 0.08, LEFT_TOWER[3] - 0.08, 140, TOWER_TOP + 20);
    scaffold(p, RIGHT_TOWER[0] + 0.08, RIGHT_TOWER[1] + 0.08, RIGHT_TOWER[2] - 0.08, RIGHT_TOWER[3] - 0.08, 140, TOWER_TOP + 20);
    crane(p, 0.45, 3.5, 200, 1.25, 2.85, 190);
  }
}

/** Stone flags on the podium. */
function paving(p: IsoPainter): void {
  const ctx = p.ctx;
  ctx.strokeStyle = 'rgba(120,108,88,.3)';
  ctx.lineWidth = 1;
  for (let t = 0.45; t < 3.8; t += 0.25) {
    for (const [a, b] of [[p.p(t, 0.2, 12), p.p(t, 3.8, 12)], [p.p(0.2, t, 12), p.p(3.8, t, 12)]] as const) {
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
  }
}

/** Dressed stone blocks waiting on the podium. */
function stoneBlocks(p: IsoPainter): void {
  for (const [u, v] of [[3.2, 3.2], [3.45, 3.25], [3.3, 3.5], [3.35, 2.9]] as const) {
    p.box(u, v, u + 0.18, v + 0.14, 12, 22, { color: 0xddd2bb }, 0xece4d2);
  }
}

/** The baroque Wonder (the age-3 only building): finished in the team colour, or a scaffolding stage. */
export function wonderArt(s: ArchStyle): WonderArt {
  return {
    size: 4,
    maxHeight: 310 + s.headroom,
    paint: (p, team) => paintWonder(p, s, team, WONDER_STAGES + 1),
    // No team colour shows while it is being built.
    paintStage: (p, stage) => paintWonder(p, s, 0xffffff, stage),
  };
}
