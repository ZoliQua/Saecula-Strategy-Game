import { ART_SCALE, ellipse, makeCanvas, poly, type Ctx } from './canvas';
import { rng } from './palette';

/**
 * Procedural fire and ruin textures for building damage (BuildingFxSystem):
 * a looping flame strip (emissive, unlit) and the rubble decal (lit, with
 * a derived normal map). Painted at ART_SCALE, drawn at 1 / ART_SCALE.
 */

/** Flame frame size, world px; the base of the fire sits at FLAME_ORIGIN_Y. */
export const FLAME_W = 26;
export const FLAME_H = 44;
export const FLAME_FRAMES = 8;
export const FLAME_ORIGIN_Y = 0.9;

const S = ART_SCALE;

interface Tongue {
  readonly x: number;
  readonly w: number;
  readonly h: number;
  readonly k: number;
  readonly seed: number;
}

/**
 * Loop of FLAME_FRAMES flame frames side by side: a cluster of licking
 * tongues (deep red rim, orange body, yellow core, white-hot root) whose
 * heights and sway cycle exactly once per loop, plus a few licks that
 * break off and float up.
 */
export function paintFlameStrip(): HTMLCanvasElement {
  const fw = FLAME_W * S;
  const fh = FLAME_H * S;
  const { canvas, ctx } = makeCanvas(fw * FLAME_FRAMES, fh);
  const rand = rng(83);
  const tongues: Tongue[] = [
    { x: 0.5, w: 7, h: 36, k: 1, seed: 0 },
    { x: -4.5, w: 5.2, h: 25, k: 2, seed: 1.7 },
    { x: 5, w: 4.8, h: 29, k: 1, seed: 3.1 },
    { x: -8.5, w: 3.4, h: 14, k: 3, seed: 4.4 },
    { x: 8, w: 3.2, h: 18, k: 2, seed: 5.2 },
    { x: 2, w: 2.6, h: 21, k: 3, seed: 2.2 },
  ];
  const licks = Array.from({ length: 3 }, (_, i) => ({ x: (rand() - 0.5) * 10, k: i + 1, seed: rand() * 6.28, r: 0.8 + rand() * 0.8 }));
  for (let f = 0; f < FLAME_FRAMES; f++) {
    const phase = (f / FLAME_FRAMES) * Math.PI * 2;
    ctx.save();
    ctx.translate(f * fw + fw / 2, fh * FLAME_ORIGIN_Y);
    ctx.scale(S, S);
    const layers: Array<[string, number, number]> = [
      ['rgba(178,38,14,.82)', 1, 1],
      ['rgba(246,104,28,.92)', 0.78, 0.86],
      ['rgba(255,186,64,.95)', 0.52, 0.66],
      ['rgba(255,244,196,.95)', 0.26, 0.4],
    ];
    layers.forEach(([color, wk, hk], li) => {
      ctx.fillStyle = color;
      // Soft outer rim and body, crisper hot core.
      ctx.filter = li === 0 ? `blur(${1.6 * S}px)` : li === 1 ? `blur(${0.7 * S}px)` : 'none';
      for (const t of tongues) {
        const live = 0.62 + 0.26 * Math.sin(phase * t.k + t.seed) + 0.14 * Math.sin(phase * (t.k + 2) + t.seed * 2);
        const sway = Math.sin(phase * t.k + t.seed * 1.3) * t.w * 0.8 + Math.sin(phase * 2 + t.x) * 1.5 + 1.2;
        tongue(ctx, t.x * (0.9 + 0.1 * wk), 0, t.w * wk, t.h * live * hk, sway * hk);
      }
    });
    ctx.filter = 'none';
    // Licks breaking off the top: rise through the loop, shrinking.
    for (const l of licks) {
      const u = ((phase * l.k) / (Math.PI * 2) + l.seed / 6.28) % 1;
      const y = -26 - u * 14;
      const r = l.r * (1 - u);
      if (r < 0.4) continue;
      ctx.fillStyle = `rgba(255,${110 + Math.round(70 * (1 - u))},40,${0.7 * (1 - u)})`;
      ellipse(ctx, l.x + Math.sin(phase + l.seed) * 2, y, r, r * 1.5);
      ctx.fill();
    }
    ctx.restore();
  }
  return canvas;
}

/** One flame tongue: rounded root at (x, y), tip `h` up and `sway` to the side. */
function tongue(ctx: Ctx, x: number, y: number, w: number, h: number, sway: number): void {
  const tx = x + sway;
  const ty = y - h;
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.bezierCurveTo(x - w * 1.05, y - h * 0.42, tx - w * 0.35, y - h * 0.68, tx, ty);
  ctx.bezierCurveTo(tx + w * 0.35, y - h * 0.68, x + w * 1.05, y - h * 0.42, x + w, y);
  ctx.quadraticCurveTo(x, y + w * 0.75, x - w, y);
  ctx.closePath();
  ctx.fill();
}

