import { ellipse } from '../canvas';
import { css, shade } from '../palette';
import { R } from './facade';
import { framedGable, styleFraming } from './kits/halfTimber';
import { column, forgeLight, goldPile, logPile, target, torch } from './parts';
import { roofOf, type ArchStyle } from './style';
import { roofChimney, styledGable, styledHip } from './styledRoofs';
import { romanTower } from './towers';
import type { IsoPainter } from '../isoPainter';
import type { AgeArtSet } from './types';

/** Height of the framed upper storey a style with kits.framedUpper adds to the house (art px). */
const FRAMED_STOREY = 22;

/**
 * House of a style with a framed upper storey: a dressed-stone ground
 * storey with the door, a timber-framed whitewashed storey above, the
 * chimney and the gable roof raised with it.
 */
function framedHouse(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ground = 26;
  const eave = 40 + FRAMED_STOREY;
  p.footShadow();
  p.ground(0.15, 0.15, 1.85, 1.85, 0xa99f88);
  p.box(0.3, 0.35, 1.7, 1.65, 0, ground, { color: c.stone, detail: 'stone' });
  p.leftFace(0.3, 1.7, 1.65, 0, () => {
    p.door(56, 15, 23, shade(team, 0.75));
    p.window(18, -20, 10, 11, true);
  }, ground);
  p.rightFace(0.35, 1.65, 1.7, 0, () => p.window(34, -20, 10, 11, true), ground);
  p.box(0.3, 0.35, 1.7, 1.65, ground, eave, { color: c.plaster, detail: 'plaster' });
  p.leftFace(0.3, 1.7, 1.65, ground, (w, h) => {
    styleFraming(p.ctx, s, w, h, 'close');
    for (const x of [0.2, 0.62]) p.window(w * x, -h + 9, 11, 13);
  }, eave - ground);
  p.rightFace(0.35, 1.65, 1.7, ground, (w, h) => {
    styleFraming(p.ctx, s, w, h, 'close', R);
    p.window(w / 2 - 6, -h + 9, 12, 13);
  }, eave - ground);
  roofChimney(p, s, 0.55, 0.55, 0.8, 0.8, eave - 10, eave + 52, 38, { color: c.stone, detail: 'stone' });
  styledGable(p, s, 0.3, 0.35, 1.7, 1.65, eave, 42, roofOf(s, 'house'), c.plaster, 'v', 0.12, framedGable(p.ctx, s));
}

