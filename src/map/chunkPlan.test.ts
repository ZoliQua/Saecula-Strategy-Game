import { describe, expect, it } from 'vitest';
import { chunkWants, type StreamMargins } from './chunkPlan';

const M: StreamMargins = { lodZoom: 0.6, fullMargin: 100, fullKeepMargin: 300, halfMargin: 400, halfKeepMargin: 600 };
const view = { x: 0, y: 0, width: 1000, height: 600 };
const chunk = (x: number, y: number) => ({ x, y, w: 512, h: 512 });

describe('chunkWants', () => {
  it('a chunk in view wants its full texture at normal zoom', () => {
    expect(chunkWants(chunk(100, 0), view, 1, M)).toEqual({ show: true, want: 'full', keepFull: true, keepHalf: true });
  });

  it('just outside the view (inside the full margin) it is already full, ahead of need', () => {
    expect(chunkWants(chunk(1050, 0), view, 1, M).want).toBe('full');
  });

  it('further out: half resolution as a fallback, full kept only inside the keep margin', () => {
    const w = chunkWants(chunk(1200, 0), view, 1, M);
    expect(w).toMatchObject({ show: false, want: 'half', keepFull: true });
    expect(chunkWants(chunk(1350, 0), view, 1, M)).toMatchObject({ want: 'half', keepFull: false, keepHalf: true });
  });

  it('far away nothing is wanted or kept', () => {
    expect(chunkWants(chunk(2000, 0), view, 1, M)).toEqual({ show: false, want: 'none', keepFull: false, keepHalf: false });
  });

  it('margins are screen px: at zoom 0.5 they reach twice as far in world px', () => {
    expect(chunkWants(chunk(1150, 0), view, 1, M).want).toBe('half');
    // 150 world px out at zoom 0.65 is 97.5 screen px: inside the 100 px full margin.
    const wide = { x: 0, y: 0, width: 2000, height: 1200 };
    expect(chunkWants(chunk(2150, 0), wide, 0.65, M).want).toBe('full');
  });

  it('zoomed out below lodZoom everything in view shows half resolution only', () => {
    const wide = { x: 0, y: 0, width: 3000, height: 1800 };
    expect(chunkWants(chunk(100, 0), wide, 0.5, M)).toEqual({ show: true, want: 'half', keepFull: false, keepHalf: true });
  });
});
