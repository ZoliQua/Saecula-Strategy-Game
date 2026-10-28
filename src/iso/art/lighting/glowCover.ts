import type { Ctx } from '../canvas';
import type { GlowPoint } from './normalLayer';

type Pt = readonly [number, number];

/** At least this alpha hides what is under a fill (a thinner glaze or shade pass lets a window show). */
const COVERING_ALPHA = 0.9;
/** Samples per side of the grid that measures how much of a window later faces cover. */
const SAMPLES = 5;

/** Alpha of a fill style: a CSS colour's own alpha; a gradient counts as opaque. */
function fillAlpha(color: string | CanvasGradient): number {
  if (typeof color !== 'string') return 1;
  const m = /^rgba\(([^)]*)\)$/.exec(color.replace(/\s/g, ''));
  return m?.[1] ? Number(m[1].split(',')[3] ?? 1) : 1;
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

/**
 * Hidden window glows (M5 final review I1). Painting runs back to front,
 * so a lit window that a later opaque face paints over is hidden, yet its
 * dusk glow would float on that face. GlowCover records the opaque faces
 * an IsoPainter fills after its first glow and drops the glows they hide
 * (visible()). Faces are taken as given, without the context's face
 * transform: a face-local fill (y ≤ 0, above its face's origin) is
 * tested in the wrong space and so in practice never covers a glow; the
 * allCivsGlows test checks every drop against the transform-aware
 * checker. The context is only read, never called, so the draw log stays
 * as it was. The window pixels
 * stay: the later face hides them anyway, so the albedo is unchanged.
 * Opt-in per style (ArchStyle.dropHiddenGlows), so styles without it
 * keep every glow exactly as before.
 */
export class GlowCover {
  private readonly faces: Array<{ readonly after: number; readonly pts: Pt[] }> = [];

  /** Records a fill of `pts` in `color` on `ctx`, painted after the first `glows` glows. */
  face(ctx: Ctx, pts: readonly Pt[], color: string | CanvasGradient, glows: number): void {
    const global = typeof ctx.globalAlpha === 'number' ? ctx.globalAlpha : 1;
    if (glows === 0 || fillAlpha(color) * global < COVERING_ALPHA) return;
    this.faces.push({ after: glows, pts: [...pts] });
  }

  /**
   * The glows that still show: a glow goes when later faces cover its
   * centre or half its window (5 × 5 samples over the square inscribed in
   * its r-wide disc). An eave grazing the window head keeps it.
   */
  visible(glows: readonly GlowPoint[]): GlowPoint[] {
    return glows.filter((g, i) => {
      const later = this.faces.filter((f) => f.after > i);
      if (later.length === 0) return true;
      const covered = (q: Pt): boolean => later.some((f) => inside(q, f.pts));
      if (covered([g.x, g.y])) return false;
      const k = g.r / (2 * Math.SQRT2);
      const step = (2 * k) / (SAMPLES - 1);
      let hidden = 0;
      for (let a = 0; a < SAMPLES; a++) {
        for (let b = 0; b < SAMPLES; b++) if (covered([g.x - k + a * step, g.y - k + b * step])) hidden++;
      }
      return hidden * 2 < SAMPLES * SAMPLES;
    });
  }
}
