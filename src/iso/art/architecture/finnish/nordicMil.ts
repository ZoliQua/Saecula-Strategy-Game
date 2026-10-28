import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { crest, R } from '../facade';
import { bellRoof } from '../kits/shingleRoof';
import { haystack, post, strawButt, target } from '../parts';
import type { ArchStyle } from '../style';
import { towerLine } from '../towerParts';
import type { AgeArtSet, BuildingArt } from '../types';
import { belfry } from './nordicBelfry';
import { boulders, footing, mainRoof, nDoor, nordic, nWindow, riukuaita, roundShield, wallBlock, type Block } from './nordicParts';
import { lato, popinjay } from './nordicProps';

/*
 * Finnish military buildings. The barracks is a long hall behind a
 * dry-stone wall with its gate tower — a turf-capped log lookout (age 1),
 * a bell tower (kellotapuli) under a shingled pyramid (age 2) or under
 * a bell roof and lantern (age 3). The archery range shows a hunter's
 * raised hide on poles (age 1) or the shooting guild's popinjay mast
 * (ages 2-3) over its butts. The stable keeps its horses in a long
 * stall row beside a meadow barn (lato) whose walls flare outwards.
 */

/** Spear rack: a rail on two posts with upright spears. */
function spearRack(p: IsoPainter, u: number, v0: number, v1: number): void {
  const ctx = p.ctx;
  post(p, u, v0, 0, 16, 1.6, 0x5a3b20);
  post(p, u, v1, 0, 16, 1.6, 0x5a3b20);
  for (let i = 0; i < 6; i++) {
    const [x, y] = p.p(u, v0 + ((v1 - v0) * (i + 0.5)) / 6, 0);
    towerLine(p, [x, y], [x + 1, y - 34], 0x6b4a2c, 1.2);
    ctx.fillStyle = '#c8ccd2';
    ctx.beginPath();
    ctx.moveTo(x - 1.2, y - 34);
    ctx.lineTo(x + 1, y - 41);
    ctx.lineTo(x + 2.8, y - 34);
    ctx.fill();
  }
}

function barracks(s: ArchStyle): BuildingArt {
  const k = nordic(s);
  const c = s.palette;
  const hall: Block = [0.3, 0.32, 2.62, 1.2];
  const gate: Block = [0.34, 1.86, 0.92, 2.44];
  const SIDE_HALL: Block = [0.3, 0.3, 1.22, 2.62];
  const SIDE_GATE: Block = [2.14, 0.22, 2.72, 0.8];
  return {
    size: 3,
    maxHeight: k.belfry === 'lookout' ? 150 : 250,
    paint: (p, team) => {
      p.footShadow();
      p.ground(0.05, 0.05, 2.95, 2.95, 0x8a7e62);
      // Age 1: the hall along the back. Later ages turn it to face the lane, its bell tower free on the right.
      const lookout = k.belfry === 'lookout';
      const h0 = lookout ? hall : SIDE_HALL;
      const z0 = footing(p, s, h0, 5);
      const wall = k.walls === 'boards' ? 50 : 34;
      const longSide = (w: number, h: number) => {
        for (let i = 0; i < 5; i++) {
          const x = (w / 5) * (i + 0.5);
          if (k.walls === 'boards') nWindow(p, s, x - 4, -h + 10, 8, 10, lookout ? 1 : R, false);
          roundShield(p, x, -h + (k.walls === 'boards' ? 30 : 10), 4.5, team, lookout ? 1 : R);
        }
        crest(p.ctx, s, w * 0.3, -h * 0.4, 8, team);
        nDoor(p, s, w * 0.55, 15, 26, c.doors.gate, lookout ? 1 : R);
      };
      const gableEnd = (light: number) => (w: number, h: number) => nWindow(p, s, w / 2 - 4, -h + 12, 8, 10, light, false);
      if (lookout) wallBlock(p, s, h0, z0, z0 + wall, longSide, gableEnd(R));
      else wallBlock(p, s, h0, z0, z0 + wall, gableEnd(1), longSide);
      mainRoof(p, s, h0, z0 + wall, lookout ? 'u' : 'v');
      if (k.belfry === 'lookout') {
        wallBlock(p, s, gate, 0, 74, (w) => nDoor(p, s, w / 2 - 8, 16, 26, c.doors.gate, 1), (w, h) => {
          p.ctx.fillStyle = '#18120d';
          p.ctx.fillRect(w / 2 - 1.5, -h + 14, 3, 10);
        });
        const top = mainRoof(p, s, gate, 74, 'u', { scale: 1.3, overhang: 0.08 });
        p.flag(0.63, 2.15, top - 4, 24, team, true);
        // Dry-stone wall (kiviaita) along the two front edges.
        boulders(p, s, 1.1, 2.72, 2.9, 2.9, 14, 4.5);
        boulders(p, s, 2.72, 1.4, 2.9, 2.9, 10, 4.5);
        spearRack(p, 2.35, 1.6, 2.3);
        return;
      }
      const top = belfry(p, s, SIDE_GATE, 0, { lower: 80, upper: 28, face: (w) => nDoor(p, s, w / 2 - 8, 16, 26, c.doors.gate, 1) });
      p.flag(SIDE_GATE[0] + 0.06, SIDE_GATE[1] + 0.06, top - 30, 24, team, true);
      spearRack(p, 2.0, 1.5, 2.2);
      boulders(p, s, 1.4, 2.72, 2.9, 2.9, 12, 4.5);
      boulders(p, s, 2.72, 1.1, 2.9, 2.9, 10, 4.5);
    },
  };
}

