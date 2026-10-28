import { ellipse } from '../canvas';
import type { IsoPainter } from '../isoPainter';
import { css } from '../palette';
import { archedOpening, boardedGable, R } from './facade';
import { forgeLight, forgeMouth, goldPile, haystack, logPile, post, strawButt, torch, wattleFence } from './parts';
import { porchRoofLeft, porchRoofRight } from './roofs';
import { dovecote, hasPepperpots, pepperpotRoom, turret } from './kits/pepperpot';
import type { ArchStyle } from './style';
import { boardedFill, roofChimney, styledGable, styledHip } from './styledRoofs';
import type { AgeArtSet } from './types';

/** Ripe strip field: alternating stubble / standing wheat strips. */
export function stripField(p: IsoPainter, strips: number, wheat: string, soil: number): void {
  const ctx = p.ctx;
  p.ground(0.06, 0.06, 1.94, 1.94, soil);
  for (let i = 0; i < strips; i++) {
    const v0 = 0.12 + (i * 1.76) / strips;
    const v1 = v0 + 1.76 / strips - 0.04;
    if (i % 2) {
      p.ground(0.12, v0, 1.88, v1, 0xa58a4e);
      continue;
    }
    for (let k = 0; k < 60; k++) {
      const [x, y] = p.p(0.15 + p.random() * 1.7, v0 + p.random() * (v1 - v0), 0);
      ctx.strokeStyle = k % 3 ? wheat : '#9c7a2e';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (p.random() - 0.5) * 3, y - 9 - p.random() * 4);
      ctx.stroke();
    }
  }
}

function sawhorse(p: IsoPainter, u: number, v: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 0);
  ctx.strokeStyle = '#4a3220';
  ctx.lineWidth = 2;
  for (const dx of [-12, 12]) {
    ctx.beginPath();
    ctx.moveTo(x + dx - 4, y + 2);
    ctx.lineTo(x + dx + 4, y - 14);
    ctx.moveTo(x + dx + 4, y + 2);
    ctx.lineTo(x + dx - 4, y - 14);
    ctx.stroke();
  }
  ctx.fillStyle = '#8a5a32';
  ctx.fillRect(x - 22, y - 16, 44, 6);
  ellipse(ctx, x + 22, y - 13, 3, 3);
  ctx.fillStyle = '#d9b07a';
  ctx.fill();
}

