import type { IsoPainter } from '../isoPainter';
import { archedOpening, baroqueWindow, clockFace, cornice } from './facade';
import { BAROQUE_WORK_ART } from './baroqueWork';
import { baroqueBlock, OCHRE, pediment, railFence, sentryBox, SLATE, TILE_RED, VERDIGRIS, volutedGable, WHITE_TRIM } from './baroqueParts';
import { chimney, lantern } from './parts';
import { dormerLeft, dormerRight, finial, helm, mansardRoof, type HelmProfile } from './roofs';
import type { AgeArtSet } from './types';

/** Town-hall tower helm: bell, neck, open lantern, onion, spike (tiles / art px). */
const TOWER_HELM: HelmProfile = [
  [0, 0.31], [8, 0.32], [18, 0.27], [26, 0.17], [30, 0.1], [33, 0.1], [34, 0.13], [48, 0.13],
  [50, 0.09], [54, 0.11], [60, 0.145], [66, 0.12], [72, 0.06], [80, 0.02],
];
const CUPOLA_HELM: HelmProfile = [[0, 0.15], [7, 0.15], [13, 0.09], [16, 0.05], [20, 0.06], [25, 0.03], [29, 0.01]];

/** Two rows of openings per bay: arched ground-floor windows, tall baroque windows above. */
function storeyWindows(p: IsoPainter, w: number, h: number, light: number, bays: number, skip: (i: number) => boolean = () => false): void {
  cornice(p.ctx, w, 34, WHITE_TRIM, light, 4);
  for (let i = 0; i < bays; i++) {
    if (skip(i)) continue;
    const x = (w / bays) * (i + 0.5);
    p.window(x - 5, -29, 10, 17, true);
    baroqueWindow(p, x - 6, -h + 16, 12, 22, light);
  }
}

