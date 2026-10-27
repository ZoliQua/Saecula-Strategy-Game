import { describe, expect, it } from 'vitest';
import { shadePixels } from './shadeCanvas';

/** One RGBA pixel. */
const px = (r: number, g: number, b: number, a = 255) => new Uint8ClampedArray([r, g, b, a]);
/** A normal-map pixel encoding a view-space normal (x right, y up, z to viewer). */
const normal = (x: number, y: number, z: number) => px(Math.round((x * 0.5 + 0.5) * 255), Math.round((y * 0.5 + 0.5) * 255), Math.round((z * 0.5 + 0.5) * 255));

const light = { dir: [0, 0, 1] as const, color: [0.5, 0.5, 0.5] as const, ambient: [0.5, 0.5, 0.5] as const };

describe('shadePixels (IsoLight2D sun term on the CPU)', () => {
  it('lights a face towards the sun with ambient + sun', () => {
    const out = shadePixels(px(200, 100, 50), normal(0, 0, 1), light);
    expect([...out]).toEqual([200, 100, 50, 255]);
  });

  it('leaves a face turned away from the sun with ambient only', () => {
    const out = shadePixels(px(200, 100, 50), normal(0, 0, -1), light);
    expect([...out]).toEqual([100, 50, 25, 255]);
  });

  it('keeps alpha and tints by the light colour', () => {
    const out = shadePixels(px(100, 100, 100, 90), normal(0, 0, 1), { ...light, color: [1, 0.5, 0], ambient: [0, 0, 0] });
    expect([...out]).toEqual([100, 50, 0, 90]);
  });

  it('treats a missing normal (transparent normal pixel) as facing the viewer', () => {
    const out = shadePixels(px(100, 100, 100), new Uint8ClampedArray([0, 0, 0, 0]), light);
    expect([...out]).toEqual([100, 100, 100, 255]);
  });
});
