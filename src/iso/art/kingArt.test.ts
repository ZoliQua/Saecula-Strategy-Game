import { beforeAll, describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { CIV_IDS } from '../../config/civs';
import { civUnitType } from '../../game/civUnits';
import type { CivId } from '../../types';
import { installRecordingCanvas } from './testing/recordingCanvas.testkit';
import { unitGeometryHash, unitPixelsHash } from './testing/unitPins.testkit';

/*
 * M19: the king has no sheet of its own. It is drawn from the sheet of its
 * civ's knight slot (the Hungarian one is the hussar's), so it must reach the
 * same texture key, layout, look, geometry and cache entry everywhere.
 */

// UnitArt and the showcase only need these from Phaser; the fake scene has no renderer.
vi.mock('phaser', () => ({
  default: {
    WEBGL: 2,
    Scene: class {},
    GameObjects: { Image: class {} },
    Renderer: { WebGL: { WebGLRenderer: class {}, Pipelines: { LightPipeline: class {}, MultiPipeline: class {} } } },
  },
}));
// A portrait is not painted here: only which sheet it asks for matters.
const portraits = vi.hoisted(() => [] as string[]);
vi.mock('./units/sheet', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./units/sheet')>()),
  paintPortrait: (type: string) => {
    portraits.push(type);
    const ctx = { getImageData: () => ({ data: [] }) };
    return { width: 0, height: 0, getContext: () => ctx, toDataURL: () => `portrait:${type}` };
  },
}));

const slotOf = (civ: CivId) => civUnitType(civ, 'knight');

/** Enough of a scene for UnitArt and createUnitSprites; `created` counts texture uploads by key. */
function fakeScene() {
  const textures = new Map<string, object>();
  const created: string[] = [];
  const frame = { n: 0 };
  const tm = {
    exists: (key: string) => textures.has(key),
    get: (key: string) => textures.get(key),
    remove: (key: string) => textures.delete(key),
    getTextureKeys: () => [...textures.keys()],
    create: (key: string) => {
      created.push(key);
      const texture = { dataSource: [] as unknown[], source: [{}], add: () => null, setDataSource: () => {} };
      textures.set(key, texture);
      return texture;
    },
  };
  const scene = { textures: tm, game: { loop: { get frame() { return frame.n; } }, renderer: {} }, add: { sprite } };
  function sprite(_x: number, _y: number, key: string) {
    const s = {
      scene,
      texture: { key },
      setScale: () => s,
      setOrigin: () => s,
      setTint: () => s,
      setPipeline: () => s,
      setTexture: (next: string) => ((s.texture.key = next), s),
    };
    return s;
  }
  return { scene: scene as unknown as Phaser.Scene, created, textures, frame };
}

