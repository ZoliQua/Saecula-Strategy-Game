import { primBounds, type Hit, type Prim } from './primitives';

/**
 * Ray-casting of rig primitives for the rasterizer (view space, one
 * orthographic ray per sample from (X, Y, RAY_Z) towards −z; the hit
 * closest to the viewer wins).
 */
const SPHERE = 0;
const ELLIPSOID = 1;
const CAPSULE = 2;
const CONE = 3;
const BOX = 4;
const KIND_CODE = { sphere: SPHERE, ellipsoid: ELLIPSOID, capsule: CAPSULE, cone: CONE, box: BOX } as const;
const RAY_Z = 1000;

/**
 * Monomorphic, scalar-only form of a Prim for the per-sample hot loop
 * (every instance has the same hidden class, so the JIT keeps the
 * intersection code fast however many kinds of parts a figure mixes).
 *  - p = centre (sphere, ellipsoid, box) or segment start (capsule, cone);
 *  - q = segment end; r / r2 = radii (cone: start / end);
 *  - e0..e2 = unit axes, s0..s2 = radii / half extents (ellipsoid, box).
 */
export class Solid {
  kind = 0;
  mat = 0;
  clip = false;
  cnx = 0;
  cny = 0;
  cnz = 0;
  cd = 0;
  px = 0;
  py = 0;
  pz = 0;
  qx = 0;
  qy = 0;
  qz = 0;
  r = 0;
  r2 = 0;
  e0x = 1;
  e0y = 0;
  e0z = 0;
  e1x = 0;
  e1y = 1;
  e1z = 0;
  e2x = 0;
  e2y = 0;
  e2z = 1;
  s0 = 0;
  s1 = 0;
  s2 = 0;
  x0 = 0;
  x1 = 0;
  y0 = 0;
  y1 = 0;

  constructor(p: Prim) {
    this.kind = KIND_CODE[p.kind];
    this.mat = p.mat;
    if (p.clip) {
      this.clip = true;
      [this.cnx, this.cny, this.cnz] = p.clip.n;
      this.cd = p.clip.d;
    }
    switch (p.kind) {
      case 'sphere':
        [this.px, this.py, this.pz] = p.c;
        this.r = p.r;
        break;
      case 'capsule':
      case 'cone':
        [this.px, this.py, this.pz] = p.a;
        [this.qx, this.qy, this.qz] = p.b;
        this.r = p.kind === 'capsule' ? p.r : p.ra;
        this.r2 = p.kind === 'capsule' ? p.r : p.rb;
        break;
      case 'ellipsoid':
      case 'box':
        [this.px, this.py, this.pz] = p.c;
        [this.e0x, this.e0y, this.e0z] = p.ax;
        [this.e1x, this.e1y, this.e1z] = p.ay;
        [this.e2x, this.e2y, this.e2z] = p.az;
        this.s0 = p.kind === 'box' ? p.hx : p.rx;
        this.s1 = p.kind === 'box' ? p.hy : p.ry;
        this.s2 = p.kind === 'box' ? p.hz : p.rz;
        break;
    }
    const b = primBounds(p);
    this.x0 = b.x0;
    this.x1 = b.x1;
    this.y0 = b.y0;
    this.y1 = b.y1;
  }
}

function keep(s: Solid, X: number, Y: number, z: number): boolean {
  return !s.clip || s.cnx * X + s.cny * Y + s.cnz * z >= s.cd;
}

/** Intersects the view ray through (X, Y); fills `h` and returns true on a hit. */
export function intersect(p: Prim, X: number, Y: number, h: Hit): boolean {
  return intersectSolid(new Solid(p), X, Y, h);
}

export function intersectSolid(s: Solid, X: number, Y: number, h: Hit): boolean {
  switch (s.kind) {
    case SPHERE:
      return sphere(s, X, Y, h);
    case ELLIPSOID:
      return ellipsoid(s, X, Y, h);
    case CAPSULE:
      return capsule(s, X, Y, h);
    case CONE:
      return cone(s, X, Y, h);
    default:
      return box(s, X, Y, h);
  }
}

function sphere(p: Solid, X: number, Y: number, h: Hit): boolean {
  const dx = X - p.px;
  const dy = Y - p.py;
  const q = p.r * p.r - dx * dx - dy * dy;
  if (q < 0) return false;
  const s = Math.sqrt(q);
  for (let sign = 1; sign >= -1; sign -= 2) {
    const dz = s * sign;
    const z = p.pz + dz;
    if (!keep(p, X, Y, z)) continue;
    const k = sign / p.r;
    h.z = z;
    h.nx = dx * k;
    h.ny = dy * k;
    h.nz = dz * k;
    h.u = (dy / p.r + 1) / 2;
    h.back = sign < 0;
    return true;
  }
  return false;
}

