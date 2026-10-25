import { describe, expect, it } from 'vitest';
import { newHit, primBounds, type Prim } from './primitives';
import { intersect } from './solid';
import { cross, dot, norm, sub, type V3 } from './rigMath';

/** Deterministic pseudo-random in [−1, 1). */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s / 2 ** 32) * 2 - 1;
  };
}

function inside(p: Prim, q: V3): boolean {
  switch (p.kind) {
    case 'sphere':
      return dot(sub(q, p.c), sub(q, p.c)) <= p.r * p.r;
    case 'ellipsoid': {
      const d = sub(q, p.c);
      return (dot(d, p.ax) / p.rx) ** 2 + (dot(d, p.ay) / p.ry) ** 2 + (dot(d, p.az) / p.rz) ** 2 <= 1;
    }
    case 'capsule': {
      const ba = sub(p.b, p.a);
      const k = Math.min(1, Math.max(0, dot(sub(q, p.a), ba) / dot(ba, ba)));
      const c: V3 = [p.a[0] + ba[0] * k, p.a[1] + ba[1] * k, p.a[2] + ba[2] * k];
      return dot(sub(q, c), sub(q, c)) <= p.r * p.r;
    }
    case 'cone': {
      const ba = sub(p.b, p.a);
      const k = dot(sub(q, p.a), ba) / dot(ba, ba);
      if (k < 0 || k > 1) return false;
      const c: V3 = [p.a[0] + ba[0] * k, p.a[1] + ba[1] * k, p.a[2] + ba[2] * k];
      const r = p.ra + (p.rb - p.ra) * k;
      return dot(sub(q, c), sub(q, c)) <= r * r;
    }
    case 'box': {
      const d = sub(q, p.c);
      return Math.abs(dot(d, p.ax)) <= p.hx && Math.abs(dot(d, p.ay)) <= p.hy && Math.abs(dot(d, p.az)) <= p.hz;
    }
  }
}

/** Reference: march the view ray downwards until it enters the solid. */
function march(p: Prim, X: number, Y: number): number | null {
  for (let z = 40; z > -40; z -= 0.004) if (inside(p, [X, Y, z])) return z;
  return null;
}

function randomFrame(r: () => number): [V3, V3, V3] {
  const a = norm([r(), r(), r()]);
  const b = norm(cross(a, norm([r(), r(), r() + 2])));
  return [a, b, cross(a, b)];
}

function randomPrims(seed: number): Prim[] {
  const r = rng(seed);
  const out: Prim[] = [];
  for (let i = 0; i < 6; i++) {
    const c: V3 = [r() * 3, r() * 3, r() * 3];
    const [ax, ay, az] = randomFrame(r);
    const a: V3 = [r() * 6, r() * 6, r() * 6];
    const b: V3 = [r() * 6, r() * 6, r() * 6];
    out.push({ kind: 'sphere', mat: 0, c, r: 2 + r() });
    out.push({ kind: 'ellipsoid', mat: 0, c, ax, ay, az, rx: 3 + r(), ry: 2 + r(), rz: 4 + r() });
    out.push({ kind: 'capsule', mat: 0, a, b, r: 1.5 + r() * 0.5 });
    out.push({ kind: 'cone', mat: 0, a, b, ra: 2 + r() * 0.5, rb: 0.8 + r() * 0.5 });
    out.push({ kind: 'box', mat: 0, c, ax, ay, az, hx: 2 + r(), hy: 1.5 + r(), hz: 3 + r() });
  }
  return out;
}

describe('primitive ray intersection', () => {
  it('matches a brute-force march for every primitive kind', () => {
    const h = newHit();
    const r = rng(99);
    for (const p of randomPrims(7)) {
      const b = primBounds(p);
      for (let i = 0; i < 40; i++) {
        const X = b.x0 + ((r() + 1) / 2) * (b.x1 - b.x0);
        const Y = b.y0 + ((r() + 1) / 2) * (b.y1 - b.y0);
        const ref = march(p, X, Y);
        const hit = intersect(p, X, Y, h);
        if (ref === null) {
          // Grazing samples may differ by the march step; only allow near-misses.
          if (hit) expect(march({ ...p, ...grow(p) } as Prim, X, Y)).not.toBeNull();
          continue;
        }
        expect(hit, `${p.kind} at ${X.toFixed(2)},${Y.toFixed(2)}`).toBe(true);
        expect(Math.abs(h.z - ref)).toBeLessThan(0.05);
        expect(Math.hypot(h.nx, h.ny, h.nz)).toBeCloseTo(1, 3);
        // Visible surfaces face the viewer.
        expect(h.nz).toBeGreaterThan(-1e-3);
      }
    }
  });

  it('bounds contain every hit', () => {
    const h = newHit();
    for (const p of randomPrims(3)) {
      const b = primBounds(p);
      for (let X = b.x0 - 3; X <= b.x1 + 3; X += 0.25) {
        for (let Y = b.y0 - 3; Y <= b.y1 + 3; Y += 0.25) {
          if (X >= b.x0 && X <= b.x1 && Y >= b.y0 && Y <= b.y1) continue;
          expect(intersect(p, X, Y, h)).toBe(false);
        }
      }
    }
  });

  it('a clip plane opens a shell and shows its inside', () => {
    const h = newHit();
    const shell: Prim = { kind: 'sphere', mat: 0, c: [0, 0, 0], r: 5, clip: { n: [0, 0, -1], d: 1 } };
    // Front of the sphere (z > −1) is cut away: the ray sees the back inside.
    expect(intersect(shell, 0, 0, h)).toBe(true);
    expect(h.z).toBeCloseTo(-5, 5);
    expect(h.back).toBe(true);
  });
});

/** Slightly inflated copy for the grazing-miss tolerance check. */
function grow(p: Prim): Partial<Record<string, number>> {
  switch (p.kind) {
    case 'sphere':
    case 'capsule':
      return { r: p.r + 0.05 };
    case 'ellipsoid':
      return { rx: p.rx + 0.05, ry: p.ry + 0.05, rz: p.rz + 0.05 };
    case 'cone':
      return { ra: p.ra + 0.05, rb: p.rb + 0.05 };
    case 'box':
      return { hx: p.hx + 0.05, hy: p.hy + 0.05, hz: p.hz + 0.05 };
  }
}
