import { ellipse } from '../canvas';
import type { IsoPainter, WallStyle } from '../isoPainter';
import { FORGE_LIGHT, LANTERN_LIGHT, TORCH_LIGHT } from '../lighting/buildingLights';
import { css, shade } from '../palette';

/*
 * Free-standing props and fixtures shared by the age styles. Each one
 * paints albedo with the painter's lighting data (normals, volume,
 * light / smoke anchors) so the sprite stays on the lighting contract.
 */

/** Column with a cylindrical gradient, standing at ground point (u,v). */
export function column(p: IsoPainter, u: number, v: number, z0: number, z1: number, r = 4, color = 0xeee4cc): void {
  const ctx = p.ctx;
  const [x, yb] = p.p(u, v, z0);
  const yt = yb - (z1 - z0);
  const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
  g.addColorStop(0, css(shade(color, 1.1)));
  g.addColorStop(0.55, css(shade(color, 0.92)));
  g.addColorStop(1, css(shade(color, 0.62)));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, yt, r * 2, yb - yt);
  p.normalCylinder(x - r - 1.5, yt - 2, r * 2 + 3, yb - yt + 3);
  ctx.fillStyle = css(shade(color, 0.85));
  ctx.fillRect(x - r - 1.5, yt - 2, r * 2 + 3, 3);
  ctx.fillRect(x - r - 1.5, yb - 2, r * 2 + 3, 3);
}

/** Square timber post (gallery, shed), plain rectangle with cylinder-ish normals. */
export function post(p: IsoPainter, u: number, v: number, z0: number, z1: number, w = 2.6, color = 0x6b4526): void {
  const ctx = p.ctx;
  const [x, yb] = p.p(u, v, z0);
  ctx.fillStyle = css(shade(color, 1.05));
  ctx.fillRect(x - w, yb - (z1 - z0), w, z1 - z0);
  ctx.fillStyle = css(shade(color, 0.7));
  ctx.fillRect(x, yb - (z1 - z0), w, z1 - z0);
  p.normalCylinder(x - w, yb - (z1 - z0), w * 2, z1 - z0);
}

export function logPile(p: IsoPainter, u: number, v: number, count: number, wood = 0x7a4e2a, cut = 0xd9b07a): void {
  const ctx = p.ctx;
  const [x0, y0] = p.p(u, v, 0);
  let i = 0;
  for (let row = 0; i < count; row++) {
    for (let k = 0; k < 4 - row && i < count; k++, i++) {
      const x = x0 + k * 9 + row * 4.5;
      const y = y0 - row * 8 - k * 0.5;
      ctx.fillStyle = css(wood);
      ctx.fillRect(x - 20, y - 4, 20, 8);
      ellipse(ctx, x, y, 4.5, 4.2);
      ctx.fillStyle = css(cut);
      ctx.fill();
      ctx.strokeStyle = css(wood);
      ctx.lineWidth = 1;
      ctx.stroke();
      ellipse(ctx, x, y, 1.6, 1.4);
      ctx.stroke();
    }
  }
}

/** Neat stack of sawn planks (a box with plank ends on the front). */
export function plankStack(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, height: number): void {
  p.box(u0, v0, u1, v1, 0, height, { color: 0xc89a62, detail: 'planks' }, 0xd8ae78);
  p.leftFace(u0, u1, v1, 0, (w, h) => {
    for (let y = 3; y < h; y += 4) {
      p.ctx.fillStyle = 'rgba(70,40,18,.45)';
      p.ctx.fillRect(0, -y, w, 0.9);
    }
  }, height);
}

export function goldPile(p: IsoPainter, u: number, v: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 0);
  for (let i = 0; i < 9; i++) {
    const nx = x + (p.random() - 0.5) * 16;
    const ny = y - p.random() * 7;
    ellipse(ctx, nx, ny, 3.2, 2.4);
    ctx.fillStyle = i % 3 === 0 ? '#fff1a6' : '#e3b23c';
    ctx.fill();
  }
}

/** Painted archery target on a post. */
export function target(p: IsoPainter, u: number, v: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 0);
  ctx.fillStyle = '#5e3b20';
  ctx.fillRect(x - 1.5, y - 22, 3, 22);
  const rings = ['#f2ead6', '#c0392b', '#f2ead6', '#c0392b'];
  rings.forEach((c, i) => {
    ellipse(ctx, x, y - 24, 9 - i * 2.2, 10 - i * 2.4);
    ctx.fillStyle = c;
    ctx.fill();
  });
}

