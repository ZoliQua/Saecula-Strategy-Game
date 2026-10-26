import { makeCanvas, type Ctx } from './canvas';
import type { VolumePoint } from './lighting/shadowGeometry';
import { rng } from './palette';

/** Damage overlays are painted at this fraction of the building texture (world resolution). */
export const DAMAGE_OVERLAY_SCALE = 0.5;
/** Frames: 0 = cracked + smudged (smoking), 1 = scorched and split (burning). */
export const DAMAGE_OVERLAY_FRAMES = 2;

/**
 * Crack + soot overlay for one building silhouette, derived from the
 * building texture's own alpha so it fits any age style, wall piece or
 * tower: the overlay is painted freely, then clipped to the building's
 * opaque pixels. Two frames side by side (DAMAGE_OVERLAY_FRAMES), each
 * DAMAGE_OVERLAY_SCALE × the source size. Dark marks only (soot, crack
 * shadows) plus faint ember glow in the burning frame, so it reads the
 * same under any light and needs no normal map. Cracks start on the
 * painted walls: up the vertical edges of the IsoPainter `volume`
 * (texture px), between the ground and the eaves.
 */
export function paintDamageOverlay(
  source: CanvasImageSource & { width: number; height: number },
  volume: readonly VolumePoint[],
  seed: number,
): {
  canvas: HTMLCanvasElement;
  frameWidth: number;
} {
  const w = Math.max(1, Math.ceil(source.width * DAMAGE_OVERLAY_SCALE));
  const h = Math.max(1, Math.ceil(source.height * DAMAGE_OVERLAY_SCALE));
  const mask = makeCanvas(w, h);
  mask.ctx.drawImage(source, 0, 0, w, h);
  const alpha = mask.ctx.getImageData(0, 0, w, h).data;
  const solid = (x: number, y: number): boolean => {
    const xi = Math.round(x);
    const yi = Math.round(y);
    return xi >= 0 && yi >= 0 && xi < w && yi < h && (alpha[(yi * w + xi) * 4 + 3] ?? 0) > 235;
  };
  // Vertical extent of the solid part (the foot shadow is never solid).
  let top = h;
  let bottom = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x += 2) {
      if (!solid(x, y)) continue;
      if (y < top) top = y;
      bottom = y;
      break;
    }
  }
  const { canvas, ctx } = makeCanvas(w * DAMAGE_OVERLAY_FRAMES, h);
  if (bottom <= top) return { canvas, frameWidth: w };
  for (let f = 0; f < DAMAGE_OVERLAY_FRAMES; f++) {
    const frame = makeCanvas(w, h);
    const rand = rng(seed * 31 + 7);
    const heavy = f === 1;
    paintSoot(frame.ctx, w, top, bottom, heavy, rand);
    // Same crack layout in both frames (seeded); the burning frame adds more.
    const sites = crackSites(volume);
    const cracks = Math.min(sites.length * (heavy ? 2 : 1), heavy ? 14 : 6);
    for (let i = 0, tries = 0; i < cracks && tries < cracks * 20; tries++) {
      const site = sites[Math.floor(rand() * sites.length)];
      if (!site) break;
      const k = DAMAGE_OVERLAY_SCALE;
      // Up the edge, nudged onto the wall face beside it.
      const x = (site.gx + (rand() - 0.5) * 24 + (w / k / 2 - site.gx) * 0.12) * k;
      const floor = (site.gy - 6) * k;
      const ceil = (site.gy - site.z + 4) * k;
      const y = floor + (ceil - floor) * (0.2 + rand() * 0.6);
      if (!solid(x, y)) continue;
      paintCrack(frame.ctx, x, y, heavy, rand, (cx, cy) => cy < floor && cy > ceil && solid(cx, cy));
      i++;
    }
    // Clip everything to the building silhouette.
    frame.ctx.globalCompositeOperation = 'destination-in';
    frame.ctx.drawImage(mask.canvas, 0, 0);
    ctx.drawImage(frame.canvas, f * w, 0);
  }
  return { canvas, frameWidth: w };
}

