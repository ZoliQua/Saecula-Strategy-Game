import { MIN_BRIGHTNESS, SHADOW, SKY_KEYS } from '../../../config/visual';
import { deriveNormals } from './deriveNormals';
import { flashEnvelope, FlashPool, persistentBudget, selectPersistentLights } from './flashPool';
import { convexHull, projectVolumeShadow, shearQuad } from './shadowGeometry';
import { groundBrightness, shadowVector, sunAt, sunDirection, wrapPhase } from './sun';
import {
  cylinderNormal,
  decodeNormal,
  dot,
  encodeNormal,
  N_LEFT,
  N_RIGHT,
  N_UP,
  slopeNormal,
} from './viewSpace';

const close = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

describe('view space', () => {
  it('ground and wall normals are unit length and perpendicular', () => {
    for (const n of [N_UP, N_LEFT, N_RIGHT]) expect(close(Math.hypot(...n), 1)).toBe(true);
    expect(close(dot(N_UP, N_LEFT), 0)).toBe(true);
    expect(close(dot(N_UP, N_RIGHT), 0)).toBe(true);
    expect(close(dot(N_LEFT, N_RIGHT), 0)).toBe(true);
  });

  it('left wall faces screen-left, right wall screen-right, both towards the viewer', () => {
    expect(N_LEFT[0]).toBeLessThan(0);
    expect(N_RIGHT[0]).toBeGreaterThan(0);
    expect(N_LEFT[2]).toBeGreaterThan(0);
    expect(N_UP[1]).toBeGreaterThan(0.8);
  });

  it('slope normal degenerates to up (flat) and to the wall (vertical)', () => {
    const flat = slopeNormal(0, 1, 1, 0);
    const wall = slopeNormal(0, 1, 0, 1);
    flat.forEach((c, i) => expect(close(c, N_UP[i]!)).toBe(true));
    wall.forEach((c, i) => expect(close(c, N_LEFT[i]!)).toBe(true));
  });

  it('cylinder normals sweep from left to right', () => {
    expect(cylinderNormal(-Math.PI / 2)[0]).toBeCloseTo(-1);
    expect(cylinderNormal(Math.PI / 2)[0]).toBeCloseTo(1);
    expect(cylinderNormal(0)[2]).toBeGreaterThan(0.8);
  });

  it('encode/decode round-trips within byte precision', () => {
    const d = decodeNormal(...encodeNormal(N_LEFT));
    d.forEach((c, i) => expect(Math.abs(c - N_LEFT[i]!)).toBeLessThan(0.01));
  });
});

describe('sun cycle', () => {
  it('wraps phases', () => {
    expect(wrapPhase(1.25)).toBeCloseTo(0.25);
    expect(wrapPhase(-0.25)).toBeCloseTo(0.75);
  });

  it('hits keyframes exactly', () => {
    const k = SKY_KEYS[3]!;
    const s = sunAt(k.at);
    expect(s.elevationDeg).toBeCloseTo(k.elevation);
    expect(s.azimuthDeg).toBeCloseTo(k.azimuth);
  });

  it('is continuous across the wrap', () => {
    const a = sunAt(0.9999);
    const b = sunAt(0);
    expect(Math.abs(a.elevationDeg - b.elevationDeg)).toBeLessThan(0.5);
  });

  it('never gets darker than MIN_BRIGHTNESS on flat ground', () => {
    for (let p = 0; p < 1; p += 0.005) {
      const s = sunAt(p);
      expect(groundBrightness(s.ambient, s.color, s.elevationDeg)).toBeGreaterThanOrEqual(MIN_BRIGHTNESS - 1e-6);
    }
  });

  it('noon is brighter than night and has no window glow', () => {
    const noon = sunAt(0.4);
    const night = sunAt(0.87);
    expect(groundBrightness(noon.ambient, noon.color, noon.elevationDeg)).toBeGreaterThan(
      groundBrightness(night.ambient, night.color, night.elevationDeg) + 0.2,
    );
    expect(noon.glow).toBe(0);
    expect(night.glow).toBeGreaterThan(0.9);
  });

  it('sun rises on the left and sets on the right', () => {
    expect(sunAt(0.05).dir[0]).toBeLessThan(0);
    expect(sunAt(0.68).dir[0]).toBeGreaterThan(0);
  });

  it('direction is a unit vector whose ground term equals sin(elevation)', () => {
    const d = sunDirection(120, 40);
    expect(close(Math.hypot(...d), 1)).toBe(true);
    expect(dot(d, N_UP)).toBeCloseTo(Math.sin((40 * Math.PI) / 180));
  });
});

