import type { Ctx } from '../../canvas';
import { HW, type IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { CHARGES } from '../charges';
import { crest, R } from '../facade';
import { column, post, torch } from '../parts';
import { porchRoofLeft, porchRoofRight } from '../roofs';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';

/*
 * French age-1 town centre: a temple-forum after the Maison Carrée at
 * Nîmes. A pseudo-peripteral temple on a high podium faces the viewer
 * (+v) with a hexastyle Corinthian porch, an entablature and a slate
 * pediment bearing the crest; a colonnaded porticus with lit shops runs
 * round the back of the paved forum; an altar with its fire and two
 * team standards stand before the steps.
 */

const POD = 26;
const COL = 84;
const ENT = 13;
const [T0, T1] = [1.0, 2.26];
const [TV0, TV1] = [0.7, 2.42];
const CELLA_V = 1.7;

/** Fluted half-columns (pilasters) along a cella face, face-local. */
function halfColumns(ctx: Ctx, w: number, h: number, color: number, light: number, n: number): void {
  for (let i = 0; i <= n; i++) {
    const x = 3 + ((w - 6) * i) / n;
    ctx.fillStyle = css(shade(color, light * 1.12));
    ctx.fillRect(x - 3, -h, 6, h);
    ctx.fillStyle = css(shade(color, light * 0.78));
    ctx.fillRect(x + 1.5, -h, 1.5, h);
    ctx.fillStyle = css(shade(color, light * 1.2));
    ctx.fillRect(x - 4, -h, 8, 3);
  }
}

/** Entablature band: architrave, frieze, cornice (face-local). */
function entablature(ctx: Ctx, w: number, h: number, color: number, light: number): void {
  ctx.fillStyle = css(shade(color, light * 0.94));
  ctx.fillRect(0, -h * 0.38, w, 1.2);
  ctx.fillStyle = css(shade(color, light * 1.12));
  ctx.fillRect(0, -h, w, 2.4);
  ctx.fillStyle = 'rgba(40,30,20,.3)';
  for (let x = 2; x < w; x += 4) ctx.fillRect(x, -h + 2.4, 1.6, 1.4);
}

/** Team standard (signum): square banner with the charge on a crossbar, gilt disc on top. */
function standard(p: IsoPainter, s: ArchStyle, u: number, v: number, team: number): void {
  const ctx = p.ctx;
  post(p, u, v, 0, 58, 1.3, 0x4a3624);
  const [x, y] = p.p(u, v, 0);
  ctx.fillStyle = '#3a2a1c';
  ctx.fillRect(x - 9, y - 52, 18, 2);
  const g = ctx.createLinearGradient(x - 8, 0, x + 8, 0);
  g.addColorStop(0, css(shade(team, 1.15)));
  g.addColorStop(1, css(shade(team, 0.72)));
  ctx.fillStyle = g;
  ctx.fillRect(x - 8, y - 50, 16, 18);
  CHARGES[s.charge](ctx, x, y - 42, 5.5);
  ctx.fillStyle = '#d9b14a';
  ctx.fillRect(x - 8, y - 33, 16, 1.6);
  ctx.beginPath();
  ctx.arc(x, y - 60, 3, 0, Math.PI * 2);
  ctx.fill();
}

/** Jupiter column (a Gallo-Roman honorific column): four-sided base, scaled shaft, gilt rider on top. */
function jupiterColumn(p: IsoPainter, s: ArchStyle, u: number, v: number): void {
  const c = s.palette;
  p.box(u - 0.1, v - 0.1, u + 0.1, v + 0.1, 0, 22, { color: c.ashlar, detail: 'stone' }, c.trim);
  p.box(u - 0.07, v - 0.07, u + 0.07, v + 0.07, 22, 34, { color: c.trim }, c.trim);
  column(p, u, v, 34, 118, 4.2, c.trim);
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 118);
  ctx.fillStyle = css(shade(c.trim, 0.9));
  ctx.fillRect(x - 6, y - 4, 12, 4);
  for (let k = 0; k < 9; k++) {
    ctx.fillStyle = 'rgba(120,108,90,.35)';
    ctx.fillRect(x - 4, y + 10 + k * 9, 8, 1);
  }
  ctx.fillStyle = '#d9b14a';
  ctx.beginPath();
  ctx.ellipse(x, y - 9, 6, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 1.5, y - 20, 3, 10);
  ctx.beginPath();
  ctx.arc(x, y - 22, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x + 5, y - 13, 1.4, 9);
  p.addVolumePoint(u, v, 142);
}

