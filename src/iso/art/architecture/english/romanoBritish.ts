import { ellipse } from '../../canvas';
import { css, shade } from '../../palette';
import { R, shutteredWindow } from '../facade';
import { haystack, palisade, post, torch, wattleFence } from '../parts';
import type { ArchStyle } from '../style';
import { styledGable, styledHip } from '../styledRoofs';
import type { AgeArtSet } from '../types';
import { timberWatchtower } from './englishTowers';
import { cruckGable, cruckWall, dummy, hangingBanner, roundFence, vexillum } from './englishParts';
import { romanoBritishWorkArt } from './romanoBritishWork';
import { roundhouse } from './roundhouse';

/*
 * Age 1 English family (Romano-British): conical-thatched roundhouses
 * beside grey rubble halls under steep slate, cruck-framed byres,
 * timber towers and Roman vexilla in the team colour.
 */

/** A point on a roundhouse wall at angle `phi` (for torches and props on the drum). */
function onDrum(uc: number, vc: number, r: number, phi: number): readonly [number, number] {
  return [uc + r * Math.cos(phi), vc + r * Math.sin(phi)];
}

/** Age 1 English set. */
export function romanoBritishArt(s: ArchStyle): AgeArtSet {
  const c = s.palette;
  return {
    ...romanoBritishWorkArt(s),
    town_center: {
      size: 3,
      maxHeight: 220,
      paint: (p, team) => {
        p.footShadow();
        p.ground(0.05, 0.05, 2.95, 2.95, 0x958e7a);
        // Slate-capped stone watchtower at the back corner.
        p.box(0.12, 0.12, 0.72, 0.72, 0, 112, { color: c.stone, detail: 'fieldstone' });
        p.leftFace(0.12, 0.72, 0.72, 0, (w) => {
          p.window(w / 2 - 3.5, -100, 7, 13);
          p.window(w / 2 - 3, -66, 6, 11);
        }, 112);
        p.rightFace(0.12, 0.72, 0.72, 0, (w) => p.window(w / 2 - 3.5, -100, 7, 13), 112);
        styledHip(p, s, 0.12, 0.12, 0.72, 0.72, 112, 40, c.roof, 0.1);
        p.flag(0.42, 0.42, 112 + 40 * s.roof.pitch, 22, team, true);
        // Long rubble hall under a steep slate roof.
        p.box(0.85, 0.22, 2.75, 1.2, 0, 46, { color: c.stone, detail: 'fieldstone' });
        p.leftFace(0.85, 2.75, 1.2, 0, (w) => {
          for (const x of [0.62, 0.8]) shutteredWindow(p, w * x, -34, 8, 10, c.shutter);
          hangingBanner(p.ctx, w * 0.42, -44, 12, 30, team);
        }, 46);
        p.rightFace(0.22, 1.2, 2.75, 0, (w) => {
          p.door(w * 0.36, 16, 26, c.doors.main);
          p.window(w * 0.12, -34, 7, 10);
          p.window(w * 0.78, -34, 7, 10);
        }, 46);
        styledGable(p, s, 0.85, 0.22, 2.75, 1.2, 46, 40, c.roof, c.stone, 'u', 0.14);
        torch(p, 2.75, 0.55, 30, 2.95, 0.55);
        // Great roundhouse (chieftain's hall) and a lesser one.
        roundhouse(p, s, 1.02, 2.0, { r: 0.8, wall: 38, rise: 66, door: 1.3, smoke: true });
        const [tu, tv] = onDrum(1.02, 2.0, 0.83, 1.3 - 0.42);
        torch(p, tu, tv, 26, tu + 0.2, tv + 0.2);
        roundhouse(p, s, 2.35, 2.28, { r: 0.44, wall: 28, rise: 40, door: 0.45, detail: 'wattle', color: c.plasterDeep });
        vexillum(p, 2.15, 1.55, 56, team);
      },
    },
    house: {
      size: 2,
      maxHeight: 120,
      paint: (p, team) => {
        const ctx = p.ctx;
        p.footShadow();
        p.ground(0.12, 0.12, 1.88, 1.88, 0x9a917c);
        roundhouse(p, s, 0.92, 0.88, { r: 0.62, wall: 32, rise: 52, door: 1.25, smoke: true });
        wattleFence(p, 1.9, 0.5, 1.9, 1.9, 12);
        wattleFence(p, 0.5, 1.9, 1.9, 1.9, 12);
        // Team-dyed cloth drying on the fence.
        const [x, y] = p.p(1.9, 1.35, 12);
        ctx.fillStyle = css(shade(team, 0.85));
        ctx.beginPath();
        ctx.moveTo(x - 1, y - 2);
        ctx.lineTo(x + 11, y - 8);
        ctx.lineTo(x + 11, y + 6);
        ctx.lineTo(x - 1, y + 12);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = css(shade(team, 1.15), 0.7);
        ctx.fillRect(x + 1, y - 3, 1.5, 12);
        // Quern and log stack by the door.
        const [qx, qy] = p.p(1.45, 1.55, 0);
        ellipse(ctx, qx, qy - 4, 6, 3);
        ctx.fillStyle = css(shade(c.stone, 1.1));
        ctx.fill();
        ctx.fillStyle = css(shade(c.stone, 0.7));
        ctx.fillRect(qx - 6, qy - 4, 12, 4);
        for (let i = 0; i < 4; i++) {
          const [lx, ly] = p.p(0.3 + i * 0.07, 1.55, 0);
          ctx.fillStyle = '#6b4a2c';
          ctx.fillRect(lx - 9, ly - 7 - (i % 2) * 5, 14, 5);
        }
      },
    },
    barracks: {
      size: 3,
      maxHeight: 170,
      paint: (p, team) => {
        p.footShadow();
        p.ground(0.05, 0.05, 2.95, 2.95, 0x989077);
        // Barrack block: rubble walls, steep slate, gable door flanked by vexilla.
        p.box(0.25, 0.25, 2.2, 1.3, 0, 42, { color: c.stone, detail: 'fieldstone' });
        p.leftFace(0.25, 2.2, 1.3, 0, (w) => {
          for (let i = 0; i < 5; i++) shutteredWindow(p, 14 + i * ((w - 30) / 4), -32, 7, 10, c.shutter);
        }, 42);
        p.rightFace(0.25, 1.3, 2.2, 0, (w) => {
          p.door(w / 2 - 9, 18, 28, c.doors.gate);
          hangingBanner(p.ctx, w / 2 - 24, -40, 10, 26, team, R);
          hangingBanner(p.ctx, w / 2 + 14, -40, 10, 26, team, R);
        }, 42);
        styledGable(p, s, 0.25, 0.25, 2.2, 1.3, 42, 36, c.roof, c.stone, 'u', 0.14);
        torch(p, 2.2, 0.55, 30, 2.4, 0.55);
        torch(p, 2.2, 1.05, 30, 2.4, 1.05);
        // Timber gate tower at the yard corner, thatched pyramid cap.
        for (const [u, v] of [[2.32, 2.32], [2.86, 2.32], [2.32, 2.86], [2.86, 2.86]] as const) post(p, u, v, 0, 66, 2.8, c.timber);
        p.box(2.26, 2.26, 2.92, 2.92, 52, 70, { color: c.board, detail: 'planks' }, c.board);
        p.material = 'thatch';
        styledHip(p, s, 2.26, 2.26, 2.92, 2.92, 70, 30, c.thatch, 0.08);
        p.flag(2.59, 2.59, 70 + 30 * s.roof.pitch, 16, team);
        palisade(p, 0.08, 2.92, 2.2, 2.92, 26);
        palisade(p, 2.92, 1.5, 2.92, 2.2, 26);
        for (const u of [0.6, 1.15, 1.7]) dummy(p, u, 2.3);
        vexillum(p, 2.55, 1.75, 50, team);
      },
    },
    stable: {
      size: 3,
      maxHeight: 150,
      paint: (p, team) => {
        const ctx = p.ctx;
        p.footShadow();
        p.ground(0.05, 0.05, 2.95, 2.95, 0x9b8f6c);
        // Cruck-framed byre, its crucked gable end to the lit side; plank walls, steep reed thatch.
        p.box(0.3, 0.3, 1.45, 2.0, 0, 32, { color: c.darkWood, detail: 'planks' });
        p.leftFace(0.3, 1.45, 2.0, 0, (w, h) => {
          cruckWall(ctx, w, h, c.timber);
          ctx.fillStyle = '#21170e';
          ctx.fillRect(w / 2 - 12, -24, 24, 24);
          ctx.fillStyle = css(c.doors.gate);
          ctx.fillRect(w / 2 - 12, -11, 24, 11);
        }, 32);
        p.rightFace(0.3, 2.0, 1.45, 0, (w) => {
          for (let i = 0; i < 3; i++) {
            const x = 12 + i * ((w - 40) / 2);
            ctx.fillStyle = '#1a120b';
            ctx.fillRect(x, -24, 16, 24);
            ctx.fillStyle = css(shade(c.doors.gate, R));
            ctx.fillRect(x, -11, 16, 11);
          }
        }, 32);
        p.material = 'thatch';
        styledGable(p, s, 0.3, 0.3, 1.45, 2.0, 32, 52, c.thatch, c.plasterDeep, 'v', 0.18, (w, rise) => cruckGable(ctx, w, rise, c.timber));
        torch(p, 0.42, 2.0, 24, 0.42, 2.2);
        // Roundhouse tack store and a round horse paddock.
        roundhouse(p, s, 2.3, 0.72, { r: 0.4, wall: 24, rise: 36, door: 1.6, detail: 'wattle', color: c.plasterDeep });
        roundFence(p, 2.12, 2.12, 0.7, 14, 'back');
        haystack(p, 2.12, 2.0, 12, 24);
        p.box(1.8, 2.35, 2.2, 2.48, 0, 7, { color: c.darkWood }, 0x5d6f78);
        roundFence(p, 2.12, 2.12, 0.7, 14, 'front');
        p.flag(2.82, 2.12, 14, 30, team);
      },
    },
    tower: timberWatchtower(s),
  };
}
