import type { Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { beam } from '../landmarkProps';
import { column } from '../parts';
import type { ArchStyle } from '../style';
import { copingOf, wallOf } from './courtyardKits';
import { hip, type Block } from './hispaniaParts';

/*
 * Parts of the Spanish mint (Pénzverde): the iron-bound strongroom door
 * and its grilled light, the screw press (volante) that strikes the
 * coins, and the open arcaded press hall that shows it.
 */

const IRON = 0x24201d;

/**
 * The strongroom door (face-local): a dressed stone surround, studded oak
 * leaves crossed by three iron straps, a great lock plate and ring.
 */
export function strongroomDoor(ctx: Ctx, s: ArchStyle, x: number, w: number, h: number, light: number): void {
  const c = s.palette;
  ctx.fillStyle = css(shade(c.ashlar, light));
  ctx.fillRect(x - 5, -h - 6, w + 10, h + 6);
  ctx.fillStyle = css(shade(c.ashlar, light * 0.75));
  for (let y = -6; y > -h; y -= 7) {
    ctx.fillRect(x - 5, y, 4, 0.8);
    ctx.fillRect(x + w + 1, y - 3, 4, 0.8);
  }
  ctx.fillRect(x - 5, -h - 1, w + 10, 1);
  // Lintel keystone.
  ctx.fillStyle = css(shade(c.ashlar, light * 1.1));
  ctx.fillRect(x + w / 2 - 3, -h - 6, 6, 6);
  // Oak leaves.
  ctx.fillStyle = css(shade(0x3e2a1a, light));
  ctx.fillRect(x, -h, w, h);
  ctx.fillStyle = css(shade(0x2a1c12, light));
  ctx.fillRect(x + w / 2 - 0.5, -h, 1, h);
  for (let xx = x + 3; xx < x + w - 1; xx += 3.5) ctx.fillRect(xx, -h, 0.6, h);
  // Iron straps with rivets.
  for (const y of [-h * 0.82, -h * 0.5, -h * 0.18]) {
    ctx.fillStyle = css(shade(IRON, light * 1.3));
    ctx.fillRect(x, y - 1.6, w, 3.2);
    ctx.fillStyle = css(shade(0x8a8178, light));
    for (let xx = x + 1.5; xx < x + w; xx += 3) ctx.fillRect(xx, y - 0.6, 1.1, 1.1);
  }
  // Lock plate and ring.
  ctx.fillStyle = css(shade(IRON, light * 1.4));
  ctx.fillRect(x + w / 2 + 1.5, -h * 0.42, 5, 7);
  ctx.fillStyle = '#0e0c0b';
  ctx.fillRect(x + w / 2 + 3.5, -h * 0.42 + 2, 1.2, 2.6);
  ctx.strokeStyle = css(shade(0x9a8f80, light));
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x + w / 2 - 3, -h * 0.36, 2.2, 0, Math.PI * 2);
  ctx.stroke();
}

/** A small barred light (face-local): dark, deep-set, behind a heavy iron grille (no glow: the treasury is shut). */
export function grilledLight(ctx: Ctx, s: ArchStyle, x: number, y: number, w: number, h: number, light: number): void {
  ctx.fillStyle = css(shade(s.palette.ashlar, light));
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = '#120e0b';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = css(shade(IRON, light * 1.6));
  for (let xx = x + 1.5; xx < x + w - 0.5; xx += 2.6) ctx.fillRect(xx, y, 1, h);
  for (const yy of [y + h * 0.33, y + h * 0.66]) ctx.fillRect(x, yy, w, 1);
}

/**
 * The screw press (volante) at ground point (u, v) on a floor at z: a
 * stone block, two iron cheeks and their crosshead, the screw, and the
 * swing bar with a lead ball at each end turned along u.
 */
