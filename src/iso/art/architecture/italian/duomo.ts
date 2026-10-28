import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { crest, R } from '../facade';
import { cypress } from '../kits/patio';
import { lantern } from '../parts';
import type { ArchStyle } from '../style';
import type { WonderArt } from '../types';
import { WONDER_STAGES } from '../wonder';
import { crane, scaffold } from '../wonderParts';
import { pointedOpening } from './comuneParts';
import { domeLantern, marbleFace, MARBLE, octaDome, octaPrism, ROSA, VERDE } from './duomoParts';
import { banner, block, brickWall, type Block } from './italianParts';

/*
 * The Italian Wonder: a Florentine cathedral (after Santa Maria del
 * Fiore). The marble-banded nave runs towards the viewer to a gabled
 * façade with its rose window and three portals; behind it the
 * transept and a domed tribune carry the octagonal drum with its oculi
 * and the great ribbed terracotta dome under a marble lantern; the
 * free-standing campanile rises beside the façade, clear of the dome.
 * Stages: footings, the walls risen in raw brick inside scaffolding, then
 * the nave roofed and the dome rising (with its crane) while the
 * campanile is still a scaffolded stump — the campanile and the marble
 * façade come last.
 */

const Z0 = 6;
const TRANSEPT: Block = [0.55, 0.4, 3.05, 1.72];
const TRANSEPT_TOP = 80;
const CROSSING = [1.8, 1.06] as const;
const DRUM_R = 0.84;
const DRUM_TOP = 122;
const DOME_H = 128;
const NAVE: Block = [1.15, 1.72, 2.45, 3.55];
const NAVE_TOP = 94;
const CAMPANILE: Block = [0.3, 2.85, 0.82, 3.37];
const CAMPANILE_TOP = 262;

function transept(p: IsoPainter, raw: boolean, stage: number, s: ArchStyle): void {
  const top = stage === 1 ? Z0 + 18 : TRANSEPT_TOP;
  if (raw) block(p, TRANSEPT, Z0, top, brickWall(s));
  else {
    const face = (light: number) => (w: number, h: number) => {
      marbleFace(p.ctx, w, h, light, 26);
      for (const x of [0.1, 0.86]) p.window(w * x, -h + 16, 7, 18, true);
    };
    block(p, TRANSEPT, Z0, top, { color: MARBLE }, face(1), face(R));
  }
  if (stage === 2) scaffold(p, ...TRANSEPT, top - 44, top);
}

/** Domed tribune on the transept's right arm. */
function tribune(p: IsoPainter, raw: boolean, stage: number, s: ArchStyle): void {
  if (stage < 2) return;
  octaPrism(p, 3.05, 1.06, 0.46, Z0, 64, false, raw ? s.palette.brick : MARBLE);
  if (!raw) octaDome(p, 3.05, 1.06, 0.46, 64, 40, 6);
}

function crossing(p: IsoPainter, s: ArchStyle, stage: number, done: boolean): void {
  if (stage < 2) return;
  const [u, v] = CROSSING;
  const drumTop = stage === 2 ? TRANSEPT_TOP + 22 : DRUM_TOP;
  octaPrism(p, u, v, DRUM_R, TRANSEPT_TOP, drumTop, stage >= 3, stage === 2 ? s.palette.brick : MARBLE);
  if (stage === 2) {
    scaffold(p, u - 0.6, v - 0.6, u + 0.6, v + 0.6, TRANSEPT_TOP, drumTop);
    return;
  }
  // Stage 3: the dome's lower webs, a crane on the rising shell; finished: the whole dome and the lantern.
  const eye = octaDome(p, u, v, DRUM_R, DRUM_TOP, DOME_H, done ? 8 : 4);
  if (done) domeLantern(p, u, v, eye, 0.15);
  else crane(p, u + 0.1, v + 0.1, eye - Z0 + 40, u - 0.3, v + 0.2, eye + 6);
}

