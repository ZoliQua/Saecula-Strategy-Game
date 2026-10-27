import { ellipse } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { R } from '../facade';
import { forgeLight, forgeMouth, goldPile, haystack, logPile, post } from '../parts';
import { stripField } from '../medievalWork';
import type { ArchStyle } from '../style';
import { roofLift, styledGable, styledHip } from '../styledRoofs';
import type { AgeArtSet } from '../types';
import { brickStack, earthButt, hedge, spoilHeap } from './englishParts';
import { framedGable, halfTimberLattice, leadedWindow } from './halfTimber';

/*
 * Age 2 English workplaces: hedged strip fields with a granary on
 * staddle stones, a tarred weatherboard wood shed, a stone-slated mine
 * house with a headframe, turf archery butts behind a framed pavilion,
 * and a framed smithy with a brick forge stack.
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
      maxHeight: 130,
      paint: (p, team) => {
        const ctx = p.ctx;
        p.footShadow();
        p.ground(0.1, 0.1, 1.9, 1.9, 0x837256);
        p.box(0.22, 0.22, 1.12, 1.5, 0, 6, { color: c.stone }, c.stone);
        p.box(0.22, 0.22, 1.12, 1.5, 6, 38, { color: c.darkWood, detail: 'planks' });
        p.leftFace(0.22, 1.12, 1.5, 6, (w) => {
          ctx.fillStyle = '#18120d';
          ctx.fillRect(w * 0.3, -30, 24, 30);
          ctx.fillStyle = css(c.doors.work);
          ctx.fillRect(w * 0.3 - 9, -30, 9, 30);
        }, 32);
        p.material = 'tile';
        styledGable(p, s, 0.22, 0.22, 1.12, 1.5, 38, 40, c.roof, c.darkWood, 'v', 0.14);
        logPile(p, 1.2, 1.82, 10, 0x6b4426, 0xe0b880);
        logPile(p, 1.45, 1.15, 6, 0x6b4426, 0xe0b880);
        // Trestle with a log half through the two-man saw.
        const [x, y] = p.p(1.55, 0.45, 0);
        ctx.fillStyle = '#3a2e25';
        for (const dx of [-14, 14]) ctx.fillRect(x + dx - 1.5, y - 16, 3, 16);
        ctx.fillStyle = '#7a5530';
        ctx.fillRect(x - 24, y - 20, 48, 6);
        ctx.fillStyle = '#b8bcc0';
        ctx.fillRect(x + 2, y - 30, 1.2, 22);
        p.flag(1.84, 1.84, 0, 30, team);
      },
    },
    mining_camp: {
      size: 2,
      maxHeight: 130,
      paint: (p, team) => {
        const ctx = p.ctx;
        p.footShadow();
        p.ground(0.1, 0.1, 1.9, 1.9, 0x857d6e);
        // Headframe over the shaft, behind the mine house.
        const [sx, sy] = p.p(1.3, 0.6, 0);
        ellipse(ctx, sx, sy, 18, 9);
        ctx.fillStyle = '#56504a';
        ctx.fill();
        ellipse(ctx, sx, sy, 13, 6.5);
        ctx.fillStyle = '#0d0a08';
        ctx.fill();
        for (const [u, v] of [[1.05, 0.38], [1.55, 0.38], [1.05, 0.84], [1.55, 0.84]] as const) post(p, u, v, 0, 62, 2.4, c.timber);
        const a = p.p(1.05, 0.61, 62);
        const b = p.p(1.55, 0.61, 62);
        ctx.strokeStyle = '#2b2420';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
        ellipse(ctx, sx, sy - 66, 7, 7);
        ctx.strokeStyle = '#3a2e25';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = '#c9b08a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, sy - 60);
        ctx.lineTo(sx, sy - 20);
        ctx.stroke();
        for (const [u, v] of [[1.05, 0.38], [1.55, 0.84]] as const) p.addVolumePoint(u, v, 62);
        p.box(0.18, 0.95, 1.05, 1.75, 0, 32, { color: c.stone, detail: 'fieldstone' });
        p.leftFace(0.18, 1.05, 1.75, 0, (w) => {
          p.door(w * 0.45, 14, 22, c.doors.work);
          leadedWindow(p, w * 0.12, -24, 12, 10, 2);
        }, 32);
        p.material = 'slate';
        styledGable(p, s, 0.18, 0.95, 1.05, 1.75, 32, 34, c.roofAlt, c.stone, 'u', 0.12);
        spoilHeap(p, 1.6, 1.3, 22, 20, 0x7d7a72);
        goldPile(p, 1.25, 1.75);
        p.flag(1.88, 0.2, 0, 30, team);
      },
    },
    archery_range: {
      size: 3,
      maxHeight: 150,
      paint: (p, team) => {
        const ctx = p.ctx;
        p.footShadow();
        p.ground(0.05, 0.05, 2.95, 2.95, 0x86985e);
        p.box(0.25, 0.25, 1.35, 1.15, 0, 6, { color: c.stone }, c.stone);
        p.box(0.25, 0.25, 1.35, 1.15, 6, 38, { color: c.plaster, detail: 'plaster' });
        p.leftFace(0.25, 1.35, 1.15, 6, (w, h) => {
          if (s.ornaments.halfTimber) halfTimberLattice(ctx, w, h, c.timber, 'square');
          p.door(w * 0.62, 13, 22, c.doors.work);
          leadedWindow(p, w * 0.14, -24, 16, 11, 2);
        }, 32);
        p.rightFace(0.25, 1.15, 1.35, 6, (w, h) => {
          if (s.ornaments.halfTimber) halfTimberLattice(ctx, w, h, c.timber, 'square', R);
          leadedWindow(p, w / 2 - 8, -24, 16, 11, 2, R);
        }, 32);
        styledHip(p, s, 0.25, 0.25, 1.35, 1.15, 38, 34, c.roof, 0.12);
        // Bow staves leaning on the wall.
        const [x, y] = p.p(0.9, 1.22, 0);
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
