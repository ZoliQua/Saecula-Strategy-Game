import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { R } from '../facade';
import { arcade, patioFloor, patioShade, pot } from '../kits/patio';
import { strawButt, torch } from '../parts';
import type { ArchStyle } from '../style';
import type { AgeArtSet, BuildingArt } from '../types';
import { towerSpot } from './towerSpots';
import { kitsOf, wallOf } from './courtyardKits';
import { ajimez, windowAt } from './hispaniaOrnament';
import { block, ridgeBells, roofOver, type Block } from './hispaniaParts';
import { gateway, yardWalls } from './hispaniaYard';

/*
 * Military buildings of the courtyard families: the barracks (cuartel)
 * — a two-storey hall with a one-storey wing round a parade patio,
 * entered through the age's gateway; the archery range, a loggia over a
 * walled butt field; and the stable, stalls round a corral with its
 * trough. Flat roofs in ages 1-2 (crenellated in 2), low hips with an
 * espadaña on the ridge in age 3; the barracks' tower spot raises a
 * brick tower in age 2 and a mirador in age 3.
 */

/** Arch head of the age (horseshoe with alfiz in age 2). */
function head(s: ArchStyle): 'horseshoe' | 'round' {
  return kitsOf(s).portal === 'alfiz' ? 'horseshoe' : 'round';
}

/** Dummy on a post (parade patio). */
function dummy(p: IsoPainter, u: number, v: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 0);
  ctx.fillStyle = '#6b4526';
  ctx.fillRect(x - 1.5, y - 24, 3, 24);
  ctx.fillRect(x - 8, y - 18, 16, 2.6);
  ctx.fillStyle = '#d6b57a';
  ctx.beginPath();
  ctx.arc(x, y - 27, 4.2, 0, Math.PI * 2);
  ctx.fill();
}

function barracks(s: ArchStyle): BuildingArt {
  return {
    size: 3,
    maxHeight: 170,
    paint: (p, team) => {
      const k = kitsOf(s);
      const hall: Block = [0.25, 0.25, 2.75, 0.95];
      const wing: Block = [0.25, 0.95, 0.9, 2.75];
      p.footShadow();
      p.ground(0.08, 0.08, 2.92, 2.92, 0xab9c7c);
      block(p, s, hall, 0, 56, (w, h) => {
        for (let i = 0; i < 4; i++) {
          const x = w * (0.34 + i * 0.16);
          if (k.towers === 'brick') ajimez(p, s, x, -h + 12, 12, 13, 1);
          else windowAt(p, s, x, -h + 12, 9, 12, 1, true);
        }
      }, (w, h) => windowAt(p, s, w * 0.4, -h + 12, 9, 12, R, true));
      p.leftFace(0.9, 2.75, 0.95, 0, (w, h) => arcade(p.ctx, w, h, { bays: 5, head: head(s), wall: wallOf(s).color, light: 1, alfiz: k.portal === 'alfiz' ? s.palette.trim : undefined }), 30);
      towerSpot(p, s, [2.25, 0.28, 2.72, 0.75], 0, 104, 24);
      roofOver(p, s, hall, 56, 28);
      ridgeBells(p, s, [0.25, 0.25, 2.0, 0.95], 56, 28, 40);
      patioFloor(p, 0.9, 0.95, 2.75, 2.75, 0, { color: 0xc4b38f, pattern: 'pebble' });
      patioShade(p, 0.9, 0.95, 2.75, 2.75, 0, 0.3);
      for (const u of [1.4, 1.95]) dummy(p, u, 1.6);
      // Weapon rack.
      const [rx, ry] = p.p(2.4, 1.3, 0);
      p.ctx.fillStyle = '#5a3b20';
      p.ctx.fillRect(rx - 10, ry - 16, 20, 2);
      p.ctx.fillStyle = '#c9c4b8';
      for (let i = 0; i < 5; i++) p.ctx.fillRect(rx - 8 + i * 4, ry - 26, 1.2, 26);
      block(p, s, wing, 0, 34, (w) => windowAt(p, s, w * 0.5, -24, 8, 10, 1), (w) => windowAt(p, s, w * 0.5, -24, 8, 10, R));
      roofOver(p, s, wing, 34);
      yardWalls(p, s, 0.9, 0.95, 2.75, 2.75, 20, 1.55, 2.15);
      gateway(p, s, 1.55, 2.15, 2.75, 38, team);
      torch(p, 1.5, 2.8, 26, 1.5, 3.0);
      torch(p, 2.2, 2.8, 26, 2.2, 3.0);
      p.flag(0.32, 2.7, 41, 34, team, true);
    },
  };
}

