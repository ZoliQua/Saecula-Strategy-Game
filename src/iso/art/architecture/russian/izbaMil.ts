import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { crest, R } from '../facade';
import { tentRoof, tentStand } from '../kits/tentRoof';
import { post, strawButt, target } from '../parts';
import type { ArchStyle } from '../style';
import type { AgeArtSet, BuildingArt } from '../types';
import { footing, izbaWindow, logBlock, logTown, oblam, plankGable, poleFence, stakeRow, stog, towerTop, type Block } from './izbaParts';

/*
 * Russian log-town military buildings. The barracks is the retinue's
 * (druzhina's) long hall behind a stockade with a log gate tower — a
 * steep plank hip in age 1, an octagon, green tent and onion in age 2.
 * The archery range is a log shooting shed over its butts (age 2 adds a
 * tent-roofed stand); the stable an L of log stalls round a fenced horse
 * yard (age 2 adds the yard gate under its own little roof).
 */

const HALL: Block = [0.3, 0.32, 2.7, 1.2];
const GATE: Block = [0.32, 1.9, 0.92, 2.5];

/** Spear rack: a rail on two posts with upright spears. */
function spearRack(p: IsoPainter, u: number, v0: number, v1: number): void {
  const ctx = p.ctx;
  post(p, u, v0, 0, 16, 1.6, 0x5a3b20);
  post(p, u, v1, 0, 16, 1.6, 0x5a3b20);
  const n = 6;
  for (let i = 0; i < n; i++) {
    const [x, y] = p.p(u, v0 + ((v1 - v0) * (i + 0.5)) / n, 0);
    ctx.strokeStyle = '#6b4a2c';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 1, y - 34);
    ctx.stroke();
    ctx.fillStyle = '#c8ccd2';
    ctx.beginPath();
    ctx.moveTo(x - 1.2, y - 34);
    ctx.lineTo(x + 1, y - 41);
    ctx.lineTo(x + 2.8, y - 34);
    ctx.fill();
  }
}

function barracks(s: ArchStyle): BuildingArt {
  const k = logTown(s);
  const c = s.palette;
  return {
    size: 3,
    maxHeight: k.tents ? 250 : 190,
    paint: (p, team) => {
      p.footShadow();
      p.ground(0.05, 0.05, 2.95, 2.95, 0x8f8062);
      const top0 = footing(p, s, HALL, k.masonry === 'whiteStone' ? 22 : 6);
      logBlock(p, s, HALL, top0, top0 + 44, (w, h) => {
        for (let i = 0; i < 5; i++) izbaWindow(p, s, (w / 5) * (i + 0.5) - 4, -h + 14, 8, 10, 1, false);
        crest(p.ctx, s, w * 0.3, -h * 0.25, 8, team);
        p.door(w * 0.55, 15, 28, c.doors.gate);
      }, (w, h) => izbaWindow(p, s, w / 2 - 4, -h + 14, 8, 10, R, false));
      plankGable(p, s, HALL, top0 + 44, 56, 'u', { window: false });
      // Gate tower.
      const stone = k.masonry === 'whiteStone' ? 40 : 0;
      if (stone) footing(p, s, GATE, stone);
      logBlock(p, s, GATE, stone, 94, (w) => {
        if (!stone) p.door(w / 2 - 8, 16, 26, c.doors.gate);
      });
      if (stone) p.leftFace(GATE[0], GATE[2], GATE[3], 0, (w) => p.door(w / 2 - 8, 16, 26, c.doors.gate), stone);
      const g = oblam(p, s, GATE, 94, 16);
      const top = towerTop(p, s, g, 110, { hip: 48, oct: 14, tent: 60 });
      p.flag(0.62, 2.2, top, 22, team, true);
      stakeRow(p, 1.05, 2.9, 2.9, 2.9, 0, 20, c.darkWood);
      stakeRow(p, 2.9, 1.4, 2.9, 2.84, 0, 20, c.darkWood);
      spearRack(p, 2.4, 1.6, 2.3);
      post(p, 1.6, 2.1, 0, 26, 2.6, c.timber);
    },
  };
}

