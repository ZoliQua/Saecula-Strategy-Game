import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CivId } from '../types';

/*
 * Setup-card civ previews keep only their data URLs (M4 review M6) and
 * never create a texture; each civ takes two calls (paint, then light and
 * encode), so callers spread the work one step per frame (M5 Task 15).
 */

interface FakeCanvas {
  width: number;
  height: number;
  getContext(): object | null;
  toDataURL(): string;
}

let contexts = true;
let paintThrows = false;

function fakeCanvas(width = 300, height = 150): FakeCanvas {
  const ctx = {
    drawImage: () => undefined,
    getImageData: (_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: () => undefined,
    createRadialGradient: () => ({ addColorStop: () => undefined }),
    fillRect: () => undefined,
  };
  return { width, height, getContext: () => (contexts ? ctx : null), toDataURL: () => 'data:image/png;base64,AAAA' };
}

vi.mock('../iso/art/buildings', () => ({
  paintBuilding: () => {
    if (paintThrows) throw new Error('half-written painter');
    return { canvas: fakeCanvas(220, 180), normal: fakeCanvas(220, 180), volume: [], glows: [{ x: 40, y: 60, r: 3 }], lights: [], smoke: [] };
  },
  paintWonderStage: () => ({ canvas: fakeCanvas(), normal: null, volume: [], glows: [], lights: [], smoke: [] }),
}));
vi.mock('../iso/art/trimArt', () => ({
  trimLitArt: (art: object) => ({ art, rect: { x: 0, y: 0, w: 1, h: 1 } }),
  cropCanvas: (canvas: object) => canvas,
}));
describe('civ previews', () => {
  beforeEach(() => {
    vi.resetModules();
    contexts = true;
    paintThrows = false;
    (globalThis as Record<string, unknown>)['document'] = { createElement: () => fakeCanvas() };
  });

  const load = () => import('./civPreview');
  const ORDER: readonly CivId[] = ['hungarian', 'english', 'german', 'french', 'spanish', 'italian', 'russian', 'finnish'];

  it('paints a civ in two calls and keeps only its data URLs', async () => {
    const preview = await load();
    expect(preview.paintNextCivPreview()).toBe('hungarian');
    expect(preview.civPreview('hungarian')).toBeUndefined();
    expect(preview.paintNextCivPreview()).toBe('hungarian');
    expect(preview.civPreview('hungarian')?.art).toMatch(/^data:image\/png/);
    expect(preview.civPreview('hungarian')?.glow).toMatch(/^data:image\/png/);
  });

  it('creates no texture: the module takes no texture manager and touches no building texture', async () => {
    const preview = await load();
    expect(preview.paintNextCivPreview.length).toBe(0);
    const bt = await import('../iso/buildingTextures');
    for (let i = 0; i < 16; i++) preview.paintNextCivPreview();
    expect([...bt.BUILDING_LIGHT.keys()]).toEqual([]);
  });

  it('works through every civ two steps each, then reports done', async () => {
    const preview = await load();
    for (const civ of ORDER) {
      expect(preview.paintNextCivPreview()).toBe(civ);
      expect(preview.paintNextCivPreview()).toBe(civ);
    }
    expect(preview.paintNextCivPreview()).toBeNull();
    for (const civ of ORDER) expect(preview.civPreview(civ)?.art).toMatch(/^data:/);
  });

  it('a failed picture gives an empty placeholder (not retried)', async () => {
    const preview = await load();
    contexts = false;
    preview.paintNextCivPreview();
    expect(preview.paintNextCivPreview()).toBe('hungarian');
    expect(preview.civPreview('hungarian')).toEqual({ art: '', glow: '' });
    expect(preview.paintNextCivPreview()).toBe('english');
  });

  it('a painter that throws marks that civ failed in one call (placeholder, no retry) and never throws out', async () => {
    const preview = await load();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    paintThrows = true;
    for (const [i, civ] of ORDER.entries()) {
      expect(() => expect(preview.paintNextCivPreview()).toBe(civ)).not.toThrow();
      expect(preview.civPreview(civ)).toEqual({ art: '', glow: '' });
      expect(warn).toHaveBeenCalledTimes(i + 1);
    }
    expect(preview.paintNextCivPreview()).toBeNull();
    warn.mockRestore();
  });
});