/** Round straw butt on a wooden trestle (medieval archery). */
export function strawButt(p: IsoPainter, u: number, v: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 0);
  ctx.fillStyle = '#5e3b20';
  ctx.fillRect(x - 8, y - 14, 2.5, 14);
  ctx.fillRect(x + 5.5, y - 14, 2.5, 14);
  ellipse(ctx, x, y - 22, 11, 12);
  ctx.fillStyle = '#c9a457';
  ctx.fill();
  ctx.strokeStyle = 'rgba(110,80,30,.7)';
  ctx.lineWidth = 1;
  for (let r = 3; r < 12; r += 3) {
    ellipse(ctx, x, y - 22, r * 0.92, r);
    ctx.stroke();
  }
  ellipse(ctx, x, y - 22, 3, 3.3);
  ctx.fillStyle = '#b8352a';
  ctx.fill();
}

/** Iron sconce with a flame on a wall at (u, v, z); its light falls at the ground point (lu, lv). */
export function torch(p: IsoPainter, u: number, v: number, z: number, lu: number, lv: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, z);
  ctx.strokeStyle = '#231a14';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x, y + 6);
  ctx.lineTo(x, y - 1);
  ctx.stroke();
  ctx.fillStyle = '#3a2a1e';
  ctx.fillRect(x - 2.2, y - 3, 4.4, 3);
  flame(ctx, x, y - 3, 1);
  p.addGlow(x, y - 7, 7);
  p.addLight(lu, lv, TORCH_LIGHT);
}

/** Glazed iron lantern on a bracket (Enlightenment); steady warm light at (lu, lv). */
export function lantern(p: IsoPainter, u: number, v: number, z: number, lu: number, lv: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, z);
  ctx.strokeStyle = '#1e1a18';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(x - 5, y + 2);
  ctx.quadraticCurveTo(x - 4, y - 9, x, y - 9);
  ctx.stroke();
  ctx.fillStyle = '#26201c';
  ctx.beginPath();
  ctx.moveTo(x - 3.5, y - 7);
  ctx.lineTo(x + 3.5, y - 7);
  ctx.lineTo(x, y - 10.5);
  ctx.closePath();
  ctx.fill();
  const g = ctx.createLinearGradient(0, y - 7, 0, y);
  g.addColorStop(0, '#fff2c2');
  g.addColorStop(1, '#f0a548');
  ctx.fillStyle = g;
  ctx.fillRect(x - 3, y - 7, 6, 7);
  ctx.fillStyle = '#26201c';
  ctx.fillRect(x - 0.4, y - 7, 0.8, 7);
  ctx.fillRect(x - 3.5, y, 7, 1.4);
  p.addGlow(x, y - 3.5, 6);
  p.addLight(lu, lv, LANTERN_LIGHT);
}

/** Open forge mouth glowing on a face (face-local coords) — call inside leftFace / rightFace. */
export function forgeMouth(p: IsoPainter, x: number, w: number, h: number): void {
  const ctx = p.ctx;
  ctx.fillStyle = '#1a110c';
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, -h + w / 2);
  ctx.arc(x + w / 2, -h + w / 2, w / 2, Math.PI, 0);
  ctx.lineTo(x + w, 0);
  ctx.closePath();
  ctx.fill();
  const g = ctx.createRadialGradient(x + w / 2, -h * 0.35, 1, x + w / 2, -h * 0.35, w * 0.85);
  g.addColorStop(0, '#ffe08a');
  g.addColorStop(0.45, 'rgba(255,140,50,.8)');
  g.addColorStop(1, 'rgba(255,90,30,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - w * 0.4, -h * 1.2, w * 1.8, h * 1.2);
  const c = ctx.getTransform().transformPoint(new DOMPoint(x + w / 2, -h * 0.4));
  p.addGlow(c.x, c.y, w);
}

/** Records the forge light (call once per smithy, ground point in front of the forge). */
export function forgeLight(p: IsoPainter, u: number, v: number): void {
  p.addLight(u, v, FORGE_LIGHT);
}