function archery(s: ArchStyle): BuildingArt {
  const k = logTown(s);
  const c = s.palette;
  const shed: Block = [0.3, 0.3, 1.35, 1.0];
  return {
    size: 3,
    maxHeight: k.tents ? 170 : 130,
    paint: (p, team) => {
      p.footShadow();
      p.ground(0.05, 0.05, 2.95, 2.95, 0x8fa26a);
      if (k.tents) {
        // Tent-roofed shooting stand on four posts.
        tentStand(p, 1.55, 0.35, 2.05, 0.85, 22, 44, 70, c.timber, c.roofAlt, { material: 'tile', ribs: shade(c.roofAlt, 1.35) });
      }
      // Shooting shed: back log wall, open front on posts.
      logBlock(p, s, [shed[0], shed[1], shed[2], shed[1] + 0.14], 0, 36, undefined, undefined, 0.06);
      logBlock(p, s, [shed[0], shed[1], shed[0] + 0.14, shed[3]], 0, 36, undefined, undefined, 0.06);
      for (const [u, v] of [[shed[2], shed[3]], [shed[2], shed[1] + 0.14], [shed[0] + 0.14, shed[3]], [(shed[0] + shed[2]) / 2, shed[3]]] as const) post(p, u, v, 0, 36, 2.6, c.timber);
      plankGable(p, s, shed, 36, 46, 'u', { window: false });
      for (const [u, v] of [[2.55, 0.7], [2.55, 1.5], [2.55, 2.3]] as const) target(p, u, v);
      strawButt(p, 2.1, 2.5);
      poleFence(p, 0.08, 2.92, 2.92, 2.92, 11);
      poleFence(p, 2.92, 0.1, 2.92, 2.92, 11);
      p.flag(0.4, 2.6, 0, 40, team, true);
    },
  };
}

function stable(s: ArchStyle): BuildingArt {
  const k = logTown(s);
  const c = s.palette;
  const long: Block = [0.3, 0.3, 2.7, 0.95];
  const wing: Block = [0.3, 0.95, 0.95, 2.3];
  return {
    size: 3,
    maxHeight: k.tents ? 180 : 130,
    paint: (p, team) => {
      p.footShadow();
      p.ground(0.05, 0.05, 2.95, 2.95, 0xa08e66);
      const stalls = (light: number) => (w: number) => {
        for (let x = 6; x < w - 14; x += 22) {
          p.ctx.fillStyle = css(shade(0x2a1e14, light));
          p.ctx.fillRect(x, -22, 13, 22);
        }
      };
      logBlock(p, s, long, 0, 36, stalls(1));
      plankGable(p, s, long, 36, 44, 'u', { window: false, horse: false });
      if (k.tents) {
        // Tent-roofed hayloft lookout astride the ridge.
        const lu: Block = [1.36, 0.47, 1.68, 0.79];
        logBlock(p, s, lu, 62, 86, (w) => {
          p.ctx.fillStyle = '#1e160e';
          p.ctx.fillRect(w / 2 - 4, -16, 8, 10);
        }, undefined, 0.04);
        tentRoof(p, 1.52, 0.63, 0.17, 86, 54, c.roofAlt, { material: 'tile', eave: 0.04, ribs: shade(c.roofAlt, 1.35) });
      }
      logBlock(p, s, wing, 0, 34, undefined, stalls(R));
      plankGable(p, s, wing, 34, 44, 'v', { window: false });
      const [hx, hy] = p.p(0.62, 2.3, 50);
      p.ctx.fillStyle = '#1e160e';
      p.ctx.fillRect(hx - 4, hy - 9, 8, 9);
      poleFence(p, 1.15, 2.88, 2.88, 2.88, 12);
      poleFence(p, 2.88, 1.15, 2.88, 2.88, 12);
      if (k.tents) {
        // Yard gate: two posts, a beam and a little hipped roof.
        for (const u of [1.62, 2.18]) post(p, u, 2.88, 0, 50, 3.4, c.timber);
        p.box(1.56, 2.74, 2.24, 2.98, 50, 58, { color: c.timber, detail: 'planks' }, c.timber);
        const prev = p.material;
        p.material = 'tile';
        p.hipRoof(1.56, 2.74, 2.24, 2.98, 58, 48, c.roofAlt, 0.05);
        p.material = prev;
      }
      // Water trough and a haystack.
      p.box(1.5, 1.6, 2.1, 1.75, 0, 9, { color: c.timber, detail: 'planks' }, 0x5a7a8a);
      stog(p, 2.45, 1.45, 13, 38);
      p.flag(2.85, 2.85, 0, 34, team, true);
    },
  };
}

/** The log-town military buildings of ages 1-2. */
export function izbaMilArt(s: ArchStyle): AgeArtSet {
  return { barracks: barracks(s), archery_range: archery(s), stable: stable(s) };
}
