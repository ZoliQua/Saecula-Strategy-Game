import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { R } from '../facade';
import type { ArchStyle } from '../style';
import { styledGable, styledHip } from '../styledRoofs';

/*
 * Shared parts of the Biskupin settlement (Polish age 1): split-oak
 * walls, long reed-thatched roofs, the log corduroy streets and the box
 * rampart of earth-filled timber cribs.
 */

/** An axis-aligned footprint: u0, v0, u1, v1 (tiles). */
export type Block = readonly [number, number, number, number];

/** Split-oak walls of a block from z0 to z1 (horizontal logs between corner posts). */
export function oakWalls(p: IsoPainter, s: ArchStyle, b: Block, z0: number, z1: number): void {
  const c = s.palette;
  const [u0, v0, u1, v1] = b;
  p.box(u0, v0, u1, v1, z0, z1, { color: c.darkWood, detail: 'logs' });
  // Corner posts.
  const post = (u: number, v: number) => p.box(u - 0.025, v - 0.025, u + 0.025, v + 0.025, z0, z1 + 2, { color: shade(c.timber, 0.95) }, c.timber);
  post(u0 + 0.025, v1 - 0.025);
  post(u1 - 0.025, v1 - 0.025);
  post(u1 - 0.025, v0 + 0.025);
}

/** Long, steep reed-thatch roof along `axis` over block `b` from `eave`; returns the ridge height. */
export function reedRoof(p: IsoPainter, s: ArchStyle, b: Block, eave: number, rise: number, axis: 'u' | 'v', overhang = 0.16): number {
  const c = s.palette;
  p.material = 'thatch';
  styledGable(p, s, b[0], b[1], b[2], b[3], eave, rise, c.thatch, c.board, axis, overhang, (w, r) => {
    // Boarded gable with a smoke hole under the ridge.
    p.ctx.fillStyle = css(shade(c.board, R * 0.75), 0.6);
    for (let x = 3; x < w; x += 5) p.ctx.fillRect(x, -r, 0.9, r);
    p.ctx.fillStyle = '#1b130c';
    p.ctx.fillRect(w / 2 - 2.5, -r * 0.7, 5, 4);
  });
  return eave + rise * s.roof.pitch;
}

/** Hipped reed-thatch cap (towers, the gate); returns the apex height. */
export function reedHip(p: IsoPainter, s: ArchStyle, b: Block, eave: number, rise: number, overhang = 0.1): number {
  p.material = 'thatch';
  styledHip(p, s, b[0], b[1], b[2], b[3], eave, rise, s.palette.thatch, overhang);
  return eave + rise * s.roof.pitch;
}

/** Log corduroy street: round logs laid across the way, on the ground plate b; the logs run across `axis`. */
export function corduroy(p: IsoPainter, s: ArchStyle, b: Block, axis: 'u' | 'v'): void {
  const c = s.palette;
  const [u0, v0, u1, v1] = b;
  p.ground(u0, v0, u1, v1, shade(c.planks, 0.8), 1);
  const ctx = p.ctx;
  const len = axis === 'u' ? u1 - u0 : v1 - v0;
  const n = Math.max(3, Math.round(len / 0.07));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const [a, b2] = axis === 'u'
      ? [p.p(u0 + len * t, v0 + 0.02, 1.5), p.p(u0 + len * t, v1 - 0.02, 1.5)]
      : [p.p(u0 + 0.02, v0 + len * t, 1.5), p.p(u1 - 0.02, v0 + len * t, 1.5)];
    ctx.strokeStyle = css(shade(c.planks, i % 3 === 0 ? 1.12 : 1.0));
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b2[0], b2[1]);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(30,20,12,.35)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1] + 1.4);
    ctx.lineTo(b2[0], b2[1] + 1.4);
    ctx.stroke();
  }
}

/**
 * Box rampart: a wall of oak cribs (log boxes) filled with earth, from 0
 * to `h`, its two visible faces showing the crib grid; a walkway of
 * planks on top with a low breastwork of stakes along the outer edge.
 */
