import type { IsoPainter, WallStyle } from '../../isoPainter';
import { css, shade } from '../../palette';
import { R } from '../facade';
import { shutteredDark, stringCourse } from '../kits/insula';
import { helm } from '../roofs';
import type { ArchStyle } from '../style';
import { bifora, block, cornicione, lowHip, rustication, type Block, type FaceDraw } from './italianParts';
import { loggia } from './loggia';

/*
 * Pieces of the Rinascimento family (Italian age 3): the palazzo block
 * (rusticated pietraforte ground storey, smooth upper storeys with
 * round-headed bifore in pietra serena, string courses, a heavy
 * cornicione and a very low hip behind it), the roof altana and the
 * dovecote tower (colombaia) with its open arched top.
 */

/** Smooth dressed walls of the palazzi. */
export const ashlarWall = (s: ArchStyle): WallStyle => ({ color: s.palette.ashlar, detail: 'plaster' });
/** White intonaco with pietra serena trim (loggias, villas, chapels). */
export const whiteWall = (s: ArchStyle): WallStyle => ({ color: s.palette.plaster, detail: 'plaster' });

export interface PalazzoOpts {
  /** Storey heights: the rusticated ground storey, then each upper storey (art px). */
  readonly ground: number;
  readonly storey: number;
  readonly storeys: number;
  /** Upper walls: pietraforte ashlar (palazzo) or white intonaco (villa). */
  readonly finish: 'ashlar' | 'white';
  /** Window bays on the left and right faces. */
  readonly bays: readonly [number, number];
  /** Lit windows: only the piano nobile's, on the left face (count from the left), default all. */
  readonly lit?: number;
  /** Extra painters for the ground storey (doors, gates) and the piano nobile (arms, banners). */
  readonly groundLeft?: FaceDraw;
  readonly groundRight?: FaceDraw;
  readonly nobileLeft?: FaceDraw;
  /** Cornice overhang (tiles); default 0.07. */
  readonly overhang?: number;
  /** Rise of the low hip behind the cornice (art px before the pitch); default 18. */
  readonly rise?: number;
}

/** A palazzo on b; returns the top of its cornice. */
export function palazzo(p: IsoPainter, s: ArchStyle, b: Block, o: PalazzoOpts, roof = true): number {
  const c = s.palette;
  const ctx = p.ctx;
  const g = o.ground;
  const top = g + o.storey * o.storeys;
  block(p, b, 0, g, { color: c.stone }, (w, h) => {
    rustication(ctx, w, 0, h, c.stone, 1, 7);
    o.groundLeft?.(w, h);
  }, (w, h) => {
    rustication(ctx, w, 0, h, c.stone, R, 7);
    o.groundRight?.(w, h);
  }, shade(c.stone, 1.05));
  const wall = o.finish === 'ashlar' ? ashlarWall(s) : whiteWall(s);
  const face = (light: number, bays: number, left: boolean): FaceDraw => (w, h) => {
    for (let k = 0; k < o.storeys; k++) {
      stringCourse(ctx, w, k * o.storey, o.finish === 'ashlar' ? shade(c.ashlar, 1.08) : c.trim, light, 3);
      const bay = w / bays;
      for (let i = 0; i < bays; i++) {
        const x = i * bay + bay / 2 - 6;
        const y = -(k + 1) * o.storey + 7;
        const lit = k === 0 && left && i < (o.lit ?? bays);
        if (k === 0) bifora(p, o.finish === 'ashlar' ? shade(c.ashlar, 1.1) : c.trim, x, y, 12, o.storey - 12, light, lit);
        else shutteredDark(ctx, x + 2, y + 2, 8, o.storey - 14, c.shutter, light);
      }
    }
    if (left) o.nobileLeft?.(w, h);
  };
  block(p, b, g, top, wall, face(1, o.bays[0], true), face(R, o.bays[1], false));
  cornicione(p, b, top, 6, o.overhang ?? 0.07, o.finish === 'ashlar' ? shade(c.ashlar, 1.06) : c.trim);
  if (roof) lowHip(p, s, b, top + 6, o.rise ?? 18, c.roof, (o.overhang ?? 0.07) - 0.02);
  return top + 6;
}

/**
 * Open arched top (altana or dovecote loft) on b from z0 to z1 under a
 * very low hip, with an optional cornice under the arches.
 */
export function openTop(p: IsoPainter, s: ArchStyle, b: Block, z0: number, z1: number, bays: readonly [number, number], wall: WallStyle, contents?: () => void): void {
  const c = s.palette;
  const o = { wall, trim: c.trim, bays, pier: 0.04, band: 5 };
  loggia(p, b, z0, z1, 'back', o);
  contents?.();
  loggia(p, b, z0, z1, 'front', o);
  cornicione(p, b, z1, 4, 0.05, c.trim);
  lowHip(p, s, b, z1 + 4, 14, c.roof, 0.04);
}

/**
 * Dovecote tower (colombaia) on b: white walls with pietra serena
 * corners and courses, rising to `top`, then an open arched loft under
 * a low hip.
 */
export function colombaia(p: IsoPainter, s: ArchStyle, b: Block, top: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  const quoin = (light: number): FaceDraw => (w, h) => {
    ctx.fillStyle = css(shade(c.trim, light));
    for (let y = 0; y < h; y += 8) {
      ctx.fillRect(0, -y - 7, (y / 8) % 2 ? 4 : 6, 6);
      ctx.fillRect(w - ((y / 8) % 2 ? 4 : 6), -y - 7, (y / 8) % 2 ? 4 : 6, 6);
    }
    stringCourse(ctx, w, h * 0.5, c.trim, light, 2.4);
  };
  block(p, b, 0, top, whiteWall(s), quoin(1), quoin(R));
  openTop(p, s, b, top, top + 22, [2, 2], whiteWall(s));
}

/**
 * Venetian chimney (fumaiolo): a square brick flue from z0 to z1 crowned
 * by a flared, bell-shaped pot; records the smoke at its mouth.
 */
export function fumaiolo(p: IsoPainter, s: ArchStyle, u: number, v: number, z0: number, z1: number): void {
  const c = s.palette;
  const a = 0.07;
  p.box(u - a, v - a, u + a, v + a, z0, z1, { color: c.stack, detail: 'brick' }, shade(c.stack, 0.6));
  helm(p, u, v, z1, [[0, 0.075], [4, 0.09], [11, 0.17], [15, 0.19], [17, 0.19]], c.plaster, false);
  p.addSmoke(u, v, z1 + 17);
}
