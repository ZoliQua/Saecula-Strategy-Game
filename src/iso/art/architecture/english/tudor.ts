import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { archedOpening, R } from '../facade';
import { post, torch } from '../parts';
import type { ArchStyle } from '../style';
import { roofLift, styledGable } from '../styledRoofs';
import { parapet } from '../towerParts';
import type { AgeArtSet } from '../types';
import { normanTower } from './englishTowers';
import { brickStack } from '../kits/chimneyStack';
import { framedGable, leadedWindow, styleFraming } from '../kits/halfTimber';
import { jettyStorey } from '../kits/jetty';
import { spireRoom } from '../kits/needleSpire';
import { dummy, hangingBanner, hedge } from './englishParts';
import { normanKeep } from './normanKeep';
import { tudorWorkArt } from './tudorWork';

/*
 * Age 2 English family (Tudor / Norman): a Norman keep behind a
 * jettied great hall, black-and-white framing over grey stone, very
 * steep red-brown peg-tile roofs and tall clustered brick stacks.
 */

/** Plain fieldstone ground storey (windows and doors are painted on its faces by the caller). */
function stoneStorey(p: IsoPainter, s: ArchStyle, u0: number, v0: number, u1: number, v1: number, z1: number): void {
  p.box(u0, v0, u1, v1, 0, z1, { color: s.palette.stone, detail: 'fieldstone' });
}

/** Square stone gatehouse with an arched gate, team banner and merlons. */
function gatehouse(p: IsoPainter, s: ArchStyle, u0: number, v0: number, d: number, h: number, team: number): void {
  const c = s.palette;
  const wall = { color: c.ashlar, detail: 'stone' as const };
  p.box(u0, v0, u0 + d, v0 + d, 0, h, wall);
  p.leftFace(u0, u0 + d, v0 + d, 0, (w) => {
    archedOpening(p.ctx, w / 2 - 10, 20, 30, shade(c.ashlar, 1.15));
    p.door(w / 2 - 8, 16, 27, c.doors.gate);
    p.window(w / 2 - 3, -h + 22, 6, 11, true);
  }, h);
  p.rightFace(v0, v0 + d, u0 + d, 0, (w) => hangingBanner(p.ctx, w / 2 - 6, -h + 12, 12, 32, team, R, s.charge), h);
  p.ground(u0, v0, u0 + d, v0 + d, shade(c.roofAlt, 0.9), h);
  parapet(p, u0, v0, u0 + d, v0 + d, h, wall, 'back', 3);
  parapet(p, u0, v0, u0 + d, v0 + d, h, wall, 'front', 3);
  p.flag(u0 + 0.12, v0 + 0.12, h + 16, 20, team, true);
}

