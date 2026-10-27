import { ellipse } from '../canvas';
import type { IsoPainter } from '../isoPainter';
import { shade } from '../palette';
import { archedOpening, boardedGable, crest, R, shutteredWindow, timberFrame } from './facade';
import { medievalWorkArt } from './medievalWork';
import { chimney, palisade, post, torch, wattleFence } from './parts';
import { porchRoofLeft, porchRoofRight } from './roofs';
import type { ArchStyle } from './style';
import { boardedFill, styledGable, styledHip } from './styledRoofs';
import { medievalTower } from './towers';
import type { AgeArtSet } from './types';

/** Half-timbered storey: rendered box with timber framing on both faces (framing only with the halfTimber ornament). */
export function timberStorey(p: IsoPainter, s: ArchStyle, u0: number, v0: number, u1: number, v1: number, z0: number, z1: number, bays: number): void {
  const c = s.palette;
  p.box(u0, v0, u1, v1, z0, z1, { color: c.plaster });
  if (!s.ornaments.halfTimber) return;
  const rails = [(z1 - z0) * 0.5];
  p.leftFace(u0, u1, v1, z0, (w, h) => timberFrame(p.ctx, w, h, { color: c.timber, bays, rails }), z1 - z0);
  p.rightFace(v0, v1, u1, z0, (w, h) => timberFrame(p.ctx, w, h, { color: c.timber, bays: Math.max(2, Math.round(bays * ((v1 - v0) / (u1 - u0)))), rails, light: R }), z1 - z0);
}

/** Wooden gallery (tornác) posts along the +v side. */
function galleryLeft(p: IsoPainter, s: ArchStyle, u0: number, u1: number, v: number, zTop: number, n: number): void {
  for (let i = 0; i <= n; i++) post(p, u0 + ((u1 - u0) * i) / n, v, 0, zTop, 2.4, s.palette.timber);
}

