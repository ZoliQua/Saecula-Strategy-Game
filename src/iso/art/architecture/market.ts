import type { IsoPainter } from '../isoPainter';
import { css, mix, shade } from '../palette';
import { archedOpening, cornice, quoins, R } from './facade';
import { hasOnionDomes, onionDome } from './kits/onionDome';
import type { ArchStyle } from './style';
import { roofLift, styledGable, styledHip } from './styledRoofs';
import type { BuildingArt } from './types';

/** Native rise of the market hall's roof. */
const HALL_RISE = 32;
/** Height of the open arcade (ground floor) and of the hall's eave. */
const ARCADE_TOP = 36;
const HALL_EAVE = 68;
const CANVAS = 0xeee2c4;
const WOOD = 0x8a6440;
const DARK_WOOD = 0x5a3e28;
const BURLAP = 0xb89a66;
/** Awning stripe colours of the stalls that do not fly the team colour. */
const CLOTHS = [0xb23a2e, 0x3f6f8e, 0x6d8a36] as const;
/** Produce piled on the stall counters (apples, cabbages, bread, onions). */
const PRODUCE = [0xc0392b, 0x7aa33c, 0xc9924a, 0xd9b86a] as const;

/**
 * Market (piac, M17), shared by every style and painted from its palette,
 * roof profile and ornaments (the monastery and dock precedent): a market
 * hall whose open arcaded ground floor carries a rendered upper floor and
 * the style's roof with a small lantern (a gilt onion in onion styles), on
 * a paved square with four stalls under striped cloth awnings (the middle
 * one in the team colour), crates, barrels and grain sacks. A family may
 * later give it its own painter.
 */
