import { beforeAll, describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { installRecordingCanvas } from '../testing/recordingCanvas.testkit';
import { frameIndex, PAINTED_HEADINGS } from './layout';

// UnitArt only needs Phaser for the WebGL partial upload (instanceof); the fake scene has no renderer.
vi.mock('phaser', () => ({ default: { Renderer: { WebGL: { WebGLRenderer: class {} } } } }));

/** Fake texture manager: enough of Phaser's for UnitArt.register. */
function fakeScene(frame = { n: 0 }) {
  const textures = new Map<string, { frames: number; dataSource: unknown[]; source: unknown[] }>();
  const tm = {
    exists: (k: string) => textures.has(k),
    remove: (k: string) => textures.delete(k),
    get: (k: string) => textures.get(k)!,
    create: (k: string) => {
      const t = {
        frames: 0,
        dataSource: [] as unknown[],
        source: [{}],
        add() {
          t.frames++;
        },
        setDataSource(c: unknown) {
          t.dataSource = [c];
        },
      };
      textures.set(k, t);
      return t;
    },
  };
  const scene = { textures: tm, game: { loop: { get frame() { return frame.n; } }, renderer: {} } };
  return { scene: scene as unknown as Phaser.Scene, textures, frame };
}

describe('unitArt on demand (M5 Task 1, Review Focus 1)', () => {
  beforeAll(() => installRecordingCanvas());

  it('a sheet nobody prewarmed (an AI civ trains a later-age unit early) is created with the first idle frame of every heading painted', async () => {
    const { unitArt, readyFrame } = await import('./UnitArt');
    const { scene, textures } = fakeScene();
    const art = unitArt(scene, 'knight', 'german');
    expect(art).not.toBeNull();
    if (!art) return;
    expect(textures.has(art.key)).toBe(true);
    expect(textures.has(art.maskKey)).toBe(true);
    for (let slot = 0; slot < PAINTED_HEADINGS.length; slot++) {
      const idle = frameIndex(art.sheet.layout, slot, 'idle', 0);
      expect(art.sheet.painted[idle]).toBe(1);
      // A walk frame not painted yet shows the heading's idle frame, never nothing.
      const walk = frameIndex(art.sheet.layout, slot, 'walk', 3);
      expect(art.sheet.painted[readyFrame(art, walk)]).toBe(1);
    }
  });

  it('a second new sheet in the same game frame waits for the next frame (one new sheet per frame)', async () => {
    const { unitArt } = await import('./UnitArt');
    const { scene, frame } = fakeScene({ n: 100 });
    expect(unitArt(scene, 'pikeman', 'french')).not.toBeNull();
    expect(unitArt(scene, 'crossbowman', 'french')).toBeNull();
    frame.n++;
    expect(unitArt(scene, 'crossbowman', 'french')).not.toBeNull();
  });
});
