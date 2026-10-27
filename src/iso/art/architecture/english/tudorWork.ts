import { ellipse } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { archedOpening, R } from '../facade';
import { forgeLight, forgeMouth, goldPile, haystack, logPile, plankStack, post } from '../parts';
import { stripField } from '../medievalWork';
import type { ArchStyle } from '../style';
import { roofLift, styledGable, styledHip } from '../styledRoofs';
import type { AgeArtSet } from '../types';
import { brickStack } from '../kits/chimneyStack';
import { framedGable, halfTimberLattice, leadedWindow } from '../kits/halfTimber';
import { jettyStorey } from '../kits/jetty';
import { earthButt, hangingBanner, hedge, spoilHeap } from './englishParts';
import { drumWall } from './roundhouse';

/*
 * Age 2 English workplaces: hedged strip fields with a granary on
 * staddle stones, a jettied magpie-framed saw shed over a saw pit, a
 * fieldstone engine house with a tall round stack and a timber
 * headframe with its winding wheel, turf archery butts facing a long
 * framed range, and a framed smithy with a brick forge stack.
 */

/** Staddle stone (mushroom-shaped granary support). */
function staddle(p: IsoPainter, u: number, v: number, color: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 0);
  ctx.fillStyle = css(shade(color, 0.9));
  ctx.beginPath();
  ctx.moveTo(x - 2.5, y);
  ctx.lineTo(x - 1.6, y - 9);
  ctx.lineTo(x + 1.6, y - 9);
  ctx.lineTo(x + 2.5, y);
  ctx.closePath();
  ctx.fill();
  ellipse(ctx, x, y - 10, 5, 2.4);
  ctx.fillStyle = css(shade(color, 1.1));
  ctx.fill();
  p.normalCylinder(x - 5, y - 12, 10, 12);
}

/** Framed granary raised on staddle stones under a steep tiled hip. */
function granary(p: IsoPainter, s: ArchStyle, u0: number, v0: number, u1: number, v1: number): void {
  const c = s.palette;
  for (const [u, v] of [[u0 + 0.05, v0 + 0.05], [u1 - 0.05, v0 + 0.05], [u0 + 0.05, v1 - 0.05], [u1 - 0.05, v1 - 0.05]] as const) staddle(p, u, v, c.stone);
  p.box(u0, v0, u1, v1, 11, 32, { color: c.plaster, detail: 'plaster' });
  p.leftFace(u0, u1, v1, 11, (w, h) => halfTimberLattice(p.ctx, w, h, c.timber, 'close'), 21);
  p.rightFace(v0, v1, u1, 11, (w, h) => halfTimberLattice(p.ctx, w, h, c.timber, 'close', R), 21);
  styledHip(p, s, u0, v0, u1, v1, 32, 18, c.roof, 0.06);
}

/**
 * Engine house: a tall narrow stone house under steep tile with a tall
 * round stack (stone below, brick above) and the beam (bob) jutting
 * from its bob wall towards the shaft.
 */
function engineHouse(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  drumWall(p, 0.32, 0.3, 0.13, 0, 104, c.stone, 'stone');
  drumWall(p, 0.32, 0.3, 0.11, 104, 146, c.stack, 'stone');
  drumWall(p, 0.32, 0.3, 0.13, 146, 151, shade(c.stack, 0.7), 'stone');
  p.addSmoke(0.32, 0.3, 152);
  p.box(0.25, 0.45, 0.9, 1.45, 0, 78, { color: c.stone, detail: 'fieldstone' });
  p.leftFace(0.25, 0.9, 1.45, 0, (w) => {
    p.window(w / 2 - 5, -66, 10, 22, true);
    p.door(w / 2 - 7, 14, 24, c.doors.work);
    hangingBanner(p.ctx, w - 12, -40, 8, 18, team);
  }, 78);
  p.rightFace(0.45, 1.45, 0.9, 0, (w) => {
    archedOpening(p.ctx, w / 2 - 9, 18, 26, shade(c.ashlar, 1.1), 0x1c140e, R);
    p.window(w / 2 - 4, -40, 8, 14, true);
  }, 78);
  styledGable(p, s, 0.25, 0.45, 0.9, 1.45, 78, 30, c.roof, c.stone, 'v', 0.1);
  // The bob: a heavy beam out of the bob wall.
  p.box(0.9, 0.85, 1.32, 0.97, 64, 72, { color: c.timber }, shade(c.timber, 1.3));
}

