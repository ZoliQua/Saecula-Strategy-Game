import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';

/*
 * Setup-card civ previews keep only their data URLs (M4 review M6): the
 * town-centre texture painted for a picture is freed afterwards, unless
 * something else (the menu diorama, a match) had it already.
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
vi.mock('../iso/art/lighting/litTextures', async (original) => ({
  ...(await original<typeof import('../iso/art/lighting/litTextures')>()),
  halfNormalCanvas: (normal: object) => normal,
}));

interface FakeTexture {
  readonly canvas: FakeCanvas;
  dataSource: Array<{ image: unknown }>;
  setDataSource(source: unknown): void;
  getSourceImage(): FakeCanvas;
}

function fakeTextures() {
  const map = new Map<string, FakeTexture>();
  const textures = {
    exists: (k: string) => map.has(k),
    get: (k: string) => map.get(k)!,
    remove: (k: string) => map.delete(k),
    addCanvas: (k: string, canvas: FakeCanvas) => {
      const t: FakeTexture = {
        canvas,
        dataSource: [],
        setDataSource(source) {
          t.dataSource = [{ image: source }];
        },
        getSourceImage: () => canvas,
      };
      map.set(k, t);
    },
  };
  return { textures: textures as unknown as Phaser.Textures.TextureManager, map };
}

const TC = 'building_town_center~chungarian';

describe('civ previews', () => {
  beforeEach(() => {
    vi.resetModules();
    contexts = true;
    paintThrows = false;
    (globalThis as Record<string, unknown>)['document'] = { createElement: () => fakeCanvas() };
  });

  async function load() {
    return {
      preview: await import('./civPreview'),
      textures: await import('../iso/buildingTextures'),
    };
  }

  it('keeps the data URLs and frees the town-centre texture it painted', async () => {
    const { preview, textures: bt } = await load();
    const { textures, map } = fakeTextures();
    expect(preview.paintNextCivPreview(textures)).toBe('hungarian');
    expect(map.has(TC)).toBe(false);
    expect(map.size).toBe(0);
    expect(bt.BUILDING_LIGHT.has(TC)).toBe(false);
    expect(preview.civPreview('hungarian')?.art).toMatch(/^data:image\/png/);
    expect(preview.civPreview('hungarian')?.glow).toMatch(/^data:image\/png/);
  });

  it('keeps a town-centre texture that existed before the call (the menu diorama shows it)', async () => {
    const { preview, textures: bt } = await load();
    const { textures, map } = fakeTextures();
    expect(bt.buildingTexture({ textures }, 'town_center', 1, 1, 'hungarian')).toBe(TC);
    preview.paintNextCivPreview(textures);
    expect(map.has(TC)).toBe(true);
    expect(bt.BUILDING_LIGHT.has(TC)).toBe(true);
    expect(preview.civPreview('hungarian')?.art).toMatch(/^data:/);
  });

  it('paints one civ per call, then reports done', async () => {
    const { preview } = await load();
    const { textures, map } = fakeTextures();
    expect(preview.paintNextCivPreview(textures)).toBe('hungarian');
    expect(preview.paintNextCivPreview(textures)).toBe('english');
    expect(preview.paintNextCivPreview(textures)).toBe('german');
    expect(preview.paintNextCivPreview(textures)).toBeNull();
    expect(map.size).toBe(0);
  });

  it('a failed paint gives an empty placeholder (not retried) and still frees the texture', async () => {
    const { preview } = await load();
    const { textures, map } = fakeTextures();
    contexts = false;
    expect(preview.paintNextCivPreview(textures)).toBe('hungarian');
    expect(preview.civPreview('hungarian')).toEqual({ art: '', glow: '' });
    expect(map.size).toBe(0);
    expect(preview.paintNextCivPreview(textures)).toBe('english');
  });

  it('a painter that throws marks that civ failed once (placeholder, no retry) and never throws out', async () => {
    const { preview } = await load();
    const { textures, map } = fakeTextures();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    paintThrows = true;
    expect(() => preview.paintNextCivPreview(textures)).not.toThrow();
    expect(preview.civPreview('hungarian')).toEqual({ art: '', glow: '' });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(map.size).toBe(0);
    expect(preview.paintNextCivPreview(textures)).toBe('english');
    expect(warn).toHaveBeenCalledTimes(2);
    expect(preview.paintNextCivPreview(textures)).toBe('german');
    expect(warn).toHaveBeenCalledTimes(3);
    expect(preview.paintNextCivPreview(textures)).toBeNull();
    warn.mockRestore();
  });
});
