import type { Ctx } from '../../canvas';
import { HW, type IsoPainter } from '../../isoPainter';
import { N_LEFT } from '../../lighting/viewSpace';
import { css, shade } from '../../palette';
import { CHARGES } from '../charges';
import { R } from '../facade';
import { arcade, basin, patioFloor, patioShade } from '../kits/patio';
import { column, post, torch } from '../parts';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';
import { framedCrest, portal, windowAt } from './hispaniaOrnament';
import { block, hallRoof, roofOver, type Block } from './hispaniaParts';

/*
 * Spanish age-1 town centre: a forum behind an aqueduct, after Segovia.
 * The two-tier arcade of unmortared granite runs along the back of the
 * plot; the forum before it holds the basilica (whitewashed, under low
 * terracotta) with its portal and crest, a flat-roofed row of shops,
 * the castellum basin the aqueduct feeds, an honorific column and the
 * owner's standards.
 */

const GRANITE = 0x9a9284;
const AQ_V0 = 0.16;
const AQ_V1 = 0.27;
const SPAN = 0.5;
const PIER = 0.13;
/** Tier tops and arch springings (art px). */
const LOW_TOP = 92;
const HIGH_TOP = 136;
const CHANNEL = 146;

/** Rough coursed granite joints on a face (face-local). */
function coursing(ctx: Ctx, w: number, h: number, light: number): void {
  ctx.fillStyle = css(shade(GRANITE, light * 0.66), 0.55);
  for (let y = 5, row = 0; y < h; y += 6, row++) {
    ctx.fillRect(0, -y, w, 0.8);
    for (let x = (row % 2) * 5; x < w; x += 10) ctx.fillRect(x, -y, 0.8, 6);
  }
}

/** Spandrels of one arcade tier between piers on the +v plane: wall from `spring - r` to `top` with round heads cut out. */
function tier(p: IsoPainter, z0: number, top: number): void {
  const ctx = p.ctx;
  const n = Math.round(3 / SPAN);
  p.leftFace(0, 3, AQ_V1, z0, (w, h) => {
    const bay = SPAN * HW;
    const pier = PIER * HW;
    const r = (bay - pier) / 2;
    const spring = h - 6 - r;
    ctx.fillStyle = css(GRANITE);
    for (let i = 0; i < n; i++) {
      const x0 = i * bay + pier / 2;
      const x1 = x0 + bay - pier;
      ctx.beginPath();
      ctx.moveTo(x0, -spring);
      ctx.lineTo(x0, -h);
      ctx.lineTo(x1, -h);
      ctx.lineTo(x1, -spring);
      ctx.arc((x0 + x1) / 2, -spring, r, 0, Math.PI, true);
      ctx.closePath();
      ctx.fill();
      // Voussoirs.
      ctx.strokeStyle = css(shade(GRANITE, 0.62), 0.7);
      ctx.lineWidth = 0.8;
      for (let k = 1; k < 6; k++) {
        const a = Math.PI + (k / 6) * Math.PI;
        const cx = (x0 + x1) / 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r, -spring + Math.sin(a) * r);
        ctx.lineTo(cx + Math.cos(a) * (r + 4), -spring + Math.sin(a) * (r + 4));
        ctx.stroke();
      }
    }
    // Cornice band at the top of the tier.
    ctx.fillStyle = css(shade(GRANITE, 1.12));
    ctx.fillRect(0, -h, w, 3);
    ctx.fillStyle = css(shade(GRANITE, 0.7));
    ctx.fillRect(0, -h + 3, w, 1);
  }, top - z0);
  // Normals of the spandrel band (the openings are painted over later by nothing: they stay transparent).
  const band = [p.p(0, AQ_V1, top - 18), p.p(3, AQ_V1, top - 18), p.p(3, AQ_V1, top), p.p(0, AQ_V1, top)];
  p.normals.fill(band, N_LEFT);
}