/** Timber headframe with a spoked winding wheel at (u, v), wheel axle at height h. */
function windingWheel(p: IsoPainter, s: ArchStyle, u: number, v: number, h: number): void {
  const ctx = p.ctx;
  const [sx, sy] = p.p(u, v, 0);
  ellipse(ctx, sx, sy, 15, 7.5);
  ctx.fillStyle = '#0d0a08';
  ctx.fill();
  post(p, u - 0.2, v + 0.2, 0, h + 4, 2.6, s.palette.timber);
  const [x, y] = p.p(u, v, h);
  ctx.strokeStyle = '#2b2420';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.ellipse(x, y, 13, 14, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(a) * 13, y - Math.sin(a) * 14);
    ctx.lineTo(x + Math.cos(a) * 13, y + Math.sin(a) * 14);
    ctx.stroke();
  }
  ctx.strokeStyle = '#c9b08a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 13, y);
  ctx.lineTo(sx + 13, sy - 4);
  ctx.stroke();
  const rim: Array<readonly [number, number]> = [];
  for (let k = 0; k <= 20; k++) rim.push([x + Math.cos((k / 20) * Math.PI * 2) * 13, y + Math.sin((k / 20) * Math.PI * 2) * 14]);
  const spokes = [0, 1, 2, 3, 4, 5].map((k) => {
    const a = (k / 6) * Math.PI;
    return [[x - Math.cos(a) * 13, y - Math.sin(a) * 14], [x + Math.cos(a) * 13, y + Math.sin(a) * 14]] as const;
  });
  p.normals.cylinderStroke([rim, ...spokes], 2.6, x - 14, 28);
  post(p, u + 0.2, v - 0.2, 0, h + 4, 2.6, s.palette.timber);
  p.addVolumePoint(u, v, h + 14);
}

