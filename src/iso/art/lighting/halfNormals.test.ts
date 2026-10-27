import { describe, expect, it } from 'vitest';
import { halveNormals } from './halfNormals';
import { decodeNormal, encodeNormal } from './viewSpace';

function fill(w: number, h: number, at: (x: number, y: number) => [number, number, number]): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = at(x, y);
      d.set([r, g, b, 255], (y * w + x) * 4);
    }
  }
  return d;
}

describe('halveNormals', () => {
  it('halves each side (rounding up) and keeps a uniform normal', () => {
    const n = encodeNormal([0.6, 0, 0.8]);
    const out = halveNormals(fill(5, 4, () => n), 5, 4, null);
    expect(out.width).toBe(3);
    expect(out.height).toBe(2);
    for (let i = 0; i < out.data.length; i += 4) {
      expect(Math.abs(out.data[i]! - n[0])).toBeLessThanOrEqual(1);
      expect(Math.abs(out.data[i + 2]! - n[2])).toBeLessThanOrEqual(1);
      expect(out.data[i + 3]).toBe(255);
    }
  });

  it('averages the four normals and renormalises', () => {
    const left = encodeNormal([-1, 0, 0]);
    const front = encodeNormal([0, 0, 1]);
    const out = halveNormals(fill(2, 2, (x) => (x === 0 ? left : front)), 2, 2, null);
    const [x, y, z] = decodeNormal(out.data[0]!, out.data[1]!, out.data[2]!);
    expect(x).toBeCloseTo(-Math.SQRT1_2, 1);
    expect(y).toBeCloseTo(0, 1);
    expect(z).toBeCloseTo(Math.SQRT1_2, 1);
  });

  it('ignores uncovered texels at a silhouette edge (no bleed of the background normal)', () => {
    const body = encodeNormal([1, 0, 0]);
    const ground = encodeNormal([0, 0.866, 0.5]);
    const cover = new Float32Array([1, 0, 0, 0]);
    const out = halveNormals(fill(2, 2, (x, y) => (x === 0 && y === 0 ? body : ground)), 2, 2, (i) => cover[i]!);
    const [x] = decodeNormal(out.data[0]!, out.data[1]!, out.data[2]!);
    expect(x).toBeCloseTo(1, 1);
  });

  it('falls back to the plain average where nothing is covered', () => {
    const ground = encodeNormal([0, 0.866, 0.5]);
    const out = halveNormals(fill(2, 2, () => ground), 2, 2, () => 0);
    expect(Math.abs(out.data[1]! - ground[1])).toBeLessThanOrEqual(1);
  });
});