/** Hunter's raised hide: a small plank box on four tall poles with a ladder, under a turf or shingle cap. */
function raisedHide(p: IsoPainter, s: ArchStyle, u: number, v: number): void {
  const c = s.palette;
  const r = 0.2;
  const z = 64;
  for (const [du, dv] of [[-1, -1], [1, -1], [-1, 1]] as const) post(p, u + du * r, v + dv * r, 0, z, 2.2, c.timber);
  const box: Block = [u - r - 0.03, v - r - 0.03, u + r + 0.03, v + r + 0.03];
  wallBlock(p, s, box, z, z + 18, (w, h) => {
    p.ctx.fillStyle = '#18120d';
    p.ctx.fillRect(w * 0.25, -h + 4, w * 0.5, 6);
  }, undefined, 0.03);
  post(p, u + r, v + r, 0, z, 2.2, c.timber);
  mainRoof(p, s, box, z + 18, 'u', { scale: 1.4, overhang: 0.06 });
  // Ladder.
  const a = p.p(u - 0.05, v + r + 0.35, 0);
  const b = p.p(u - 0.05, v + r + 0.04, z);
  const a2 = p.p(u + 0.12, v + r + 0.35, 0);
  const b2 = p.p(u + 0.12, v + r + 0.04, z);
  towerLine(p, a, b, c.timber, 1.6);
  towerLine(p, a2, b2, c.timber, 1.6);
  for (let t = 0.1; t < 1; t += 0.14) towerLine(p, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], [a2[0] + (b2[0] - a2[0]) * t, a2[1] + (b2[1] - a2[1]) * t], c.timber, 1.1);
}

function archery(s: ArchStyle): BuildingArt {
  const k = nordic(s);
  const c = s.palette;
  const shed: Block = [0.3, 0.3, 1.35, 1.0];
  return {
    size: 3,
    maxHeight: k.belfry === 'lookout' ? 150 : 200,
    paint: (p, team) => {
      p.footShadow();
      p.ground(0.05, 0.05, 2.95, 2.95, 0x8a9a62);
      if (k.belfry === 'lookout') raisedHide(p, s, 2.3, 0.6);
      else if (k.belfry === 'kellotapuli') popinjay(p, 2.35, 0.55, 158, team);
      else targetWall(p, s, team);
      // Shooting shed: back and side walls, open front on posts.
      wallBlock(p, s, [shed[0], shed[1], shed[2], shed[1] + 0.12], 0, 34, undefined, undefined, 0.05);
      wallBlock(p, s, [shed[0], shed[1], shed[0] + 0.12, shed[3]], 0, 34, undefined, undefined, 0.05);
      const postColour = k.walls === 'boards' ? c.trim : c.timber;
      for (const [u, v] of [[shed[2], shed[3]], [shed[2], shed[1] + 0.12], [shed[0] + 0.12, shed[3]], [(shed[0] + shed[2]) / 2, shed[3]]] as const) post(p, u, v, 0, 34, 2.6, postColour);
      const ridge = mainRoof(p, s, shed, 34, 'u');
      if (k.belfry === 'lantern') cupola(p, s, (shed[0] + shed[2]) / 2, (shed[1] + shed[3]) / 2, ridge - 6);
      for (const [u, v] of [[2.55, 1.2], [2.55, 1.85], [2.55, 2.5]] as const) target(p, u, v);
      strawButt(p, 2.0, 2.55);
      riukuaita(p, 0.08, 2.9, 1.8, 2.9, 12);
      p.flag(0.4, 2.6, 0, 40, team, true);
    },
  };
}