/** Age 2 family (Középkor): fieldstone, timber framing, steep shingle / thatch, round-arched doors, palisades. */
export function medievalArt(s: ArchStyle): AgeArtSet {
  const c = s.palette;
  const tall = (h: number) => h + s.headroom;
  return {
    ...medievalWorkArt(s),
    town_center: {
      size: 3,
      maxHeight: tall(262),
      paint: (p, team) => {
        const ctx = p.ctx;
        p.footShadow();
        p.ground(0.05, 0.05, 2.95, 2.95, 0xa39a84);
        // Romanesque keep with a timber hoarding and a steep shingle spire.
        p.box(0.15, 0.15, 1.1, 1.1, 0, 150, { color: c.stone, detail: 'fieldstone' });
        p.leftFace(0.15, 1.1, 1.1, 0, (w) => {
          p.window(w / 2 - 3.5, -128, 7, 17, true);
          p.window(w / 2 - 3, -92, 6, 13, true);
        }, 150);
        p.rightFace(0.15, 1.1, 1.1, 0, (w) => p.window(w / 2 - 3.5, -128, 7, 17, true), 150);
        p.box(0.07, 0.07, 1.18, 1.18, 150, 172, { color: c.timber, detail: 'planks' }, c.timber);
        p.leftFace(0.07, 1.18, 1.18, 150, (w) => {
          ctx.fillStyle = '#1c130c';
          for (let x = 6; x < w - 6; x += 13) ctx.fillRect(x, -15, 5, 8);
        }, 22);
        p.rightFace(0.07, 1.18, 1.18, 150, (w) => {
          ctx.fillStyle = '#140d08';
          for (let x = 6; x < w - 6; x += 13) ctx.fillRect(x, -15, 5, 8);
        }, 22);
        p.material = 'shingle';
        styledHip(p, s, 0.07, 0.07, 1.18, 1.18, 172, 74, c.roof, 0.07);
        p.flag(0.625, 0.625, 172 + 74 * s.roof.pitch, 14, team, true);
        // Hall: fieldstone ground floor, jettied half-timbered upper floor.
        p.box(0.45, 0.55, 2.6, 2.55, 0, 38, { color: c.stone, detail: 'fieldstone' });
        p.leftFace(0.45, 2.6, 2.55, 0, (w) => {
          archedOpening(ctx, w * 0.5 - 12, 24, 28, c.ashlar);
          p.door(w * 0.5 - 10, 20, 25, 0x5a3518);
          p.window(16, -26, 7, 12, true);
          p.window(w - 26, -26, 7, 12, true);
        }, 38);
        p.rightFace(0.55, 2.55, 2.6, 0, (w) => {
          for (const x of [w * 0.25, w * 0.5, w * 0.75]) p.window(x - 3.5, -26, 7, 12, true);
        }, 38);
        timberStorey(p, s, 0.4, 0.5, 2.65, 2.6, 38, 80, 6);
        p.leftFace(0.4, 2.65, 2.6, 38, (w) => {
          for (const x of [0.1, 0.27, 0.6, 0.77]) shutteredWindow(p, w * x + 4, -30, 10, 13, c.shutter);
          crest(ctx, s, w * 0.435 + 4, -22, 8, team);
        }, 42);
        p.rightFace(0.5, 2.6, 2.65, 38, (w) => {
          for (const x of [0.2, 0.5, 0.8]) shutteredWindow(p, w * x - 5, -30, 10, 13, shade(c.shutter, R), R);
        }, 42);
        p.material = 'shingle';
        styledGable(p, s, 0.4, 0.5, 2.65, 2.6, 80, 70, c.roof, c.plaster, 'u', 0.14, boardedFill(s, (w, rise) => boardedGable(ctx, w, rise, c.board, R)));
        // Gallery (tornác) along the front.
        galleryLeft(p, s, 0.5, 2.55, 2.88, 32, 5);
        porchRoofLeft(p, 0.42, 2.62, 2.6, 0.3, 37, 32, c.roof);
        torch(p, 1.15, 2.88, 26, 1.15, 3.1);
        torch(p, 1.9, 2.88, 26, 1.9, 3.1);
        // Palisade stubs guarding the corners.
        palisade(p, 0.06, 2.94, 0.42, 2.94, 26);
        palisade(p, 2.94, 0.06, 2.94, 0.45, 26);
      },
    },
    house: {
      size: 2,
      maxHeight: tall(132),
      paint: (p) => {
        const ctx = p.ctx;
        p.footShadow();
        p.ground(0.12, 0.12, 1.88, 1.88, 0xa3977c);
        // Gable faces the street (+v), long side carries the porch.
        p.box(0.4, 0.2, 1.32, 1.72, 0, 40, { color: c.plaster, detail: 'plaster' });
        p.leftFace(0.4, 1.32, 1.72, 0, (w) => {
          shutteredWindow(p, w * 0.22, -30, 9, 11, c.shutter);
          shutteredWindow(p, w * 0.66, -30, 9, 11, c.shutter);
        }, 40);
        p.rightFace(0.2, 1.72, 1.32, 0, (w) => {
          p.door(w * 0.42, 15, 26, 0x6b4526);
          p.window(w * 0.14, -29, 9, 10);
          p.window(w * 0.75, -29, 9, 10);
        }, 40);
        if (s.ornaments.chimneys) chimney(p, 0.6, 0.55, 0.8, 0.75, 30, 108, { color: c.plaster, detail: 'plaster' });
        p.material = 'thatch';
        styledGable(p, s, 0.4, 0.2, 1.32, 1.72, 40, 56, c.thatch, c.plaster, 'v', 0.16, boardedFill(s, (w, rise) => boardedGable(ctx, w, rise, c.board)));
        for (let i = 0; i <= 3; i++) post(p, 1.72, 0.32 + i * 0.43, 0, 28, 2.2, c.timber);
        porchRoofRight(p, 0.18, 1.74, 1.48, 0.3, 37, 28, c.thatch);
        wattleFence(p, 0.14, 1.93, 1.0, 1.93, 12);
        // Bench by the door.
        p.box(1.82, 1.0, 1.9, 1.3, 0, 7, { color: 0x6b4526 }, 0x7d5530);
      },
    },
    barracks: {
      size: 3,
      maxHeight: tall(176),
      paint: (p, team) => {
        const ctx = p.ctx;
        p.footShadow();
        p.ground(0.05, 0.05, 2.95, 2.95, 0x9d917a);
        p.box(0.3, 0.3, 2.7, 1.9, 0, 28, { color: c.stone, detail: 'fieldstone' });
        p.rightFace(0.3, 1.9, 2.7, 0, (w) => {
          archedOpening(ctx, w * 0.5 - 15, 30, 26, c.ashlar, 0x22170e, R);
          p.door(w * 0.5 - 13, 26, 23, 0x4a2e18);
        }, 28);
        timberStorey(p, s, 0.26, 0.26, 2.74, 1.94, 28, 64, 7);
        p.leftFace(0.26, 2.74, 1.94, 28, (w) => {
          for (let i = 0; i < 7; i++) {
            const x = (w / 7) * (i + 0.5);
            if (i % 2) crest(ctx, s, x, -18, 7, team);
            else p.window(x - 4, -26, 8, 12, true);
          }
        }, 36);
        p.material = 'shingle';
        styledGable(p, s, 0.26, 0.26, 2.74, 1.94, 64, 64, c.roof, c.plaster, 'u', 0.14, boardedFill(s, (w, rise) => boardedGable(ctx, w, rise, c.board, R)));
        torch(p, 2.7, 1.35, 30, 2.95, 1.35);
        torch(p, 2.7, 0.85, 30, 2.95, 0.85);
        // Timber watchtower at the yard corner.
        p.box(0.18, 2.22, 0.72, 2.76, 0, 12, { color: c.stone, detail: 'fieldstone' }, c.stone);
        for (const [u, v] of [[0.24, 2.7], [0.66, 2.7], [0.66, 2.28]] as const) post(p, u, v, 12, 74, 2.6, c.timber);
        p.box(0.12, 2.16, 0.78, 2.82, 74, 92, { color: c.board, detail: 'planks' }, c.board);
        p.material = 'shingle';
        styledHip(p, s, 0.12, 2.16, 0.78, 2.82, 92, 34, c.roof, 0.06);
        p.flag(0.45, 2.49, 92 + 34 * s.roof.pitch, 16, team, true);
        // Training yard: dummies + palisade with a gate gap.
        for (const u of [1.3, 1.9, 2.5]) {
          const [x, y] = p.p(u, 2.4, 0);
          ctx.fillStyle = '#5a3b20';
          ctx.fillRect(x - 1.5, y - 26, 3, 26);
          ctx.fillRect(x - 9, y - 20, 18, 3);
          ellipse(ctx, x, y - 29, 4.5, 4.5);
          ctx.fillStyle = '#c9a66a';
          ctx.fill();
        }
        palisade(p, 0.85, 2.94, 1.55, 2.94, 24);
        palisade(p, 2.15, 2.94, 2.94, 2.94, 24);
        palisade(p, 2.94, 2.1, 2.94, 2.86, 24);
      },
    },
    stable: {
      size: 3,
      maxHeight: tall(150),
      paint: (p, team) => {
        const ctx = p.ctx;
        p.footShadow();
        p.ground(0.05, 0.05, 2.95, 2.95, 0x9f9068);
        p.box(0.3, 0.3, 2.7, 2.0, 0, 34, { color: c.stone, detail: 'fieldstone' });
        p.leftFace(0.3, 2.7, 2.0, 0, (w) => {
          for (let i = 0; i < 4; i++) {
            const x = 14 + i * ((w - 28) / 4);
            archedOpening(ctx, x, 22, 28, c.ashlar);
            ctx.fillStyle = '#4a2e18';
            ctx.fillRect(x, -14, 22, 14);
            ctx.fillStyle = 'rgba(20,12,6,.6)';
            ctx.fillRect(x, -14, 22, 1.4);
          }
        }, 34);
        timberStorey(p, s, 0.27, 0.27, 2.73, 2.03, 34, 62, 8);
        p.leftFace(0.27, 2.73, 2.03, 34, (w) => {
          // Hay-loft hatch.
          ctx.fillStyle = '#3a2614';
          ctx.fillRect(w * 0.5 - 9, -24, 18, 18);
          ctx.fillStyle = 'rgba(230,190,90,.8)';
          ctx.fillRect(w * 0.5 - 7, -10, 14, 4);
        }, 28);
        p.material = 'shingle';
        styledGable(p, s, 0.27, 0.27, 2.73, 2.03, 62, 60, c.roof, c.plaster, 'u', 0.14, boardedFill(s, (w, rise) => boardedGable(ctx, w, rise, c.board, R)));
        // Paddock fence.
        for (const [a, b] of [[[0.2, 2.86], [2.86, 2.86]], [[2.86, 2.86], [2.86, 2.2]]] as const) {
          const n = 7;
          for (let i = 0; i <= n; i++) {
            const [x, y] = p.p(a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n, 0);
            ctx.fillStyle = '#5a3b20';
            ctx.fillRect(x - 1.3, y - 16, 2.6, 16);
          }
          for (const z of [7, 14]) {
            const pa = p.p(a[0], a[1], z);
            const pb = p.p(b[0], b[1], z);
            ctx.strokeStyle = '#8a6238';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(pa[0], pa[1]);
            ctx.lineTo(pb[0], pb[1]);
            ctx.stroke();
          }
        }
        for (const u of [0.6, 0.98]) p.box(u, 2.3, u + 0.32, 2.62, 0, 13, { color: 0xd2ad55 }, 0xe2c26c);
        p.flag(2.86, 2.86, 0, 40, team);
      },
    },
    tower: medievalTower(s),
  };
}
