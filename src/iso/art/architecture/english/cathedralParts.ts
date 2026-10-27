import type { Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { baked } from '../../lighting/normalLayer';
import { css, shade } from '../../palette';

type Pt = readonly [number, number];

/*
 * Gothic cathedral parts (the English Wonder): pointed lancets and a
 * rose window in stained glass that glows at night, an octagonal stone
 * spire with lucarnes and crockets, pinnacles, flying buttresses and a
 * great treadwheel crane for the building stages. Face-local helpers
 * draw inside IsoPainter.leftFace / rightFace.
 */

/** Pointed (equilateral) arch outline on a face: jambs at x and x+w, base y0, total height h. */
export function pointedArch(ctx: Ctx, x: number, y0: number, w: number, h: number): void {
  const ys = y0 - h + w * 0.866;
  ctx.beginPath();
  ctx.moveTo(x, y0);
  ctx.lineTo(x, ys);
  ctx.arc(x + w, ys, w, Math.PI, (4 * Math.PI) / 3);
  ctx.arc(x, ys, w, (5 * Math.PI) / 3, 2 * Math.PI);
  ctx.lineTo(x + w, y0);
  ctx.closePath();
}

/** Stained glass fill: deep blue-violet by day with jewel flecks. */
function glass(ctx: Ctx, rand: () => number, x: number, y: number, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#2c3150');
  g.addColorStop(0.5, '#3a2c48');
  g.addColorStop(1, '#4a3428');
  ctx.fillStyle = g;
  ctx.fill();
  const flecks = Math.round((w * h) / 22);
  const jewels = ['#b0303a', '#3a5ab0', '#d6a43a', '#3f8a5a', '#8a3a9a'];
  for (let i = 0; i < flecks; i++) {
    ctx.fillStyle = jewels[Math.floor(rand() * jewels.length)] ?? '#3a5ab0';
    ctx.globalAlpha = 0.55;
    ctx.fillRect(x + rand() * w, y + rand() * h, 1.4, 1.4);
  }
  ctx.globalAlpha = 1;
}

/**
 * Lancet window (face-local, base y0): stone surround, stained glass
 * with lead cames; records a dusk glow (the lit nave seen through it).
 * `empty` paints the unglazed opening of a stage under construction.
 */
export function lancet(p: IsoPainter, stone: number, x: number, y0: number, w: number, h: number, light = 1, empty = false): void {
  const ctx = p.ctx;
  pointedArch(ctx, x - 1.6, y0 + 1, w + 3.2, h + 2.4);
  ctx.fillStyle = css(shade(stone, light * 1.1));
  ctx.fill();
  pointedArch(ctx, x, y0, w, h);
  if (empty) {
    ctx.fillStyle = '#16110d';
    ctx.fill();
    return;
  }
  ctx.save();
  ctx.clip();
  glass(ctx, () => p.random(), x, y0 - h, w, h);
  ctx.fillStyle = 'rgba(20,16,14,.75)';
  for (let y = y0 - 4; y > y0 - h; y -= 4.5) ctx.fillRect(x, y, w, 0.6);
  if (w > 5) ctx.fillRect(x + w / 2 - 0.4, y0 - h, 0.8, h);
  ctx.restore();
  const c = ctx.getTransform().transformPoint(new DOMPoint(x + w / 2, y0 - h / 2));
  p.addGlow(c.x, c.y, Math.max(w * 1.3, h * 0.32));
}

/** Rose window (face-local, centre cx, cy, radius r): stone ring, 12-light wheel tracery and quatrefoil hub. */
export function roseWindow(p: IsoPainter, stone: number, cx: number, cy: number, r: number, light = 1, empty = false): void {
  const ctx = p.ctx;
  ctx.fillStyle = css(shade(stone, light * 1.12));
  ctx.beginPath();
  ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  if (empty) {
    ctx.fillStyle = '#16110d';
    ctx.fill();
    return;
  }
  ctx.save();
  ctx.clip();
  glass(ctx, () => p.random(), cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
  const tracery = css(shade(stone, light * 1.05));
  ctx.strokeStyle = tracery;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    ctx.moveTo(cx + Math.cos(a) * r * 0.3, cy + Math.sin(a) * r * 0.3);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.stroke();
  ctx.lineWidth = 1;
  for (let k = 0; k < 12; k++) {
    const a = ((k + 0.5) / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78, r * 0.17, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = tracery;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b0303a';
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r * 0.13, cy + Math.sin(a) * r * 0.13, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  // The rose is the hero light of the west front: a core and a ring of glows round the wheel.
  const m = ctx.getTransform();
  const core = m.transformPoint(new DOMPoint(cx, cy));
  p.addGlow(core.x, core.y, r * 1.1);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const q = m.transformPoint(new DOMPoint(cx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62));
    p.addGlow(q.x, q.y, r * 0.45);
  }
}

/** Pointed portal with receding orders and a dark door (face-local, base 0). */
export function portal(p: IsoPainter, stone: number, x: number, w: number, h: number, door: number, light = 1): void {
  const ctx = p.ctx;
  for (let k = 3; k >= 0; k--) {
    pointedArch(ctx, x - k * 2.2, 0, w + k * 4.4, h + k * 2.8);
    ctx.fillStyle = css(shade(stone, light * (k % 2 ? 1.12 : 0.9)));
    ctx.fill();
  }
  pointedArch(ctx, x, 0, w, h);
  ctx.fillStyle = css(shade(door, light));
  ctx.fill();
  ctx.fillStyle = css(shade(door, light * 0.6));
  ctx.fillRect(x + w / 2 - 0.5, -h * 0.8, 1, h * 0.8);
  ctx.fillStyle = 'rgba(30,24,20,.6)';
  for (let y = -6; y > -h * 0.75; y -= 6) ctx.fillRect(x, y, w, 0.7);
}

/** Baked shade for an outward direction in tile axes (+v lit, +u in shade). */
function facetLight(phi: number): number {
  return baked(0.88 + 0.16 * (Math.sin(phi) - Math.cos(phi)));
}

/**
 * Octagonal stone spire from (uc, vc, z) rising `rise`: facets painted
 * back to front with their own slope normals, stone courses, crockets
 * on the visible arrises and a lucarne on the two lit faces. `top`
 * < 1 paints only the lower part (a spire under construction).
 * Returns the apex point.
 */
export function octSpire(p: IsoPainter, uc: number, vc: number, r: number, z: number, rise: number, color: number, top = 1): Pt {
  const ctx = p.ctx;
  const n = 8;
  const corner = (k: number, t: number) => {
    const a = ((k + 0.5) / n) * Math.PI * 2;
    return p.p(uc + r * (1 - t) * Math.cos(a), vc + r * (1 - t) * Math.sin(a), z + rise * t);
  };
  const order = [...Array(n).keys()].sort((a, b) => {
    const fa = ((a + 1) / n) * Math.PI * 2;
    const fb = ((b + 1) / n) * Math.PI * 2;
    return Math.cos(fa) + Math.sin(fa) - (Math.cos(fb) + Math.sin(fb));
  });
  for (const k of order) {
    const phi = ((k + 1) / n) * Math.PI * 2;
    const pts = [corner(k, 0), corner(k + 1, 0), corner(k + 1, top), corner(k, top)];
    p.fillPoly(pts, css(shade(color, facetLight(phi))));
    p.strokePoly(pts, css(shade(color, facetLight(phi) * 0.8)), 0.6);
    p.normals.fill(pts, p.slope(Math.cos(phi), Math.sin(phi), r, rise));
    if (Math.cos(phi) + Math.sin(phi) <= 0) continue;
    // Stone courses on the visible facets.
    ctx.strokeStyle = css(shade(color, facetLight(phi) * 0.78), 0.6);
    ctx.lineWidth = 0.6;
    for (let t = 0.05; t < top; t += 0.045) {
      const a = corner(k, t);
      const b = corner(k + 1, t);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
  }
  // Crockets up the three front arrises.
  for (const k of [0, 1, 7]) {
    for (let t = 0.12; t < top - 0.04; t += 0.11) {
      const [x, y] = corner(k, t);
      ctx.fillStyle = css(shade(color, 1.15));
      ctx.fillRect(x - 1.4, y - 1.6, 2.8, 2);
    }
  }
  // Lucarnes: small gabled openings at the foot of the lit faces.
  for (const phi of [Math.PI / 2, Math.PI / 4]) {
    const [x, y] = p.p(uc + r * 0.8 * Math.cos(phi), vc + r * 0.8 * Math.sin(phi), z + rise * 0.16);
    ctx.fillStyle = css(shade(color, 1.1));
    ctx.beginPath();
    ctx.moveTo(x - 5, y + 6);
    ctx.lineTo(x - 5, y - 4);
    ctx.lineTo(x, y - 11);
    ctx.lineTo(x + 5, y - 4);
    ctx.lineTo(x + 5, y + 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1c1612';
    ctx.fillRect(x - 2, y - 4, 4, 9);
  }
  for (let k = 0; k < n; k++) {
    const a = ((k + 0.5) / n) * Math.PI * 2;
    p.addVolumePoint(uc + r * Math.cos(a), vc + r * Math.sin(a), z);
  }
  p.addVolumePoint(uc, vc, z + rise * top);
  return p.p(uc, vc, z + rise * top);
}

/** Square stone pinnacle: a short shaft and a crocketed pyramid (two visible facets) at (u, v, z). */
export function pinnacle(p: IsoPainter, u: number, v: number, z: number, d: number, shaft: number, spike: number, color: number): void {
  const h = d / 2;
  p.box(u - h, v - h, u + h, v + h, z, z + shaft, { color }, color);
  const z1 = z + shaft;
  const apex = p.p(u, v, z1 + spike);
  const b = p.p(u + h, v - h, z1);
  const c = p.p(u + h, v + h, z1);
  const dd = p.p(u - h, v + h, z1);
  const front: Pt[] = [dd, c, apex];
  const side: Pt[] = [c, b, apex];
  p.fillPoly(front, css(shade(color, baked(1.04))));
  p.normals.fill(front, p.slope(0, 1, h, spike));
  p.fillPoly(side, css(shade(color, baked(0.74))));
  p.normals.fill(side, p.slope(1, 0, h, spike));
  p.ctx.fillStyle = css(shade(color, 1.2));
  p.ctx.fillRect(apex[0] - 1, apex[1] - 3, 2, 3);
  p.addVolumePoint(u, v, z1 + spike);
}

/** Flying buttress on the +u side: a pier at (uPier, v) with a pinnacle and a half-arch leaning onto the wall at uWall. */
export function flyingButtress(p: IsoPainter, uPier: number, uWall: number, v: number, zPier: number, zWall: number, color: number): void {
  p.box(uPier - 0.05, v - 0.05, uPier + 0.07, v + 0.05, 6, zPier, { color, detail: 'stone' }, color);
  pinnacle(p, uPier + 0.01, v, zPier, 0.09, 6, 18, color);
  const ctx = p.ctx;
  const a = p.p(uPier - 0.05, v, zPier - 6);
  const b = p.p(uWall, v, zWall);
  const ctrl = p.p((uPier + uWall) / 2 + 0.06, v, zWall - 14);
  ctx.lineCap = 'round';
  ctx.strokeStyle = css(shade(color, baked(0.7)));
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.quadraticCurveTo(ctrl[0], ctrl[1], b[0], b[1]);
  ctx.stroke();
  ctx.strokeStyle = css(shade(color, 1.05));
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1] - 2);
  ctx.quadraticCurveTo(ctrl[0], ctrl[1] - 2, b[0], b[1] - 2);
  ctx.stroke();
  ctx.lineCap = 'butt';
  const mid: Pt = [(a[0] + 2 * ctrl[0] + b[0]) / 4, (a[1] + 2 * ctrl[1] + b[1]) / 4];
  p.normals.cylinderStroke([[a, mid, b]], 4.5, Math.min(a[0], b[0]), Math.abs(b[0] - a[0]) + 1);
}

/**
 * Great treadwheel crane (medieval cathedral works): a man-sized wheel
 * in a timber frame at (u, v), a jib reaching to (tu, tv) at `height`,
 * a stone block hanging at tz.
 */
export function treadwheelCrane(p: IsoPainter, u: number, v: number, height: number, tu: number, tv: number, tz: number, timber: number): void {
  const ctx = p.ctx;
  const [bx, by] = p.p(u, v, 0);
  const wheelR = 17;
  const cy = by - wheelR - 3;
  const rim: Pt[] = [];
  for (let k = 0; k <= 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    rim.push([bx + Math.cos(a) * wheelR * 0.55, cy + Math.sin(a) * wheelR]);
  }
  ctx.strokeStyle = css(shade(timber, 0.85));
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  rim.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.stroke();
  ctx.lineWidth = 1;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(bx - Math.cos(a) * wheelR * 0.55, cy - Math.sin(a) * wheelR);
    ctx.lineTo(bx + Math.cos(a) * wheelR * 0.55, cy + Math.sin(a) * wheelR);
    ctx.stroke();
  }
  const top = p.p(u, v, height);
  const tip = p.p(tu, tv, height + 10);
  const hook = p.p(tu, tv, tz);
  const legs: Pt[][] = [[[bx - 10, by], top], [[bx + 10, by], top], [[top[0], top[1] + 14], tip]];
  ctx.strokeStyle = css(timber);
  ctx.lineWidth = 3;
  for (const [a, b] of legs) {
    ctx.beginPath();
    ctx.moveTo(a![0], a![1]);
    ctx.lineTo(b![0], b![1]);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(50,40,30,.85)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(bx, cy);
  ctx.lineTo(top[0], top[1]);
  ctx.lineTo(tip[0], tip[1]);
  ctx.lineTo(hook[0], hook[1]);
  ctx.stroke();
  ctx.fillStyle = '#d6ccb4';
  ctx.fillRect(hook[0] - 5, hook[1], 10, 7);
  p.normals.cylinderStroke([...legs, rim], 3, bx - wheelR, wheelR * 2);
  p.addVolumePoint(u, v, height);
}

/** Churchyard yew: a dark clipped cone. */
export function yew(p: IsoPainter, u: number, v: number, h: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 0);
  const g = ctx.createLinearGradient(x - 9, 0, x + 9, 0);
  g.addColorStop(0, '#3f6232');
  g.addColorStop(0.5, '#2a4824');
  g.addColorStop(1, '#172a14');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - 9, y);
  ctx.quadraticCurveTo(x - 9, y - h * 0.6, x, y - h);
  ctx.quadraticCurveTo(x + 9, y - h * 0.6, x + 9, y);
  ctx.quadraticCurveTo(x, y + 4, x - 9, y);
  ctx.fill();
  p.normals.cylinderPoly([[x - 9, y], [x, y - h], [x + 9, y]], x - 9, 18);
  p.addVolumePoint(u, v, h);
}

/** Leaning headstones in a churchyard row. */
export function headstones(p: IsoPainter, u: number, v0: number, v1: number, color: number): void {
  const ctx = p.ctx;
  for (let v = v0; v < v1; v += 0.18) {
    const [x, y] = p.p(u + (p.random() - 0.5) * 0.05, v, 0);
    const lean = (p.random() - 0.5) * 2;
    ctx.fillStyle = css(shade(color, 0.85 + p.random() * 0.25));
    ctx.beginPath();
    ctx.moveTo(x - 2.5, y);
    ctx.lineTo(x - 2.5 + lean, y - 6);
    ctx.arc(x + lean, y - 6, 2.5, Math.PI, 0);
    ctx.lineTo(x + 2.5, y);
    ctx.closePath();
    ctx.fill();
  }
}