/** Altar before the steps, its fire glowing at dusk. */
function altar(p: IsoPainter, s: ArchStyle, u: number, v: number): void {
  p.box(u - 0.1, v - 0.07, u + 0.1, v + 0.07, 0, 12, { color: s.palette.ashlar, detail: 'stone' }, s.palette.ashlar);
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 12);
  const g = ctx.createRadialGradient(x, y - 3, 0.5, x, y - 3, 6);
  g.addColorStop(0, '#fff0b0');
  g.addColorStop(0.5, '#f08a30');
  g.addColorStop(1, 'rgba(200,60,20,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y - 4, 4, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();
  p.addGlow(x, y - 4, 9);
}

/** Porticus round the back of the forum: a shop wall (lit doorways) under a slate lean-to on columns. */
function porticus(p: IsoPainter, s: ArchStyle): void {
  const c = s.palette;
  const wall = { color: c.plaster, detail: 'plaster' as const };
  p.box(0.12, 0.12, 2.88, 0.34, 0, 46, wall);
  // Shop doorways only where the temple does not stand in front of the wall (no hidden glows); a face is HW px per tile.
  p.leftFace(0.34, 2.88, 0.34, 0, (w) => {
    for (let x = 18; x < w - 10; x += 34) {
      const u = 0.34 + (x + 5.5) / HW;
      if (u > 0.75 && u < 2.42) continue;
      p.window(x, -30, 11, 26, true);
    }
  }, 46);
  p.box(0.12, 0.34, 0.34, 2.88, 0, 46, wall);
  p.rightFace(0.34, 2.88, 0.34, 0, (w) => {
    for (let x = 22; x < w - 10; x += 34) {
      // x runs from the front (v = 2.88) to the back; the temple hides the back part.
      const v = 2.88 - (x + 5.5) / HW;
      if (v < 1.95) continue;
      p.window(x, -30, 11, 26, true);
    }
  }, 46);
  p.material = 'slate';
  porchRoofLeft(p, 0.34, 2.88, 0.34, 0.36, 46, 36, c.roofAlt);
  porchRoofRight(p, 0.7, 2.88, 0.34, 0.36, 46, 36, c.roofAlt);
  for (let u = 0.72; u < 2.88; u += 0.36) column(p, u, 0.68, 0, 36, 2.6, c.ashlar);
  for (let v = 1.08; v < 2.88; v += 0.36) column(p, 0.68, v, 0, 36, 2.6, c.ashlar);
}

