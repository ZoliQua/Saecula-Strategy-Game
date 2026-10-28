import { vi } from 'vitest';
import { IsoPainter } from '../isoPainter';

type Pt = readonly [number, number];

/*
 * Occluded glows (test-only; M5 final review I1, from the Finnish Task 13
 * check): a lit window that a later solid paints over still glows at
 * dusk, floating on the wall or roof in front of it. Painting runs back
 * to front, so a glow is hidden when its centre or any corner of the
 * square inscribed in its r-wide disc falls inside an opaque face polygon
 * painted after it by the same painter (a half-covered window fails too;
 * the inscribed square keeps the probes on the opening on a sheared face).
 * The painter is spied on: each window / addGlow call records the glow it
 * pushed, each fillPoly that covers (alpha ≥ 0.9: clip fills, glazes and
 * shade passes aside) an opaque face, both in canvas px (the face
 * transform applied), before the texture trim. A covering face may still
 * be trim or a shutter, so each hit is triaged by eye before a painter
 * changes. Needs the recording canvas (it reads gradient stops from the
 * draw log). Only glows the painting still returns count: a glow its
 * painter dropped (lighting/glowCover.ts) never shows.
 */

export interface OccludedGlow {
  /** Index of the glow in the painting's glow list. */
  readonly index: number;
  readonly x: number;
  readonly y: number;
  /** Fill style of the first later face that covers it. */
  readonly by: string;
  /** Whether the glow's centre is covered (not only a corner of it). */
  readonly centre: boolean;
  /** Share of the glow's inscribed square later faces cover (7 × 7 samples). */
  readonly coverage: number;
}

interface GlowEvent {
  readonly painter: IsoPainter;
  readonly glow: { x: number; y: number; r: number };
}
interface FaceEvent {
  readonly painter: IsoPainter;
  readonly pts: Pt[];
  readonly color: string;
}

function inside([x, y]: Pt, pts: readonly Pt[]): boolean {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]!;
    const [xj, yj] = pts[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Alpha of a CSS colour string (1 for opaque spellings). */
function alphaOf(c: string): number {
  const m = /^rgba\(([^)]*)\)$/.exec(c.replace(/\s/g, ''));
  return m?.[1] ? Number(m[1].split(',')[3] ?? 1) : 1;
}

/** At least this alpha counts as covering a window (a thinner glaze or shade pass lets it show). */
const OPAQUE = 0.9;

/**
 * Whether a fill in `color` on `ctx` covers what is under it: solid
 * colours by their alpha, gradients by their weakest stop (read from the
 * recording canvas log), both times the context's globalAlpha.
 */
function covers(ctx: CanvasRenderingContext2D, color: unknown): boolean {
  const global = typeof ctx.globalAlpha === 'number' ? ctx.globalAlpha : 1;
  let alpha = 1;
  if (typeof color === 'string') alpha = alphaOf(color);
  else if (color && typeof color === 'object' && 'logId' in color) {
    const log = (ctx.canvas as unknown as { log: readonly string[] }).log;
    const stop = `${String((color as { logId: string }).logId)}.stop(`;
    for (const line of log) {
      if (!line.startsWith(stop)) continue;
      const colour = /,"(.*)"\)$/.exec(line)?.[1] ?? '';
      alpha = Math.min(alpha, alphaOf(colour));
    }
  }
  return alpha * global >= OPAQUE;
}

/** Glows of the painting `paint` makes that a later opaque face covers. */
export function occludedGlows(paint: () => { readonly glows: readonly unknown[] }): OccludedGlow[] {
  const events: Array<GlowEvent | FaceEvent> = [];
  const fill = IsoPainter.prototype.fillPoly;
  const win = IsoPainter.prototype.window;
  const add = IsoPainter.prototype.addGlow;
  const lastGlow = (p: IsoPainter): { x: number; y: number; r: number } => {
    const glows = (p as unknown as { glows: Array<{ x: number; y: number; r: number }> }).glows;
    return glows[glows.length - 1]!;
  };
  const ctxOf = (p: IsoPainter): CanvasRenderingContext2D => (p as unknown as { ctx: CanvasRenderingContext2D }).ctx;
  const fillSpy = vi.spyOn(IsoPainter.prototype, 'fillPoly').mockImplementation(function (this: IsoPainter, pts, color) {
    const ctx = ctxOf(this);
    if (covers(ctx, color)) {
      const m = ctx.getTransform();
      const world = pts.map(([x, y]) => {
        const q = m.transformPoint(new DOMPoint(x, y));
        return [q.x, q.y] as const;
      });
      events.push({ painter: this, pts: world, color: typeof color === 'string' ? color : 'gradient' });
    }
    fill.call(this, pts, color);
  });
  const winSpy = vi.spyOn(IsoPainter.prototype, 'window').mockImplementation(function (this: IsoPainter, ...a) {
    win.apply(this, a);
    events.push({ painter: this, glow: lastGlow(this) });
  });
  const addSpy = vi.spyOn(IsoPainter.prototype, 'addGlow').mockImplementation(function (this: IsoPainter, ...a) {
    add.apply(this, a);
    events.push({ painter: this, glow: lastGlow(this) });
  });
  let shown: readonly unknown[];
  try {
    shown = paint().glows;
  } finally {
    fillSpy.mockRestore();
    winSpy.mockRestore();
    addSpy.mockRestore();
  }
  const out: OccludedGlow[] = [];
  const counts = new Map<IsoPainter, number>();
  events.forEach((e, i) => {
    if (!('glow' in e)) return;
    const index = counts.get(e.painter) ?? 0;
    counts.set(e.painter, index + 1);
    // A glow the painter dropped (GlowCover) does not show.
    if (!shown.includes(e.glow)) return;
    const { x, y, r } = e.glow;
    const k = r / (2 * Math.SQRT2);
    const probes: Pt[] = [[x, y], [x - k, y - k], [x + k, y - k], [x - k, y + k], [x + k, y + k]];
    const later = events.slice(i + 1).filter((f): f is FaceEvent => !('glow' in f) && f.painter === e.painter);
    const covered = (q: Pt): boolean => later.some((f) => inside(q, f.pts));
    const hit = later.find((f) => probes.some((q) => inside(q, f.pts)));
    if (!hit) return;
    let samples = 0;
    for (let a = 0; a < 7; a++) for (let b = 0; b < 7; b++) if (covered([x - k + (a * k) / 3, y - k + (b * k) / 3])) samples++;
    out.push({ index, x, y, by: hit.color, centre: covered([x, y]), coverage: samples / 49 });
  });
  return out;
}
