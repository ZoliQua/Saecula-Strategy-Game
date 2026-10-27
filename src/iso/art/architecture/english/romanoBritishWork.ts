import { ellipse } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { chimney, forgeLight, goldPile, logPile, post, strawButt, wattleFence } from '../parts';
import type { ArchStyle } from '../style';
import { roofLift, styledGable } from '../styledRoofs';
import type { AgeArtSet } from '../types';
import { cruckGable, cruckWall, drystone, spoilHeap } from './englishParts';
import { coneRoof, drumWall, roundhouse } from './roundhouse';

/*
 * Age 1 English workplaces: Celtic fields behind drystone walls with a
 * raised granary, a cruck-framed wood shed, a slate-roofed lead mine
 * with its spoil heap, an open thatched butts shelter, and a roundhouse
 * smithy with a stone forge stack.
 */

/** Ridged plot of a crop between (u0, v0) and (u1, v1). */
function ridges(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, crop: string, tip: string): void {
  const ctx = p.ctx;
  for (let v = v0 + 0.06; v < v1 - 0.04; v += 0.13) {
    const a = p.p(u0, v, 0);
    const b = p.p(u1, v, 0);
    ctx.strokeStyle = 'rgba(40,26,12,.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    for (let u = u0 + 0.05; u < u1; u += 0.09) {
      const [x, y] = p.p(u, v + 0.05, 0);
      ctx.strokeStyle = (u * 100) % 3 < 1 ? tip : crop;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (p.random() - 0.5) * 3, y - 7 - p.random() * 4);
      ctx.stroke();
    }
  }
}

/** Raised granary: a small wattle drum on four posts under a cone of thatch. */
function granary(p: IsoPainter, s: ArchStyle, uc: number, vc: number, r: number): void {
  for (const [du, dv] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) post(p, uc + du * r * 0.6, vc + dv * r * 0.6, 0, 11, 2.2, s.palette.timber);
  drumWall(p, uc, vc, r, 11, 28, s.palette.plasterDeep, 'wattle');
  coneRoof(p, uc, vc, r + 0.1, 26, 26 * s.roof.pitch, s.palette.thatch, 'thatch');
}

