import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { clockFace, R } from '../facade';
import { lantern } from '../parts';
import { dormerLeft } from '../roofs';
import type { ArchStyle } from '../style';
import { onRoof, roofLift, styledHip } from '../styledRoofs';
import type { AgeArtSet } from '../types';
import { englishFoundry } from './englishFoundry';
import { georgianTower } from './englishTowers';
import { gothicCathedral } from './gothicCathedral';
import { cupola, doorcase, georgianBlock, georgianStack, parapetWall, portico, sashWindow } from './georgianParts';
import { cannon, gravel, railings, sentryBox, stackedArms, stableDoor } from './georgianProps';
import { georgianWorkArt } from './georgianWork';

/*
 * Age 3 English family (Georgian): a Palladian town hall with a
 * pedimented portico and clock cupola, a three-storey brick town house
 * with a fanlit door in the team colour, a brick barrack range round a
 * parade ground, and a stable block with a clock turret — red brick in
 * Flemish bond, stone dressings, white sashes, parapets and slate hips.
 */

/** Rows of sashes on a face: one row per [y-top, height] storey, `bays` windows each, skipping `skip(i)`. */
function sashRows(p: IsoPainter, s: ArchStyle, w: number, light: number, bays: number, rows: ReadonlyArray<readonly [number, number]>, skip: (i: number) => boolean = () => false): void {
  const ww = Math.min(11, (w / bays) * 0.42);
  for (let i = 0; i < bays; i++) {
    if (skip(i)) continue;
    const x = (w / bays) * (i + 0.5) - ww / 2;
    for (const [y, h] of rows) sashWindow(p, s, x, y, ww, h, light);
  }
}

