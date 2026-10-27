/** Streaming margins (screen px) and the half-resolution zoom; see TERRAIN_STREAM. */
export interface StreamMargins {
  readonly lodZoom: number;
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

/** What one terrain chunk should hold this frame. */
export interface ChunkWants {
  /** Intersects the view (draw it). */
  readonly show: boolean;
  /** The best texture worth having now; restored ahead of need inside the margins. */
  readonly want: 'full' | 'half' | 'none';
  /** A resident full / half texture may stay (hysteresis: wider keep margins). */
  readonly keepFull: boolean;
  readonly keepHalf: boolean;
}

/**
 * Pure streaming decision for one chunk. Full resolution near the view
 * (only at zoom ≥ lodZoom: below it half resolution is at least one texel
 * per screen px), half resolution as the outer prefetch ring.
 */
export function chunkWants(r: ChunkRect, view: WorldView, zoom: number, m: StreamMargins): ChunkWants {
  const near = (marginPx: number): boolean => {
    const pad = marginPx / zoom;
    return r.x < view.x + view.width + pad && r.x + r.w > view.x - pad && r.y < view.y + view.height + pad && r.y + r.h > view.y - pad;
  };
  const sharp = zoom >= m.lodZoom;
  const want = sharp && near(m.fullMargin) ? 'full' : near(m.halfMargin) ? 'half' : 'none';
  return { show: near(0), want, keepFull: sharp && near(m.fullKeepMargin), keepHalf: near(m.halfKeepMargin) };
}