function archeryRange(s: ArchStyle): BuildingArt {
  return {
    size: 3,
    maxHeight: 150,
    paint: (p, team) => {
      const k = kitsOf(s);
      const loggia: Block = [0.25, 0.25, 2.2, 0.85];
      p.footShadow();
      p.ground(0.08, 0.08, 2.92, 2.92, 0x9aa66a);
      block(p, s, loggia, 0, 36, (w, h) => arcade(p.ctx, w, h, { bays: 5, head: head(s), wall: wallOf(s).color, column: k.portal === 'alfiz' ? undefined : s.palette.ashlar, light: 1, alfiz: k.portal === 'alfiz' ? s.palette.trim : undefined }), (w) => windowAt(p, s, w * 0.4, -26, 7, 9, R));
      roofOver(p, s, loggia, 36, 20);
      ridgeBells(p, s, loggia, 36, 20, 36);
      // Butts against a backstop of earth along the far edge.
      p.box(2.45, 0.3, 2.75, 2.6, 0, 14, { color: 0x8a6a48 }, 0x7d9a4a);
      for (const v of [0.7, 1.4, 2.1]) strawButt(p, 2.3, v);
      for (const u of [0.5, 1.0]) pot(p, u, 1.0, 0);
      yardWalls(p, s, 0.12, 0.85, 2.85, 2.85, 16, 0.5, 1.1);
      gateway(p, s, 0.5, 1.1, 2.85, 32, team);
    },
  };
}

function stable(s: ArchStyle): BuildingArt {
  return {
    size: 3,
    maxHeight: 150,
    paint: (p, team) => {
      const k = kitsOf(s);
      const back: Block = [0.25, 0.25, 2.75, 0.85];
      const side: Block = [0.25, 0.85, 0.85, 2.75];
      const stalls = (w: number, h: number, light: number, n: number) => {
        const ctx = p.ctx;
        for (let i = 0; i < n; i++) {
          const x = (w / n) * (i + 0.5) - 8;
          ctx.fillStyle = css(shade(k.walls === 'toledan' ? s.palette.trim : s.palette.ashlar, light));
          ctx.fillRect(x - 2, -h + 6, 20, h - 6);
          ctx.fillStyle = css(shade(s.palette.doors.gate, light));
          ctx.fillRect(x, -h + 10, 16, h - 10);
          ctx.fillStyle = 'rgba(20,14,10,.8)';
          ctx.fillRect(x, -h + 10, 16, 7);
        }
      };
      p.footShadow();
      p.ground(0.08, 0.08, 2.92, 2.92, 0xa79670);
      block(p, s, back, 0, 34, (w, h) => stalls(w, h * 0.8, 1, 5), (w, h) => stalls(w, h * 0.8, R, 1));
      roofOver(p, s, back, 34, 26);
      ridgeBells(p, s, back, 34, 26, 38);
      patioFloor(p, 0.85, 0.85, 2.75, 2.75, 0, { color: 0xb8a37a, pattern: 'pebble' });
      patioShade(p, 0.85, 0.85, 2.75, 2.75, 0, 0.3);
      // Trough (pilón) and hay.
      p.box(1.4, 1.35, 2.2, 1.55, 0, 9, { color: s.palette.stone, detail: 'stone' }, 0x4a7a92);
      for (const u of [2.3, 2.5]) p.box(u, 2.15, u + 0.18, 2.4, 0, 12, { color: 0xd9b55a }, 0xe8c873);
      block(p, s, side, 0, 34, (w, h) => stalls(w, h * 0.8, 1, 1), (w, h) => stalls(w, h * 0.8, R, 4));
      roofOver(p, s, side, 34, 26);
      yardWalls(p, s, 0.85, 0.85, 2.75, 2.75, 18, 1.6, 2.2);
      gateway(p, s, 1.6, 2.2, 2.75, 34, team);
      p.flag(2.75, 0.9, 18, 30, team);
    },
  };
}

/** The courtyard families' military buildings. */
export function hispaniaMilArt(s: ArchStyle): AgeArtSet {
  return { barracks: barracks(s), archery_range: archeryRange(s), stable: stable(s) };
}