/** Rubble decal size, world px (painted for a 2×2 footprint and scaled per building). */
export const RUBBLE_W = 150;
export const RUBBLE_H = 96;
/** Where the footprint centre sits on the decal (fraction of its height). */
export const RUBBLE_ORIGIN_Y = 0.62;
export const RUBBLE_VARIANTS = 2;

/**
 * Collapsed-building rubble: a scorched, dust-pale ground patch with a
 * heap of broken stone, brick and charred beams, highest in the middle
 * and spilling out to the footprint edge. Lit by a derived normal map.
 */
export function paintRubble(variant: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(RUBBLE_W * S, RUBBLE_H * S);
  const rand = rng(211 + variant * 97);
  ctx.scale(S, S);
  const cx = RUBBLE_W / 2;
  const cy = RUBBLE_H * RUBBLE_ORIGIN_Y;
  // Ground: dust ring and a charred core, flattened onto the iso plane.
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, 0.5);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 70);
  g.addColorStop(0, 'rgba(30,22,16,.8)');
  g.addColorStop(0.5, 'rgba(70,56,42,.6)');
  g.addColorStop(0.8, 'rgba(150,132,104,.3)');
  g.addColorStop(1, 'rgba(160,140,110,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const stones = variant === 0 ? ['#6b6257', '#7b7164', '#574d43', '#857967', '#4b433b'] : ['#7a5240', '#6a4532', '#7f6e5c', '#5e574e', '#4f3a2d'];
  const pieces: Array<{ x: number; y: number; kind: 'stone' | 'beam'; s: number; a: number; c: string }> = [];
  for (let i = 0; i < 170; i++) {
    // Denser and higher towards the middle of the footprint diamond.
    const r = Math.pow(rand(), 1.15) * 0.95;
    const a = rand() * Math.PI * 2;
    const x = cx + Math.cos(a) * r * 58;
    const ground = cy + Math.sin(a) * r * 29;
    const heap = (1 - r) * (1 - r) * 26;
    const beam = rand() < 0.16;
    pieces.push({ x, y: ground - heap, kind: beam ? 'beam' : 'stone', s: (beam ? 9 : 1.8 + (1 - r) * 2.2) + rand() * (beam ? 9 : 3) * (1 - r * 0.5), a: rand() * Math.PI, c: stones[Math.floor(rand() * stones.length)]! });
  }
  pieces.sort((p, q) => p.y - q.y);
  for (const p of pieces) {
    if (p.kind === 'beam') beamPiece(ctx, p.x, p.y, p.s, p.a, rand());
    else stonePiece(ctx, p.x, p.y, p.s, p.c, rand);
  }
  // A last sifting of dust over the heap.
  for (let i = 0; i < 60; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * 60;
    ctx.fillStyle = `rgba(150,136,112,${0.15 + rand() * 0.2})`;
    ellipse(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.5 - rand() * 6, 0.8 + rand() * 1.6, 0.6 + rand());
    ctx.fill();
  }
  return canvas;
}

function stonePiece(ctx: Ctx, x: number, y: number, s: number, color: string, rand: () => number): void {
  const pts: Array<[number, number]> = [];
  const n = 5 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand() * 0.5;
    const r = s * (0.7 + rand() * 0.45);
    pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r * 0.62]);
  }
  ctx.fillStyle = 'rgba(20,14,10,.45)';
  poly(ctx, pts.map(([px, py]) => [px + 0.8, py + 1.1] as [number, number]));
  ctx.fill();
  ctx.fillStyle = color;
  poly(ctx, pts);
  ctx.fill();
  // Lit upper facet (light from the upper left).
  ctx.fillStyle = 'rgba(255,244,224,.17)';
  poly(ctx, [[x - s * 0.6, y - s * 0.1], [x - s * 0.1, y - s * 0.55], [x + s * 0.4, y - s * 0.3], [x, y]]);
  ctx.fill();
}

function beamPiece(ctx: Ctx, x: number, y: number, len: number, angle: number, burn: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle * 0.6 - 0.3);
  ctx.fillStyle = 'rgba(20,14,10,.45)';
  ctx.fillRect(-len / 2 + 0.8, -1.2, len, 3.4);
  ctx.fillStyle = burn < 0.6 ? '#2a1c14' : '#5e4128';
  ctx.fillRect(-len / 2, -1.8, len, 3.2);
  ctx.fillStyle = burn < 0.6 ? '#46301f' : '#8a6440';
  ctx.fillRect(-len / 2, -1.8, len, 1.1);
  // Charred, glowing-out ends.
  ctx.fillStyle = '#140c08';
  ctx.fillRect(len / 2 - 2.2, -1.8, 2.2, 3.2);
  ctx.restore();
}