describe('king art (M19)', () => {
  beforeAll(() => installRecordingCanvas());

  it.each(CIV_IDS)('%s: the same texture key, layout, walk cycle, look and geometry as the knight slot', async (civ) => {
    const { unitTextureKey } = await import('./units/UnitArt');
    const { unitSheetType } = await import('./units/sheetType');
    const { unitLook } = await import('./units/looks');
    const { unitSheetLayout, walkCycleTiles } = await import('./units/layout');
    const { sheetGeometry } = await import('./units/sheet');
    const slot = slotOf(civ);
    expect(unitSheetType('king', civ)).toBe(slot);
    expect(unitTextureKey('king', civ)).toBe(unitTextureKey(slot, civ));
    expect(unitSheetLayout('king')).toEqual(unitSheetLayout(slot));
    expect(walkCycleTiles('king')).toBe(walkCycleTiles(slot));
    expect(unitLook('king', civ)).toBe(unitLook(slot, civ));
    expect(sheetGeometry('king', civ)).toBe(sheetGeometry(slot, civ)); // one cache entry
  });

  it('the Hungarian king is drawn from the hussar sheet', async () => {
    const { unitTextureKey } = await import('./units/UnitArt');
    expect(unitTextureKey('king', 'hungarian')).toBe('unit_hussar~chungarian');
    expect(unitTextureKey('king', 'english')).toBe('unit_knight~cenglish');
  });

  it.each(['hungarian', 'english'] as const)('%s: every pixel is the knight slot’s', (civ) => {
    expect(unitPixelsHash('king', civ)).toBe(unitPixelsHash(slotOf(civ), civ));
    expect(unitGeometryHash('king', civ)).toBe(unitGeometryHash(slotOf(civ), civ));
  });

  it('every other type keeps its own sheet', async () => {
    const { unitSheetType } = await import('./units/sheetType');
    for (const type of ['villager', 'knight', 'hussar', 'trade_ship'] as const) expect(unitSheetType(type, 'hungarian')).toBe(type);
  });

  it.each(CIV_IDS)('%s: a king in age 1 gets the sheet on demand, and the age-up reuses it', async (civ) => {
    const { unitArt } = await import('./units/UnitArt');
    const { ageUpArtJobs, prewarmUnitTypes } = await import('../../scenes/game/artLoadPlan');
    const { scene, created, frame } = fakeScene();
    // An AI civ's knight slot is not prewarmed in age 1.
    expect(prewarmUnitTypes(civ, civ === 'english' ? 'french' : 'english')).not.toContain(slotOf(civ));
    const king = unitArt(scene, 'king', civ, true)!;
    expect(king.type).toBe(slotOf(civ));
    expect(created).toContain(king.key);
    const slotPaints: unknown[] = [];
    ageUpArtJobs(civ, 2, {
      building: () => {},
      wall: () => {},
      unit: (type, c) => {
        frame.n++;
        const art = unitArt(scene, type, c, true);
        if (type === slotOf(civ)) slotPaints.push(art);
      },
    }).forEach((job) => job());
    expect(slotPaints).toHaveLength(1);
    expect(slotPaints[0]).toBe(king);
    expect(created.filter((key) => key === king.key)).toHaveLength(1);
    expect(created.some((key) => key.includes('king'))).toBe(false);
  });

  it('the prewarm makes one sheet for a king and its slot', async () => {
    const { UnitArtPrewarm } = await import('./units/UnitArtPrewarm');
    const { unitTextureKey } = await import('./units/UnitArt');
    const { scene, created } = fakeScene();
    const warm = new UnitArtPrewarm(scene, [['king', 'italian'], ['knight', 'italian']]);
    while (!warm.step());
    expect(created.filter((key) => key === unitTextureKey('knight', 'italian'))).toHaveLength(1);
    expect(created.some((key) => key.includes('king'))).toBe(false);
  });

  it('a shown king keeps the sheet through both evictions, and it goes with the king', async () => {
    const { createUnitSprites } = await import('./units/unitSprite');
    const { forgetUnitArt, unitArt, unitTextureKey } = await import('./units/UnitArt');
    const { releaseAbsentCivArt } = await import('../buildingTextures');
    const { scene, textures } = fakeScene();
    const sprites = createUnitSprites(scene, 'king', 'hungarian', 0xff0000, true);
    const key = unitTextureKey('hussar', 'hungarian');
    expect(sprites.key).toBe(key); // the cast-shadow caster
    expect(sprites.body.texture.key).toBe(key);
    const art = sprites.art;
    // The civ is out of play, only the king's sprite shows the sheet.
    const none = new Set<CivId>();
    forgetUnitArt(none, new Set([key]));
    releaseAbsentCivArt(scene, none, new Set([key]));
    expect(textures.has(key)).toBe(true);
    expect(unitArt(scene, 'hussar', 'hungarian', true)).toBe(art);
    forgetUnitArt(none, new Set());
    releaseAbsentCivArt(scene, none, new Set());
    expect(textures.has(key)).toBe(false);
  });

  it('the HUD portrait is the knight slot’s picture, cached once', async () => {
    const { unitThumbnail } = await import('../../ui/thumbnails');
    portraits.length = 0;
    const king = unitThumbnail('king', 'hungarian', 0x123456);
    expect(unitThumbnail('hussar', 'hungarian', 0x123456)).toBe(king);
    expect(portraits).toEqual(['hussar']);
  });

  it('the unit showcase lists no king', async () => {
    const { SHOWCASE_TYPES } = await import('../../scenes/UnitShowcaseScene');
    expect(SHOWCASE_TYPES).toContain('knight');
    expect(SHOWCASE_TYPES).not.toContain('king');
  });
});
