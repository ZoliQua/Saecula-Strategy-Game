import { describe, expect, it } from 'vitest';
import { trimRect } from './trimArt';

function alphaWith(w: number, h: number, box: [number, number, number, number]): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4);
  const [x0, y0, x1, y1] = box;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) d[(y * w + x) * 4 + 3] = 200;
  return d;
}

describe('trimRect', () => {
  it('cuts the empty top and equal empty margins left and right, never the bottom', () => {
    // Content x 55..144 of 200 (55 px margin each side), y 92..150 of 204.
    const r = trimRect(alphaWith(200, 204, [55, 92, 144, 150]), 200, 204);
    expect(r).toEqual({ left: 55, top: 92, width: 90, height: 112 });
  });

  it('keeps the centre: the smaller side margin wins', () => {
    const r = trimRect(alphaWith(100, 50, [10, 20, 79, 49]), 100, 50);
    // margins 10 left / 20 right -> 10 each side
    expect(r.left).toBe(10);
    expect(r.width).toBe(80);
    expect(r.left + r.width / 2).toBe(50);
  });

  it('keeps the exact centre on an odd width', () => {
    const r = trimRect(alphaWith(101, 61, [13, 17, 87, 60]), 101, 61);
    expect(r.left + r.width / 2).toBe(50.5);
    expect(r.top + r.height).toBe(61);
  });

  it('keeps an even height (half-size normal maps stay texel-exact) by keeping one more empty row', () => {
    const r = trimRect(alphaWith(100, 61, [10, 20, 89, 60]), 100, 61);
    expect(r.height % 2).toBe(0);
    expect(r.top).toBe(19);
    expect(r.top + r.height).toBe(61);
  });

  it('leaves an empty canvas alone', () => {
    expect(trimRect(new Uint8ClampedArray(40 * 30 * 4), 40, 30)).toEqual({ left: 0, top: 0, width: 40, height: 30 });
  });
});