/** Smoke stains: blotches licking up from the lower walls, a dark crown when burning. */
function paintSoot(ctx: Ctx, w: number, top: number, bottom: number, heavy: boolean, rand: () => number): void {
  const span = bottom - top;
  const blotches = heavy ? 34 : 10;
  for (let i = 0; i < blotches; i++) {
    const x = rand() * w;
    const y = top + span * (heavy ? rand() : 0.15 + rand() * 0.7);
    const r = span * (0.08 + rand() * (heavy ? 0.22 : 0.12));
    const a = heavy ? 0.38 + rand() * 0.34 : 0.16 + rand() * 0.14;
    const g = ctx.createRadialGradient(x, y, 0, x, y - r * 0.3, r);
    g.addColorStop(0, `rgba(18,13,10,${a})`);
    g.addColorStop(1, 'rgba(18,13,10,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r * 1.3, r * 2, r * 2.3);
  }
  if (!heavy) return;
  // Charred roofline: the top of the silhouette goes black.
  const crown = ctx.createLinearGradient(0, top, 0, top + span * 0.55);
  crown.addColorStop(0, 'rgba(14,10,8,.7)');
  crown.addColorStop(1, 'rgba(14,10,8,0)');
  ctx.fillStyle = crown;
  ctx.fillRect(0, top, w, span * 0.55);
  ctx.fillStyle = 'rgba(24,16,11,.2)';
  ctx.fillRect(0, top, w, span);
}

/** Vertical wall edges cracks may start on: volume points above the ground, below the roof peaks. */
function crackSites(volume: readonly VolumePoint[]): VolumePoint[] {
  const up = volume.filter((p) => p.z > 8);
  if (up.length === 0) return [];
  const top = Math.max(...up.map((p) => p.z));
  const walls = up.filter((p) => p.z < top * 0.92);
  return walls.length > 0 ? walls : up;
}

/**
 * A branching crack wandering mostly up and down the wall: a dark split
 * with a pale chipped lip below it, glowing deep orange inside when the
 * building burns. Stops where the silhouette ends.
 */
function paintCrack(ctx: Ctx, x0: number, y0: number, heavy: boolean, rand: () => number, solid: (x: number, y: number) => boolean): void {
  const paths: Array<Array<[number, number]>> = [];
  const walk = (x: number, y: number, dir: number, steps: number, depth: number): void => {
    const path: Array<[number, number]> = [[x, y]];
    let a = dir;
    for (let s = 0; s < steps; s++) {
      // Zig-zag along the mortar: alternate kinks around the main heading.
      a = dir + (s % 2 === 0 ? 1 : -1) * (0.35 + rand() * 0.4);
      const len = 1.2 + rand() * 1.6;
      x += Math.cos(a) * len * 0.75;
      y += Math.sin(a) * len;
      if (!solid(x, y)) break;
      path.push([x, y]);
      if (depth < 2 && rand() < 0.2) walk(x, y, a + (rand() < 0.5 ? -1 : 1) * (0.7 + rand() * 0.6), Math.floor(steps * 0.5), depth + 1);
    }
    if (path.length > 1) paths.push(path);
  };
  const steps = heavy ? 6 + Math.floor(rand() * 5) : 4 + Math.floor(rand() * 4);
  walk(x0, y0, -Math.PI / 2 + (rand() - 0.5) * 0.9, steps, 1);
  walk(x0, y0, Math.PI / 2 + (rand() - 0.5) * 0.9, Math.floor(steps * 0.6), 2);
  const stroke = (color: string, width: number, dy: number): void => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    for (const p of paths) {
      ctx.beginPath();
      p.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py + dy) : ctx.lineTo(px, py + dy)));
      ctx.stroke();
    }
  };
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  stroke('rgba(250,236,214,.28)', 0.8, 0.6);
  stroke('rgba(16,10,7,.88)', heavy ? 1.1 : 0.9, 0);
}