export function cribRampart(p: IsoPainter, s: ArchStyle, b: Block, h: number): void {
  const c = s.palette;
  const [u0, v0, u1, v1] = b;
  p.box(u0, v0, u1, v1, 0, h, { color: c.stone }, shade(c.stone, 1.05));
  const grid = (light: number) => (w: number, hh: number) => {
    const ctx = p.ctx;
    // Horizontal crib logs.
    for (let y = 0; y < hh; y += 7) {
      ctx.fillStyle = css(shade(c.darkWood, light * (y % 14 ? 0.95 : 1.1)));
      ctx.fillRect(0, -y - 3.2, w, 3.2);
    }
    // Upright crib ends every bay.
    const bays = Math.max(2, Math.round(w / 16));
    for (let i = 0; i <= bays; i++) {
      const x = (w / bays) * i;
      ctx.fillStyle = css(shade(c.timber, light * 0.9));
      ctx.fillRect(x - 1.6, -hh, 3.2, hh);
      // Log ends of the cross ties.
      ctx.fillStyle = css(shade(0xd8b886, light), 0.9);
      for (let y = 5; y < hh - 2; y += 14) ctx.fillRect(x - 1.4, -y - 2.6, 2.8, 2.6);
    }
  };
  p.leftFace(u0, u1, v1, 0, grid(1), h);
  p.rightFace(v0, v1, u1, 0, grid(R), h);
  // Plank walkway on top.
  p.ground(u0 + 0.02, v0 + 0.02, u1 - 0.02, v1 - 0.02, shade(c.planks, 1.08), h);
}

/** Stake breastwork along a rampart edge from (u0, v0) to (u1, v1) at height z. */
export function breastwork(p: IsoPainter, s: ArchStyle, u0: number, v0: number, u1: number, v1: number, z: number, height = 12): void {
  const c = s.palette;
  const n = Math.max(2, Math.round(Math.hypot(u1 - u0, v1 - v0) / 0.07));
  const ctx = p.ctx;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const [x, y] = p.p(u0 + (u1 - u0) * t, v0 + (v1 - v0) * t, z);
    ctx.fillStyle = css(shade(c.darkWood, i % 2 ? 0.9 : 1.05));
    ctx.fillRect(x - 1.3, y - height, 2.6, height);
    ctx.beginPath();
    ctx.moveTo(x - 1.3, y - height);
    ctx.lineTo(x, y - height - 2.4);
    ctx.lineTo(x + 1.3, y - height);
    ctx.fill();
  }
  p.addVolumePoint(u0, v0, z + height);
  p.addVolumePoint(u1, v1, z + height);
}

/**
 * Terraced row of `n` dwellings under one long reed roof along u: oak
 * walls, a door and a small light per dwelling on the street side (+v),
 * party walls marked by posts; `lit` picks the dwellings whose light
 * shows (one behind a later roof or rampart has none). Returns the ridge height.
 */
export function rowHouses(p: IsoPainter, s: ArchStyle, b: Block, n: number, wall: number, rise: number, lit: (i: number) => boolean = () => true): number {
  const c = s.palette;
  const [u0, , u1, v1] = b;
  oakWalls(p, s, b, 0, wall);
  p.leftFace(u0, u1, v1, 0, (w) => {
    const bay = w / n;
    for (let i = 0; i < n; i++) {
      const x = bay * i;
      // The door: a low opening with a heavy oak leaf.
      p.ctx.fillStyle = '#1a120b';
      p.ctx.fillRect(x + bay * 0.2 - 1, -20, 11, 20);
      p.door(x + bay * 0.2, 9, 18, c.doors.main);
      if (lit(i)) p.window(x + bay * 0.62, -wall * 0.5, 6, 5);
      if (i > 0) {
        p.ctx.fillStyle = css(shade(c.timber, 0.9));
        p.ctx.fillRect(x - 1.5, -wall, 3, wall);
      }
    }
  }, wall);
  p.rightFace(b[1], b[3], u1, 0, (w) => p.window(w * 0.5 - 3, -wall * 0.5, 6, 5, false), wall);
  return reedRoof(p, s, b, wall, rise, 'u');
}
