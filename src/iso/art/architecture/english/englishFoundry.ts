import type { IsoPainter } from '../../isoPainter';
import { FURNACE_LIGHT } from '../../lighting/buildingLights';
import { css, shade } from '../../palette';
import { R } from '../facade';
import { barrel, furnaceMouth, heap, shotPyramid } from '../foundry';
import { helm, type HelmProfile } from '../roofs';
import type { ArchStyle } from '../style';
import { styledGable } from '../styledRoofs';
import type { BuildingArt } from '../types';
import { flemishBond, georgianBlock, georgianStack, modillionCornice } from './georgianParts';

/*
 * English foundry (ágyúöntöde), after Coalbrookdale: a brick casting
 * house with a great round-headed cast-iron window in its gable, a
 * square stone blast furnace with a glowing tuyere arch and its stack,
 * and an iron-hooped brick bottle kiln smoking above the yard of cast
 * barrels, shot and coal.
 */

const CINDER = 0x5f574e;
const HALL_RISE = 40;

/** Bottle kiln: a hooped brick bottle (bands at every profile ring), narrowing to a smoking neck. */
const BOTTLE: HelmProfile = [
  [0, 0.42], [24, 0.43], [52, 0.4], [78, 0.33], [100, 0.24], [116, 0.16], [126, 0.13], [140, 0.13], [143, 0.155], [147, 0.15],
];

/** Cast-iron round-headed window with radial and grid glazing (face-local, base at y0, width w). */
function ironWindow(p: IsoPainter, s: ArchStyle, cx: number, y0: number, w: number, h: number, light: number): void {
  const ctx = p.ctx;
  const r = w / 2;
  const arch = (grow: number) => {
    ctx.beginPath();
    ctx.moveTo(cx - r - grow, y0);
    ctx.lineTo(cx - r - grow, y0 - h + r);
    ctx.arc(cx, y0 - h + r, r + grow, Math.PI, 0);
    ctx.lineTo(cx + r + grow, y0);
    ctx.closePath();
  };
  arch(3);
  ctx.fillStyle = css(shade(s.palette.ashlar, light));
  ctx.fill();
  arch(0);
  const g = ctx.createLinearGradient(0, y0 - h, 0, y0);
  g.addColorStop(0, css(s.palette.window.glassTop));
  g.addColorStop(1, css(s.palette.window.glassBottom));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  arch(0);
  ctx.clip();
  ctx.strokeStyle = 'rgba(28,26,26,.9)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let x = cx - r + w / 6; x < cx + r; x += w / 6) {
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y0 - h);
  }
  for (let y = y0 - 5; y > y0 - h + r; y -= 5) {
    ctx.moveTo(cx - r, y);
    ctx.lineTo(cx + r, y);
  }
  for (let k = 0; k <= 6; k++) {
    const a = Math.PI + (k / 6) * Math.PI;
    ctx.moveTo(cx, y0 - h + r);
    ctx.lineTo(cx + Math.cos(a) * r, y0 - h + r + Math.sin(a) * r);
  }
  ctx.stroke();
  ctx.restore();
  const c = ctx.getTransform().transformPoint(new DOMPoint(cx, y0 - h / 2));
  p.addGlow(c.x, c.y, Math.max(w, h) * 0.8);
}

/** Pig-iron bars stacked crosswise. */
function pigs(p: IsoPainter, u: number, v: number): void {
  for (let k = 0; k < 3; k++) {
    const z = k * 3;
    if (k % 2) for (const dv of [0, 0.12, 0.24]) p.box(u, v + dv, u + 0.32, v + dv + 0.07, z, z + 3, { color: 0x4a4644 }, 0x5a5654);
    else for (const du of [0, 0.12, 0.24]) p.box(u + du, v, u + du + 0.07, v + 0.32, z, z + 3, { color: 0x4a4644 }, 0x5a5654);
  }
}

