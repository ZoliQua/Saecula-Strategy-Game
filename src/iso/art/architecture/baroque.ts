import type { IsoPainter } from '../isoPainter';
import { css } from '../palette';
import { archedOpening, baroqueWindow, clockFace, cornice } from './facade';
import { baroqueWorkArt } from './baroqueWork';
import { baroqueBlock, pediment, railFence, sentryBox, volutedGable } from './baroqueParts';
import { foundryArt } from './foundry';
import { hasOnionDomes, onionDome } from './kits/onionDome';
import { openLantern } from './kits/tentRoof';
import { lantern } from './parts';
import { dormerLeft, dormerRight, finial, helm, type HelmProfile } from './roofs';
import type { ArchStyle } from './style';
import { hasDormers, onRoof, roofChimney, roofLift, styledHip, styledMansard } from './styledRoofs';
import { baroqueTower } from './towers';
import type { AgeArtSet } from './types';
import { wonderArt } from './wonder';

/** Town-hall tower helm: bell, neck, open lantern, onion, spike (tiles / art px). */
const TOWER_HELM: HelmProfile = [
  [0, 0.31], [8, 0.32], [18, 0.27], [26, 0.17], [30, 0.1], [33, 0.1], [34, 0.13], [48, 0.13],
  [50, 0.09], [54, 0.11], [60, 0.145], [66, 0.12], [72, 0.06], [80, 0.02],
];
const CUPOLA_HELM: HelmProfile = [[0, 0.15], [7, 0.15], [13, 0.09], [16, 0.05], [20, 0.06], [25, 0.03], [29, 0.01]];

/** Two rows of openings per bay: arched ground-floor windows, tall baroque windows above. */
function storeyWindows(p: IsoPainter, s: ArchStyle, w: number, h: number, light: number, bays: number, skip: (i: number) => boolean = () => false): void {
  cornice(p.ctx, w, 34, s.palette.trim, light, 4);
  for (let i = 0; i < bays; i++) {
    if (skip(i)) continue;
    const x = (w / bays) * (i + 0.5);
    p.window(x - 5, -29, 10, 17, true);
    baroqueWindow(p, s, x - 6, -h + 16, 12, 22, light);
  }
}