export function marketArt(s: ArchStyle): BuildingArt {
  const c = s.palette;
  const corners = (ctx: CanvasRenderingContext2D, w: number, h: number, light: number) => {
    if (s.ornaments.quoins) quoins(ctx, w, h, c.trim, light);
  };
  return {
    size: 3,
    maxHeight: 190 + s.headroom,
    paint: (p, team) => {
      const ctx = p.ctx;
      p.footShadow();
      paving(p, shade(mix(c.stone, c.ashlar, 0.5), 1.08));
      // Market hall (behind): open arcade below, rendered upper floor with windows.
      const [u0, v0, u1, v1] = [0.25, 0.25, 2.25, 1.4];
      p.box(u0, v0, u1, v1, 0, ARCADE_TOP, { color: c.ashlar, detail: 'stone' });
      const arcade = (light: number, bays: number) => (w: number, h: number) => {
        corners(ctx, w, h, light);
        const bay = w / bays;
        for (let i = 0; i < bays; i++) archedOpening(ctx, bay * i + bay * 0.2, bay * 0.6, h - 9, shade(c.trim, 0.95), 0x2a2018, light);
        hallInterior(ctx, w, bays, light);
      };
      p.leftFace(u0, u1, v1, 0, arcade(1, 5), ARCADE_TOP);
      p.rightFace(v0, v1, u1, 0, arcade(R, 3), ARCADE_TOP);
      p.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, ARCADE_TOP, HALL_EAVE, { color: c.plaster });
      const upper = (light: number, bays: number) => (w: number, h: number) => {
        corners(ctx, w, h, light);
        cornice(ctx, w, 0, c.trim, light, 4);
        cornice(ctx, w, h - 4, c.trim, light, 4);
        for (let i = 0; i < bays; i++) p.window((w / bays) * (i + 0.5) - 4, -h + 9, 8, 13, true);
      };
      p.leftFace(u0 - 0.03, u1 + 0.03, v1 + 0.03, ARCADE_TOP, upper(1, 5), HALL_EAVE - ARCADE_TOP);
      p.rightFace(v0 - 0.03, v1 + 0.03, u1 + 0.03, ARCADE_TOP, upper(R, 3), HALL_EAVE - ARCADE_TOP);
      p.material = 'tile';
      styledGable(p, s, u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, HALL_EAVE, HALL_RISE, c.roof, c.plaster, 'u');
      // Lantern on the ridge.
      const ridge = HALL_EAVE + HALL_RISE + roofLift(s, HALL_RISE);
      const [lu, lv] = [1.25, (v0 + v1) / 2];
      p.box(lu - 0.13, lv - 0.13, lu + 0.13, lv + 0.13, ridge - 10, ridge + 14, { color: c.trim });
      p.leftFace(lu - 0.13, lu + 0.13, lv + 0.13, ridge - 10, lantern(ctx, 1), 24);
      p.rightFace(lv - 0.13, lv + 0.13, lu + 0.13, ridge - 10, lantern(ctx, R), 24);
      if (hasOnionDomes(s)) onionDome(p, lu, lv, 0.12, ridge + 14, { color: c.metal });
      else {
        p.material = 'tile';
        styledHip(p, s, lu - 0.15, lv - 0.15, lu + 0.15, lv + 0.15, ridge + 14, 18, c.roof, 0.05);
      }
      // Stalls and goods on the square, back to front.
      stall(p, 2.42, 0.4, 2.92, 1.15, CLOTHS[0], c, 'v');
      barrel(p, 2.55, 1.4);
      barrel(p, 2.75, 1.5);
      stall(p, 0.3, 1.75, 1.0, 2.25, CLOTHS[1], c, 'u');
      sacks(p, 1.15, 1.8);
      stall(p, 1.35, 1.75, 2.05, 2.25, team, c, 'u');
      p.crate(2.25, 1.8, 16, shade(WOOD, 1.1));
      p.crate(2.45, 1.95, 14, shade(WOOD, 0.95));
      stall(p, 2.35, 2.25, 2.9, 2.85, CLOTHS[2], c, 'v');
      barrel(p, 0.45, 2.6);
      sacks(p, 0.85, 2.65);
      p.crate(1.35, 2.55, 15, WOOD);
      p.crate(1.6, 2.65, 12, shade(WOOD, 1.15));
      barrel(p, 1.95, 2.7);
      // The market banner on a tall pole in the square.
      p.flag(0.15, 2.45, 0, 70, team);
    },
  };
}