export function englishFoundry(s: ArchStyle): BuildingArt {
  const c = s.palette;
  return {
    size: 3,
    maxHeight: 220,
    paint: (p, team) => {
      const ctx = p.ctx;
      p.footShadow();
      p.ground(0.05, 0.05, 2.95, 2.95, CINDER);
      for (let i = 0; i < 70; i++) {
        const [x, y] = p.p(0.1 + p.random() * 2.8, 0.1 + p.random() * 2.8, 0);
        ctx.fillStyle = css(shade(CINDER, 0.6 + p.random() * 0.7), 0.8);
        ctx.fillRect(x, y, 2 + p.random() * 2, 1.4);
      }
      // Bottle kiln at the back.
      helm(p, 2.3, 0.72, 0, BOTTLE, c.brick);
      const [kx, ky] = p.p(2.3 + 0.3, 0.72 + 0.3, 0);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, kx - 9, ky);
      furnaceMouth(p, c.ashlar, 0, 18, 22, 1);
      ctx.restore();
      p.addSmoke(2.3, 0.72, 150);
      // Casting house: brick, slate gable to the front with the great iron window.
      georgianStack(p, s, 0.45, 0.5, 0.7, 0.72, 40, 150, 0, 'forge');
      georgianBlock(p, s, 0.25, 0.4, 1.85, 2.2, 0, 70, {
        bands: [24],
        left: (w, h, l) => ironWindow(p, s, w / 2, -12, 30, h - 22, l),
        right: (w, h, l) => {
          for (const x of [0.2, 0.5, 0.8]) ironWindow(p, s, w * x, -30, 12, h - 42, l);
          ctx.fillStyle = '#1a120c';
          ctx.fillRect(w * 0.42, -26, w * 0.16, 26);
        },
      });
      p.material = 'slate';
      styledGable(p, s, 0.25, 0.4, 1.85, 2.2, 70, HALL_RISE, c.roof, c.brick, 'v', 0.06, (w, rise) => {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(w / 2, -rise);
        ctx.lineTo(w, 0);
        ctx.closePath();
        ctx.clip();
        flemishBond(p, w, rise, c.brick, 1);
        ctx.restore();
        ctx.fillStyle = css(c.ashlar);
        ctx.beginPath();
        ctx.arc(w / 2, -rise * 0.4, 6, 0, Math.PI * 2);
        ctx.fill();
        // Cast date plate.
        ctx.fillStyle = '#2e2824';
        for (const dx of [-3.5, -1.2, 1.2, 3.5]) ctx.fillRect(w / 2 + dx - 0.5, -rise * 0.4 - 2, 1, 4);
      });
      // Blast furnace: battered stone block, iron-banded, glowing tuyere arch, charging stack.
      p.box(1.98, 1.3, 2.88, 2.3, 0, 16, { color: c.stone, detail: 'stone' }, c.stone);
      p.box(2.05, 1.37, 2.81, 2.23, 16, 92, { color: c.ashlar, detail: 'stone' });
      p.leftFace(2.05, 2.81, 2.23, 16, (w, h) => {
        modillionCornice(ctx, s, w, h, 1);
        furnaceMouth(p, c.ashlar, w / 2 - 12, 24, 34, 1);
        for (const y of [-48, -66]) {
          ctx.fillStyle = 'rgba(30,26,24,.85)';
          ctx.fillRect(0, y, w, 2.2);
        }
      }, 76);
      p.rightFace(1.37, 2.23, 2.81, 16, (w, h) => {
        modillionCornice(ctx, s, w, h, R);
        furnaceMouth(p, c.ashlar, w / 2 - 9, 18, 26, R);
      }, 76);
      p.box(2.15, 1.47, 2.71, 2.13, 92, 98, { color: 0x3a302a }, 0x3a302a);
      georgianStack(p, s, 2.3, 1.62, 2.56, 1.88, 98, 168, 0, 'forge');
      p.addLight(2.45, 2.6, FURNACE_LIGHT);
      // Yard: cast barrels, shot, coal and pig iron.
      for (const v of [2.42, 2.66]) barrel(p, 0.45, 1.25, v);
      shotPyramid(p, 1.6, 2.6);
      pigs(p, 1.95, 2.42);
      heap(p, 2.62, 2.6, 15, 15, 0x2a2624);
      p.flag(0.32, 2.2, 70, 34, team);
    },
  };
}
