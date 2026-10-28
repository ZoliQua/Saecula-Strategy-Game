import type { IsoPainter } from '../../isoPainter';
import { N_LEFT } from '../../lighting/viewSpace';
import { css, shade } from '../../palette';
import { R } from '../facade';
import { lantern } from '../parts';
import { finial } from '../roofs';
import type { ArchStyle } from '../style';
import type { WonderArt } from '../types';
import { WONDER_STAGES } from '../wonder';
import { flyingButtress, headstones, lancet, octSpire, pinnacle, pointedArch, portal, roseWindow, treadwheelCrane, yew } from './cathedralParts';
import { churned, lodge, raggedCourses, scaffoldAround, shellTop, stonePile, trusses, type Block } from './cathedralWorks';
import { hangingBanner } from '../families/familyParts';

/*
 * The English Wonder: a Gothic cathedral in its close (after Salisbury)
 * — a cruciform church of pale limestone under lead, the nave and its
 * aisles held by flying buttresses, a crossing tower carrying a tall
 * octagonal spire, a west front with a rose window over three pointed
 * portals between pinnacled turrets. At night the nave glows through
 * the rose and the lancets. Stages: foundations with the treadwheel
 * crane, then the half-built nave and west front, then the whole church
 * with the spire still in scaffolding.
 */

const BASE = 6;
const WALL = 96;
const AISLE = 56;
const RISE = 54;
const TOWER_TOP = 214;
const SPIRE = 166;
const TURRET_TOP = 170;
const GABLE = 54;
const FRONT_TOP = 118;

const CHOIR: Block = [1.4, 0.35, 2.4, 1.5];
const TRANS_L: Block = [0.55, 1.5, 1.5, 2.25];
const TOWER: Block = [1.5, 1.48, 2.3, 2.28];
const TRANS_R: Block = [2.3, 1.5, 3.3, 2.25];
const AISLE_L: Block = [1.0, 2.25, 1.4, 3.4];
const NAVE: Block = [1.4, 2.25, 2.4, 3.4];
const AISLE_R: Block = [2.4, 2.25, 2.8, 3.4];
const TURRET_L: Block = [0.92, 3.3, 1.27, 3.66];
const FRONT: Block = [1.25, 3.4, 2.55, 3.6];
const TURRET_R: Block = [2.53, 3.3, 2.88, 3.66];

interface Look {
  readonly stone: number;
  readonly lead: number;
  readonly s: ArchStyle;
}

/** How a face's bays are opened: glazed lancets, or blind niches where the face is hidden (no glow behind a roof). */
type Glazing = 'glass' | 'blind' | ((bay: number) => 'glass' | 'blind');

interface WallOpts {
  /** Unglazed openings (a stage under construction). */
  readonly empty?: boolean;
  /** Lancet sill above the wall foot and lancet height (art px). */
  readonly sill?: number;
  readonly lh?: number;
  /** Paired lancets in each bay. */
  readonly twin?: boolean;
  readonly left?: Glazing;
  readonly right?: Glazing;
}

/** Blind pointed niche (no glass, no glow). */
function niche(p: IsoPainter, stone: number, x: number, y0: number, w: number, h: number, light: number): void {
  pointedArch(p.ctx, x, y0, w, h);
  p.ctx.fillStyle = css(shade(stone, light * 0.7));
  p.ctx.fill();
}

/** Buttressed bays on a face: pale buttress strips with set-offs and a lancet (or niche) in each bay. */
function bays(p: IsoPainter, k: Look, w: number, h: number, light: number, o: WallOpts, glazing: Glazing): void {
  const ctx = p.ctx;
  const sill = o.sill ?? 14;
  const n = Math.max(1, Math.round(w / 28));
  const bw = w / n;
  for (let i = 0; i <= n; i++) {
    const x = Math.min(w - 5, Math.max(0, i * bw - 2.5));
    ctx.fillStyle = css(shade(k.stone, light * 1.12));
    ctx.fillRect(x, -h, 5, h);
    ctx.fillStyle = css(shade(k.stone, light * 0.62));
    for (let y = 26; y < h; y += 30) ctx.fillRect(x, -y, 5, 1.6);
  }
  if (h - sill < 18) return;
  const hh = Math.min(o.lh ?? 46, h - sill - 8);
  for (let i = 0; i < n; i++) {
    const cx = bw * (i + 0.5);
    const mode = typeof glazing === 'function' ? glazing(i) : glazing;
    const lights: ReadonlyArray<readonly [number, number]> = o.twin ? [[cx - 6, 5], [cx + 1, 5]] : [[cx - 3.5, 7]];
    for (const [x, lw] of lights) {
      if (mode === 'blind') niche(p, k.stone, x, -sill, lw, hh, light);
      else lancet(p, k.stone, x, -sill, lw, hh, light, o.empty ?? false);
    }
  }
}