/** The square's paving: a flat stone plate with joint lines and a few darker setts. */
function paving(p: IsoPainter, color: number): void {
  const ctx = p.ctx;
  p.ground(0.05, 0.05, 2.95, 2.95, color);
  ctx.strokeStyle = css(shade(color, 0.78), 0.55);
  ctx.lineWidth = 1;
  for (let i = 1; i < 10; i++) {
    const t = 0.05 + i * 0.29;
    for (const [a, b] of [[p.p(t, 0.05, 0), p.p(t, 2.95, 0)], [p.p(0.05, t, 0), p.p(2.95, t, 0)]] as const) {
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
  }
  for (let i = 0; i < 26; i++) {
    const u = 0.15 + p.random() * 2.7;
    const v = 0.15 + p.random() * 2.7;
    p.ground(u, v, u + 0.12, v + 0.12, shade(color, 0.86 + p.random() * 0.2));
  }
}

/** Goods glimpsed through the arcade: a counter line and stacked bales in each bay. */
function hallInterior(ctx: CanvasRenderingContext2D, w: number, bays: number, light: number): void {
  const bay = w / bays;
  for (let i = 0; i < bays; i++) {
    const x = bay * i + bay * 0.28;
    ctx.fillStyle = css(shade(BURLAP, light * 0.55));
    ctx.fillRect(x, -9, bay * 0.18, 9);
    ctx.fillStyle = css(shade(WOOD, light * 0.5));
    ctx.fillRect(x + bay * 0.22, -6, bay * 0.22, 6);
  }
}

/** The ridge lantern's open louvres. */
function lantern(ctx: CanvasRenderingContext2D, light: number) {
  return (w: number, h: number) => {
    ctx.fillStyle = css(shade(0x1a140f, light));
    ctx.fillRect(w * 0.25, -h + 5, w * 0.5, h - 9);
    ctx.strokeStyle = css(shade(WOOD, light * 0.9));
    ctx.lineWidth = 1;
    for (let y = -h + 8; y < -5; y += 3) {
      ctx.beginPath();
      ctx.moveTo(w * 0.25, y);
      ctx.lineTo(w * 0.75, y);
      ctx.stroke();
    }
  };
}

/**
 * A market stall: a plank counter heaped with produce, four posts and a
 * striped cloth awning sloping down to the front (+v for axis 'u', +u for
 * axis 'v') with a scalloped valance.
 */
function stall(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, cloth: number, c: ArchStyle['palette'], axis: 'u' | 'v'): void {
  const ctx = p.ctx;
  const counter = 12;
  p.box(u0 + 0.06, v0 + 0.06, u1 - 0.06, v1 - 0.06, 0, counter, { color: shade(c.timber, 1.05), detail: 'planks' }, WOOD);
  // Produce heaped on the counter.
  for (let i = 0; i < 9; i++) {
    const u = u0 + 0.12 + p.random() * (u1 - u0 - 0.24);
    const v = v0 + 0.12 + p.random() * (v1 - v0 - 0.24);
    const [x, y] = p.p(u, v, counter);
    const col = PRODUCE[i % PRODUCE.length] ?? PRODUCE[0];
    ctx.fillStyle = css(shade(col, 0.85 + p.random() * 0.3));
    ctx.beginPath();
    ctx.ellipse(x, y - 2, 3.2, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Posts.
  const back = 30;
  const front = 23;
  const postTop = (u: number, v: number) => (axis === 'u' ? (v > (v0 + v1) / 2 ? front : back) : u > (u0 + u1) / 2 ? front : back);
  for (const [u, v] of [[u0, v0], [u1, v0], [u0, v1], [u1, v1]] as const) {
    const [x, y] = p.p(u, v, 0);
    const top = postTop(u, v);
    ctx.fillStyle = css(DARK_WOOD);
    ctx.fillRect(x - 1.2, y - top, 2.4, top);
    p.normalCylinder(x - 1.2, y - top, 2.4, top);
    p.addVolumePoint(u, v, top);
  }
  // Awning: a sloped cloth from the back edge (high) to the front edge (low), in stripes across the slope.
  const o = 0.08;
  const stripes = 6;
  const light = axis === 'u' ? 1.04 : 0.84;
  for (let i = 0; i < stripes; i++) {
    const a = i / stripes;
    const b = (i + 1) / stripes;
    const pts =
      axis === 'u'
        ? [p.p(u0 - o + (u1 - u0 + 2 * o) * a, v0 - o, back), p.p(u0 - o + (u1 - u0 + 2 * o) * b, v0 - o, back), p.p(u0 - o + (u1 - u0 + 2 * o) * b, v1 + o, front), p.p(u0 - o + (u1 - u0 + 2 * o) * a, v1 + o, front)]
        : [p.p(u0 - o, v0 - o + (v1 - v0 + 2 * o) * a, back), p.p(u0 - o, v0 - o + (v1 - v0 + 2 * o) * b, back), p.p(u1 + o, v0 - o + (v1 - v0 + 2 * o) * b, front), p.p(u1 + o, v0 - o + (v1 - v0 + 2 * o) * a, front)];
    p.fillPoly(pts, css(shade(i % 2 === 0 ? cloth : CANVAS, light)));
    p.normals.fill(pts, axis === 'u' ? p.slope(0, 1, v1 - v0, back - front) : p.slope(1, 0, u1 - u0, back - front));
  }
  // Scalloped valance along the low front edge.
  const [ax, ay] = axis === 'u' ? p.p(u0 - o, v1 + o, front) : p.p(u1 + o, v1 + o, front);
  const [bx, by] = axis === 'u' ? p.p(u1 + o, v1 + o, front) : p.p(u1 + o, v0 - o, front);
  const n = 6;
  for (let i = 0; i < n; i++) {
    const t0 = i / n;
    const t1 = (i + 1) / n;
    const x0 = ax + (bx - ax) * t0;
    const y0 = ay + (by - ay) * t0;
    const x1 = ax + (bx - ax) * t1;
    const y1 = ay + (by - ay) * t1;
    ctx.fillStyle = css(shade(i % 2 === 0 ? cloth : CANVAS, light * 0.88));
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + 7, x0, y0);
    ctx.fill();
  }
  p.strokePoly(axis === 'u' ? [p.p(u0 - o, v0 - o, back), p.p(u1 + o, v0 - o, back), p.p(u1 + o, v1 + o, front), p.p(u0 - o, v1 + o, front)] : [p.p(u0 - o, v0 - o, back), p.p(u1 + o, v0 - o, front), p.p(u1 + o, v1 + o, front), p.p(u0 - o, v1 + o, back)], css(shade(cloth, 0.45), 0.6), 1);
  p.addVolumePoint(u0 - o, v0 - o, back);
  p.addVolumePoint(u1 + o, v1 + o, front);
}

/** An upright barrel with iron hoops and a lid. */
function barrel(p: IsoPainter, u: number, v: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 0);
  const r = 6;
  const h = 15;
  const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
  g.addColorStop(0, css(shade(WOOD, 0.75)));
  g.addColorStop(0.45, css(shade(WOOD, 1.15)));
  g.addColorStop(1, css(shade(WOOD, 0.6)));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - r + 1, y);
  ctx.quadraticCurveTo(x - r - 1.5, y - h / 2, x - r + 1, y - h);
  ctx.lineTo(x + r - 1, y - h);
  ctx.quadraticCurveTo(x + r + 1.5, y - h / 2, x + r - 1, y);
  ctx.closePath();
  ctx.fill();
  p.normalCylinder(x - r, y - h, r * 2, h);
  ctx.strokeStyle = css(0x3a332c, 0.9);
  ctx.lineWidth = 1.2;
  for (const t of [0.2, 0.8]) {
    ctx.beginPath();
    ctx.moveTo(x - r, y - h * t);
    ctx.lineTo(x + r, y - h * t);
    ctx.stroke();
  }
  ctx.fillStyle = css(shade(WOOD, 0.95));
  ctx.beginPath();
  ctx.ellipse(x, y - h, r - 1, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  p.addVolumePoint(u, v, h);
}

/** Three grain sacks slumped together. */
function sacks(p: IsoPainter, u: number, v: number): void {
  const ctx = p.ctx;
  for (const [du, dv, s] of [[0, 0, 1], [0.12, 0.08, 0.9], [0.05, 0.16, 0.95]] as const) {
    const [x, y] = p.p(u + du, v + dv, 0);
    const w = 6 * s;
    const h = 11 * s;
    const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
    g.addColorStop(0, css(shade(BURLAP, 0.7)));
    g.addColorStop(0.4, css(shade(BURLAP, 1.1)));
    g.addColorStop(1, css(shade(BURLAP, 0.65)));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.quadraticCurveTo(x - w - 1, y - h * 0.7, x - 2, y - h);
    ctx.lineTo(x + 2, y - h);
    ctx.quadraticCurveTo(x + w + 1, y - h * 0.7, x + w, y);
    ctx.closePath();
    ctx.fill();
    p.normalCylinder(x - w, y - h, w * 2, h);
    // The tied neck.
    ctx.fillStyle = css(shade(BURLAP, 0.6));
    ctx.fillRect(x - 2, y - h - 2, 4, 3);
    p.addVolumePoint(u + du, v + dv, h);
  }
}
