import { ellipse } from '../canvas';
import type { IsoPainter } from '../isoPainter';
import { FURNACE_LIGHT } from '../lighting/buildingLights';
import { css, shade } from '../palette';
import { RB } from './baroqueParts';
import { archedOpening, cornice, quoins } from './facade';
import { chimney } from './parts';
import type { ArchStyle } from './style';
import { styledGable } from './styledRoofs';
import type { BuildingArt } from './types';

const SOOT = 0x3a302a;
const CINDER = 0x6b6156;

/** Glowing furnace mouth (face-local): iron frame, molten core, spill of light on the sill. */
function furnaceMouth(p: IsoPainter, surround: number, x: number, w: number, h: number, light: number): void {
  const ctx = p.ctx;
  archedOpening(ctx, x, w, h, shade(surround, 0.9), 0x1a0d06, light);
  const g = ctx.createRadialGradient(x + w / 2, -h * 0.3, 1, x + w / 2, -h * 0.3, w * 0.9);
  g.addColorStop(0, '#fff3b0');
  g.addColorStop(0.3, '#ffb03c');
  g.addColorStop(0.7, 'rgba(230,80,20,.75)');
  g.addColorStop(1, 'rgba(160,40,10,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x + 1.5, 0);
  ctx.lineTo(x + 1.5, -h + w / 2);
  ctx.arc(x + w / 2, -h + w / 2, w / 2 - 1.5, Math.PI, 0);
  ctx.lineTo(x + w - 1.5, 0);
  ctx.closePath();
  ctx.fill();
  // Molten trough running out of the mouth.
  ctx.fillStyle = '#ffcf5a';
  ctx.fillRect(x + w * 0.3, -2.5, w * 0.4, 2.5);
  const c = ctx.getTransform().transformPoint(new DOMPoint(x + w / 2, -h * 0.45));
  p.addGlow(c.x, c.y, w * 1.4);
}

/** A cast bronze cannon barrel lying on the ground along u. */
function barrel(p: IsoPainter, u0: number, u1: number, v: number): void {
  const ctx = p.ctx;
  const a = p.p(u0, v, 4);
  const b = p.p(u1, v, 5.5);
  ctx.lineCap = 'round';
  for (const [wdt, col, dy] of [[9, '#4d3a1c', 0], [6, '#a07a38', -1], [2, '#e2c27a', -2.4]] as const) {
    ctx.strokeStyle = col;
    ctx.lineWidth = wdt;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1] + dy);
    ctx.lineTo(b[0], b[1] + dy);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  ellipse(ctx, b[0] + 1, b[1], 3, 4);
  ctx.fillStyle = '#1c140c';
  ctx.fill();
}

function shotPyramid(p: IsoPainter, u: number, v: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 0);
  for (const [row, n] of [[0, 4], [1, 3], [2, 2], [3, 1]] as const) {
    for (let i = 0; i < n; i++) {
      const cx = x - (n - 1) * 3.2 + i * 6.4;
      const cy = y - 3 - row * 5;
      const g = ctx.createRadialGradient(cx - 1.2, cy - 1.2, 0.4, cx, cy, 3.4);
      g.addColorStop(0, '#8a8e94');
      g.addColorStop(1, '#202226');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, 3.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function heap(p: IsoPainter, u: number, v: number, r: number, h: number, color: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 0);
  const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
  g.addColorStop(0, css(shade(color, 1.25)));
  g.addColorStop(1, css(shade(color, 0.6)));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.quadraticCurveTo(x - r * 0.4, y - h * 1.2, x + r * 0.2, y - h);
  ctx.quadraticCurveTo(x + r * 0.7, y - h * 0.8, x + r, y);
  ctx.quadraticCurveTo(x, y + r * 0.3, x - r, y);
  ctx.fill();
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = css(shade(color, 0.7 + p.random() * 0.8));
    ctx.fillRect(x - r * 0.7 + p.random() * r * 1.4, y - p.random() * h * 0.8, 2, 1.6);
  }
  p.normalCylinder(x - r, y - h, r * 2, h);
}

/**
 * Age 3 foundry (ágyúöntöde): a brick casting hall under a tile roof
 * with a louvred ridge vent, a stone-quoined blast furnace whose mouth
 * glows (persistent light), two smoking stacks, and a yard of cast
 * barrels, shot, ore and coal.
 */