/** Stone walls of a block from BASE to z1 with buttressed bays on its visible faces. */
function walls(p: IsoPainter, k: Look, b: Block, z1: number, o: WallOpts = {}): void {
  const [u0, v0, u1, v1] = b;
  p.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, BASE, { color: shade(k.stone, 0.85), detail: 'stone' }, k.stone);
  p.box(u0, v0, u1, v1, BASE, z1, { color: k.stone, detail: 'stone' });
  const h = z1 - BASE;
  p.leftFace(u0, u1, v1, BASE, (w) => bays(p, k, w, h, 1, o, o.left ?? 'glass'), h);
  p.rightFace(v0, v1, u1, BASE, (w) => bays(p, k, w, h, R, o, o.right ?? 'glass'), h);
}

function leadRoof(p: IsoPainter, k: Look, [u0, v0, u1, v1]: Block, axis: 'u' | 'v', detail?: (w: number, rise: number) => void): void {
  p.material = 'copper';
  p.gableRoof(u0, v0, u1, v1, WALL, RISE, k.lead, k.stone, axis, 0.04, detail);
}

/** Lean-to aisle roof falling from the clerestory (at uHigh) to the aisle wall head. */
function aisleRoof(p: IsoPainter, k: Look, [u0, v0, u1, v1]: Block, right: boolean): void {
  const hi = AISLE + 16;
  const pts = right
    ? [p.p(u0, v0, hi), p.p(u1 + 0.04, v0, AISLE), p.p(u1 + 0.04, v1, AISLE), p.p(u0, v1, hi)]
    : [p.p(u0 - 0.04, v0, AISLE), p.p(u1, v0, hi), p.p(u1, v1, hi), p.p(u0 - 0.04, v1, AISLE)];
  p.fillPoly(pts, css(shade(k.lead, right ? 0.8 : 0.95)));
  p.normals.fill(pts, p.slope(right ? 1 : -1, 0, u1 - u0, 16));
  p.strokePoly(pts, css(shade(k.lead, 0.5), 0.6), 1);
}

/** Crossing tower: two stages of twin lancets, corner buttresses, a pierced parapet and corner pinnacles. */
function crossingTower(p: IsoPainter, k: Look, top: number, empty: boolean): void {
  const [u0, v0, u1, v1] = TOWER;
  p.box(u0, v0, u1, v1, WALL, top, { color: k.stone, detail: 'stone' });
  const h = top - WALL;
  const face = (light: number) => (w: number) => {
    const ctx = p.ctx;
    for (const x of [0, w - 6]) {
      ctx.fillStyle = css(shade(k.stone, light * 1.14));
      ctx.fillRect(x, -h, 6, h);
    }
    ctx.fillStyle = css(shade(k.stone, light * 1.1));
    for (const y of [h * 0.42, h - 6]) ctx.fillRect(0, -y - 3, w, 3);
    if (h < 60) return;
    // Belfry lights above; the lower stage, hidden behind the roofs, has blind arcading.
    for (const x of [w * 0.28, w * 0.58]) {
      lancet(p, k.stone, x, -(h * 0.42 + 6), 6, h * 0.5, light, empty);
      niche(p, k.stone, x, -10, 6, h * 0.32, light);
    }
  };
  p.leftFace(u0, u1, v1, WALL, face(1), h);
  p.rightFace(v0, v1, u1, WALL, face(R), h);
  p.ground(u0, v0, u1, v1, shade(k.lead, 0.9), top);
  if (h < 60) return;
  for (const [u, v] of [[u0 + 0.06, v0 + 0.06], [u1 - 0.06, v0 + 0.06], [u0 + 0.06, v1 - 0.06], [u1 - 0.06, v1 - 0.06]] as const) {
    pinnacle(p, u, v, top, 0.1, 10, 26, k.stone);
  }
}

