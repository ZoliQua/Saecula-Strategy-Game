import { beforeAll, describe, expect, it } from 'vitest';
import { CIV_IDS } from '../../config/civs';
import { UNIT_SPECS } from '../../ecs/archetypes/unit';
import { installRecordingCanvas } from './testing/recordingCanvas.testkit';
import { unitPixelsHash } from './testing/unitPins.testkit';
import { unitAnims, walkCycleTiles } from './units/layout';
import { unitLook } from './units/looks';

/*
 * M17 art: the trade cart (a horse-drawn covered wagon, its own look kind)
 * paints for every civ, the same way twice (deterministic; no hash pinned,
 * as for M11 / M14: draw-log hashes differ between Node versions). The
 * trade ship is drawn from the transport's sheet.
 */

describe('trade art', () => {
  let sheet: typeof import('./units/sheet');
  beforeAll(async () => {
    installRecordingCanvas();
    sheet = await import('./units/sheet');
  });

  it.each(CIV_IDS)('%s: the trade cart sheet paints idle, walk and death, deterministically, wider than a villager', (civ) => {
    expect(unitLook('trade_cart', civ).kind).toBe('wagon');
    const g = sheet.sheetGeometry('trade_cart', civ);
    expect(g.layout.anims).toEqual(['idle', 'walk', 'death']);
    for (let k = 0; k < g.layout.frameCount; k += 3) {
      expect(sheet.rasterizeFrame('trade_cart', civ, k).coverage.some((c) => c > 0), `frame ${k}`).toBe(true);
    }
    expect(unitPixelsHash('trade_cart', civ)).toBe(unitPixelsHash('trade_cart', civ));
    const widest = (type: 'trade_cart' | 'villager') => Math.max(...sheet.sheetGeometry(type, civ).frames.map((f) => f.w));
    expect(widest('trade_cart')).toBeGreaterThan(widest('villager'));
  });

  it('the walk frames differ (wheels turn, the horse moves) and the civs paint their carts differently', () => {
    const g = sheet.sheetGeometry('trade_cart', 'english');
    const walk = g.layout.offsets.walk ?? 0;
    const px = (k: number) => Array.from(sheet.rasterizeFrame('trade_cart', 'english', k).albedo.slice(0, 20000)).join(',');
    expect(px(walk)).not.toBe(px(walk + 3));
    expect(new Set(CIV_IDS.map((civ) => unitPixelsHash('trade_cart', civ))).size).toBe(CIV_IDS.length);
  });

  it('the trade ship shares the transport sheet: the same texture key, animations, walk cycle and look in every civ', () => {
    expect(UNIT_SPECS.trade_ship.textureKey).toBe(UNIT_SPECS.transport.textureKey);
    expect(unitAnims('trade_ship')).toEqual(unitAnims('transport'));
    expect(walkCycleTiles('trade_ship')).toBe(walkCycleTiles('transport'));
    for (const civ of CIV_IDS) {
      expect(unitLook('trade_ship', civ), civ).toBe(unitLook('transport', civ));
      expect(sheet.sheetGeometry('trade_ship', civ).frames).toEqual(sheet.sheetGeometry('transport', civ).frames);
    }
    expect(UNIT_SPECS.trade_cart.textureKey).not.toBe(UNIT_SPECS.transport.textureKey);
  });
});