/** Age 2 English workplaces. */
export function tudorWorkArt(s: ArchStyle): AgeArtSet {
  const c = s.palette;
  return {
    farm: {
      size: 2,
      maxHeight: 90,
      paint: (p, team) => {
        stripField(p, 7, '#d6b54e', 0x5e4630);
        granary(p, s, 0.16, 0.16, 0.66, 0.6);
        haystack(p, 1.0, 0.32, 12, 28);
        hedge(p, 0.06, 1.93, 1.93, 1.93, 12);
        hedge(p, 1.93, 0.06, 1.93, 1.85, 12);
        p.flag(1.93, 1.93, 12, 22, team);
      },
    },
    lumber_camp: {
      size: 2,
      maxHeight: 140,
      paint: (p, team) => {
        const ctx = p.ctx;
        p.footShadow();
        p.ground(0.1, 0.1, 1.9, 1.9, 0x837256);
        // Saw shed: open stone-footed bay below, jettied framed loft, steep framed gable.
        p.box(0.2, 0.25, 1.05, 1.3, 0, 30, { color: c.stone, detail: 'fieldstone' });
        p.leftFace(0.2, 1.05, 1.3, 0, (w) => {
          ctx.fillStyle = '#17110c';
          ctx.fillRect(8, -24, w - 16, 24);
          ctx.fillStyle = '#c99a62';
          for (let k = 0; k < 4; k++) ctx.fillRect(12, -4 - k * 4, w - 24, 2.6);
        }, 30);
        jettyStorey(p, s, 0.2, 0.25, 1.05, 1.3, 30, 58, 0.1, 'square', (w) => {
          ctx.fillStyle = '#1e1610';
          ctx.fillRect(w / 2 - 7, -22, 14, 16);
        }, (w) => leadedWindow(p, w / 2 - 8, -22, 16, 10, 2, R));
        styledGable(p, s, 0.2, 0.25, 1.15, 1.4, 58, 34, c.roof, c.plaster, 'v', 0.12, framedGable(ctx, s));
        // Hoist beam from the loft.
        const [hx, hy] = p.p(0.68, 1.4, 54);
        ctx.fillStyle = '#2b2420';
        ctx.fillRect(hx - 1.5, hy - 2, 3, 10);
        // Saw pit with a trunk across it and the two-man saw.
        p.ground(1.3, 0.3, 1.8, 0.7, 0x231a12);
        const a = p.p(1.22, 0.5, 8);
        const b = p.p(1.88, 0.5, 8);
        ctx.strokeStyle = '#6b4a2c';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
        ellipse(ctx, b[0], b[1], 4, 4);
        ctx.fillStyle = '#e0b880';
        ctx.fill();
        const [x, y] = p.p(1.55, 0.5, 8);
        ctx.fillStyle = '#b8bcc0';
        ctx.fillRect(x - 0.6, y - 18, 1.2, 30);
        ctx.fillStyle = '#3a2e25';
        ctx.fillRect(x - 3, y - 20, 6, 2);
        logPile(p, 1.25, 1.85, 10, 0x6b4426, 0xe0b880);
        plankStack(p, 1.35, 1.0, 1.75, 1.3, 12);
        p.flag(1.86, 0.2, 0, 30, team);
      },
    },
    mining_camp: {
      size: 2,
      maxHeight: 170,
      paint: (p, team) => {
        p.footShadow();
        p.ground(0.1, 0.1, 1.9, 1.9, 0x857d6e);
        spoilHeap(p, 1.55, 0.35, 24, 22, 0x7d7a72);
        engineHouse(p, s, team);
        windingWheel(p, s, 1.45, 1.05, 56);
        goldPile(p, 1.5, 1.7);
        p.flag(1.88, 1.88, 0, 26, team);
      },
    },
    archery_range: {
      size: 3,
      maxHeight: 150,
      paint: (p, team) => {
        const ctx = p.ctx;
        p.footShadow();
        p.ground(0.05, 0.05, 2.95, 2.95, 0x86985e);
        // Long framed shooting pavilion facing the butts.
        p.box(0.25, 0.3, 1.1, 2.2, 0, 6, { color: c.stone }, c.stone);
        p.box(0.25, 0.3, 1.1, 2.2, 6, 38, { color: c.plaster, detail: 'plaster' });
        p.leftFace(0.25, 1.1, 2.2, 6, (w, h) => {
          if (s.ornaments.halfTimber) halfTimberLattice(ctx, w, h, c.timber, 'square');
          p.door(w / 2 - 6, 13, 22, c.doors.work);
        }, 32);
        p.rightFace(0.3, 2.2, 1.1, 6, (w, h) => {
          if (s.ornaments.halfTimber) halfTimberLattice(ctx, w, h, c.timber, 'close', R);
          for (const x of [0.15, 0.42, 0.7]) leadedWindow(p, w * x, -24, 18, 11, 3, R);
        }, 32);
        styledGable(p, s, 0.25, 0.3, 1.1, 2.2, 38, 34, c.roof, c.plaster, 'v', 0.14, framedGable(ctx, s));
        // Bow staves leaning on the wall.
        const [x, y] = p.p(1.18, 1.0, 0);
        ctx.strokeStyle = '#7a5530';
        ctx.lineWidth = 1.5;
        for (let k = 0; k < 4; k++) {
          ctx.beginPath();
          ctx.moveTo(x - 14 + k * 6, y);
          ctx.lineTo(x - 10 + k * 6, y - 30);
          ctx.stroke();
        }
        for (const [u, v] of [[2.45, 0.6], [2.5, 1.4], [2.45, 2.2]] as const) earthButt(p, u, v);
        hedge(p, 0.1, 2.92, 1.9, 2.92, 11);
        p.flag(0.5, 2.5, 0, 40, team, true);
      },
    },
    blacksmith: {
      size: 2,
      maxHeight: 140,
      paint: (p, team) => {
        const ctx = p.ctx;
        p.footShadow();
        p.ground(0.1, 0.1, 1.9, 1.9, 0x7a7266);
        brickStack(p, s, 1.06, 0.3, 1.4, 0.6, 0, 104 + roofLift(s, 36), 1, 'forge');
        p.box(0.28, 0.3, 1.4, 1.5, 0, 20, { color: c.stone, detail: 'fieldstone' });
        p.rightFace(0.3, 1.5, 1.4, 0, (w) => forgeMouth(p, w * 0.35, 20, 18), 20);
        p.box(0.28, 0.3, 1.4, 1.5, 20, 44, { color: c.plaster, detail: 'plaster' });
        p.leftFace(0.28, 1.4, 1.5, 20, (w, h) => {
          if (s.ornaments.halfTimber) halfTimberLattice(ctx, w, h, c.timber, 'close');
          leadedWindow(p, w / 2 - 9, -18, 18, 10, 3);
        }, 24);
        p.rightFace(0.3, 1.5, 1.4, 20, (w, h) => {
          if (s.ornaments.halfTimber) halfTimberLattice(ctx, w, h, c.timber, 'close', R);
        }, 24);
        p.leftFace(0.28, 1.4, 1.5, 0, (w) => p.door(w * 0.3, 15, 17, c.doors.work), 20);
        styledGable(p, s, 0.28, 0.3, 1.4, 1.5, 44, 36, c.roof, c.plaster, 'u', 0.12, framedGable(ctx, s, R));
        // Lean-to over the anvil.
        post(p, 1.78, 0.5, 0, 26, 2.4, c.timber);
        post(p, 1.78, 1.4, 0, 26, 2.4, c.timber);
        p.material = 'tile';
        styledGable(p, s, 1.42, 0.45, 1.82, 1.45, 26, 8, c.roof, c.timber, 'v', 0.04);
        forgeLight(p, 1.65, 0.95);
        const [x, y] = p.p(1.62, 1.2, 0);
        ctx.fillStyle = '#3a2e25';
        ctx.fillRect(x - 5, y - 8, 10, 8);
        ctx.fillStyle = '#34343a';
        ctx.fillRect(x - 9, y - 12, 18, 4.5);
        p.flag(1.88, 1.88, 0, 26, team);
      },
    },
  };
}