/** West front: three portals, an arcaded band, the rose window and the gable with its niche and cross. */
function westFront(p: IsoPainter, k: Look, team: number, stage: number): void {
  const [u0, v0, u1, v1] = FRONT;
  const done = stage > WONDER_STAGES;
  const top = stage === 2 ? 100 : FRONT_TOP;
  p.box(u0, v0 - 0.15, u1, v1, 0, BASE, { color: shade(k.stone, 0.85), detail: 'stone' }, k.stone);
  p.box(u0, v0, u1, v1, BASE, top, { color: k.stone, detail: 'stone' });
  p.leftFace(u0, u1, v1, BASE, (w) => {
    const ctx = p.ctx;
    portal(p, k.stone, w / 2 - 11, 22, 42, k.s.palette.doors.main);
    for (const x of [w * 0.16, w * 0.84 - 14]) portal(p, k.stone, x, 14, 30, k.s.palette.doors.main);
    // Arcaded band of blind niches over the portals.
    ctx.fillStyle = css(shade(k.stone, 0.72));
    for (let x = 5; x < w - 6; x += 9) ctx.fillRect(x, -60, 5, 9);
    roseWindow(p, k.stone, w / 2, -(86 - BASE), 22, 1, stage < WONDER_STAGES);
    if (done) for (const x of [3, w - 13]) hangingBanner(ctx, x, -58, 10, 24, team);
  }, top - BASE);
  if (stage === 2) return;
  const gable = [p.p(u0, v1, top), p.p(u1, v1, top), p.p((u0 + u1) / 2, v1, top + GABLE)];
  p.fillPoly(gable, css(k.stone));
  p.normals.fill(gable, N_LEFT);
  p.strokePoly(gable, css(shade(k.stone, 1.18)), 2.4);
  p.leftFace(u0, u1, v1, top, (w) => {
    lancet(p, k.stone, w / 2 - 9, -6, 5, 26, 1, stage < WONDER_STAGES);
    lancet(p, k.stone, w / 2 - 2.5, -6, 5, 32, 1, stage < WONDER_STAGES);
    lancet(p, k.stone, w / 2 + 4, -6, 5, 26, 1, stage < WONDER_STAGES);
  }, GABLE);
  finial(p, (u0 + u1) / 2, v1, top + GABLE, 12, false);
  p.addVolumePoint((u0 + u1) / 2, v1, top + GABLE);
}

/** Square west turret with buttress set-offs and blind lancets; an octagonal spirelet when finished. */
function turret(p: IsoPainter, k: Look, b: Block, top: number, spirelet: boolean, team: number, empty = false): void {
  walls(p, k, b, top, { sill: 70, lh: 50, empty });
  const [u0, v0, u1, v1] = b;
  if (!spirelet) {
    shellTop(p, b, top, k.stone);
    return;
  }
  const uc = (u0 + u1) / 2;
  const vc = (v0 + v1) / 2;
  octSpire(p, uc, vc, 0.17, top, 46, shade(k.stone, 0.95));
  p.flag(uc, vc, top + 46, 20, team);
}