/** Age 3 English set. */
export function georgianArt(s: ArchStyle): AgeArtSet {
  const c = s.palette;
  const hip = (p: IsoPainter, u0: number, v0: number, u1: number, v1: number, eave: number, rise: number) => {
    p.material = 'slate';
    return styledHip(p, s, u0, v0, u1, v1, eave, rise, c.roof, 0.02);
  };
  return {
    ...georgianWorkArt(s),
    town_center: {
      size: 3,
      maxHeight: 220,
      paint: (p, team) => {
        p.footShadow();
        gravel(p, 0.05, 0.05, 2.95, 2.95, 0xbdb5a0);
        p.ground(0.95, 2.45, 2.05, 2.95, 0xcfc6b0);
        for (const u of [0.62, 2.1]) georgianStack(p, s, u, 0.52, u + 0.3, 0.66, 70, 150 + roofLift(s, 44), 3);
        parapetWall(p, s, 0.35, 0.4, 2.65, 2.05, 96, 9, 'back');
        georgianBlock(p, s, 0.35, 0.4, 2.65, 2.05, 0, 96, {
          bands: [36],
          left: (w, _h, l) => sashRows(p, s, w, l, 7, [[-30, 20], [-74, 28]], (i) => i === 3),
          right: (w, _h, l) => sashRows(p, s, w, l, 5, [[-30, 20], [-74, 28]]),
        });
        hip(p, 0.35, 0.4, 2.65, 2.05, 96, 44);
        cupola(p, s, 1.5, 1.22, 96 + 44 * s.roof.pitch - 14, team, 0.36);
        parapetWall(p, s, 0.35, 0.4, 2.65, 2.05, 96, 9, 'front');
        // Entrance behind the portico, then the portico itself.
        p.leftFace(1.05, 1.95, 2.05, 8, (w) => {
          doorcase(p, s, w / 2 - 8, 16, 30, c.doors.main);
          sashWindow(p, s, w / 2 - 6, -74, 12, 28);
        }, 88);
        portico(p, s, 1.05, 1.95, 2.05, 2.48, 72, 4, 24, team);
        railings(p, 0.35, 2.4, 1.0, 2.4, 13);
        railings(p, 2.0, 2.4, 2.65, 2.4, 13);
        lantern(p, 1.0, 2.42, 28, 1.0, 2.7);
        lantern(p, 2.0, 2.42, 28, 2.0, 2.7);
      },
    },
    house: {
      size: 2,
      maxHeight: 160,
      paint: (p, team) => {
        p.footShadow();
        p.ground(0.12, 0.12, 1.88, 1.88, 0xa59c86);
        p.ground(0.3, 1.5, 1.7, 1.88, 0xc4bba6);
        georgianStack(p, s, 0.44, 0.72, 0.62, 1.2, 60, 128 + roofLift(s, 34), 3);
        parapetWall(p, s, 0.4, 0.5, 1.6, 1.45, 90, 8, 'back');
        georgianBlock(p, s, 0.4, 0.5, 1.6, 1.45, 0, 90, {
          bands: [26, 56],
          left: (w, _h, l) => {
            doorcase(p, s, w / 2 - 6.5, 13, 22, team, l);
            for (const x of [0.17, 0.83]) sashWindow(p, s, w * x - 4.5, -22, 9, 15, l);
            sashRows(p, s, w, l, 3, [[-50, 21], [-76, 13]]);
          },
          right: (w, _h, l) => sashRows(p, s, w, l, 2, [[-22, 15], [-50, 21], [-76, 13]]),
        });
        hip(p, 0.4, 0.5, 1.6, 1.45, 90, 34);
        dormerLeft(p, 1.0, 1.36, onRoof(s, 90, 93), 0.24, 13, c.trim, c.roof, 'slate');
        georgianStack(p, s, 1.42, 0.8, 1.6, 1.15, 94, 128 + roofLift(s, 34), 2);
        parapetWall(p, s, 0.4, 0.5, 1.6, 1.45, 90, 8, 'front');
        railings(p, 0.3, 1.78, 0.82, 1.78, 12);
        railings(p, 1.18, 1.78, 1.7, 1.78, 12);
        lantern(p, 0.82, 1.47, 32, 0.95, 1.7);
      },
    },
    barracks: {
      size: 3,
      maxHeight: 190,
      paint: (p, team) => {
        p.footShadow();
        p.ground(0.05, 0.05, 2.95, 2.95, 0x9e9680);
        gravel(p, 0.95, 1.38, 2.85, 2.85, 0xc7bc9e);
        for (const u of [0.7, 1.95]) georgianStack(p, s, u, 0.42, u + 0.26, 0.56, 50, 132 + roofLift(s, 36), 3);
        georgianBlock(p, s, 0.25, 0.3, 2.75, 1.25, 0, 76, {
          bands: [32],
          left: (w, _h, l) => sashRows(p, s, w, l, 9, [[-26, 17], [-60, 20]], (i) => i === 4),
          right: (w, _h, l) => sashRows(p, s, w, l, 3, [[-26, 17], [-60, 20]]),
        });
        hip(p, 0.25, 0.3, 2.75, 1.25, 76, 36);
        // West wing closing the parade ground, gable end to the front.
        georgianBlock(p, s, 0.25, 1.25, 0.85, 2.45, 0, 66, {
          bands: [30],
          left: (w, _h, l) => sashRows(p, s, w, l, 2, [[-24, 16], [-52, 16]]),
          right: (w, _h, l) => sashRows(p, s, w, l, 4, [[-24, 16], [-52, 16]]),
        });
        hip(p, 0.25, 1.25, 0.85, 2.45, 66, 30);
        // Pedimented centre with the gate arch and a clock in the tympanum.
        georgianBlock(p, s, 1.15, 1.1, 1.85, 1.38, 0, 84, {
          bands: [32],
          left: (w, _h, l) => {
            const ctx = p.ctx;
            ctx.fillStyle = css(shade(c.ashlar, l));
            ctx.beginPath();
            ctx.moveTo(w / 2 - 15, -8);
            ctx.lineTo(w / 2 - 15, -26);
            ctx.arc(w / 2, -26, 15, Math.PI, 0);
            ctx.lineTo(w / 2 + 15, -8);
            ctx.fill();
            ctx.fillStyle = '#1d1510';
            ctx.beginPath();
            ctx.moveTo(w / 2 - 11, -8);
            ctx.lineTo(w / 2 - 11, -26);
            ctx.arc(w / 2, -26, 11, Math.PI, 0);
            ctx.lineTo(w / 2 + 11, -8);
            ctx.fill();
            sashWindow(p, s, w / 2 - 6, -66, 12, 22, l);
          },
        });
        p.material = 'slate';
        p.gableRoof(1.15, 1.1, 1.85, 1.38, 84, 26, c.roof, c.trim, 'v', 0.04, (w, rr) => clockFace(p.ctx, w / 2, -rr * 0.38, rr * 0.24));
        lantern(p, 1.15, 1.4, 34, 1.15, 1.65);
        lantern(p, 1.85, 1.4, 34, 1.85, 1.65);
        sentryBox(p, s, 1.95, 1.48, team);
        stackedArms(p, 1.25, 1.85);
        stackedArms(p, 1.55, 2.05);
        cannon(p, 2.15, 2.15);
        cannon(p, 2.15, 2.55);
        p.flag(2.65, 2.75, 0, 70, team, true);
        railings(p, 0.95, 2.9, 2.88, 2.9, 11);
        railings(p, 2.9, 1.4, 2.9, 2.88, 11);
      },
    },
    stable: {
      size: 3,
      maxHeight: 190,
      paint: (p, team) => {
        p.footShadow();
        p.ground(0.05, 0.05, 2.95, 2.95, 0x9e9680);
        gravel(p, 1.1, 1.15, 2.85, 2.85, 0xaba18b);
        georgianStack(p, s, 2.2, 0.42, 2.44, 0.56, 40, 108 + roofLift(s, 30), 2);
        // Back range: stalls round a central carriage arch under a pediment and the clock turret.
        georgianBlock(p, s, 0.3, 0.3, 2.7, 1.12, 0, 56, {
          left: (w, _h, l) => {
            for (const x of [0.12, 0.27, 0.73, 0.88]) {
              stableDoor(p, s, w * x - 6, 12, 22, c.doors.gate, l, team);
              lunette(p, s, w * x, -40, 6, l);
            }
          },
          right: (w, _h, l) => sashRows(p, s, w, l, 2, [[-38, 16]]),
        });
        hip(p, 0.3, 0.3, 2.7, 1.12, 56, 30);
        georgianBlock(p, s, 1.12, 1.0, 1.88, 1.24, 0, 64, {
          left: (w, _h, l) => {
            const ctx = p.ctx;
            ctx.fillStyle = css(shade(c.ashlar, l));
            ctx.beginPath();
            ctx.moveTo(w / 2 - 16, -2);
            ctx.lineTo(w / 2 - 16, -30);
            ctx.arc(w / 2, -30, 16, Math.PI, 0);
            ctx.lineTo(w / 2 + 16, -2);
            ctx.fill();
            ctx.fillStyle = '#1d1510';
            ctx.beginPath();
            ctx.moveTo(w / 2 - 12, 0);
            ctx.lineTo(w / 2 - 12, -30);
            ctx.arc(w / 2, -30, 12, Math.PI, 0);
            ctx.lineTo(w / 2 + 12, 0);
            ctx.fill();
          },
        });
        p.material = 'slate';
        p.gableRoof(1.12, 1.0, 1.88, 1.24, 64, 22, c.roof, c.trim, 'v', 0.04, (w, rr) => lunette(p, s, w / 2, -rr * 0.3, 5, 1));
        cupola(p, s, 1.5, 0.82, 56 + 30 * s.roof.pitch - 8, team, 0.3);
        // West wing: stalls facing the yard, gable end to the front.
        georgianBlock(p, s, 0.3, 1.12, 1.05, 2.6, 0, 52, {
          left: (w, _h, l) => sashRows(p, s, w, l, 1, [[-36, 16]]),
          right: (w, _h, l) => {
            for (const x of [0.2, 0.5, 0.8]) stableDoor(p, s, w * x - 6, 12, 22, c.doors.gate, l, team);
          },
        });
        hip(p, 0.3, 1.12, 1.05, 2.6, 52, 28);
        lantern(p, 1.05, 1.6, 32, 1.3, 1.6);
        lantern(p, 1.12, 1.24, 34, 1.3, 1.45);
        // Yard: stone trough, mounting block, hay.
        p.box(1.5, 2.0, 2.1, 2.16, 0, 9, { color: c.stone, detail: 'stone' }, 0x5d6f78);
        p.box(2.3, 1.5, 2.48, 1.68, 0, 8, { color: c.ashlar }, c.ashlar);
        p.box(2.3, 1.5, 2.4, 1.68, 8, 14, { color: c.ashlar }, c.ashlar);
        for (const u of [1.4, 1.75]) p.box(u, 2.45, u + 0.3, 2.7, 0, 11, { color: 0xd2ad55 }, 0xe2c26c);
        railings(p, 1.1, 2.88, 2.88, 2.88, 11);
      },
    },
    tower: georgianTower(s),
    foundry: englishFoundry(s),
    wonder: gothicCathedral(s),
  };
}

/** Semicircular lunette window (face-local, centred on x with its base at y). */
function lunette(p: IsoPainter, s: ArchStyle, x: number, y: number, r: number, light: number): void {
  const ctx = p.ctx;
  ctx.fillStyle = css(shade(s.palette.ashlar, light));
  ctx.beginPath();
  ctx.arc(x, y, r + 1.8, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2a2018';
  ctx.beginPath();
  ctx.arc(x, y, r, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = css(shade(s.palette.trim, light * R * 1.3));
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  for (let k = 1; k < 4; k++) {
    const a = Math.PI + (k / 4) * Math.PI;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.stroke();
}
