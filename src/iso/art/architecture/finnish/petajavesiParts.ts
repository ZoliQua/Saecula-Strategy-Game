import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { R } from '../facade';
import { logBox } from '../kits/logWall';
import { bellRoof } from '../kits/shingleRoof';
import { octPrism, tentRoof } from '../kits/tentRoof';
import type { ArchStyle } from '../style';
import { nWindow, type Block } from './nordicParts';

/*
 * Pieces of the Petäjävesi church: unpainted log arms of a cross plan
 * under very steep shingled gables, and the crossing's octagonal log
 * drum under a steep shingled tent that breaks into a small lantern
 * with its own bell cap and cross. While it is being built the roofs
 * are bare pale boards and the drum waits without its tent.
 */

/** Weathered, unpainted pine of the church (it was never painted). */
export const CHURCH_LOG = 0x8a7258;
/** Weathered silver-grey shingles of the finished roofs. */
export const CHURCH_SHINGLE = 0x6e655a;
/** The drum's logs, a step lighter so the crossing stands off the arms. */
export const DRUM_LOG = 0xa48a6c;
/** Pale verge boards along the gables. */
export const VERGE = 0xd9ccb2;
/** Fresh sawn boards of roofs still waiting for their shingles. */
export const BARE_BOARDS = 0xc9ab7c;
/** Wall top of the arms and the ridge rise of their steep gables. */
export const ARM_WALL = 58;
export const ARM_RISE = 104;

export type RoofState = 'none' | 'bare' | 'shingled';

export interface ArmOpts {
  /** Wall top (shorter while the logs are being raised). */
  readonly wall: number;
  readonly roof: RoofState;
  /** Lit windows on the visible faces (only on the finished church). */
  readonly lit: boolean;
  /** Windows on the +v face, the +u face (x fractions). */
  readonly left?: readonly number[];
  readonly right?: readonly number[];
}

/** One arm segment of the cross plan, ridge along `axis`. */
export function arm(p: IsoPainter, s: ArchStyle, b: Block, z0: number, axis: 'u' | 'v', o: ArmOpts): void {
  const [u0, v0, u1, v1] = b;
  logBox(p, u0, v0, u1, v1, z0, o.wall, CHURCH_LOG, 0.07);
  const full = o.wall >= ARM_WALL;
  if (full) {
    const win = (xs: readonly number[] | undefined, light: number) => (w: number, h: number) => {
      for (const x of xs ?? []) nWindow(p, s, w * x - 4, -h + 16, 8, 14, light, o.lit);
    };
    p.leftFace(u0, u1, v1, z0, win(o.left, 1), o.wall - z0);
    p.rightFace(v0, v1, u1, z0, win(o.right, R), o.wall - z0);
  }
  if (o.roof === 'none') return;
  const prev = p.material;
  p.material = 'shingle';
  const color = o.roof === 'shingled' ? CHURCH_SHINGLE : BARE_BOARDS;
  p.gableRoof(u0, v0, u1, v1, o.wall, ARM_RISE, color, CHURCH_LOG, axis, 0.08, (w, rise) => {
    // Board gable with a small round-headed light.
    p.ctx.fillStyle = css(shade(CHURCH_LOG, 0.6), 0.55);
    for (let x = 3; x < w; x += 5) p.ctx.fillRect(x, -rise, 0.9, rise);
    p.ctx.fillStyle = '#1c1612';
    p.ctx.fillRect(w / 2 - 3, -rise * 0.5, 6, 10);
  });
  p.material = prev;
  if (o.roof !== 'shingled') return;
  // Pale verge boards up the visible gable end.
  const top = o.wall + ARM_RISE;
  const [a, m, e] = axis === 'v'
    ? [p.p(u0 - 0.08, v1 + 0.08, o.wall), p.p((u0 + u1) / 2, v1 + 0.08, top), p.p(u1 + 0.08, v1 + 0.08, o.wall)]
    : [p.p(u1 + 0.08, v0 - 0.08, o.wall), p.p(u1 + 0.08, (v0 + v1) / 2, top), p.p(u1 + 0.08, v1 + 0.08, o.wall)];
  p.ctx.strokeStyle = css(shade(VERGE, axis === 'v' ? 1 : R));
  p.ctx.lineWidth = 2.6;
  p.ctx.lineJoin = 'round';
  p.ctx.beginPath();
  p.ctx.moveTo(a[0], a[1]);
  p.ctx.lineTo(m[0], m[1]);
  p.ctx.lineTo(e[0], e[1]);
  p.ctx.stroke();
}

/**
 * The crossing: an octagonal log drum from z0 to z1 and, when `tent`,
 * the steep shingled tent with its lantern, bell cap and cross. Returns
 * the top height.
 */
export function crossing(p: IsoPainter, uc: number, vc: number, r: number, z0: number, z1: number, tent: boolean, lit: boolean): number {
  octPrism(p, uc, vc, r, z0, z1, DRUM_LOG, 'logs', (w, h, light) => {
    if (w < 10) return;
    const ww = 6;
    p.ctx.fillStyle = css(shade(0x5a4632, light));
    p.ctx.fillRect(w / 2 - ww / 2 - 2, -h + 9, ww + 4, 14);
    if (lit) p.window(w / 2 - ww / 2, -h + 11, ww, 10);
    else {
      p.ctx.fillStyle = '#1c1612';
      p.ctx.fillRect(w / 2 - ww / 2, -h + 11, ww, 10);
    }
  });
  if (!tent) return z1;
  const rise = 136;
  tentRoof(p, uc, vc, r, z1, rise, CHURCH_SHINGLE, { material: 'shingle', eave: 0.09 });
  // The lantern breaks out of the tent two thirds of the way up.
  const zl = z1 + rise * 0.6;
  const lr = r * 0.44;
  octPrism(p, uc, vc, lr, zl, zl + 20, CHURCH_LOG, 'plain', (w, h, light) => {
    if (w < 5) return;
    if (lit) p.window(w / 2 - 2, -h + 5, 4, 9);
    else {
      p.ctx.fillStyle = css(shade(0x1c1612, light));
      p.ctx.fillRect(w / 2 - 2, -h + 5, 4, 9);
    }
  });
  const prev = p.material;
  p.material = 'shingle';
  const cap = bellRoof(p, uc, vc, lr + 0.04, zl + 20, 26, CHURCH_SHINGLE);
  p.material = prev;
  // The cross.
  const [x, y] = p.p(uc, vc, cap);
  p.ctx.fillStyle = '#2a2420';
  p.ctx.fillRect(x - 1, y - 20, 2, 20);
  p.ctx.fillRect(x - 5, y - 15, 10, 2);
  p.addVolumePoint(uc, vc, cap + 20);
  return cap + 20;
}