/** The aqueduct: tall piers, two arcade tiers and the covered channel (specus) on top. */
function aqueduct(p: IsoPainter): void {
  const n = Math.round(3 / SPAN);
  const pierAt = (i: number) => i * SPAN;
  for (let i = 0; i <= n; i++) {
    const u = Math.min(3 - PIER / 2, Math.max(PIER / 2, pierAt(i)));
    const lowW = PIER * 1.25;
    p.box(u - lowW / 2, AQ_V0 - 0.02, u + lowW / 2, AQ_V1 + 0.02, 0, 46, { color: shade(GRANITE, 0.96) });
    p.leftFace(u - lowW / 2, u + lowW / 2, AQ_V1 + 0.02, 0, (w, h) => coursing(p.ctx, w, h, 1), 46);
    p.rightFace(AQ_V0 - 0.02, AQ_V1 + 0.02, u + lowW / 2, 0, (w, h) => coursing(p.ctx, w, h, R), 46);
    p.box(u - PIER / 2, AQ_V0, u + PIER / 2, AQ_V1, 46, HIGH_TOP, { color: GRANITE });
    p.leftFace(u - PIER / 2, u + PIER / 2, AQ_V1, 46, (w, h) => coursing(p.ctx, w, h, 1), HIGH_TOP - 46);
    p.rightFace(AQ_V0, AQ_V1, u + PIER / 2, 46, (w, h) => coursing(p.ctx, w, h, R), HIGH_TOP - 46);
  }
  tier(p, LOW_TOP - 30, LOW_TOP);
  tier(p, HIGH_TOP - 30, HIGH_TOP);
  p.box(0, AQ_V0 + 0.02, 3, AQ_V1 - 0.02, HIGH_TOP, CHANNEL, { color: shade(GRANITE, 1.04), detail: 'stone' }, shade(GRANITE, 1.1));
  for (const u of [0, 1.5, 3]) p.addVolumePoint(u, (AQ_V0 + AQ_V1) / 2, CHANNEL);
}

/** Honorific column with a gilt statue, on a pedestal at (u, v). */
function honorific(p: IsoPainter, s: ArchStyle, u: number, v: number): void {
  p.box(u - 0.09, v - 0.09, u + 0.09, v + 0.09, 0, 18, { color: s.palette.ashlar, detail: 'stone' }, s.palette.trim);
  column(p, u, v, 18, 76, 3.6, 0xe6dccb);
  const [x, y] = p.p(u, v, 76);
  const ctx = p.ctx;
  ctx.fillStyle = '#d9b14a';
  ctx.fillRect(x - 2, y - 14, 4, 12);
  ctx.beginPath();
  ctx.arc(x, y - 16, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x + 2, y - 12, 4, 1.4);
  p.addVolumePoint(u, v, 94);
}

/** Team standard: square banner with the charge on a crossbar. */
function standard(p: IsoPainter, s: ArchStyle, u: number, v: number, team: number): void {
  post(p, u, v, 0, 54, 1.3, 0x4a3624);
  const [x, y] = p.p(u, v, 0);
  const ctx = p.ctx;
  ctx.fillStyle = css(team);
  ctx.fillRect(x - 7, y - 48, 14, 16);
  CHARGES[s.charge](ctx, x, y - 40, 4.6);
  ctx.fillStyle = '#d9b14a';
  ctx.fillRect(x - 8, y - 49, 16, 1.6);
}

function paintForum(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const basilica: Block = [0.3, 0.5, 1.15, 2.3];
  const shops: Block = [2.45, 0.6, 2.85, 2.2];
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0xb5a98e);
  aqueduct(p);
  patioFloor(p, 0.2, 0.36, 2.9, 2.9, 0, { color: 0xcbbfa3, pattern: 'flags', cell: 0.3 });
  patioShade(p, 0.2, 0.36, 2.9, 2.9, 0, 0.25, 0.3);
  // Basilica: whitewash on a granite plinth, its long side glazed, its end with the portal and the crest.
  block(p, s, basilica, 0, 62, (w, h) => {
    portal(p, s, w / 2 - 10, 20, 32, team, 1);
    framedCrest(p, s, w / 2, -h + 14, 6, team, 1);
  }, (w, h) => {
    for (let i = 0; i < 4; i++) windowAt(p, s, w * (0.12 + i * 0.22), -h + 14, 9, 13, R);
  });
  hallRoof(p, s, basilica, 62, 30);
  // Castellum basin fed from the aqueduct, the column, the standards.
  basin(p, 1.85, 0.75, 0, 0.22, c.ashlar, 16);
  honorific(p, s, 1.6, 1.65);
  // Shops (tabernae) along the right edge, flat-roofed, with an arcade on their street side.
  block(p, s, shops, 0, 34, undefined, (w, h) => arcade(p.ctx, w, h, { bays: 4, head: 'round', wall: c.plaster, light: R, rise: 0.7 }));
  roofOver(p, s, shops, 34, 18);
  standard(p, s, 1.35, 2.6, team);
  standard(p, s, 2.3, 2.6, team);
  torch(p, 0.5, 2.31, 30, 0.5, 2.6);
  torch(p, 0.95, 2.31, 30, 0.95, 2.6);
}

/** The Spanish age-1 town centre: a forum behind the aqueduct. */
export function forum(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 170, paint: (p, team) => paintForum(p, s, team) };
}