/** The shooting society's boarded target wall with painted rings and its tall flag mast. */
function targetWall(p: IsoPainter, s: ArchStyle, team: number): void {
  p.flag(2.62, 0.2, 0, 132, team, true);
  p.addVolumePoint(2.62, 0.2, 132);
  p.box(2.3, 0.3, 2.44, 1.55, 0, 52, { color: s.palette.darkWood }, s.palette.darkWood);
  p.rightFace(0.3, 1.55, 2.44, 0, (w, h) => {
    const ctx = p.ctx;
    ctx.fillStyle = css(shade(s.palette.trim, R));
    ctx.fillRect(0, -h, w, 3);
    for (const x of [0.2, 0.5, 0.8]) {
      ['#f2ead6', '#c0392b', '#f2ead6', '#1c1612'].forEach((col, i) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(w * x, -h * 0.55, 9 - i * 2.2, 10 - i * 2.4, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }, 52);
}

/** Small boarded lantern cupola under a bell roof astride a ridge. */
function cupola(p: IsoPainter, s: ArchStyle, u: number, v: number, z: number): void {
  const r = 0.1;
  wallBlock(p, s, [u - r, v - r, u + r, v + r], z, z + 18, (w, h) => {
    p.ctx.fillStyle = '#1c1612';
    p.ctx.fillRect(w / 2 - 2, -h + 5, 4, 8);
  }, undefined, 0.02);
  const prev = p.material;
  p.material = 'shingle';
  bellRoof(p, u, v, r + 0.04, z + 18, 24, s.palette.roof, { hips: s.palette.trim });
  p.material = prev;
}

/** Hay hoist: a beam out of the gable apex with a pulley and rope. */
function hayHoist(p: IsoPainter, s: ArchStyle, u: number, v: number, z: number): void {
  const a = p.p(u, v, z);
  const b = p.p(u + 0.22, v, z);
  towerLine(p, a, b, shade(s.palette.timber, 0.9), 3);
  towerLine(p, b, [b[0], b[1] + 22], 0x2a2018, 0.8);
  p.ctx.fillStyle = '#2a2622';
  p.ctx.beginPath();
  p.ctx.arc(b[0], b[1] + 2, 2.4, 0, Math.PI * 2);
  p.ctx.fill();
  p.addVolumePoint(u + 0.22, v, z);
}

/** Two carved boards crossed above a gable apex, each ending in a horse head. */
function horseHeads(p: IsoPainter, u: number, v: number, z: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, z - 2);
  ctx.fillStyle = '#5e4c3a';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x - side * 6, y + 4);
    ctx.lineTo(x + side * 6, y - 14);
    ctx.lineTo(x + side * 11, y - 15);
    ctx.lineTo(x + side * 10, y - 11);
    ctx.lineTo(x + side * 7, y - 11);
    ctx.lineTo(x - side * 3, y + 5);
    ctx.closePath();
    ctx.fill();
  }
  p.addVolumePoint(u, v, z + 14);
}

/** Horse weathervane on a ridge point. */
function horseVane(p: IsoPainter, u: number, v: number, z: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, z);
  ctx.fillStyle = '#2a2622';
  ctx.fillRect(x - 0.8, y - 16, 1.6, 16);
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 16);
  ctx.lineTo(x + 5, y - 16);
  ctx.lineTo(x + 8, y - 22);
  ctx.lineTo(x + 5, y - 21);
  ctx.lineTo(x + 3, y - 18.5);
  ctx.lineTo(x - 6, y - 19);
  ctx.closePath();
  ctx.fill();
  p.addVolumePoint(u, v, z + 22);
}

function stable(s: ArchStyle): BuildingArt {
  const k = nordic(s);
  const c = s.palette;
  const long: Block = [0.3, 0.3, 2.7, 0.95];
  return {
    size: 3,
    maxHeight: k.roofs === 'turf' ? 120 : 150,
    paint: (p, team) => {
      p.footShadow();
      p.ground(0.05, 0.05, 2.95, 2.95, 0x9a8a64);
      const z0 = footing(p, s, long, 4);
      const stalls = (light: number) => (w: number) => {
        for (let x = 8; x < w - 14; x += 24) {
          p.ctx.fillStyle = css(shade(0x2a1e14, light));
          p.ctx.fillRect(x, -22, 13, 22);
          if (k.walls === 'boards') {
            p.ctx.fillStyle = css(shade(c.trim, light));
            p.ctx.fillRect(x - 1.5, -24, 16, 2);
          }
        }
      };
      wallBlock(p, s, long, z0, z0 + 32, stalls(1));
      const ridge = mainRoof(p, s, long, z0 + 32, 'u');
      if (k.roofs === 'turf') {
        // Carved horse heads crossed over both gable ends, a tall hay rick by the barn.
        for (const u of [long[0] - 0.08, long[2] + 0.08]) horseHeads(p, u, (long[1] + long[3]) / 2, ridge);
        haystack(p, 2.3, 1.55, 15, 62);
      }
      if (k.roofs === 'gambrel') {
        hayHoist(p, s, long[2] + 0.07, (long[1] + long[3]) / 2, ridge - 8);
        horseVane(p, 1.5, (long[1] + long[3]) / 2, ridge);
      }
      lato(p, s, [0.45, 1.35, 1.0, 2.1], 42, 0.17);
      riukuaita(p, 1.3, 2.86, 2.86, 2.86, 13);
      riukuaita(p, 2.86, 1.2, 2.86, 2.86, 13);
      p.box(1.55, 1.6, 2.15, 1.75, 0, 9, { color: c.timber, detail: 'planks' }, 0x5a7a8a);
      p.flag(2.8, 2.8, 0, 34, team, true);
    },
  };
}

/** The military buildings of every age. */
export function nordicMilArt(s: ArchStyle): AgeArtSet {
  return { barracks: barracks(s), archery_range: archery(s), stable: stable(s) };
}