export function foundryArt(s: ArchStyle): BuildingArt {
  const c = s.palette;
  const corners = (ctx: CanvasRenderingContext2D, w: number, h: number, light: number) => {
    if (s.ornaments.quoins) quoins(ctx, w, h, c.trim, light);
  };
  return {
    size: 3,
    maxHeight: 250 + s.headroom,
    paint: (p, team) => {
      const ctx = p.ctx;
      p.footShadow();
      p.ground(0.05, 0.05, 2.95, 2.95, CINDER);
      for (let i = 0; i < 70; i++) {
        const [x, y] = p.p(0.1 + p.random() * 2.8, 0.1 + p.random() * 2.8, 0);
        ctx.fillStyle = css(shade(CINDER, 0.6 + p.random() * 0.7), 0.8);
        ctx.fillRect(x, y, 2 + p.random() * 2, 1.4);
      }
      heap(p, 2.55, 0.42, 14, 10, 0x8a5a3a);
      chimney(p, 0.42, 0.42, 0.68, 0.68, 0, 210, { color: c.brick, detail: 'brick' });
      // Casting hall.
      p.box(0.25, 0.3, 2.0, 2.15, 0, 10, { color: c.stone, detail: 'stone' }, c.stone);
      p.box(0.28, 0.33, 1.97, 2.12, 10, 74, { color: c.brick, detail: 'brick' });
      const hall = (light: number, bays: number) => (w: number, h: number) => {
        corners(ctx, w, h, light * 0.95);
        cornice(ctx, w, h - 5, c.trim, light, 5);
        for (let i = 0; i < bays; i++) {
          const x = (w / bays) * (i + 0.5);
          p.window(x - 5, -h + 14, 10, 30, true);
        }
      };
      p.leftFace(0.28, 1.97, 2.12, 10, hall(1, 4), 64);
      p.rightFace(0.33, 2.12, 1.97, 10, hall(RB, 4), 64);
      p.material = 'tile';
      styledGable(p, s, 0.28, 0.33, 1.97, 2.12, 74, 42, c.roof, c.brick, 'u');
      // Louvred ridge vent letting the heat out.
      p.box(0.7, 1.12, 1.55, 1.33, 112, 126, { color: SOOT, detail: 'planks' }, SOOT);
      p.gableRoof(0.7, 1.12, 1.55, 1.33, 126, 10, c.roof, SOOT, 'u', 0.05);
      p.addSmoke(1.1, 1.22, 132);
      // Blast furnace: battered stone base, brick shaft, iron-banded top and its own stack.
      p.box(2.0, 0.9, 2.88, 1.95, 0, 18, { color: c.stone, detail: 'stone' }, c.stone);
      p.box(2.06, 0.96, 2.82, 1.89, 18, 104, { color: c.brick, detail: 'brick' });
      p.leftFace(2.06, 2.82, 1.89, 18, (w, h) => {
        corners(ctx, w, h, 0.95);
        furnaceMouth(p, c.ashlar, w / 2 - 11, 22, 30, 1);
        for (const y of [-56, -82]) {
          ctx.fillStyle = 'rgba(30,24,20,.85)';
          ctx.fillRect(0, y, w, 2.2);
        }
      }, 86);
      p.rightFace(0.96, 1.89, 2.82, 18, (w, h) => {
        corners(ctx, w, h, RB * 0.95);
        furnaceMouth(p, c.ashlar, w / 2 - 9, 18, 24, RB);
      }, 86);
      p.box(2.03, 0.93, 2.85, 1.92, 104, 112, { color: SOOT }, SOOT);
      chimney(p, 2.3, 1.2, 2.58, 1.48, 112, 184, { color: c.brick, detail: 'brick' });
      p.addLight(2.55, 2.45, FURNACE_LIGHT);
      // Yard: cast barrels on skids, shot pyramid, ore and coal heaps.
      for (const v of [2.42, 2.66]) barrel(p, 0.45, 1.25, v);
      shotPyramid(p, 1.6, 2.6);
      heap(p, 2.35, 2.55, 15, 17, 0x2a2624);
      p.flag(0.32, 2.1, 74, 34, team);
    },
  };
}