function ellipsoid(p: Solid, X: number, Y: number, h: Hit): boolean {
  const wx = X - p.px;
  const wy = Y - p.py;
  // Local coordinate l_i(ζ) = α_i + β_i ζ (ζ = z − centre z); solve Σ l_i² = 1.
  const a1 = (p.e0x * wx + p.e0y * wy) / p.s0;
  const a2 = (p.e1x * wx + p.e1y * wy) / p.s1;
  const a3 = (p.e2x * wx + p.e2y * wy) / p.s2;
  const b1 = p.e0z / p.s0;
  const b2 = p.e1z / p.s1;
  const b3 = p.e2z / p.s2;
  const A = b1 * b1 + b2 * b2 + b3 * b3;
  const B = 2 * (a1 * b1 + a2 * b2 + a3 * b3);
  const C = a1 * a1 + a2 * a2 + a3 * a3 - 1;
  const disc = B * B - 4 * A * C;
  if (disc < 0) return false;
  const s = Math.sqrt(disc);
  for (let sign = 1; sign >= -1; sign -= 2) {
    const zeta = (-B + sign * s) / (2 * A);
    const z = p.pz + zeta;
    if (!keep(p, X, Y, z)) continue;
    const l3 = a3 + b3 * zeta;
    const q1 = (a1 + b1 * zeta) / p.s0;
    const q2 = (a2 + b2 * zeta) / p.s1;
    const q3 = l3 / p.s2;
    let nx = q1 * p.e0x + q2 * p.e1x + q3 * p.e2x;
    let ny = q1 * p.e0y + q2 * p.e1y + q3 * p.e2y;
    let nz = q1 * p.e0z + q2 * p.e1z + q3 * p.e2z;
    const l = (Math.hypot(nx, ny, nz) || 1) * sign;
    nx /= l;
    ny /= l;
    nz /= l;
    h.z = z;
    h.nx = nx;
    h.ny = ny;
    h.nz = nz;
    h.u = (l3 + 1) / 2;
    h.v = a2 + b2 * zeta;
    h.f = a1 + b1 * zeta;
    h.back = sign < 0;
    return true;
  }
  return false;
}

/** Capsule (Quilez's analytic ray-capsule) with the ray (X, Y, RAY_Z) → −z. */
function capsule(p: Solid, X: number, Y: number, h: Hit): boolean {
  const r = p.r;
  const bax = p.qx - p.px;
  const bay = p.qy - p.py;
  const baz = p.qz - p.pz;
  const oax = X - p.px;
  const oay = Y - p.py;
  const oaz = RAY_Z - p.pz;
  const baba = bax * bax + bay * bay + baz * baz;
  const bard = -baz;
  const baoa = bax * oax + bay * oay + baz * oaz;
  const rdoa = -oaz;
  const oaoa = oax * oax + oay * oay + oaz * oaz;
  const A = baba - bard * bard;
  let t = -1;
  if (A > 1e-6) {
    const B = baba * rdoa - baoa * bard;
    const C = baba * oaoa - baoa * baoa - r * r * baba;
    const disc = B * B - A * C;
    if (disc < 0) return false;
    t = (-B - Math.sqrt(disc)) / A;
    const y = baoa + t * bard;
    if (y <= 0 || y >= baba) t = -1;
  }
  if (t < 0) {
    // End caps: nearest of the two spheres.
    let best = -1;
    for (let e = 0; e < 2; e++) {
      const dx = X - (e === 0 ? p.px : p.qx);
      const dy = Y - (e === 0 ? p.py : p.qy);
      const q = r * r - dx * dx - dy * dy;
      if (q < 0) continue;
      const tc = RAY_Z - ((e === 0 ? p.pz : p.qz) + Math.sqrt(q));
      if (best < 0 || tc < best) best = tc;
    }
    if (best < 0) return false;
    t = best;
  }
  const z = RAY_Z - t;
  if (!keep(p, X, Y, z)) return false;
  const pax = X - p.px;
  const pay = Y - p.py;
  const paz = z - p.pz;
  const k = Math.min(1, Math.max(0, (pax * bax + pay * bay + paz * baz) / (baba || 1)));
  h.z = z;
  h.nx = (pax - k * bax) / r;
  h.ny = (pay - k * bay) / r;
  h.nz = (paz - k * baz) / r;
  h.u = k;
  h.back = false;
  return true;
}

function setCap(p: Solid, t: number, sign: number, u: number, X: number, Y: number, h: Hit): boolean {
  const z = RAY_Z - t;
  if (!keep(p, X, Y, z)) return false;
  const bax = p.qx - p.px;
  const bay = p.qy - p.py;
  const baz = p.qz - p.pz;
  const inv = sign / (Math.hypot(bax, bay, baz) || 1);
  h.z = z;
  h.nx = bax * inv;
  h.ny = bay * inv;
  h.nz = baz * inv;
  h.u = u;
  h.back = false;
  return true;
}