/** Age 3 (Felvilágosodás): Hungarian baroque — ochre plaster, white pilasters, mansards, onion helms. */
export const BAROQUE_ART: AgeArtSet = {
  ...BAROQUE_WORK_ART,
  town_center: {
    size: 3,
    maxHeight: 316,
    paint: (p, team) => {
      const ctx = p.ctx;
      p.footShadow();
      p.ground(0.05, 0.05, 2.95, 2.95, 0xbdb39c);
      ctx.strokeStyle = 'rgba(90,80,64,.25)';
      ctx.lineWidth = 1;
      for (let t = 0.25; t < 2.95; t += 0.22) {
        for (const [a, b] of [[p.p(t, 0.05, 0), p.p(t, 2.95, 0)], [p.p(0.05, t, 0), p.p(2.95, t, 0)]] as const) {
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
          ctx.stroke();
        }
      }
      chimney(p, 0.6, 0.7, 0.78, 0.88, 70, 136, { color: OCHRE });
      baroqueBlock(p, 0.3, 0.45, 2.7, 2.45, 0, 84, {
        bays: 5,
        left: (w, h, l) => storeyWindows(p, w, h, l, 5, (i) => i === 2),
        right: (w, h, l) => storeyWindows(p, w, h, l, 4),
      });
      mansardRoof(p, 0.3, 0.45, 2.7, 2.45, 84, 34, 0.24, 14, SLATE);
      for (const uc of [0.72, 2.28]) dormerLeft(p, uc, 2.38, 94, 0.2, 16, WHITE_TRIM, SLATE, 'slate');
      for (const vc of [0.95, 1.45, 1.95]) dormerRight(p, 2.63, vc, 94, 0.2, 16, WHITE_TRIM, SLATE, 'slate');
      // Facade tower with the main portal, clock stage and helm.
      baroqueBlock(p, 1.12, 2.2, 1.88, 2.96, 0, 150, {
        left: (w, _h, l) => {
          archedOpening(ctx, w / 2 - 14, 28, 40, WHITE_TRIM, 0x2a1c12, l);
          p.door(w / 2 - 11, 22, 35, 0x5a3518);
          cornice(ctx, w, 50, WHITE_TRIM, l, 4);
          baroqueWindow(p, w / 2 - 7, -100, 14, 26, l);
        },
        right: (w, _h, l) => baroqueWindow(p, w / 2 - 6, -100, 12, 24, l),
      });
      baroqueBlock(p, 1.2, 2.28, 1.8, 2.88, 150, 202, {
        plinth: 0,
        left: (w) => {
          clockFace(ctx, w / 2, -26, 10);
        },
        right: (w) => {
          ctx.fillStyle = '#2a1c12';
          ctx.beginPath();
          ctx.moveTo(w / 2 - 6, -8);
          ctx.lineTo(w / 2 - 6, -30);
          ctx.arc(w / 2, -30, 6, Math.PI, 0);
          ctx.lineTo(w / 2 + 6, -8);
          ctx.fill();
        },
      });
      helm(p, 1.5, 2.58, 202, TOWER_HELM, VERDIGRIS);
      // Openings of the helm's lantern.
      const [hx, hy] = p.p(1.5, 2.58, 202 + 41);
      ctx.fillStyle = '#16120e';
      for (const dx of [-6, 1.5]) ctx.fillRect(hx + dx, hy - 5, 4, 9);
      finial(p, 1.5, 2.58, 282, 22);
      p.flag(2.62, 2.78, 0, 74, team, true);
      lantern(p, 1.16, 2.96, 30, 1.16, 3.14);
      lantern(p, 1.84, 2.96, 30, 1.84, 3.14);
    },
  },
  house: {
    size: 2,
    maxHeight: 140,
    paint: (p) => {
      p.footShadow();
      p.ground(0.12, 0.12, 1.88, 1.88, 0xb3a991);
      chimney(p, 0.55, 0.5, 0.75, 0.7, 30, 112, { color: OCHRE, detail: 'plaster' });
      baroqueBlock(p, 0.32, 0.3, 1.68, 1.62, 0, 50, {
        left: (w, h, l) => {
          baroqueWindow(p, w * 0.18, -h + 12, 11, 21, l);
          baroqueWindow(p, w * 0.66, -h + 12, 11, 21, l);
        },
        right: (w, h, l) => {
          archedOpening(p.ctx, w * 0.5 - 9, 18, 28, WHITE_TRIM, 0x2a1c12, l);
          p.door(w * 0.5 - 7, 14, 25, 0x3f5a3a);
          baroqueWindow(p, w * 0.13, -h + 12, 10, 20, l);
          baroqueWindow(p, w * 0.78, -h + 12, 10, 20, l);
        },
      });
      p.material = 'tile';
      p.hipRoof(0.32, 0.3, 1.68, 1.62, 50, 44, TILE_RED, 0.1);
      volutedGable(p, 0.44, 1.56, 1.62, 50, 42);
      lantern(p, 1.68, 0.7, 34, 1.86, 0.7);
      railFence(p, 0.14, 1.92, 0.9, 1.92, 11);
    },
  },
  barracks: {
    size: 3,
    maxHeight: 190,
    paint: (p, team) => {
      p.footShadow();
      p.ground(0.05, 0.05, 2.95, 2.95, 0xb0a68e);
      baroqueBlock(p, 0.3, 0.3, 2.7, 1.85, 0, 80, {
        bays: 8,
        left: (w, h, l) => storeyWindows(p, w, h, l, 8),
        right: (w, h, l) => {
          cornice(p.ctx, w, 34, WHITE_TRIM, l, 4);
          archedOpening(p.ctx, w / 2 - 15, 30, 36, WHITE_TRIM, 0x22170e, l);
          p.door(w / 2 - 12, 24, 32, 0x4a2e18);
          for (const x of [w * 0.17, w * 0.83]) baroqueWindow(p, x - 6, -h + 16, 12, 22, l);
        },
      });
      mansardRoof(p, 0.3, 0.3, 2.7, 1.85, 80, 30, 0.22, 12, SLATE);
      for (const uc of [0.62, 1.0, 2.0, 2.38]) dormerLeft(p, uc, 1.79, 90, 0.18, 14, WHITE_TRIM, SLATE, 'slate');
      pediment(p, 1.15, 1.85, 1.85, 80, 36, team);
      lantern(p, 2.7, 0.75, 40, 2.9, 0.75);
      lantern(p, 2.7, 1.4, 40, 2.9, 1.4);
      sentryBox(p, 2.76, 1.5);
      p.flag(1.0, 2.45, 0, 62, team, true);
      railFence(p, 0.12, 2.92, 2.92, 2.92, 12);
      railFence(p, 2.92, 2.1, 2.92, 2.92, 12);
    },
  },
  stable: {
    size: 3,
    maxHeight: 160,
    paint: (p, team) => {
      p.footShadow();
      p.ground(0.05, 0.05, 2.95, 2.95, 0xa89a70);
      baroqueBlock(p, 0.3, 0.3, 2.7, 2.0, 0, 56, {
        bays: 6,
        left: (w, h, _l) => {
          for (let i = 0; i < 6; i++) p.window((w / 6) * (i + 0.5) - 7, -h + 14, 14, 14, true);
        },
        right: (w, h, l) => {
          archedOpening(p.ctx, w / 2 - 16, 32, 38, WHITE_TRIM, 0x22170e, l);
          p.door(w / 2 - 13, 26, 34, 0x6b4526);
          p.window(w * 0.15, -h + 14, 12, 12, true);
          p.window(w * 0.78, -h + 14, 12, 12, true);
        },
      });
      p.material = 'tile';
      mansardRoof(p, 0.3, 0.3, 2.7, 2.0, 56, 26, 0.2, 16, TILE_RED);
      // Ventilation cupola on the ridge.
      p.box(1.42, 1.07, 1.64, 1.29, 90, 108, { color: WHITE_TRIM }, WHITE_TRIM);
      p.leftFace(1.42, 1.64, 1.29, 90, (w) => p.window(w / 2 - 3, -15, 6, 10, true), 18);
      helm(p, 1.53, 1.18, 108, CUPOLA_HELM, VERDIGRIS);
      finial(p, 1.53, 1.18, 137, 12, false);
      lantern(p, 2.7, 0.9, 40, 2.9, 0.9);
      railFence(p, 0.15, 2.86, 2.86, 2.86, 15);
      railFence(p, 2.86, 2.25, 2.86, 2.86, 15);
      for (const u of [0.6, 0.98]) p.box(u, 2.3, u + 0.32, 2.62, 0, 13, { color: 0xd2ad55 }, 0xe2c26c);
      p.flag(0.25, 2.8, 0, 40, team);
    },
  },
};