function nave(p: IsoPainter, s: ArchStyle, team: number | null, stage: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  const top = stage === 1 ? Z0 + 16 : NAVE_TOP;
  const finished = stage > WONDER_STAGES;
  const clerestory = (light: number) => (w: number, h: number) => {
    marbleFace(ctx, w, h, light, 26);
    if (stage < 3) return;
    const n = Math.max(2, Math.round(w / 26));
    for (let i = 0; i < n; i++) {
      const x = ((i + 0.5) * w) / n - 4;
      if (i % 2) p.window(x, -h + 14, 8, 16, true);
      else pointedOpening(ctx, x, 8, 16, VERDE, light);
    }
  };
  const facade = (w: number, h: number) => {
    if (!finished) {
      // The façade stands in raw brick until the very end.
      ctx.fillStyle = css(shade(c.brick, 0.95));
      ctx.fillRect(0, -h, w, h);
      return;
    }
    marbleFace(ctx, w, h, 1, 18);
    // Three portals, a rose window and the owner's banners.
    for (const [x, pw, ph] of [[w * 0.12, 11, 22], [w / 2 - 8, 16, 30], [w * 0.88 - 11, 11, 22]] as const) pointedOpening(ctx, x, pw, ph, ROSA, 1, shade(c.doors.main, 0.9));
    ctx.fillStyle = css(VERDE);
    ctx.beginPath();
    ctx.arc(w / 2, -h + 22, 10, 0, Math.PI * 2);
    ctx.fill();
    p.window(w / 2 - 6, -h + 16, 12, 12);
    if (team !== null) for (const x of [w * 0.22, w * 0.72]) banner(ctx, x, -h + 18, 7, 20, team, 1);
  };
  if (stage <= 2) block(p, NAVE, Z0, top, brickWall(s));
  else block(p, NAVE, Z0, top, { color: MARBLE }, facade, clerestory(R));
  if (stage === 2) scaffold(p, ...NAVE, top - 44, top);
  if (stage < 3) return;
  const prev = p.material;
  p.material = 'tile';
  p.gableRoof(NAVE[0], NAVE[1], NAVE[2], NAVE[3], NAVE_TOP, 30, c.roof, finished ? MARBLE : c.brick, 'v', 0.06, (w, rise) => {
    if (!finished) return;
    ctx.fillStyle = css(VERDE);
    ctx.fillRect(w / 2 - 8, -rise * 0.55, 16, 2);
    if (team !== null) crest(ctx, s, w / 2, -rise * 0.36, 5.5, team);
  });
  p.material = prev;
}

function campanile(p: IsoPainter, s: ArchStyle, team: number | null, stage: number): void {
  const ctx = p.ctx;
  const done = stage > WONDER_STAGES;
  const top = done ? CAMPANILE_TOP : [0, Z0 + 12, Z0 + 40, 120][stage] ?? 120;
  if (!done) {
    block(p, CAMPANILE, Z0, top, brickWall(s));
    if (stage >= 2) scaffold(p, ...CAMPANILE, top - 40, top);
    return;
  }
  const face = (light: number) => (w: number, h: number) => {
    marbleFace(ctx, w, h, light, w / 2);
    // Gothic bifore and the tall trifora in the upper storeys.
    for (const y of [h * 0.55, h * 0.72]) {
      p.window(w / 2 - 5, -y - 18, 10, 18, true);
      ctx.fillStyle = css(shade(MARBLE, light * 1.05));
      ctx.fillRect(w / 2 - 0.8, -y - 18, 1.6, 18);
    }
    ctx.save();
    ctx.translate(0, -h + 46);
    pointedOpening(ctx, w / 2 - 7, 14, 34, VERDE, light, 0x2b2420);
    ctx.restore();
  };
  block(p, CAMPANILE, Z0, top, { color: MARBLE }, face(1), face(R));
  // The projecting cornice and its parapet.
  const [u0, v0, u1, v1] = CAMPANILE;
  p.box(u0 - 0.05, v0 - 0.05, u1 + 0.05, v1 + 0.05, top, top + 6, { color: MARBLE }, shade(MARBLE, 0.92));
  p.box(u0 - 0.05, v1 - 0.01, u1 + 0.05, v1 + 0.05, top + 6, top + 12, { color: MARBLE }, MARBLE);
  p.box(u1 - 0.01, v0 - 0.05, u1 + 0.05, v1 + 0.05, top + 6, top + 12, { color: MARBLE }, MARBLE);
  if (team !== null) p.flag((u0 + u1) / 2, (v0 + v1) / 2, top + 6, 26, team, true);
}

function paintDuomo(p: IsoPainter, s: ArchStyle, team: number | null, stage: number): void {
  const done = stage > WONDER_STAGES;
  const raw = stage <= 2;
  p.footShadow();
  p.ground(0.05, 0.05, 3.95, 3.95, 0xd7cdb8);
  p.box(0.25, 0.25, 3.75, 3.75, 0, Z0, { color: MARBLE, detail: 'stone' }, 0xe2dccd);
  transept(p, raw, stage, s);
  crossing(p, s, stage, done);
  tribune(p, raw, stage, s);
  campanile(p, s, team, stage);
  nave(p, s, team, stage);
  if (!done) {
    for (const [u, v] of [[2.9, 3.4], [3.15, 3.5], [3.0, 3.15]] as const) p.box(u, v, u + 0.2, v + 0.14, Z0, Z0 + 9, { color: MARBLE }, MARBLE);
    if (stage < 3) crane(p, 0.75, 2.6, [0, 110, 150][stage] ?? 150, 1.4, 2.2, 60);
    return;
  }
  for (const u of [2.9, 3.3]) cypress(p, u, 3.55, Z0, 44);
  lantern(p, 1.15, 3.58, 28, 1.0, 3.85);
  lantern(p, 2.45, 3.58, 28, 2.5, 3.85);
}

/** The Italian Wonder (age-3 style): the Florentine Duomo, finished in the team colour, or a construction stage. */
export function duomo(s: ArchStyle): WonderArt {
  return {
    size: 4,
    maxHeight: 330,
    paint: (p, team) => paintDuomo(p, s, team, WONDER_STAGES + 1),
    // No team colour shows while it is being built.
    paintStage: (p, stage) => paintDuomo(p, s, null, stage),
  };
}