/** Capped cone p (radius r) → q (radius r2), after Quilez's iCappedCone. */
function cone(p: Solid, X: number, Y: number, h: Hit): boolean {
  const ra = p.r;
  const rb = p.r2;
  const bax = p.qx - p.px;
  const bay = p.qy - p.py;
  const baz = p.qz - p.pz;
  const oax = X - p.px;
  const oay = Y - p.py;
  const oaz = RAY_Z - p.pz;
  const obx = X - p.qx;
  const oby = Y - p.qy;
  const obz = RAY_Z - p.qz;
  const m0 = bax * bax + bay * bay + baz * baz;
  const m1 = oax * bax + oay * bay + oaz * baz;
  const m2 = -baz;
  const m3 = -oaz;
  const m5 = oax * oax + oay * oay + oaz * oaz;
  const m9 = obx * bax + oby * bay + obz * baz;
  if (m1 < 0) {
    // Ray origin below the start cap plane: may hit that cap.
    const qx = oax * m2;
    const qy = oay * m2;
    const qz = oaz * m2 + m1;
    if (Math.abs(m2) > 1e-9 && qx * qx + qy * qy + qz * qz < ra * ra * m2 * m2) return setCap(p, -m1 / m2, -1, 0, X, Y, h);
  } else if (m9 > 0 && Math.abs(m2) > 1e-9) {
    const t = -m9 / m2;
    const dz = obz - t;
    if (obx * obx + oby * oby + dz * dz < rb * rb) return setCap(p, t, 1, 1, X, Y, h);
  }
  const rr = ra - rb;
  const hy = m0 + rr * rr;
  const k2 = m0 * m0 - m2 * m2 * hy;
  const k1 = m0 * m0 * m3 - m1 * m2 * hy + m0 * ra * (rr * m2);
  const k0 = m0 * m0 * m5 - m1 * m1 * hy + m0 * ra * (rr * m1 * 2 - m0 * ra);
  if (Math.abs(k2) < 1e-9) return false;
  const disc = k1 * k1 - k2 * k0;
  if (disc < 0) return false;
  const t = (-k1 - Math.sqrt(disc)) / k2;
  const y = m1 + t * m2;
  if (y < 0 || y > m0 || t < 0) return false;
  const z = RAY_Z - t;
  if (!keep(p, X, Y, z)) return false;
  // n ∝ m0·(m0·(oa + t·rd) + rr·ba·ra) − ba·hy·y
  const pz = oaz - t;
  let nx = m0 * (m0 * oax + rr * bax * ra) - bax * hy * y;
  let ny = m0 * (m0 * oay + rr * bay * ra) - bay * hy * y;
  let nz = m0 * (m0 * pz + rr * baz * ra) - baz * hy * y;
  const l = Math.hypot(nx, ny, nz) || 1;
  nx /= l;
  ny /= l;
  nz /= l;
  h.z = z;
  h.nx = nx;
  h.ny = ny;
  h.nz = nz;
  h.u = y / m0;
  h.back = false;
  return true;
}

function box(p: Solid, X: number, Y: number, h: Hit): boolean {
  const ox = X - p.px;
  const oy = Y - p.py;
  const oz = RAY_Z - p.pz;
  let tNear = -Infinity;
  let tFar = Infinity;
  let axis = 0;
  let sign = 1;
  for (let i = 0; i < 3; i++) {
    const ex = i === 0 ? p.e0x : i === 1 ? p.e1x : p.e2x;
    const ey = i === 0 ? p.e0y : i === 1 ? p.e1y : p.e2y;
    const ez = i === 0 ? p.e0z : i === 1 ? p.e1z : p.e2z;
    const hh = i === 0 ? p.s0 : i === 1 ? p.s1 : p.s2;
    const o = ex * ox + ey * oy + ez * oz;
    const d = -ez;
    if (Math.abs(d) < 1e-9) {
      if (o < -hh || o > hh) return false;
      continue;
    }
    let t1 = (-hh - o) / d;
    let t2 = (hh - o) / d;
    let s = -1;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
      s = 1;
    }
    if (t1 > tNear) {
      tNear = t1;
      axis = i;
      sign = s;
    }
    if (t2 < tFar) tFar = t2;
    if (tNear > tFar) return false;
  }
  if (tFar < 0) return false;
  const z = RAY_Z - tNear;
  if (!keep(p, X, Y, z)) return false;
  h.z = z;
  h.nx = (axis === 0 ? p.e0x : axis === 1 ? p.e1x : p.e2x) * sign;
  h.ny = (axis === 0 ? p.e0y : axis === 1 ? p.e1y : p.e2y) * sign;
  h.nz = (axis === 0 ? p.e0z : axis === 1 ? p.e1z : p.e2z) * sign;
  // u runs along the box's main (first) axis, 0..1.
  h.u = (p.e0x * ox + p.e0y * oy + p.e0z * (z - p.pz) + p.s0) / (2 * p.s0);
  h.back = false;
  return true;
}
