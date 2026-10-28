import type { IsoPainter } from '../../isoPainter';
import { lerp } from '../../isoProps';
import { baked } from '../../lighting/normalLayer';
import { normalize, tileToView } from '../../lighting/viewSpace';
import { css, shade } from '../../palette';
import type { RoofMaterial } from '../../roofCover';

type Pt = readonly [number, number];

/*
 * Tent roof kit (shatyor): the tall octagonal pyramid of timber and
 * white-stone towers, belfries and church porches, on an octagonal
 * prism (the "octagon on a square" — vos'merik na chetverike). Octagons
 * stand with a facet towards the viewer; each facet and slope carries
 * its own normal and baked shade. Square tents are plain hip roofs.
 */

const SIDES = 8;
const corner = (k: number): number => ((k + 0.5) / SIDES) * Math.PI * 2;
const mid = (i: number): number => ((i + 1) / SIDES) * Math.PI * 2;
const towards = (phi: number): number => Math.cos(phi) + Math.sin(phi);
const wallLight = (phi: number): number => baked(0.86 + 0.14 * (Math.sin(phi) - Math.cos(phi)));

/** Facet indices facing the viewer, back to front. */
function visible(limit = -0.25): number[] {
  return [...Array(SIDES).keys()].filter((i) => towards(mid(i)) > limit).sort((a, b) => towards(mid(a)) - towards(mid(b)));
}

function at(p: IsoPainter, uc: number, vc: number, r: number, a: number, z: number): Pt {
  const rr = r / Math.cos(Math.PI / SIDES);
  return p.p(uc + rr * Math.cos(a), vc + rr * Math.sin(a), z);
}

export type OctDetail = 'logs' | 'stone' | 'plain';

/** Facet-local painter: x along the facet (0..w, left to right on screen), y up as negative values. */
export type FacetDraw = (w: number, h: number, light: number, facing: number) => void;

/**
 * Octagonal prism of apothem r tiles round (uc, vc) from z0 to z1:
 * log courses, stone courses or plain render; `facet` paints openings
 * on the facets that face the viewer (facing > 0.5).
 */