function flame(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const g = ctx.createRadialGradient(x, y - 3 * s, 0.5, x, y - 3 * s, 6 * s);
  g.addColorStop(0, '#fff6c8');
  g.addColorStop(0.45, '#ffb347');
  g.addColorStop(1, 'rgba(230,90,30,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y - 10 * s);
  ctx.quadraticCurveTo(x + 4 * s, y - 3 * s, x, y);
  ctx.quadraticCurveTo(x - 4 * s, y - 3 * s, x, y - 10 * s);
  ctx.fill();
}

/** Chimney stack with a cap; records the smoke source at its top. */
export function chimney(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, z0: number, z1: number, wall: WallStyle): void {
  p.box(u0, v0, u1, v1, z0, z1, wall, 0x3a3530);
  p.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, z1 - 4, z1, { color: shade(wall.color, 0.85) }, 0x2a2622);
  p.addSmoke((u0 + u1) / 2, (v0 + v1) / 2, z1);
}

/** Row of sharpened stakes from (u0,v0) to (u1,v1). */
export function palisade(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, height: number, step = 0.085): void {
  const ctx = p.ctx;
  const len = Math.hypot(u1 - u0, v1 - v0);
  const n = Math.max(1, Math.round(len / step));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = u0 + (u1 - u0) * t;
    const v = v0 + (v1 - v0) * t;
    const [x, y] = p.p(u, v, 0);
    const h = height * (0.9 + p.random() * 0.2);
    const r = 3.1;
    const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
    g.addColorStop(0, '#8d6237');
    g.addColorStop(1, '#4d321b');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - r, y);
    ctx.lineTo(x - r, y - h);
    ctx.lineTo(x, y - h - 5);
    ctx.lineTo(x + r, y - h);
    ctx.lineTo(x + r, y);
    ctx.closePath();
    ctx.fill();
    p.normalCylinder(x - r, y - h - 5, r * 2, h + 5);
  }
  // Binding rail.
  const a = p.p(u0, v0, height * 0.55);
  const b = p.p(u1, v1, height * 0.55);
  ctx.strokeStyle = 'rgba(40,26,14,.8)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  for (const [u, v] of [[u0, v0], [u1, v1]] as const) p.addVolumePoint(u, v, height);
}

/** Woven wattle fence (wicker between stakes) from (u0,v0) to (u1,v1). */
export function wattleFence(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, height = 13): void {
  const ctx = p.ctx;
  const n = Math.max(2, Math.round(Math.hypot(u1 - u0, v1 - v0) / 0.32));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const [x, y] = p.p(u0 + (u1 - u0) * t, v0 + (v1 - v0) * t, 0);
    ctx.fillStyle = '#5a3b20';
    ctx.fillRect(x - 1.2, y - height - 2, 2.4, height + 2);
  }
  for (let row = 0; row < 4; row++) {
    const z = 2.5 + row * ((height - 3) / 3);
    const a = p.p(u0, v0, z);
    const b = p.p(u1, v1, z);
    ctx.strokeStyle = row % 2 ? '#9a7444' : '#7f5c33';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
}

/** Hay rick (boglya): a domed stack around a pole. */
export function haystack(p: IsoPainter, u: number, v: number, r: number, h: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 0);
  ctx.strokeStyle = '#4d321b';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x, y - h * 0.7);
  ctx.lineTo(x, y - h - 7);
  ctx.stroke();
  const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
  g.addColorStop(0, '#f0d27a');
  g.addColorStop(0.5, '#d6ad52');
  g.addColorStop(1, '#93702f');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.bezierCurveTo(x - r * 1.05, y - h * 0.7, x - r * 0.35, y - h, x, y - h);
  ctx.bezierCurveTo(x + r * 0.35, y - h, x + r * 1.05, y - h * 0.7, x + r, y);
  ctx.quadraticCurveTo(x, y + r * 0.35, x - r, y);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,85,30,.5)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 14; i++) {
    const t = (i / 13) * 2 - 1;
    ctx.beginPath();
    ctx.moveTo(x + t * r * 0.95, y - 1);
    ctx.quadraticCurveTo(x + t * r * 0.8, y - h * 0.6, x + t * r * 0.2, y - h * 0.97);
    ctx.stroke();
  }
  p.normalCylinder(x - r, y - h, r * 2, h);
  p.addVolumePoint(u, v, h);
}