export function screwPress(p: IsoPainter, s: ArchStyle, u: number, v: number, z: number): void {
  const ctx = p.ctx;
  const d = 0.09;
  p.box(u - d, v - d, u + d, v + d, z, z + 6, { color: s.palette.ashlar, detail: 'stone' }, s.palette.ashlar);
  const top = z + 6;
  const iron = 0x3a3430;
  for (const dv of [-0.065, 0.065]) beam(p, [u, v + dv, top], [u, v + dv, top + 16], iron, 3.4);
  p.box(u - 0.04, v - 0.1, u + 0.04, v + 0.1, top + 14, top + 20, { color: iron }, shade(iron, 1.3));
  beam(p, [u, v, top + 20], [u, v, top + 28], 0x8a7e70, 2.8);
  // Die and a coin blank on the anvil.
  const [ax, ay] = p.p(u, v, top);
  ctx.fillStyle = '#e3b23c';
  ctx.beginPath();
  ctx.ellipse(ax, ay - 1, 2.6, 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  // The swing bar (balancier) and its lead balls.
  const bz = top + 25;
  beam(p, [u - 0.42, v + 0.1, bz], [u + 0.42, v - 0.1, bz], iron, 2.4);
  for (const [bu, bv] of [[u - 0.44, v + 0.105], [u + 0.44, v - 0.105]] as const) {
    const [x, y] = p.p(bu, bv, bz);
    const g = ctx.createRadialGradient(x - 1.5, y - 1.5, 0.5, x, y, 4.2);
    g.addColorStop(0, '#9a9590');
    g.addColorStop(1, '#2e2a27');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 4.2, 0, Math.PI * 2);
    ctx.fill();
    p.normalCylinder(x - 4.2, y - 4.2, 8.4, 8.4);
    p.addVolumePoint(bu, bv, bz + 4);
  }
  // Hand ropes hanging from the bar ends.
  ctx.strokeStyle = '#b89a62';
  ctx.lineWidth = 0.9;
  for (const bu of [u - 0.4, u + 0.4]) {
    const [x, y] = p.p(bu, bu < u ? v + 0.095 : v - 0.095, bz);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 1.5, y + 10, x - 0.5, y + 17);
    ctx.stroke();
  }
}

/**
 * The open press hall: a raised floor, round-arched arcades on columns
 * along its two front sides (the press stands inside, painted by
 * `inside` between the back and front rows), and a low tile hip.
 */
export function pressHall(p: IsoPainter, s: ArchStyle, [u0, v0, u1, v1]: Block, eave: number, inside: () => void): void {
  const c = s.palette;
  const floor = 4;
  p.box(u0, v0, u1, v1, 0, floor, { color: c.ashlar, detail: 'stone' }, shade(c.ashlar, 0.95));
  // The courtyard row stands behind the press.
  for (const v of [v0 + 0.12, (v0 + v1) / 2]) column(p, u0 + 0.05, v, floor, eave - 8, 2.6, c.plasterDeep);
  inside();
  const cols = c.plasterDeep;
  const along = (n: number, a: number, b: number) => [...Array(n + 1).keys()].map((i) => a + ((b - a) * i) / n);
  for (const v of along(3, v0 + 0.06, v1 - 0.04)) column(p, u1 - 0.04, v, floor, eave - 8, 2.8, cols);
  for (const u of along(2, u0 + 0.05, u1 - 0.04).slice(0, -1)) column(p, u, v1 - 0.04, floor, eave - 8, 2.8, cols);
  // Arched spandrels: a whitewashed band over the columns, its arches cut from below.
  const wall = wallOf(s);
  const band = (draw: (f: (w: number, h: number) => void) => void, bays: number, light: number) =>
    draw((w, h) => {
      const ctx = p.ctx;
      const bay = w / bays;
      ctx.fillStyle = css(shade(wall.color, light));
      ctx.beginPath();
      ctx.rect(0, -h, w, h);
      for (let i = 0; i < bays; i++) {
        const r = Math.min((bay - 6) / 2, h - 3);
        const cx = i * bay + bay / 2;
        ctx.moveTo(cx - r, 0);
        ctx.arc(cx, 0, r, Math.PI, 0);
        ctx.closePath();
      }
      ctx.fill('evenodd');
      ctx.strokeStyle = css(shade(c.plasterDeep, light), 0.9);
      ctx.lineWidth = 1.4;
      for (let i = 0; i < bays; i++) {
        const r = Math.min((bay - 6) / 2, h - 3);
        ctx.beginPath();
        ctx.arc(i * bay + bay / 2, 0, r, Math.PI, 0);
        ctx.stroke();
      }
    });
  const z = eave - 14;
  band((f) => p.leftFace(u0, u1, v1, z, f, 14), 2, 1);
  band((f) => p.rightFace(v0, v1, u1, z, f, 14), 3, 0.78);
  p.box(u0, v0, u1, v1, eave - 3, eave, wall, copingOf(s));
  hip(p, s, [u0, v0, u1, v1], eave, 26);
}