export function octPrism(p: IsoPainter, uc: number, vc: number, r: number, z0: number, z1: number, color: number, detail: OctDetail, facet?: FacetDraw): void {
  const ctx = p.ctx;
  for (const i of visible()) {
    const a0 = corner(i);
    const a1 = corner(i + 1);
    const pts: Pt[] = [at(p, uc, vc, r, a0, z0), at(p, uc, vc, r, a1, z0), at(p, uc, vc, r, a1, z1), at(p, uc, vc, r, a0, z1)];
    const l = wallLight(mid(i));
    p.fillPoly(pts, css(shade(color, l)));
    p.normals.fill(pts, normalize(tileToView(Math.cos(mid(i)), Math.sin(mid(i)), 0)));
    const [A, B] = pts[0]![0] <= pts[1]![0] ? [pts[0]!, pts[1]!] : [pts[1]!, pts[0]!];
    const w = B[0] - A[0];
    ctx.save();
    ctx.beginPath();
    pts.forEach(([x, y], k) => (k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.clip();
    if (w > 1.5) {
      ctx.setTransform(1, (B[1] - A[1]) / w, 0, 1, A[0], A[1]);
      const h = z1 - z0;
      if (detail === 'logs') {
        for (let y = 0; y < h; y += 8) {
          ctx.fillStyle = css(shade(color, l * 1.22), 0.5);
          ctx.fillRect(0, -y - 7.5, w, 1.6);
          ctx.fillStyle = css(shade(color, l * 0.62), 0.6);
          ctx.fillRect(0, -y - 1.2, w, 1.2);
        }
      } else if (detail === 'stone') {
        ctx.fillStyle = css(shade(color, l * 0.8), 0.45);
        for (let y = 9; y < h; y += 9) ctx.fillRect(0, -y, w, 0.9);
      }
      const facing = towards(mid(i)) / Math.SQRT2;
      if (facet && facing > 0.5) facet(w, h, l, facing);
    }
    ctx.restore();
    p.strokePoly(pts, css(shade(color, 0.45), 0.5), 0.9);
  }
  for (let k = 0; k < SIDES; k += 2) {
    const rr = r / Math.cos(Math.PI / SIDES);
    p.addVolumePoint(uc + rr * Math.cos(corner(k)), vc + rr * Math.sin(corner(k)), z1);
  }
}

export interface TentOpts {
  readonly material?: RoofMaterial;
  /** Eave overhang (tiles) past the prism. */
  readonly eave?: number;
  /** Ribs along the hips in this colour (the tent's corner boards). */
  readonly ribs?: number;
  /** Small dormer lights (sluhi) on the facing slopes. */
  readonly lights?: boolean;
}

/**
 * Tent roof (shatyor) over an octagon of apothem r tiles at height z,
 * rising `rise` art px. Paints far slopes first, records the slopes'
 * normals and the apex for the shadow. Returns the apex height.
 */
export function tentRoof(p: IsoPainter, uc: number, vc: number, r: number, z: number, rise: number, color: number, o: TentOpts = {}): number {
  const prev = p.material;
  p.material = o.material ?? 'shingle';
  const re = r + (o.eave ?? 0.05);
  const apex = p.p(uc, vc, z + rise);
  const faces = [...Array(SIDES).keys()].sort((a, b) => towards(mid(a)) - towards(mid(b)));
  for (const i of faces) {
    const a = at(p, uc, vc, re, corner(i), z);
    const b = at(p, uc, vc, re, corner(i + 1), z);
    const tri: Pt[] = [a, b, apex];
    const du = Math.cos(mid(i));
    const dv = Math.sin(mid(i));
    const normal = p.slope(du, dv, re, rise);
    const light = baked(0.86 + 0.2 * dv - 0.12 * du);
    if (du + dv < -0.2) {
      p.fillPoly(tri, css(shade(color, light)));
      p.normals.fill(tri, normal);
    } else p.roofSlope(tri, color, light, normal, (t) => [lerp(apex, a, t), lerp(apex, b, t)]);
  }
  p.material = prev;
  const ctx = p.ctx;
  if (o.ribs !== undefined) {
    ctx.strokeStyle = css(o.ribs, 0.9);
    ctx.lineWidth = 1.3;
    for (const k of visible(-0.6)) {
      const [x, y] = at(p, uc, vc, re, corner(k + 1), z);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(apex[0], apex[1]);
      ctx.stroke();
    }
  }
  if (o.lights) {
    for (const i of visible(0.6)) {
      const foot = lerp(at(p, uc, vc, re, corner(i), z), at(p, uc, vc, re, corner(i + 1), z), 0.5);
      for (const t of [0.3, 0.58]) {
        const [cx, cy] = lerp(foot, apex, t);
        const s = 3.4 * (1 - t);
        ctx.fillStyle = css(shade(color, 1.18));
        ctx.beginPath();
        ctx.moveTo(cx - s * 1.5, cy + s * 0.5);
        ctx.lineTo(cx, cy - s * 1.9);
        ctx.lineTo(cx + s * 1.5, cy + s * 0.5);
        ctx.fill();
        ctx.fillStyle = '#1e1712';
        ctx.fillRect(cx - s * 0.5, cy - s * 0.6, s, s);
      }
    }
  }
  // Eave line.
  ctx.strokeStyle = css(shade(color, 0.5), 0.8);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = 0; k <= SIDES; k++) {
    const [x, y] = at(p, uc, vc, re, corner(k), z);
    if (k === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  for (let k = 0; k < SIDES; k += 2) {
    const rr = re / Math.cos(Math.PI / SIDES);
    p.addVolumePoint(uc + rr * Math.cos(corner(k)), vc + rr * Math.sin(corner(k)), z);
  }
  p.addVolumePoint(uc, vc, z + rise);
  return z + rise;
}

/**
 * Open lantern: an octagon of apothem r from z to z + h whose facing
 * facets are open arches (dark, the sky behind), under a tent of `rise`
 * (a lookout or hay-loft belfry). Returns the apex height.
 */
export function openLantern(p: IsoPainter, uc: number, vc: number, r: number, z: number, h: number, rise: number, wall: number, roof: number, ribs?: number): number {
  octPrism(p, uc, vc, r, z, z + h, wall, 'plain', (w, fh, light) => {
    const ctx = p.ctx;
    const ow = w * 0.56;
    ctx.fillStyle = css(shade(0x1c1612, light));
    ctx.beginPath();
    ctx.moveTo(w / 2 - ow / 2, -3);
    ctx.lineTo(w / 2 - ow / 2, -fh * 0.55);
    ctx.arc(w / 2, -fh * 0.55, ow / 2, Math.PI, 0);
    ctx.lineTo(w / 2 + ow / 2, -3);
    ctx.closePath();
    ctx.fill();
  });
  return tentRoof(p, uc, vc, r, z + h, rise, roof, { material: 'copper', eave: 0.04, ...(ribs === undefined ? {} : { ribs }) });
}

/**
 * Tent-roofed stand on four posts over (u0..u1, v0..v1): a railed deck
 * at `deck`, posts up to `h`, an octagonal tent of `rise` above.
 * Returns the apex height.
 */
export function tentStand(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, deck: number, h: number, rise: number, timber: number, roof: number, o: TentOpts = {}): number {
  const ctx = p.ctx;
  const post = (u: number, v: number) => {
    const [x, y] = p.p(u, v, 0);
    ctx.fillStyle = css(shade(timber, 1.05));
    ctx.fillRect(x - 2.6, y - h, 2.6, h);
    ctx.fillStyle = css(shade(timber, 0.7));
    ctx.fillRect(x, y - h, 2.6, h);
    p.normalCylinder(x - 2.6, y - h, 5.2, h);
  };
  for (const [u, v] of [[u0, v0], [u1, v0], [u0, v1]] as const) post(u, v);
  p.box(u0, v0, u1, v1, deck - 4, deck, { color: timber, detail: 'planks' }, shade(timber, 1.15));
  // Rail round the deck's two front sides.
  ctx.strokeStyle = css(shade(timber, 1.2));
  ctx.lineWidth = 1.6;
  for (const [a, b] of [[p.p(u0, v1, deck + 10), p.p(u1, v1, deck + 10)], [p.p(u1, v1, deck + 10), p.p(u1, v0, deck + 10)]] as const) {
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  post(u1, v1);
  const r = Math.min(u1 - u0, v1 - v0) / 2;
  return tentRoof(p, (u0 + u1) / 2, (v0 + v1) / 2, r, h, rise, roof, { eave: 0.05, ...o });
}