function paintCathedral(p: IsoPainter, s: ArchStyle, team: number, stage: number): void {
  const c = s.palette;
  const k: Look = { stone: shade(c.ashlar, 0.93), lead: c.metal, s };
  const done = stage > WONDER_STAGES;
  p.footShadow();
  p.ground(0.05, 0.05, 3.95, 3.95, 0x67873f);
  if (stage <= 2) churned(p, 0.4, 0.2, 3.5, 3.75);
  else {
    p.ground(1.6, 3.6, 2.2, 3.95, 0xc9bfa4);
    headstones(p, 0.4, 2.5, 3.6, 0xa8a294);
    headstones(p, 3.45, 2.5, 3.6, 0xa8a294);
  }
  yew(p, 0.35, 0.5, 34);
  yew(p, 3.6, 0.9, 30);
  if (stage === 1) {
    for (const b of [CHOIR, [0.55, 1.5, 3.3, 2.25] as Block, [1.0, 2.25, 2.8, 3.4] as Block]) {
      walls(p, k, b, 22, { empty: true });
      shellTop(p, b, 22, k.stone);
    }
    for (const [u, v] of [[1.5, 1.48], [2.16, 1.48], [1.5, 2.14], [2.16, 2.14]] as const) p.box(u, v, u + 0.14, v + 0.14, 22, 64, { color: k.stone, detail: 'stone' }, k.stone);
    scaffoldAround(p, TOWER, 22, 64);
    walls(p, k, FRONT, 30, { empty: true });
    lodge(p, 3.0, 0.25, 3.7, 0.8, c.timber, c.thatch);
    stonePile(p, 3.25, 2.6, 0xddd2bb);
    treadwheelCrane(p, 3.3, 3.35, 120, 2.2, 2.6, 60, c.timber);
    return;
  }
  // Choir and transepts.
  walls(p, k, CHOIR, WALL, { empty: stage === 2, lh: 54, left: 'blind' });
  if (stage === 2) {
    shellTop(p, CHOIR, WALL, k.stone);
    trusses(p, CHOIR, WALL, RISE);
  } else leadRoof(p, k, CHOIR, 'v');
  if (stage === 2) {
    for (const b of [TRANS_L, TRANS_R]) {
      walls(p, k, b, 60, { empty: true });
      shellTop(p, b, 60, k.stone);
      raggedCourses(p, b, 60, 84, k.stone);
    }
    for (const [u, v] of [[1.5, 1.48], [2.16, 1.48], [1.5, 2.14], [2.16, 2.14]] as const) p.box(u, v, u + 0.14, v + 0.14, BASE, WALL + 10, { color: k.stone, detail: 'stone' }, k.stone);
    scaffoldAround(p, TOWER, 60, WALL + 10);
    walls(p, k, AISLE_L, 40, { empty: true });
    shellTop(p, [1.0, 2.25, 2.8, 3.4], 40, k.stone);
    walls(p, k, NAVE, 40, { empty: true });
    shellTop(p, NAVE, 40, k.stone);
    raggedCourses(p, NAVE, 40, 88, k.stone);
    walls(p, k, AISLE_R, 40, { empty: true });
    raggedCourses(p, AISLE_R, 40, AISLE, k.stone);
    turret(p, k, TURRET_L, 110, false, team, true);
    westFront(p, k, team, stage);
    shellTop(p, FRONT, 100, k.stone);
    turret(p, k, TURRET_R, 110, false, team, true);
    scaffoldAround(p, FRONT, BASE, 100);
    stonePile(p, 3.25, 2.7, 0xddd2bb);
    treadwheelCrane(p, 3.35, 3.4, 170, 2.3, 2.9, 110, c.timber);
    return;
  }
  walls(p, k, TRANS_L, WALL, { lh: 54, twin: true, left: (i) => (i === 0 ? 'glass' : 'blind'), right: 'blind' });
  leadRoof(p, k, TRANS_L, 'u');
  crossingTower(p, k, TOWER_TOP, false);
  const spire = done ? 1 : 0.42;
  const apex = octSpire(p, 1.9, 1.88, 0.36, TOWER_TOP, SPIRE, shade(k.stone, 0.96), spire);
  if (done) finial(p, 1.9, 1.88, TOWER_TOP + SPIRE, 16, false);
  else {
    scaffoldAround(p, [1.62, 1.6, 2.18, 2.16], TOWER_TOP, TOWER_TOP + SPIRE * 0.5);
    p.ctx.fillStyle = '#ddd2bb';
    p.ctx.fillRect(apex[0] - 4, apex[1] - 4, 8, 4);
  }
  walls(p, k, TRANS_R, WALL, { lh: 54, twin: true, left: 'blind' });
  leadRoof(p, k, TRANS_R, 'u', (w, rise) => roseWindow(p, k.stone, w / 2, -rise * 0.4, Math.min(11, rise * 0.22), R));
  walls(p, k, AISLE_L, AISLE, { sill: 12, lh: 30, left: 'blind', right: 'blind' });
  aisleRoof(p, k, AISLE_L, false);
  walls(p, k, NAVE, WALL, { sill: AISLE - BASE + 20, lh: 26, twin: true, left: 'blind' });
  leadRoof(p, k, NAVE, 'v');
  walls(p, k, AISLE_R, AISLE, { sill: 12, lh: 30, left: 'blind' });
  aisleRoof(p, k, AISLE_R, true);
  for (const v of [2.45, 2.8, 3.15]) flyingButtress(p, 2.9, 2.4, v, AISLE + 18, WALL - 8, k.stone);
  turret(p, k, TURRET_L, TURRET_TOP, done, team);
  westFront(p, k, team, stage);
  turret(p, k, TURRET_R, TURRET_TOP, done, team);
  if (done) {
    lantern(p, 1.62, 3.62, 30, 1.62, 3.9);
    lantern(p, 2.18, 3.62, 30, 2.18, 3.9);
    yew(p, 0.45, 3.6, 28);
    return;
  }
  for (const b of [TURRET_L, TURRET_R]) scaffoldAround(p, b, TURRET_TOP - 40, TURRET_TOP + 10);
  treadwheelCrane(p, 3.45, 2.6, 236, 2.15, 2.0, TOWER_TOP + 40, c.timber);
}

/** The English Wonder (age-3 style): finished in the team colour, or a construction stage. */
export function gothicCathedral(s: ArchStyle): WonderArt {
  return {
    size: 4,
    maxHeight: 410,
    paint: (p, team) => paintCathedral(p, s, team, WONDER_STAGES + 1),
    // No team colour shows while it is being built.
    paintStage: (p, stage) => paintCathedral(p, s, 0xffffff, stage),
  };
}