/** Age 3 family (Felvilágosodás): baroque — rendered blocks, pilasters, mansards, onion helms. */
export function baroqueArt(s: ArchStyle): AgeArtSet {
  const c = s.palette;
  const tall = (h: number) => h + s.headroom;
  return {
    ...baroqueWorkArt(s),
    town_center: {
      size: 3,
      maxHeight: tall(316),
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
        roofChimney(p, s, 0.6, 0.7, 0.78, 0.88, 70, 136, 34 + 14, { color: c.plaster });
        baroqueBlock(p, s, 0.3, 0.45, 2.7, 2.45, 0, 84, {
          bays: 5,
          left: (w, h, l) => storeyWindows(p, s, w, h, l, 5, (i) => i === 2),
          right: (w, h, l) => storeyWindows(p, s, w, h, l, 4),
        });
        styledMansard(p, s, 0.3, 0.45, 2.7, 2.45, 84, 34, 0.24, 14, c.roofAlt);
        if (hasDormers(s)) {
          for (const uc of [0.72, 2.28]) dormerLeft(p, uc, 2.38, onRoof(s, 84, 94), 0.2, 16, c.trim, c.roofAlt, 'slate');
          for (const vc of [0.95, 1.45, 1.95]) dormerRight(p, 2.63, vc, onRoof(s, 84, 94), 0.2, 16, c.trim, c.roofAlt, 'slate');
        }
        // Facade tower with the main portal, clock stage and helm.
        baroqueBlock(p, s, 1.12, 2.2, 1.88, 2.96, 0, 150, {
          left: (w, _h, l) => {
            archedOpening(ctx, w / 2 - 14, 28, 40, c.trim, 0x2a1c12, l);
            p.door(w / 2 - 11, 22, 35, c.doors.main);
            cornice(ctx, w, 50, c.trim, l, 4);
            baroqueWindow(p, s, w / 2 - 7, -100, 14, 26, l);
          },
          right: (w, _h, l) => baroqueWindow(p, s, w / 2 - 6, -100, 12, 24, l),
        });
        baroqueBlock(p, s, 1.2, 2.28, 1.8, 2.88, 150, 202, {
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
        helm(p, 1.5, 2.58, 202, TOWER_HELM, c.metal);
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
      maxHeight: tall(140),
      paint: (p, team) => {
        p.footShadow();
        p.ground(0.12, 0.12, 1.88, 1.88, 0xb3a991);
        roofChimney(p, s, 0.55, 0.5, 0.75, 0.7, 30, 112, 44, { color: c.plaster, detail: 'plaster' });
        baroqueBlock(p, s, 0.32, 0.3, 1.68, 1.62, 0, 50, {
          left: (w, h, l) => {
            baroqueWindow(p, s, w * 0.18, -h + 12, 11, 21, l);
            baroqueWindow(p, s, w * 0.66, -h + 12, 11, 21, l);
          },
          right: (w, h, l) => {
            archedOpening(p.ctx, w * 0.5 - 9, 18, 28, c.trim, 0x2a1c12, l);
            p.door(w * 0.5 - 7, 14, 25, c.shutter);
            baroqueWindow(p, s, w * 0.13, -h + 12, 10, 20, l);
            baroqueWindow(p, s, w * 0.78, -h + 12, 10, 20, l);
          },
        });
        p.material = 'tile';
        styledHip(p, s, 0.32, 0.3, 1.68, 1.62, 50, 44, c.roof, 0.1);
        // Onion styles crown the hip with a gilt onion on a drum (smaller than the barracks') and fly the pennant from the yard.
        if (hasOnionDomes(s)) {
          onionDome(p, 1.0, 0.96, 0.12, 50 + 44 * s.roof.pitch - 6, { color: c.metal, drum: { h: 24, color: c.plaster }, kokoshnik: c.trim });
          p.flag(0.2, 1.86, 0, 30, team);
        }
        // Without the street gable the house flies a pennant from its roof instead.
        else if (s.ornaments.streetGables === false) p.flag(1.0, 0.96, 50 + 44 * s.roof.pitch, 18, team);
        else volutedGable(p, s, 0.44, 1.56, 1.62, 50, 42);
        lantern(p, 1.68, 0.7, 34, 1.86, 0.7);
        railFence(p, 0.14, 1.92, 0.9, 1.92, 11);
      },
    },
    barracks: {
      size: 3,
      maxHeight: tall(190),
      paint: (p, team) => {
        p.footShadow();
        p.ground(0.05, 0.05, 2.95, 2.95, 0xb0a68e);
        baroqueBlock(p, s, 0.3, 0.3, 2.7, 1.85, 0, 80, {
          bays: 8,
          left: (w, h, l) => storeyWindows(p, s, w, h, l, 8),
          right: (w, h, l) => {
            cornice(p.ctx, w, 34, c.trim, l, 4);
            archedOpening(p.ctx, w / 2 - 15, 30, 36, c.trim, 0x22170e, l);
            p.door(w / 2 - 12, 24, 32, c.doors.gate);
            for (const x of [w * 0.17, w * 0.83]) baroqueWindow(p, s, x - 6, -h + 16, 12, 22, l);
          },
        });
        styledMansard(p, s, 0.3, 0.3, 2.7, 1.85, 80, 30, 0.22, 12, c.roofAlt);
        if (hasDormers(s)) for (const uc of [0.62, 1.0, 2.0, 2.38]) dormerLeft(p, uc, 1.79, onRoof(s, 80, 90), 0.18, 14, c.trim, c.roofAlt, 'slate');
        // Onion styles raise a gate church's drum and gilt onion over the roof.
        if (hasOnionDomes(s)) onionDome(p, 1.5, 1.08, 0.18, 80 + 42 * s.roof.pitch - 10, { color: c.metal, drum: { h: 30, color: c.plaster }, kokoshnik: c.trim });
        pediment(p, s, 1.15, 1.85, 1.85, 80, 36, team);
        lantern(p, 2.7, 0.75, 40, 2.9, 0.75);
        lantern(p, 2.7, 1.4, 40, 2.9, 1.4);
        const sentry = c.sentry;
        if (sentry) sentryBox(p, 2.76, 1.5, sentry.field, css(sentry.chevron));
        else sentryBox(p, 2.76, 1.5);
        p.flag(1.0, 2.45, 0, 62, team, true);
        railFence(p, 0.12, 2.92, 2.92, 2.92, 12);
        railFence(p, 2.92, 2.1, 2.92, 2.92, 12);
      },
    },
    stable: {
      size: 3,
      maxHeight: tall(160),
      paint: (p, team) => {
        p.footShadow();
        p.ground(0.05, 0.05, 2.95, 2.95, 0xa89a70);
        baroqueBlock(p, s, 0.3, 0.3, 2.7, 2.0, 0, 56, {
          bays: 6,
          left: (w, h, _l) => {
            for (let i = 0; i < 6; i++) p.window((w / 6) * (i + 0.5) - 7, -h + 14, 14, 14, true);
          },
          right: (w, h, l) => {
            archedOpening(p.ctx, w / 2 - 16, 32, 38, c.trim, 0x22170e, l);
            p.door(w / 2 - 13, 26, 34, 0x6b4526);
            p.window(w * 0.15, -h + 14, 12, 12, true);
            p.window(w * 0.78, -h + 14, 12, 12, true);
          },
        });
        p.material = 'tile';
        styledMansard(p, s, 0.3, 0.3, 2.7, 2.0, 56, 26, 0.2, 16, c.roof);
        // Ventilation cupola on the ridge.
        const cupola = roofLift(s, 26 + 16);
        p.box(1.42, 1.07, 1.64, 1.29, 90 + cupola, 108 + cupola, { color: c.trim }, c.trim);
        p.leftFace(1.42, 1.64, 1.29, 90 + cupola, (w) => p.window(w / 2 - 3, -15, 6, 10, true), 18);
        // Onion styles raise an open, tented hay-loft lookout on the cupola instead of its helm.
        if (hasOnionDomes(s)) openLantern(p, 1.53, 1.18, 0.15, 108 + cupola, 26, 58, c.board, c.roof, c.trim);
        else {
          helm(p, 1.53, 1.18, 108 + cupola, CUPOLA_HELM, c.metal);
          finial(p, 1.53, 1.18, 137 + cupola, 12, false);
        }
        lantern(p, 2.7, 0.9, 40, 2.9, 0.9);
        railFence(p, 0.15, 2.86, 2.86, 2.86, 15);
        railFence(p, 2.86, 2.25, 2.86, 2.86, 15);
        for (const u of [0.6, 0.98]) p.box(u, 2.3, u + 0.32, 2.62, 0, 13, { color: 0xd2ad55 }, 0xe2c26c);
        p.flag(0.25, 2.8, 0, 40, team);
      },
    },
    tower: baroqueTower(s),
    foundry: foundryArt(s),
    wonder: wonderArt(s),
  };
}