/** Age 2 family workplaces: farm, camps, archery range, smithy. */
export function medievalWorkArt(s: ArchStyle): AgeArtSet {
  const c = s.palette;
  const tall = (h: number) => h + s.headroom;
  /** Pepperpot styles raise a dovecote or stair turret in each yard (kits/pepperpot.ts). */
  const pots = hasPepperpots(s);
  return {
    farm: {
      size: 2,
      maxHeight: tall(64) + pepperpotRoom(s, 80),
      paint: (p, team) => {
        stripField(p, 7, '#d8b34a', 0x6a4828);
        haystack(p, 0.42, 0.42, 15, 34);
        haystack(p, 0.82, 0.3, 11, 26);
        if (pots) dovecote(p, s, 1.45, 0.5, 0.2, 52);
        wattleFence(p, 0.06, 1.95, 1.95, 1.95, 12);
        wattleFence(p, 1.95, 0.06, 1.95, 1.95, 12);
        p.flag(1.95, 1.95, 0, 24, team);
      },
    },
    lumber_camp: {
      size: 2,
      maxHeight: tall(118) + pepperpotRoom(s, 40),
      paint: (p, team) => {
        p.footShadow();
        p.ground(0.1, 0.1, 1.9, 1.9, 0x857455);
        p.box(0.22, 0.22, 1.18, 1.5, 0, 6, { color: c.stone }, c.stone);
        p.box(0.25, 0.25, 1.15, 1.47, 6, 42, { color: c.darkWood, detail: 'logs' });
        p.leftFace(0.25, 1.15, 1.47, 6, (w) => p.door(w * 0.35, 16, 26, c.doors.work), 36);
        p.material = 'shingle';
        styledGable(p, s, 0.25, 0.25, 1.15, 1.47, 42, 52, c.roof, c.darkWood, 'v', 0.14, boardedFill(s, (w, r) => boardedGable(p.ctx, w, r, c.board)));
        torch(p, 0.3, 1.47, 30, 0.3, 1.66);
        if (pots) dovecote(p, s, 1.62, 0.5, 0.17, 50, team);
        logPile(p, 1.2, 1.82, 10, 0x6b4426, 0xe0b880);
        logPile(p, 1.45, 1.15, 6, 0x6b4426, 0xe0b880);
        sawhorse(p, 0.72, 1.85);
        if (!pots) p.flag(1.82, 0.32, 0, 32, team);
      },
    },
    mining_camp: {
      size: 2,
      maxHeight: tall(118) + pepperpotRoom(s, 40),
      paint: (p, team) => {
        const ctx = p.ctx;
        p.footShadow();
        p.ground(0.1, 0.1, 1.9, 1.9, 0x877c6b);
        if (pots) dovecote(p, s, 0.45, 0.48, 0.18, 48, team);
        p.box(0.18, 0.95, 1.05, 1.75, 0, 34, { color: c.stone, detail: 'fieldstone' });
        p.leftFace(0.18, 1.05, 1.75, 0, (w) => {
          archedOpening(ctx, w * 0.4, 16, 24, c.ashlar);
          p.door(w * 0.4 + 1, 14, 22, c.doors.work);
        }, 34);
        p.material = 'shingle';
        styledGable(p, s, 0.18, 0.95, 1.05, 1.75, 34, 44, c.roof, c.stone, 'u', 0.12, boardedFill(s, (w, r) => boardedGable(ctx, w, r, c.board, R)));
        torch(p, 0.3, 1.75, 26, 0.3, 1.95);
        // Shaft with a windlass headframe.
        const [sx, sy] = p.p(1.3, 0.62, 0);
        ellipse(ctx, sx, sy, 20, 10);
        ctx.fillStyle = '#5a5046';
        ctx.fill();
        ellipse(ctx, sx, sy, 15, 7.5);
        ctx.fillStyle = '#0d0a08';
        ctx.fill();
        for (const [u, v] of [[1.05, 0.38], [1.55, 0.38], [1.05, 0.86], [1.55, 0.86]] as const) post(p, u, v, 0, 58, 2.6, c.timber);
        const a = p.p(1.05, 0.62, 58);
        const b = p.p(1.55, 0.62, 58);
        ctx.strokeStyle = '#5a3b20';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
        ctx.strokeStyle = '#c9b08a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, sy - 58);
        ctx.lineTo(sx, sy - 22);
        ctx.stroke();
        ctx.fillStyle = '#6b4526';
        ctx.fillRect(sx - 4, sy - 24, 8, 7);
        for (const [u, v] of [[1.05, 0.38], [1.55, 0.86]] as const) p.addVolumePoint(u, v, 58);
        // Ore cart.
        p.box(1.3, 1.3, 1.78, 1.68, 6, 20, { color: 0x5a3a22, detail: 'planks' });
        goldPile(p, 1.54, 1.52);
        for (const u of [1.4, 1.68]) {
          const [x, y] = p.p(u, 1.68, 6);
          ellipse(ctx, x, y, 4.5, 5);
          ctx.fillStyle = '#20160c';
          ctx.fill();
        }
        if (!pots) p.flag(1.86, 0.2, 0, 30, team);
      },
    },
    archery_range: {
      size: 3,
      maxHeight: tall(140) + pepperpotRoom(s, 20),
      paint: (p, team) => {
        p.footShadow();
        p.ground(0.05, 0.05, 2.95, 2.95, 0x8d9c64);
        p.box(0.25, 0.25, 1.6, 1.25, 0, 8, { color: c.stone }, c.stone);
        p.box(0.25, 0.25, 1.6, 1.25, 8, 46, { color: c.planks, detail: 'planks' });
        p.rightFace(0.25, 1.25, 1.6, 8, (w) => p.door(w * 0.4, 16, 26, c.doors.work), 38);
        p.material = 'shingle';
        styledGable(p, s, 0.25, 0.25, 1.6, 1.25, 46, 54, c.roof, c.planks, 'u', 0.14, boardedFill(s, (w, r) => boardedGable(p.ctx, w, r, c.board, R)));
        // Shooting gallery along the front.
        for (let i = 0; i <= 3; i++) post(p, 0.3 + i * 0.43, 1.6, 0, 30, 2.4, c.timber);
        porchRoofLeft(p, 0.22, 1.63, 1.3, 0.32, 40, 30, c.roof);
        if (pots) dovecote(p, s, 2.05, 0.45, 0.18, 50);
        for (const [u, v] of [[2.5, 0.55], [2.55, 1.35], [2.5, 2.15]] as const) strawButt(p, u, v);
        p.flag(0.4, 2.6, 0, 38, team, true);
      },
    },
    blacksmith: {
      size: 2,
      maxHeight: tall(130) + pepperpotRoom(s, 20),
      paint: (p, team) => {
        const ctx = p.ctx;
        p.footShadow();
        p.ground(0.1, 0.1, 1.9, 1.9, 0x7a7266);
        roofChimney(p, s, 1.08, 0.28, 1.45, 0.65, 0, 112, 46, { color: c.stone, detail: 'fieldstone' }, 'forge');
        p.box(0.28, 0.3, 1.4, 1.5, 0, 38, { color: c.stone, detail: 'fieldstone' });
        p.leftFace(0.28, 1.4, 1.5, 0, (w) => {
          archedOpening(ctx, w * 0.3, 18, 26, c.ashlar);
          p.door(w * 0.3 + 1, 16, 24, c.doors.work);
        }, 38);
        p.rightFace(0.3, 1.5, 1.4, 0, (w) => forgeMouth(p, w * 0.35, 22, 26), 38);
        p.material = 'shingle';
        styledHip(p, s, 0.28, 0.3, 1.4, 1.5, 38, 46, c.roof, 0.12, c.stone);
        if (pots) turret(p, s, 0.36, 1.62, 0.15, 0, 56, { lights: [32] });
        // Open lean-to over the anvil.
        post(p, 1.75, 0.4, 0, 28, 2.4, c.timber);
        post(p, 1.75, 1.4, 0, 28, 2.4, c.timber);
        porchRoofRight(p, 0.32, 1.48, 1.4, 0.4, 36, 27, c.roof);
        forgeLight(p, 1.65, 0.95);
        const [x, y] = p.p(1.62, 1.2, 0);
        ctx.fillStyle = '#5a3b20';
        ctx.fillRect(x - 5, y - 8, 10, 8);
        ctx.fillStyle = '#34343a';
        ctx.fillRect(x - 9, y - 12, 18, 4.5);
        ctx.fillRect(x - 3, y - 9, 6, 2);
        const [bx, by] = p.p(1.7, 1.7, 0);
        ellipse(ctx, bx, by - 9, 6, 3);
        ctx.fillStyle = css(0x24303a);
        ctx.fill();
        ctx.fillStyle = '#6b4526';
        ctx.fillRect(bx - 6, by - 9, 12, 9);
        p.flag(1.88, 1.88, 0, 26, team);
      },
    },
  };
}
