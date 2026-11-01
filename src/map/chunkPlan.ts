/** Streaming margins (screen px) and the half / mid resolution zooms; see TERRAIN_STREAM. */
export interface StreamMargins {
  readonly lodZoom: number;
  readonly midZoom: number;
  readonly fullMargin: number;
  readonly fullKeepMargin: number;
  readonly halfMargin: number;
  readonly halfKeepMargin: number;
}

export interface ChunkRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface WorldView {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A streamed chunk texture, sharpest first. */
export type ChunkLevel = 'full' | 'mid' | 'half';
export const CHUNK_LEVELS: readonly ChunkLevel[] = ['full', 'mid', 'half'];

/** What one terrain chunk should hold this frame. */
export interface ChunkWants {
  /** Intersects the view (draw it). */
  readonly show: boolean;
  /** The best texture worth having now; restored ahead of need inside the margins. */
  readonly want: ChunkLevel | 'none';
  /** A resident full / mid / half texture may stay (hysteresis: wider keep margins). */
  readonly keepFull: boolean;
  readonly keepMid: boolean;
  readonly keepHalf: boolean;
}

/**
 * Pure streaming decision for one chunk. Near the view: full resolution
 * at zoom ≥ midZoom, the mid (three-quarter) texture from lodZoom up to
 * midZoom, and below lodZoom nothing sharper than half resolution (at
 * least one texel per screen px). Half resolution is the outer prefetch ring.
 */
export function chunkWants(r: ChunkRect, view: WorldView, zoom: number, m: StreamMargins): ChunkWants {
  const near = (marginPx: number): boolean => {
    const pad = marginPx / zoom;
    return r.x < view.x + view.width + pad && r.x + r.w > view.x - pad && r.y < view.y + view.height + pad && r.y + r.h > view.y - pad;
  };
  const sharp = zoom >= m.midZoom;
  const medium = zoom >= m.lodZoom;
  const close = near(m.fullMargin);
  const want: ChunkWants['want'] = close && sharp ? 'full' : close && medium ? 'mid' : near(m.halfMargin) ? 'half' : 'none';
  const closeKeep = near(m.fullKeepMargin);
  return { show: near(0), want, keepFull: sharp && closeKeep, keepMid: medium && closeKeep, keepHalf: near(m.halfKeepMargin) };
}
