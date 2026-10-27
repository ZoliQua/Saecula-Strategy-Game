import { TILE_HEIGHT, TILE_WIDTH } from '../config/constants';
import { convexHull, type Pt2 } from '../iso/art/lighting/shadowGeometry';
import { sampleRelief, type Relief } from './cliffRelief';

/** The screen area one cliff tile's rock covers: its ground and everything up to its top. */
export interface RockFootprint {
  readonly tx: number;
  readonly ty: number;
  /** Convex outline in world px. */
  readonly points: readonly Pt2[];
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface ScreenBox {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/**
 * Per cliff tile, the convex screen outline of its rock: every relief
 * sample with rock on it (edge > 0.5) as its ground point and its top
 * (`top` px higher). Ground-level shadows must not be drawn inside these
 * (nothing stands on the impassable plateaus, so every caster is lower).
 * Convex per tile: an eroded bay inside one tile counts as rock.
 */
export function rockFootprints(relief: Relief): RockFootprint[] {
  const out: RockFootprint[] = [];
  const { res } = relief;
  const hw = TILE_WIDTH / 2;
  const hh = TILE_HEIGHT / 2;
  for (let ty = 0; ty < relief.height; ty++) {
    for (let tx = 0; tx < relief.width; tx++) {
      if (!relief.isCliff(tx, ty)) continue;
      const pts: Pt2[] = [];
      for (let b = 0; b <= res; b++) {
        for (let a = 0; a <= res; a++) {
          const u = tx - 0.5 + a / res;
          const v = ty - 0.5 + b / res;
          if (sampleRelief(relief, relief.edge, u, v) <= 0.5) continue;
          const x = (u - v) * hw;
          const y = (u + v) * hh;
          pts.push([x, y], [x, y - sampleRelief(relief, relief.top, u, v)]);
        }
      }
      if (pts.length < 6) continue;
      const points = convexHull(pts);
      const xs = points.map((p) => p[0]);
      const ys = points.map((p) => p[1]);
      out.push({ tx, ty, points, minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) });
    }
  }
  return out;
}

/** Footprints bucketed on a coarse screen grid, for overlap queries (building shadows, every 200 ms). */
export class RockFootprintIndex {
  private readonly cells = new Map<string, RockFootprint[]>();

  constructor(
    prints: readonly RockFootprint[],
    private readonly cell = 256,
  ) {
    for (const p of prints) {
      this.eachCell(p, (key) => {
        const list = this.cells.get(key);
        if (list) list.push(p);
        else this.cells.set(key, [p]);
      });
    }
  }

  get empty(): boolean {
    return this.cells.size === 0;
  }

  /** The footprints whose bounds overlap `box` (each once). */
  near(box: ScreenBox): RockFootprint[] {
    const out = new Set<RockFootprint>();
    this.eachCell(box, (key) => {
      for (const p of this.cells.get(key) ?? []) {
        if (p.maxX >= box.minX && p.minX <= box.maxX && p.maxY >= box.minY && p.minY <= box.maxY) out.add(p);
      }
    });
    return [...out];
  }

  private eachCell(box: ScreenBox, fn: (key: string) => void): void {
    const c = this.cell;
    for (let y = Math.floor(box.minY / c); y <= Math.floor(box.maxY / c); y++) {
      for (let x = Math.floor(box.minX / c); x <= Math.floor(box.maxX / c); x++) fn(`${x},${y}`);
    }
  }
}
