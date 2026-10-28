import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { kokoshnikRing, onionDome, type OnionPattern } from '../kits/onionDome';
import { octPrism, tentRoof, type FacetDraw } from '../kits/tentRoof';

/*
 * Pieces of St Basil's (Pokrovsky) cathedral: red-brick octagonal
 * chapels trimmed in white, each crowned with a tier of kokoshniki, a
 * drum and a patterned onion; and the central tower — a tall octagon
 * with rings of kokoshniki under the tent spire and its small gilt onion.
 */

export const BRICK = 0xb4483a;
export const WHITE = 0xf1ebdf;
export const GOLD = 0xdfae3e;

export interface Chapel {
  readonly u: number;
  readonly v: number;
  readonly r: number;
  /** Top of the octagon (art px). */
  readonly top: number;
  readonly drum: number;
  readonly onion: { readonly color: number; readonly alt: number; readonly pattern: OnionPattern };
}

/** Brick facet with white bands at foot and head, and a white-framed arched window that glows when `lit`. */
export function brickFacet(p: IsoPainter, lit: boolean): FacetDraw {
  return (w, h, light) => {
    const ctx = p.ctx;
    ctx.fillStyle = css(shade(WHITE, light));
    ctx.fillRect(0, -4, w, 4);
    ctx.fillRect(0, -h + 2, w, 3.5);
    ctx.fillRect(0, -h * 0.5, w, 2);
    if (w < 8) return;
    const ww = Math.min(7, w * 0.36);
    const y = -h * 0.5 - 6 - ww * 1.8;
    ctx.fillStyle = css(shade(WHITE, light));
    ctx.fillRect(w / 2 - ww / 2 - 2, y - 2, ww + 4, ww * 1.8 + 3);
    ctx.beginPath();
    ctx.arc(w / 2, y - 1, ww / 2 + 3, Math.PI, 0);
    ctx.fill();
    if (lit) p.window(w / 2 - ww / 2, y, ww, ww * 1.8, true);
    else {
      ctx.fillStyle = css(shade(0x2a1e18, light));
      ctx.fillRect(w / 2 - ww / 2, y, ww, ww * 1.8);
    }
  };
}

/** One chapel up to its octagon top (`upTo` cuts it lower while it is being built). */
export function chapelBody(p: IsoPainter, c: Chapel, z0: number, upTo: number, lit: boolean): void {
  const top = Math.min(c.top, upTo);
  octPrism(p, c.u, c.v, c.r, z0, top, BRICK, 'stone', top === c.top ? brickFacet(p, lit) : undefined);
}

/** The chapel's crown: kokoshnik tier, drum and onion (`paint` false = unpainted tin onion; null = no onion yet). */
export function chapelCrown(p: IsoPainter, c: Chapel, paint: boolean | null): number {
  kokoshnikRing(p, c.u, c.v, c.r * 0.92, c.top, c.r * 34, WHITE);
  if (paint === null) {
    octPrism(p, c.u, c.v, c.r * 0.55, c.top, c.top + c.drum, BRICK, 'stone');
    return c.top + c.drum;
  }
  const look = paint ? { ...c.onion } : { color: 0x8c9196 };
  return onionDome(p, c.u, c.v, c.r * 0.62, c.top, { ...look, drum: { h: c.drum, color: WHITE }, tall: 1.05 });
}

/** The central tower's octagon from z0 to the head of `top`, with two kokoshnik rings once `done`; its windows glow when `lit`. */
export function centralOctagon(p: IsoPainter, uc: number, vc: number, r: number, z0: number, top: number, done: boolean, lit: boolean): void {
  octPrism(p, uc, vc, r, z0, top, BRICK, 'stone', done ? brickFacet(p, lit) : undefined);
  if (!done) return;
  kokoshnikRing(p, uc, vc, r * 0.98, top, r * 30, WHITE);
  octPrism(p, uc, vc, r * 0.8, top + 2, top + 26, BRICK, 'stone', brickFacet(p, false));
  kokoshnikRing(p, uc, vc, r * 0.78, top + 26, r * 26, WHITE);
}

/** The tent spire over the central octagon (white ribs, little lights), its lantern and gilt onion. */
export function centralSpire(p: IsoPainter, uc: number, vc: number, r: number, z: number, rise: number): number {
  const apex = tentRoof(p, uc, vc, r, z, rise, 0x3f7a52, { material: 'tile', ribs: WHITE, lights: true, eave: 0.02 });
  octPrism(p, uc, vc, 0.07, apex - 18, apex + 6, WHITE, 'plain');
  return onionDome(p, uc, vc, 0.08, apex + 6, { color: GOLD });
}