/** Age 2 English set. */
export function tudorArt(s: ArchStyle): AgeArtSet {
  const c = s.palette;
  const gable = (p: IsoPainter, light = 1) => framedGable(p.ctx, s, light);
  return {
    ...tudorWorkArt(s),
    town_center: {
      size: 3,
      maxHeight: 270 + spireRoom(s, 30),
      paint: (p, team) => {
        p.footShadow();
        p.ground(0.05, 0.05, 2.95, 2.95, 0x9a9482);
        normanKeep(p, s, 0.12, 0.12, 1.02, 172, team);
        // Cross-wing behind the hall: stone below, jettied framing above, gable to the east.
        stoneStorey(p, s, 1.6, 0.25, 2.6, 1.3, 32);
        p.rightFace(0.25, 1.3, 2.6, 0, (w) => leadedWindow(p, w / 2 - 8, -26, 16, 12, 3, R), 32);
        jettyStorey(p, s, 1.6, 0.25, 2.6, 1.3, 32, 66, 0.08, 'square', undefined, (w) => leadedWindow(p, w / 2 - 9, -26, 18, 13, 3, R));
        styledGable(p, s, 1.6, 0.25, 2.68, 1.38, 66, 38, c.roof, c.plaster, 'u', 0.12, gable(p, R));
        // Great hall: tall brick stack on its back slope first, then the storeys.
        brickStack(p, s, 0.95, 1.5, 1.25, 1.66, 40, 128 + roofLift(s, 44), 3);
        stoneStorey(p, s, 0.4, 1.35, 2.5, 2.45, 34);
        p.leftFace(0.4, 2.5, 2.45, 0, (w) => {
          archedOpening(p.ctx, w * 0.42 - 2, 22, 28, c.ashlar);
          p.door(w * 0.42, 18, 25, c.doors.main);
          for (const x of [0.1, 0.25, 0.68, 0.85]) leadedWindow(p, w * x, -26, 14, 12, 2);
        }, 34);
        p.rightFace(1.35, 2.45, 2.5, 0, (w) => leadedWindow(p, w / 2 - 8, -26, 16, 12, 2, R), 34);
        jettyStorey(p, s, 0.4, 1.35, 2.5, 2.45, 34, 72, 0.1, 'close', (w) => {
          for (const x of [0.08, 0.3, 0.78]) leadedWindow(p, w * x, -30, 20, 14, 3);
          hangingBanner(p.ctx, w * 0.56, -34, 11, 26, team, 1, s.charge);
        }, (w) => leadedWindow(p, w / 2 - 10, -30, 20, 14, 3, R));
        styledGable(p, s, 0.4, 1.35, 2.6, 2.55, 72, 44, c.roof, c.plaster, 'u', 0.14, gable(p, R));
        // Gabled bay jutting from the front slope.
        styledGable(p, s, 1.55, 1.95, 2.2, 2.55, 72, 30, c.roof, c.plaster, 'v', 0.08, gable(p));
        torch(p, 1.05, 2.48, 26, 1.05, 2.75);
        torch(p, 1.6, 2.48, 26, 1.6, 2.75);
        hedge(p, 0.1, 2.9, 0.9, 2.9, 11);
        hedge(p, 2.9, 1.5, 2.9, 2.9, 11);
      },
    },
    house: {
      size: 2,
      maxHeight: 170,
      paint: (p, team) => {
        const ctx = p.ctx;
        p.footShadow();
        p.ground(0.12, 0.12, 1.88, 1.88, 0x9b937e);
        hedge(p, 0.12, 1.9, 0.6, 1.9, 9);
        // Ground storey: stone plinth, close-studded walls.
        p.box(0.35, 0.3, 1.4, 1.45, 0, 6, { color: c.stone, detail: 'fieldstone' }, c.stone);
        p.box(0.35, 0.3, 1.4, 1.45, 6, 36, { color: c.plaster, detail: 'plaster' });
        p.leftFace(0.35, 1.4, 1.45, 6, (w, h) => {
          styleFraming(ctx, s, w, h, 'close');
          p.door(w * 0.58, 13, 23, c.doors.main);
          leadedWindow(p, w * 0.12, -22, 16, 11, 2);
          // Hanging sign in the team colour.
          ctx.fillStyle = '#1e1814';
          ctx.fillRect(w * 0.86 - 1, -30, 12, 1.6);
          ctx.fillStyle = css(team);
          ctx.fillRect(w * 0.86 + 3, -28.5, 8, 9);
          ctx.fillStyle = '#d9b14a';
          ctx.fillRect(w * 0.86 + 3, -28.5, 8, 1.2);
        }, 30);
        p.rightFace(0.3, 1.45, 1.4, 6, (w, h) => {
          styleFraming(ctx, s, w, h, 'close', R);
          leadedWindow(p, w * 0.55, -22, 16, 11, 2, R);
        }, 30);
        jettyStorey(p, s, 0.35, 0.3, 1.4, 1.45, 36, 70, 0.12, 'square', (w) => {
          leadedWindow(p, w / 2 - 11, -26, 22, 13, 3);
        }, (w) => {
          leadedWindow(p, w * 0.2, -26, 16, 12, 2, R);
          leadedWindow(p, w * 0.62, -26, 16, 12, 2, R);
        });
        styledGable(p, s, 0.35, 0.3, 1.52, 1.57, 70, 46, c.roof, c.plaster, 'v', 0.14, gable(p));
        // External chimney breast on the side wall, stepping in to a pair of shafts above the ridge.
        if (s.ornaments.chimneys) p.box(1.53, 0.48, 1.8, 0.86, 0, 44, { color: c.brick, detail: 'brick' }, shade(c.brick, 0.9));
        brickStack(p, s, 1.55, 0.54, 1.73, 0.8, 44, 132 + roofLift(s, 46), 2);
      },
    },
    barracks: {
      size: 3,
      maxHeight: 200,
      paint: (p, team) => {
        const ctx = p.ctx;
        p.footShadow();
        p.ground(0.05, 0.05, 2.95, 2.95, 0x989077);
        for (const u of [0.7, 1.7]) brickStack(p, s, u, 0.42, u + 0.24, 0.58, 36, 118 + roofLift(s, 38), 2);
        stoneStorey(p, s, 0.25, 0.25, 2.2, 1.3, 32);
        p.leftFace(0.25, 2.2, 1.3, 0, (w) => {
          for (let i = 0; i < 5; i++) leadedWindow(p, 12 + i * ((w - 36) / 4), -24, 12, 11, 2);
        }, 32);
        p.rightFace(0.25, 1.3, 2.2, 0, (w) => {
          archedOpening(ctx, w / 2 - 11, 22, 28, c.ashlar, 0x22170e, R);
          p.door(w / 2 - 9, 18, 25, c.doors.gate);
        }, 32);
        jettyStorey(p, s, 0.25, 0.25, 2.2, 1.3, 32, 66, 0.08, 'close', (w) => {
          for (let i = 0; i < 6; i++) {
            const x = (w / 6) * (i + 0.5);
            if (i % 2) hangingBanner(ctx, x - 5, -30, 10, 24, team, 1, s.charge);
            else leadedWindow(p, x - 8, -28, 16, 12, 2);
          }
        }, (w) => leadedWindow(p, w / 2 - 8, -28, 16, 12, 2, R));
        styledGable(p, s, 0.25, 0.25, 2.28, 1.38, 66, 38, c.roof, c.plaster, 'u', 0.14, gable(p, R));
        torch(p, 2.28, 0.55, 26, 2.5, 0.55);
        torch(p, 2.28, 1.05, 26, 2.5, 1.05);
        gatehouse(p, s, 2.25, 2.25, 0.62, 84, team);
        // Yard: pike rack and dummies.
        for (const u of [0.55, 1.05, 1.55]) dummy(p, u, 2.3, 0x3a2e25);
        for (let k = 0; k < 6; k++) post(p, 0.3 + k * 0.08, 2.85, 0, 46, 0.9, 0x6b5440);
        hedge(p, 0.1, 2.92, 2.1, 2.92, 10);
      },
    },
    stable: {
      size: 3,
      maxHeight: 180,
      paint: (p, team) => {
        const ctx = p.ctx;
        p.footShadow();
        p.ground(0.05, 0.05, 2.95, 2.95, 0x9c9070);
        stoneStorey(p, s, 0.3, 0.3, 2.7, 1.85, 32);
        p.leftFace(0.3, 2.7, 1.85, 0, (w) => {
          for (let i = 0; i < 4; i++) {
            const x = 14 + i * ((w - 40) / 3);
            archedOpening(ctx, x, 22, 26, c.ashlar);
            ctx.fillStyle = css(c.doors.gate);
            ctx.fillRect(x, -13, 22, 13);
            ctx.fillStyle = 'rgba(0,0,0,.35)';
            ctx.fillRect(x, -13, 22, 1.4);
          }
        }, 32);
        jettyStorey(p, s, 0.3, 0.3, 2.7, 1.85, 32, 60, 0.06, 'square', (w) => {
          ctx.fillStyle = '#2a1e14';
          ctx.fillRect(w * 0.5 - 9, -24, 18, 19);
          ctx.fillStyle = 'rgba(225,190,95,.85)';
          ctx.fillRect(w * 0.5 - 7, -10, 14, 4);
          hangingBanner(ctx, w * 0.22, -26, 10, 22, team, 1, s.charge);
          hangingBanner(ctx, w * 0.72, -26, 10, 22, team, 1, s.charge);
        });
        styledGable(p, s, 0.3, 0.3, 2.76, 1.91, 60, 42, c.roof, c.plaster, 'u', 0.14, gable(p, R));
        torch(p, 1.0, 1.85, 24, 1.0, 2.05);
        torch(p, 2.0, 1.85, 24, 2.0, 2.05);
        // Post-and-rail paddock with a trough.
        for (const [a, b] of [[[0.2, 2.86], [2.86, 2.86]], [[2.86, 2.86], [2.86, 2.1]]] as const) {
          const n = 7;
          for (let i = 0; i <= n; i++) post(p, a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n, 0, 15, 1.4, 0x6e5a44);
          for (const z of [7, 13]) {
            const pa = p.p(a[0], a[1], z);
            const pb = p.p(b[0], b[1], z);
            ctx.strokeStyle = '#8a7356';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(pa[0], pa[1]);
            ctx.lineTo(pb[0], pb[1]);
            ctx.stroke();
          }
        }
        p.box(0.7, 2.2, 1.3, 2.38, 0, 9, { color: c.stone }, 0x5d6f78);
        p.flag(2.86, 2.86, 15, 34, team);
      },
    },
    tower: normanTower(s),
  };
}