/** Age 1 English workplaces. */
export function romanoBritishWorkArt(s: ArchStyle): AgeArtSet {
  const c = s.palette;
  return {
    farm: {
      size: 2,
      maxHeight: 80,
      paint: (p, team) => {
        p.ground(0.05, 0.05, 1.95, 1.95, 0x5e4630);
        ridges(p, 0.12, 0.75, 1.88, 1.88, '#c9b45a', '#e2cf7a');
        ridges(p, 0.75, 0.12, 1.88, 0.68, '#8fb04a', '#a9c35c');
        granary(p, s, 0.4, 0.4, 0.24);
        drystone(p, 0.05, 1.9, 1.95, 1.9, 9, c.stone);
        drystone(p, 1.9, 0.05, 1.9, 1.9, 9, c.stone);
        drystone(p, 0.75, 0.7, 1.9, 0.7, 6, c.stone);
        p.flag(1.94, 1.94, 9, 22, team);
      },
    },
    lumber_camp: {
      size: 2,
      maxHeight: 120,
      paint: (p, team) => {
        const ctx = p.ctx;
        p.footShadow();
        p.ground(0.1, 0.1, 1.9, 1.9, 0x837256);
        p.box(0.22, 0.22, 1.12, 1.5, 0, 34, { color: c.darkWood, detail: 'planks' });
        p.leftFace(0.22, 1.12, 1.5, 0, (w, h) => {
          cruckWall(ctx, w, h, c.timber);
          p.door(w * 0.36, 16, 24, c.doors.work);
        }, 34);
        p.material = 'thatch';
        styledGable(p, s, 0.22, 0.22, 1.12, 1.5, 34, 44, c.thatch, c.darkWood, 'v', 0.16, (w, rise) => cruckGable(ctx, w, rise, c.timber));
        logPile(p, 1.2, 1.82, 10, 0x5e4026, 0xd6b384);
        logPile(p, 1.42, 1.1, 6, 0x5e4026, 0xd6b384);
        // Saw pit with a trunk on trestles.
        p.ground(1.3, 0.25, 1.8, 0.55, 0x2c2218);
        const a = p.p(1.25, 0.4, 9);
        const b = p.p(1.85, 0.4, 9);
        ctx.strokeStyle = '#6b4a2c';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
        ellipse(ctx, b[0], b[1], 3.5, 3.5);
        ctx.fillStyle = '#d6b384';
        ctx.fill();
        p.flag(1.84, 1.84, 0, 30, team);
      },
    },
    mining_camp: {
      size: 2,
      maxHeight: 120,
      paint: (p, team) => {
        const ctx = p.ctx;
        p.footShadow();
        p.ground(0.1, 0.1, 1.9, 1.9, 0x7e786c);
        spoilHeap(p, 1.45, 0.42, 26, 24, 0x7a7a74);
        p.box(0.2, 0.95, 1.05, 1.75, 0, 30, { color: c.stone, detail: 'fieldstone' });
        p.leftFace(0.2, 1.05, 1.75, 0, (w) => {
          p.door(w * 0.42, 14, 22, c.doors.work);
          p.window(w * 0.14, -24, 6, 8);
        }, 30);
        styledGable(p, s, 0.2, 0.95, 1.05, 1.75, 30, 34, c.roof, c.stone, 'u', 0.12);
        // Windlass over the shaft.
        const [sx, sy] = p.p(1.3, 1.1, 0);
        ellipse(ctx, sx, sy, 15, 7.5);
        ctx.fillStyle = '#504a42';
        ctx.fill();
        ellipse(ctx, sx, sy, 11, 5.5);
        ctx.fillStyle = '#0d0a08';
        ctx.fill();
        post(p, 1.1, 1.1, 0, 26, 2.4, c.timber);
        post(p, 1.5, 1.1, 0, 26, 2.4, c.timber);
        const a = p.p(1.1, 1.1, 24);
        const b = p.p(1.5, 1.1, 24);
        ctx.strokeStyle = '#5b4836';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
        // Lead pigs stacked by the hut and a heap of ore.
        for (let i = 0; i < 5; i++) {
          const [x, y] = p.p(1.3 + (i % 3) * 0.1, 1.62, 0);
          ctx.fillStyle = i < 3 ? '#7d838a' : '#9aa1a8';
          ctx.fillRect(x - 6, y - 4 - (i < 3 ? 0 : 4), 11, 4);
        }
        goldPile(p, 1.68, 1.4);
        p.flag(1.86, 1.86, 0, 30, team);
      },
    },
    archery_range: {
      size: 3,
      maxHeight: 140,
      paint: (p, team) => {
        const ctx = p.ctx;
        p.footShadow();
        p.ground(0.05, 0.05, 2.95, 2.95, 0x8a9a62);
        // Open-fronted shelter: wattle back wall, posts, steep thatch.
        p.box(0.25, 0.25, 1.55, 0.35, 0, 34, { color: c.plasterDeep });
        p.leftFace(0.25, 1.55, 0.35, 0, (w) => {
          ctx.fillStyle = 'rgba(30,20,10,.35)';
          ctx.fillRect(0, -34, w, 34);
        }, 34);
        for (const u of [0.3, 0.72, 1.12, 1.5]) post(p, u, 1.2, 0, 34, 2.6, c.timber);
        p.material = 'thatch';
        styledGable(p, s, 0.25, 0.25, 1.55, 1.2, 34, 36, c.thatch, c.plasterDeep, 'u', 0.16);
        // Bow rack under the eave.
        const [x, y] = p.p(0.9, 1.25, 0);
        ctx.strokeStyle = '#5a3b20';
        ctx.lineWidth = 1.4;
        for (let k = 0; k < 4; k++) {
          ctx.beginPath();
          ctx.arc(x - 12 + k * 7, y - 14, 9, -Math.PI / 2 - 0.9, -Math.PI / 2 + 0.9);
          ctx.stroke();
        }
        roundhouse(p, s, 0.55, 2.35, { r: 0.36, wall: 24, rise: 34, door: 0.2, fire: false, detail: 'wattle', color: c.plasterDeep });
        for (const [u, v] of [[2.5, 0.6], [2.55, 1.4], [2.5, 2.2]] as const) strawButt(p, u, v);
        wattleFence(p, 1.0, 2.9, 2.9, 2.9, 11);
        p.flag(1.4, 2.6, 0, 38, team, true);
      },
    },
    blacksmith: {
      size: 2,
      maxHeight: 130,
      paint: (p, team) => {
        const ctx = p.ctx;
        p.footShadow();
        p.ground(0.1, 0.1, 1.9, 1.9, 0x7a7266);
        chimney(p, 1.22, 0.3, 1.5, 0.58, 0, 84 + roofLift(s, 40), { color: c.stone, detail: 'fieldstone' });
        roundhouse(p, s, 0.82, 0.85, { r: 0.56, wall: 30, rise: 44, door: 1.15, detail: 'stone', color: c.stone });
        // Anvil, quench tub and a lean-to over the bellows.
        post(p, 1.75, 0.95, 0, 24, 2.3, c.timber);
        post(p, 1.75, 1.6, 0, 24, 2.3, c.timber);
        p.material = 'thatch';
        styledGable(p, s, 1.45, 0.95, 1.8, 1.65, 24, 10, c.thatch, c.timber, 'v', 0.06);
        forgeLight(p, 1.3, 1.5);
        const [x, y] = p.p(1.35, 1.62, 0);
        ctx.fillStyle = '#4a3624';
        ctx.fillRect(x - 5, y - 8, 10, 8);
        ctx.fillStyle = '#34343a';
        ctx.fillRect(x - 9, y - 12, 18, 4.5);
        const [bx, by] = p.p(1.7, 1.78, 0);
        ellipse(ctx, bx, by - 9, 6, 3);
        ctx.fillStyle = css(0x24303a);
        ctx.fill();
        ctx.fillStyle = css(shade(c.timber, 1.1));
        ctx.fillRect(bx - 6, by - 9, 12, 9);
        p.flag(1.88, 0.2, 0, 26, team);
      },
    },
  };
}