function paintTemple(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const stone = c.ashlar;
  const ctx = p.ctx;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0xcfc5ae);
  ctx.strokeStyle = 'rgba(110,98,78,.28)';
  ctx.lineWidth = 1;
  for (let t = 0.3; t < 2.95; t += 0.3) {
    for (const [a, b] of [[p.p(t, 0.05, 0), p.p(t, 2.95, 0)], [p.p(0.05, t, 0), p.p(2.95, t, 0)]] as const) {
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
  }
  porticus(p, s);
  jupiterColumn(p, s, 0.8, 2.3);
  // Podium and the front flight of steps.
  p.box(T0, TV0, T1, TV1, 0, POD, { color: shade(stone, 0.92), detail: 'stone' }, stone);
  p.leftFace(T0, T1, TV1, 0, (w) => {
    ctx.fillStyle = css(shade(stone, 1.12));
    ctx.fillRect(0, -POD, w, 3);
  }, POD);
  for (let k = 3; k >= 0; k--) {
    const v1 = TV1 + 0.1 * (k + 1);
    p.box(T0 + 0.08, TV1, T1 - 0.08, v1, 0, POD - 5.5 * (k + 1) + 5.5, { color: shade(stone, 1.02 - k * 0.03) }, shade(stone, 1.06));
  }
  // Cella with engaged half-columns.
  const wall = { color: stone, detail: 'stone' as const };
  p.box(T0 + 0.06, TV0 + 0.04, T1 - 0.06, CELLA_V, POD, POD + COL, wall);
  p.leftFace(T0 + 0.06, T1 - 0.06, CELLA_V, POD, (w, h) => {
    ctx.fillStyle = css(shade(stone, 1.1));
    ctx.fillRect(w / 2 - 13, -h + 6, 26, h - 6);
    ctx.fillStyle = '#2a1c12';
    ctx.fillRect(w / 2 - 10, -h + 10, 20, h - 10);
    const g = ctx.createLinearGradient(0, -h + 10, 0, 0);
    g.addColorStop(0, 'rgba(255,200,110,.25)');
    g.addColorStop(1, 'rgba(255,170,70,.75)');
    ctx.fillStyle = g;
    ctx.fillRect(w / 2 - 8, -h * 0.55, 16, h * 0.55);
    p.addGlow(...p.p((T0 + T1) / 2, CELLA_V, POD + 14), 14);
  }, COL);
  p.rightFace(TV0 + 0.04, CELLA_V, T1 - 0.06, POD, (w, h) => halfColumns(ctx, w, h, stone, R, 5), COL);
  // Pronaos: the side pair and the hexastyle front.
  for (const v of [1.94, 2.16]) column(p, T1 - 0.07, v, POD, POD + COL, 3.6, c.trim);
  for (let i = 0; i < 6; i++) column(p, T0 + 0.07 + ((T1 - T0 - 0.14) * i) / 5, TV1 - 0.07, POD, POD + COL, 3.6, c.trim);
  // Entablature and the slate pediment with the crest in its tympanum.
  const top = POD + COL;
  p.box(T0, TV0, T1, TV1, top, top + ENT, { color: c.trim }, c.trim);
  p.leftFace(T0, T1, TV1, top, (w, h) => entablature(ctx, w, h, c.trim, 1), ENT);
  p.rightFace(TV0, TV1, T1, top, (w, h) => entablature(ctx, w, h, c.trim, R), ENT);
  p.material = 'slate';
  const rise = 30 * s.roof.pitch;
  p.gableRoof(T0, TV0, T1, TV1, top + ENT, rise, c.roof, c.trim, 'v', 0.05, (w, r) => {
    ctx.strokeStyle = css(shade(c.trim, 0.7));
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(4, -2);
    ctx.lineTo(w / 2, -r + 4);
    ctx.lineTo(w - 4, -2);
    ctx.closePath();
    ctx.stroke();
    crest(ctx, s, w / 2, -r * 0.38, r * 0.2, team);
  });
  const peak = p.p((T0 + T1) / 2, TV1 + 0.05, top + ENT + rise);
  ctx.fillStyle = '#d9b14a';
  ctx.beginPath();
  ctx.arc(peak[0], peak[1] - 3, 3, 0, Math.PI * 2);
  ctx.fill();
  // Before the temple: altar, standards and torches.
  altar(p, s, 1.63, 2.92);
  standard(p, s, 0.9, 2.75, team);
  standard(p, s, 2.4, 2.75, team);
  torch(p, T0 + 0.1, TV1 + 0.38, 18, 1.0, 2.95);
  torch(p, T1 - 0.1, TV1 + 0.38, 18, 2.3, 2.95);
}

/** The French age-1 town centre: the Maison Carrée temple-forum. */
export function maisonCarree(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 160 + s.headroom, paint: (p, team) => paintTemple(p, s, team) };
}
