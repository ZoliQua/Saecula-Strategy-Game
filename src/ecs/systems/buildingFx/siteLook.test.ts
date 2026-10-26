import { describe, expect, it } from 'vitest';
import { BUILDING_BOTTOM_PAD } from '../../../iso/art/canvas';
import { showsTexture } from '../../../iso/damageTextures';
import { siteAlpha, sitePlateAlpha, siteShownHeight } from './siteLook';

describe('siteLook', () => {
  it('rises from a stub to the full sprite and solidifies', () => {
    expect(siteShownHeight(200, 0)).toBe(Math.max(BUILDING_BOTTOM_PAD + 4, 16));
    expect(siteShownHeight(200, 0.5)).toBeCloseTo(108);
    expect(siteShownHeight(200, 1)).toBe(200);
    expect(siteAlpha(0)).toBe(0.75);
    expect(siteAlpha(1)).toBe(1);
    expect(sitePlateAlpha(1)).toBeCloseTo(0.4);
  });
});

describe('showsTexture', () => {
  it('is false for an image still holding a texture removed and repainted under the same key', () => {
    const old = { key: 'dmg~house' };
    const repainted = { key: 'dmg~house' };
    const textures = { get: (k: string) => (k === 'dmg~house' ? repainted : undefined) };
    expect(showsTexture({ texture: old }, textures, 'dmg~house')).toBe(false);
    expect(showsTexture({ texture: repainted }, textures, 'dmg~house')).toBe(true);
  });
});
