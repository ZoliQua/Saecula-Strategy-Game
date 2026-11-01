import { describe, expect, it } from 'vitest';
import { TERRAIN_STREAM } from '../config/visual';
import { chunkWants, type StreamMargins } from './chunkPlan';

const M: StreamMargins = { lodZoom: 0.6, midZoom: 0.9, fullMargin: 100, fullKeepMargin: 300, halfMargin: 400, halfKeepMargin: 600 };
const view = { x: 0, y: 0, width: 1000, height: 600 };
const chunk = (x: number, y: number) => ({ x, y, w: 512, h: 512 });

describe('chunkWants', () => {
  it('a chunk in view wants its full texture at normal zoom', () => {
    expect(chunkWants(chunk(100, 0), view, 1, M)).toEqual({ show: true, want: 'full', keepFull: true, keepMid: true, keepHalf: true });
  });

  it('just outside the view (inside the full margin) it is already full, ahead of need', () => {
    expect(chunkWants(chunk(1050, 0), view, 1, M).want).toBe('full');
  });

  it('further out: half resolution as a fallback, full kept only inside the keep margin', () => {
    const w = chunkWants(chunk(1200, 0), view, 1, M);
    expect(w).toMatchObject({ show: false, want: 'half', keepFull: true });
    expect(chunkWants(chunk(1350, 0), view, 1, M)).toMatchObject({ want: 'half', keepFull: false, keepMid: false, keepHalf: true });
  });

  it('far away nothing is wanted or kept', () => {
    expect(chunkWants(chunk(2000, 0), view, 1, M)).toEqual({ show: false, want: 'none', keepFull: false, keepMid: false, keepHalf: false });
  });

  it('margins are screen px: at zoom 0.5 they reach twice as far in world px', () => {
    expect(chunkWants(chunk(1150, 0), view, 1, M).want).toBe('half');
    // 150 world px out at zoom 0.95 is 142.5 screen px: outside the 100 px full margin; 90 px out is inside.
    expect(chunkWants(chunk(1150, 0), view, 0.95, M).want).toBe('half');
    expect(chunkWants(chunk(1090, 0), view, 0.95, M).want).toBe('full');
  });

  it('between lodZoom and midZoom the view wants the mid texture; full may no longer stay', () => {
    const wide = { x: 0, y: 0, width: 2000, height: 1200 };
    expect(chunkWants(chunk(100, 0), wide, 0.75, M)).toEqual({ show: true, want: 'mid', keepFull: false, keepMid: true, keepHalf: true });
    // The prefetch ring stays half resolution, as at full zoom.
    expect(chunkWants(chunk(2300, 0), wide, 0.75, M)).toMatchObject({ want: 'half', keepMid: true });
    expect(chunkWants(chunk(100, 0), wide, M.midZoom, M).want).toBe('full');
    expect(chunkWants(chunk(100, 0), wide, M.lodZoom, M).want).toBe('mid');
  });

  it('zoomed out below lodZoom everything in view shows half resolution only', () => {
    const wide = { x: 0, y: 0, width: 3000, height: 1800 };
    expect(chunkWants(chunk(100, 0), wide, 0.5, M)).toEqual({ show: true, want: 'half', keepFull: false, keepMid: false, keepHalf: true });
  });

  it('the mid level keeps the sharpness half resolution is accepted at below lodZoom', () => {
    // Texels per screen px at the bottom of each band: mid at midZoom matches half at lodZoom.
    const half = 0.5 / TERRAIN_STREAM.lodZoom;
    const mid = TERRAIN_STREAM.midScale / TERRAIN_STREAM.midZoom;
    expect(mid).toBeGreaterThanOrEqual(half - 0.01);
    expect(TERRAIN_STREAM.lodZoom).toBeLessThan(TERRAIN_STREAM.midZoom);
    expect(TERRAIN_STREAM.midZoom).toBeLessThanOrEqual(1);
  });
});
