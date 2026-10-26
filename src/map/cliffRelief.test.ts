import { describe, expect, it } from 'vitest';
import type { CliffTest } from './cliffGeometry';
import { buildRelief, findPasses, footDistance, marchRelief, rockAt, sampleRelief } from './cliffRelief';

const H = 30;
/** A 6×6 plateau at tiles 4..9 on a 16×16 map. */
const plateau: CliffTest = (x, y) => x >= 4 && x <= 9 && y >= 4 && y <= 9;
const relief = buildRelief(plateau, 16, 16, H, 3);

describe('cliff relief', () => {
  it('stands rock inside the plateau and never on open tiles', () => {
    expect(rockAt(relief, 6.5, 6.5)).toBe(true);
    for (let u = -0.5; u < 15.5; u += 0.13) {
      for (let v = -0.5; v < 15.5; v += 0.17) {
        if (!plateau(Math.floor(u + 0.5), Math.floor(v + 0.5))) expect(rockAt(relief, u, v)).toBe(false);
      }
    }
  });

  it('erodes the rim: some edge points of cliff tiles show ground', () => {
    let open = 0;
    for (let t = 3.6; t < 9.4; t += 0.05) if (!rockAt(relief, t, 9.45)) open++;
    expect(open).toBeGreaterThan(0);
  });

  it('keeps plateau heights within the declared maximum', () => {
    for (let u = 4; u <= 9; u += 0.5) {
      for (let v = 4; v <= 9; v += 0.5) {
        const top = sampleRelief(relief, relief.top, u, v);
        expect(top).toBeGreaterThan(H * 0.8);
        expect(top).toBeLessThanOrEqual(relief.maxHeight);
      }
    }
  });

  it('sees the plateau top inside, a face at the front rim, ground far away', () => {
    expect(marchRelief(relief, 5, 5)?.surface).toBe('top');
    const front = marchRelief(relief, 9.1, 9.1);
    expect(front?.surface).toBe('face');
    expect(front?.tx).toBeGreaterThanOrEqual(4);
    expect(marchRelief(relief, 13, 13)).toBeNull();
    expect(marchRelief(relief, 1, 1)).toBeNull();
  });

  it('measures the foot distance as zero at the rock and growing outward', () => {
    expect(footDistance(relief, 6.5, 6.5)).toBe(0);
    expect(footDistance(relief, 11, 7)).toBeGreaterThan(footDistance(relief, 10, 7));
  });
});

describe('mountain passes', () => {
  /** A ridge along x = 6..10 on a 20×20 map with a 1-tile lane cut through at y = 10. */
  const ridge: CliffTest = (x, y) => x >= 6 && x <= 10 && y >= 0 && y < 20 && y !== 10;

  it('finds 1–2 tile lanes between rock on opposite sides', () => {
    const pass = findPasses(ridge, 20, 20);
    expect(pass[10 * 20 + 8]).toBe(1);
    expect(pass[10 * 20 + 3]).toBe(0);
    expect(pass[3 * 20 + 3]).toBe(0);
    const wide: CliffTest = (x, y) => x >= 6 && x <= 10 && (y < 9 || y > 10);
    const w = findPasses(wide, 20, 20);
    expect(w[9 * 20 + 8]).toBe(1);
    expect(w[10 * 20 + 8]).toBe(1);
  });

  it('lowers the rock beside a pass into a saddle', () => {
    const r = buildRelief(ridge, 20, 20, H, 3);
    const beside = sampleRelief(r, r.top, 8, 9);
    const far = sampleRelief(r, r.top, 8, 3);
    expect(beside).toBeLessThan(far * 0.75);
  });
});
