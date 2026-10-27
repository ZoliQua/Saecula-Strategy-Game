import { describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';

/** Painted stand-ins: each paint is a tagged object instead of a canvas (no DOM in tests). */
interface FakeCanvas {
  readonly paint: string;
  readonly crop?: object;
}

vi.mock('./art/buildings', () => ({
  paintBuilding: (type: string, team: number, age: number, civ: string, withNormals = true) => ({
    canvas: { paint: `${type}/${age}/${civ}/${team}` },
    normal: withNormals ? { paint: `normal ${type}/${age}/${civ}` } : null,
    volume: [],
    glows: [],
    lights: [],
    smoke: [],
  }),
  paintWonderStage: () => ({ canvas: {}, normal: null, volume: [], glows: [], lights: [], smoke: [] }),
}));
vi.mock('./art/trimArt', () => ({
  // Each base gets its own crop rect, so the test can see which base a variant used.
  trimLitArt: (art: { canvas: FakeCanvas }) => ({ art, rect: { of: art.canvas.paint } }),
  cropCanvas: (canvas: FakeCanvas, rect: object): FakeCanvas => ({ ...canvas, crop: rect }),
}));
vi.mock('./art/lighting/litTextures', async (original) => ({
  ...(await original<typeof import('./art/lighting/litTextures')>()),
  halfNormalCanvas: (normal: object) => normal,
}));

const { buildingTexture } = await import('./buildingTextures');

interface FakeTexture {
  canvas: FakeCanvas;
  dataSource: object[];
  setDataSource(source: object): void;
}

function fakeHost() {
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
          t.dataSource = [source];
        },
      };
      map.set(k, t);
    },
  };
  return { host: { textures } as unknown as Pick<Phaser.Scene, 'textures'>, map };
}

describe('buildingTexture', () => {
  it('paints each civ its own base; a team variant borrows its own civ’s normal map and crop', () => {
    const { host, map } = fakeHost();
    expect(buildingTexture(host, 'house', 2, 1, 'hungarian')).toBe('building_house~a2~chungarian');
    expect(buildingTexture(host, 'house', 2, 1, 'english')).toBe('building_house~a2~cenglish');
    const variant = buildingTexture(host, 'house', 2, 3, 'english');
    expect(variant).toBe('building_house~a2~cenglish@p3');

    const englishBase = map.get('building_house~a2~cenglish')!;
    const hungarianBase = map.get('building_house~a2~chungarian')!;
    const v = map.get(variant)!;
    expect(englishBase.dataSource).toEqual([{ paint: 'normal house/2/english' }]);
    expect(v.dataSource).toBe(englishBase.dataSource);
    expect(v.dataSource).not.toBe(hungarianBase.dataSource);
    expect(v.canvas.crop).toEqual({ of: englishBase.canvas.paint });
    expect(v.canvas.paint.startsWith('house/2/english/')).toBe(true);
  });

  it('paints a variant’s missing base first, in the variant’s civ', () => {
    const { host, map } = fakeHost();
    buildingTexture(host, 'barracks', 1, 4, 'english');
    expect([...map.keys()].sort()).toEqual(['building_barracks~cenglish', 'building_barracks~cenglish@p4']);
  });
});