describe('shadow projection', () => {
  const sun = (azimuthDeg: number, elevationDeg: number) => ({ azimuthDeg, elevationDeg, color: [0.6, 0.6, 0.6] as const });

  it('falls away from the sun', () => {
    expect(shadowVector(sun(180, 30)).x).toBeGreaterThan(0); // sun left → shadow right
    expect(shadowVector(sun(0, 30)).x).toBeLessThan(0);
    expect(shadowVector(sun(90, 30)).y).toBeLessThan(0); // sun in front → shadow up-screen
  });

  it('grows as the sun gets lower and is capped', () => {
    const len = (e: number) => Math.hypot(shadowVector(sun(150, e)).x, shadowVector(sun(150, e)).y);
    expect(len(20)).toBeGreaterThan(len(60));
    expect(Math.hypot(shadowVector(sun(180, 1)).x, 0)).toBeLessThanOrEqual(SHADOW.maxLength + 1e-9);
  });

  it('fades with a dim sun', () => {
    const dim = shadowVector({ azimuthDeg: 120, elevationDeg: 40, color: [0.1, 0.1, 0.1] });
    const bright = shadowVector({ azimuthDeg: 120, elevationDeg: 40, color: [0.6, 0.6, 0.6] });
    expect(dim.strength).toBeLessThan(bright.strength);
  });

  it('convex hull drops interior points', () => {
    const hull = convexHull([[0, 0], [10, 0], [10, 10], [0, 10], [5, 5]]);
    expect(hull).toHaveLength(4);
  });

  it('volume shadow keeps the footprint and extends tops along the vector', () => {
    const sv = { x: 1, y: 0, px: 0, py: 0.5, strength: 1 };
    const hull = projectVolumeShadow([{ gx: 0, gy: 0, z: 0 }, { gx: 0, gy: 0, z: 20 }, { gx: 0, gy: 10, z: 0 }], sv);
    expect(hull.some(([x]) => x === 20)).toBe(true);
    expect(hull.some(([x, y]) => x === 0 && y === 0)).toBe(true);
  });

  it('shear quad keeps the pivot row and moves the top along the shadow', () => {
    const sv = { x: 2, y: -0.5, px: 1, py: 0, strength: 1 };
    const [tl, bl] = shearQuad(-10, -40, 10, 0, sv);
    expect(bl[0]).toBeCloseTo(-10);
    expect(bl[1]).toBeCloseTo(0);
    expect(tl[0]).toBeCloseTo(-10 + 80);
    expect(tl[1]).toBeCloseTo(-20);
  });
});

describe('flash pool', () => {
  it('envelope starts full and ends dark', () => {
    expect(flashEnvelope(0)).toBe(1);
    expect(flashEnvelope(0.5)).toBeLessThan(1);
    expect(flashEnvelope(1)).toBe(0);
  });

  it('caps active flashes and recycles the oldest', () => {
    const pool = new FlashPool(2);
    pool.spawn(0, 1, 1, 0xffffff, 50, 100);
    pool.spawn(10, 2, 2, 0xffffff, 50, 100);
    const idx = pool.spawn(20, 3, 3, 0xffffff, 50, 100);
    expect(pool.activeCount()).toBe(2);
    expect(idx).toBe(0);
    expect(pool.slots[0]!.x).toBe(3);
  });

  it('expires finished flashes', () => {
    const pool = new FlashPool(3);
    pool.spawn(0, 0, 0, 0xffffff, 50, 100, 2);
    expect(pool.update(50)[0]).toBeGreaterThan(0);
    expect(pool.update(150)[0]).toBe(0);
    expect(pool.activeCount()).toBe(0);
  });
});

describe('deriveNormals', () => {
  const W = 21;
  const square = (): Uint8ClampedArray => {
    const a = new Uint8ClampedArray(W * W * 4);
    for (let y = 4; y < 17; y++) {
      for (let x = 4; x < 17; x++) {
        const o = (y * W + x) * 4;
        a.set([128, 128, 128, 255], o);
      }
    }
    return a;
  };
  const normalAt = (n: Uint8ClampedArray, x: number, y: number) => {
    const o = (y * W + x) * 4;
    return decodeNormal(n[o]!, n[o + 1]!, n[o + 2]!);
  };

  it('bulges a silhouette: left edge faces left, top edge faces up', () => {
    const n = deriveNormals(square(), W, W, null, { bulge: 3, bulgeStrength: 6, upBias: 0, detail: 0 });
    expect(normalAt(n, 4, 10)[0]).toBeLessThan(-0.2);
    expect(normalAt(n, 16, 10)[0]).toBeGreaterThan(0.2);
    expect(normalAt(n, 10, 4)[1]).toBeGreaterThan(0.2);
    expect(normalAt(n, 10, 10)[2]).toBeGreaterThan(0.9);
  });

  it('transparent pixels face up; painter faces override the pillow', () => {
    const faces = new Uint8ClampedArray(W * W * 4);
    const o = (10 * W + 4) * 4;
    faces.set([...encodeNormal(N_RIGHT), 255], o);
    const n = deriveNormals(square(), W, W, faces, { bulge: 3, bulgeStrength: 6, upBias: 0, detail: 0 });
    expect(normalAt(n, 0, 0)[1]).toBeCloseTo(N_UP[1], 1);
    expect(normalAt(n, 4, 10)[0]).toBeCloseTo(N_RIGHT[0], 1);
  });
});

describe('persistent light budget', () => {
  const view = { x: 0, y: 0, right: 100, bottom: 100 };
  const at = (x: number, y: number, radius = 10) => ({ x, y, radius });

  it('keeps the lights nearest the view centre within the budget', () => {
    const lights = [at(50, 50), at(90, 90), at(10, 10), at(55, 45)];
    expect([...selectPersistentLights(lights, view, 2)].sort()).toEqual([0, 3]);
  });

  it('ignores lights that cannot reach the view', () => {
    const lights = [at(500, 500), at(60, 60)];
    expect([...selectPersistentLights(lights, view, 2)]).toEqual([1]);
  });

  it('reserves room for active flashes', () => {
    const lights = Array.from({ length: 20 }, (_, i) => at(i * 5, 50));
    const budget = persistentBudget(12, 4);
    expect(budget).toBe(8);
    expect(selectPersistentLights(lights, view, budget).size).toBe(8);
    expect(persistentBudget(12, 20)).toBe(0);
  });
});