/** Age 1 family (Római kor): plastered villas, hip and gable roofs, timber, columns, round arches. */
export function romanArt(s: ArchStyle): AgeArtSet {
  const c = s.palette;
  const tall = (h: number) => h + s.headroom;
  const framed = s.kits?.framedUpper === true;
  /** Framed gable fill for a gable on the right ('u' ridge) or left ('v' ridge) face, with framedUpper. */
  const gableFrame = (p: IsoPainter, axis: 'u' | 'v') => (framed ? framedGable(p.ctx, s, axis === 'u' ? R : 1) : undefined);
  return {
    town_center: {
      size: 3,
      maxHeight: tall(236),
      paint: (p, team) => {
        p.footShadow();
        p.ground(0.05, 0.05, 2.95, 2.95, 0xb9ae97);
        // Back tower first (painter's order).
        p.box(0.2, 0.2, 1.05, 1.05, 0, 136, { color: c.stone, detail: 'stone' });
        p.leftFace(0.2, 1.05, 1.05, 0, () => p.window(20, -124, 8, 14, true), 136);
        styledHip(p, s, 0.2, 0.2, 1.05, 1.05, 136, 40, c.roof);
        p.flag(0.625, 0.625, 136 + 40 * s.roof.pitch, 28, team, true);
        p.box(0.3, 0.3, 2.7, 2.7, 0, 12, { color: c.stone, detail: 'stone' }, c.stone);
        p.box(0.45, 0.45, 2.55, 2.55, 12, 76, { color: c.plaster, detail: 'plaster' });
        p.leftFace(0.45, 2.55, 2.55, 12, () => {
          p.door(58, 20, 32, c.doors.main);
          p.window(16, -50, 11, 16, true);
          p.window(104, -50, 11, 16, true);
        }, 64);
        p.rightFace(0.45, 2.55, 2.55, 12, () => {
          p.window(22, -50, 11, 16, true);
          p.window(62, -50, 11, 16, true);
          p.window(102, -50, 11, 16, true);
        }, 64);
        styledHip(p, s, 0.45, 0.45, 2.55, 2.55, 76, 44, c.roof, 0.14);
        // Portico columns along the front-left face.
        for (const u of [0.75, 1.25, 1.75, 2.25]) column(p, u, 2.8, 12, 58, 3.4);
        p.box(0.55, 2.66, 2.45, 2.94, 58, 66, { color: 0xd8ccb0 }, 0xe6dcc4);
        // Entrance steps.
        p.box(1.2, 2.94, 1.8, 3.0, 0, 6, { color: c.ashlar }, 0xd8ccb0);
        torch(p, 1.05, 2.95, 40, 1.05, 3.15);
        torch(p, 1.95, 2.95, 40, 1.95, 3.15);
      },
    },
    house: {
      size: 2,
      maxHeight: tall(110) + (framed ? FRAMED_STOREY : 0),
      paint: (p, team) => {
        if (framed) {
          framedHouse(p, s, team);
          return;
        }
        p.footShadow();
        p.ground(0.15, 0.15, 1.85, 1.85, 0xa99f88);
        p.box(0.3, 0.35, 1.7, 1.65, 0, 40, { color: c.plaster, detail: 'plaster' });
        p.leftFace(0.3, 1.7, 1.65, 0, () => {
          p.ctx.fillStyle = css(c.timber);
          p.ctx.fillRect(0, -40, 89.6, 3);
          p.ctx.fillRect(0, -22, 89.6, 2.5);
          p.door(56, 15, 25, shade(team, 0.75));
          p.window(16, -33, 11, 11);
        }, 40);
        p.rightFace(0.35, 1.65, 1.7, 0, () => {
          p.ctx.fillStyle = css(shade(c.timber, 0.8));
          p.ctx.fillRect(0, -40, 83.2, 3);
          p.window(32, -31, 12, 12);
        }, 40);
        // Chimney sits on the back slope, so paint it before the roof.
        roofChimney(p, s, 0.55, 0.55, 0.8, 0.8, 30, 92, 38, { color: c.stone, detail: 'stone' });
        styledGable(p, s, 0.3, 0.35, 1.7, 1.65, 40, 38, roofOf(s, 'house'), c.plaster, 'u');
      },
    },
    farm: {
      size: 2,
      maxHeight: tall(40),
      paint: (p, team) => {
        const ctx = p.ctx;
        p.ground(0.05, 0.05, 1.95, 1.95, 0x6e4a2a);
        // Furrows + sprouting crops.
        for (let i = 0; i < 9; i++) {
          const v = 0.15 + i * 0.2;
          const a = p.p(0.12, v, 0);
          const b = p.p(1.88, v, 0);
          ctx.strokeStyle = 'rgba(40,24,10,.55)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
          ctx.stroke();
          for (let k = 0; k < 11; k++) {
            const [x, y] = p.p(0.2 + k * 0.16, v + 0.08, 0);
            ctx.strokeStyle = k % 2 ? '#c7b24a' : '#9dbb45';
            ctx.lineWidth = 1.4;
            for (let s = -1; s <= 1; s++) {
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(x + s * 2.5, y - 7 - p.random() * 3);
              ctx.stroke();
            }
          }
        }
        // Fence posts along the visible front edges.
        for (let t = 0.05; t <= 1.96; t += 0.3) {
          for (const [u, v] of [[t, 1.95], [1.95, t]] as const) {
            const [x, y] = p.p(u, v, 0);
            ctx.fillStyle = '#6b4526';
            ctx.fillRect(x - 1.2, y - 10, 2.4, 10);
          }
        }
        p.flag(1.95, 1.95, 0, 22, team);
      },
    },
    lumber_camp: {
      size: 2,
      maxHeight: tall(100),
      paint: (p, team) => {
        p.footShadow();
        p.ground(0.1, 0.1, 1.9, 1.9, 0x8a7a5a);
        p.box(0.25, 0.25, 1.15, 1.6, 0, 38, { color: c.darkWood, detail: 'logs' });
        styledGable(p, s, 0.25, 0.25, 1.15, 1.6, 38, 32, roofOf(s, 'lumber_camp'), framed ? c.plaster : c.darkWood, 'v', 0.12, gableFrame(p, 'v'));
        logPile(p, 1.25, 1.75, 9);
        p.flag(1.8, 0.4, 0, 30, team);
        // Chopping stump with axe.
        const [x, y] = p.p(1.6, 1.1, 0);
        ellipse(p.ctx, x, y - 6, 7, 3.5);
        p.ctx.fillStyle = '#d9b07a';
        p.ctx.fill();
        p.ctx.fillStyle = '#7a4e2a';
        p.ctx.fillRect(x - 7, y - 6, 14, 6);
      },
    },
    mining_camp: {
      size: 2,
      maxHeight: tall(100),
      paint: (p, team) => {
        p.footShadow();
        p.ground(0.1, 0.1, 1.9, 1.9, 0x8b8070);
        p.box(0.25, 0.25, 1.4, 1.2, 0, 36, { color: c.stone, detail: 'stone' });
        styledGable(p, s, 0.25, 0.25, 1.4, 1.2, 36, 30, roofOf(s, 'mining_camp'), framed ? c.plaster : c.stone, 'u', 0.12, gableFrame(p, 'u'));
        // Mine cart.
        p.box(0.9, 1.35, 1.5, 1.75, 6, 22, { color: 0x6b4a2a, detail: 'planks' });
        goldPile(p, 1.25, 1.55);
        const ctx = p.ctx;
        for (const u of [1.0, 1.4]) {
          const [x, y] = p.p(u, 1.75, 6);
          ellipse(ctx, x, y, 4.5, 5);
          ctx.fillStyle = '#2a1c10';
          ctx.fill();
        }
        p.flag(1.85, 0.35, 0, 30, team);
      },
    },
    barracks: {
      size: 3,
      maxHeight: tall(140),
      paint: (p, team) => {
        p.footShadow();
        p.ground(0.05, 0.05, 2.95, 2.95, 0xa89c84);
        p.box(0.3, 0.3, 2.7, 1.9, 0, 18, { color: c.stone, detail: 'stone' });
        p.box(0.3, 0.3, 2.7, 1.9, 18, 54, { color: c.plaster, detail: 'plaster' });
        p.leftFace(0.3, 2.7, 1.9, 18, (w, h) => {
          if (framed) styleFraming(p.ctx, s, w, h, 'square');
          for (let i = 0; i < 5; i++) p.window(14 + i * 30, -28, 9, 13, true);
        }, 36);
        if (framed) p.rightFace(0.3, 1.9, 2.7, 18, (w, h) => styleFraming(p.ctx, s, w, h, 'square', R), 36);
        p.rightFace(0.3, 1.9, 2.7, 0, () => {
          p.door(30, 24, 34, c.doors.gate);
          // Team banners either side of the gate.
          for (const bx of [12, 66]) {
            p.ctx.fillStyle = css(team);
            p.ctx.fillRect(bx, -50, 10, 22);
            p.ctx.fillStyle = '#e8c35a';
            p.ctx.fillRect(bx, -50, 10, 2.5);
          }
        }, 54);
        styledGable(p, s, 0.3, 0.3, 2.7, 1.9, 54, 40, roofOf(s, 'barracks'), c.plaster, 'u', 0.12, gableFrame(p, 'u'));
        torch(p, 2.7, 1.45, 42, 2.95, 1.45);
        torch(p, 2.7, 0.78, 42, 2.95, 0.78);
        // Training yard: dummies + weapon rack.
        const ctx = p.ctx;
        for (const u of [0.8, 1.6, 2.4]) {
          const [x, y] = p.p(u, 2.5, 0);
          ctx.fillStyle = '#6b4526';
          ctx.fillRect(x - 1.5, y - 26, 3, 26);
          ctx.fillRect(x - 9, y - 20, 18, 3);
          ellipse(ctx, x, y - 29, 4.5, 4.5);
          ctx.fillStyle = '#d6b57a';
          ctx.fill();
        }
        p.flag(2.8, 2.8, 0, 40, team, true);
      },
    },
    archery_range: {
      size: 3,
      maxHeight: tall(120),
      paint: (p, team) => {
        p.footShadow();
        p.ground(0.05, 0.05, 2.95, 2.95, 0x93a46a);
        p.box(0.25, 0.25, 1.5, 1.2, 0, 40, { color: c.timber, detail: 'planks' });
        styledGable(p, s, 0.25, 0.25, 1.5, 1.2, 40, 30, roofOf(s, 'archery_range'), framed ? c.plaster : c.timber, 'u', 0.12, gableFrame(p, 'u'));
        for (const [u, v] of [[2.5, 0.6], [2.5, 1.4], [2.5, 2.2]] as const) target(p, u, v);
        p.flag(0.4, 2.6, 0, 36, team, true);
      },
    },
    stable: {
      size: 3,
      maxHeight: tall(130),
      paint: (p, team) => {
        p.footShadow();
        p.ground(0.05, 0.05, 2.95, 2.95, 0xa3946a);
        p.box(0.3, 0.3, 2.7, 2.0, 0, 46, { color: c.board, detail: 'planks' });
        p.leftFace(0.3, 2.7, 2.0, 0, () => {
          for (let i = 0; i < 4; i++) p.door(10 + i * 38, 18, 26, c.doors.gate);
        }, 46);
        styledGable(p, s, 0.3, 0.3, 2.7, 2.0, 46, 42, roofOf(s, 'stable'), framed ? c.plaster : c.board, 'u', 0.12, gableFrame(p, 'u'));
        // Hay bales.
        for (const u of [0.6, 1.0]) p.box(u, 2.25, u + 0.35, 2.6, 0, 14, { color: 0xd9b55a }, 0xe8c873);
        p.flag(2.8, 2.8, 0, 36, team);
      },
    },
    blacksmith: {
      size: 2,
      maxHeight: tall(120),
      paint: (p, team) => {
        p.footShadow();
        p.ground(0.1, 0.1, 1.9, 1.9, 0x7f776a);
        roofChimney(p, s, 1.1, 0.3, 1.45, 0.65, 0, 96, 30, { color: c.stone, detail: 'stone' }, 'forge');
        p.box(0.3, 0.3, 1.7, 1.5, 0, 38, { color: c.brick, detail: 'brick' });
        p.leftFace(0.3, 1.7, 1.5, 0, () => {
          const ctx = p.ctx;
          const g = ctx.createRadialGradient(46, -14, 1, 46, -14, 20);
          g.addColorStop(0, '#ffcf6a');
          g.addColorStop(1, 'rgba(255,120,40,0)');
          ctx.fillStyle = '#1e1410';
          ctx.fillRect(34, -26, 24, 26);
          ctx.fillStyle = g;
          ctx.fillRect(26, -34, 40, 34);
        }, 38);
        if (framed) styledGable(p, s, 0.3, 0.3, 1.7, 1.5, 38, 30, roofOf(s, 'blacksmith'), c.plaster, 'u', 0.12, gableFrame(p, 'u'));
        else styledHip(p, s, 0.3, 0.3, 1.7, 1.5, 38, 30, roofOf(s, 'blacksmith'));
        forgeLight(p, 1.08, 1.55);
        const [x, y] = p.p(1.3, 1.75, 0);
        p.ctx.fillStyle = '#3a3a40';
        p.ctx.fillRect(x - 8, y - 9, 16, 4);
        p.ctx.fillRect(x - 3, y - 6, 6, 6);
        p.flag(1.85, 1.85, 0, 26, team);
      },
    },
    tower: romanTower(s),
  };
}
