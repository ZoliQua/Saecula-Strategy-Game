import type { IsoPainter } from '../../isoPainter';
import { css } from '../../palette';
import { baroqueBlock, pediment } from '../baroqueParts';
import { archedOpening, baroqueWindow, clockFace, cornice } from '../facade';
import { lantern } from '../parts';
import { finial, helm, type HelmProfile } from '../roofs';
import type { ArchStyle } from '../style';
import { styledHip } from '../styledRoofs';
import type { BuildingArt } from '../types';

/*
 * French age-3 town centre: an hôtel de ville of the Grand Siècle — a
 * corps de logis between two end pavilions and a taller central
 * pavilion, each under its own tall slate pavilion roof (kits/
 * pavilionRoof.ts, through the style's 'pavilion' form) with
 * oeil-de-boeuf dormers; a pediment with the crest and a clock, and an
 * open campanile with a lead dome on the central roof.
 */

type Block = readonly [u0: number, v0: number, u1: number, v1: number];

const CORPS: Block = [0.45, 0.85, 2.55, 1.9];
const LEFT: Block = [0.3, 0.7, 1.0, 2.2];
const CENTRE: Block = [1.18, 0.78, 1.82, 2.32];
const RIGHT: Block = [2.0, 0.7, 2.7, 2.2];
const CORPS_H = 78;
const WING_H = 88;
const CENTRE_H = 102;

/** Lead campanile dome over an open lantern. */
const CAMPANILE: HelmProfile = [[0, 0.13], [4, 0.13], [10, 0.11], [15, 0.07], [18, 0.03], [20, 0.01]];

/** Two storeys of tall windows per bay: arched below the string course, segmental above. */
function storeys(p: IsoPainter, s: ArchStyle, w: number, h: number, light: number, bays: number, door = false): void {
  cornice(p.ctx, w, 36, s.palette.trim, light, 4);
  for (let i = 0; i < bays; i++) {
    const x = (w / bays) * (i + 0.5);
    if (!(door && i === Math.floor(bays / 2))) p.window(x - 4.5, -30, 9, 20, true);
    baroqueWindow(p, s, x - 5, -h + 14, 10, 22, light);
  }
}

function block(p: IsoPainter, s: ArchStyle, [u0, v0, u1, v1]: Block, h: number, bays: number, door = false): void {
  baroqueBlock(p, s, u0, v0, u1, v1, 0, h, {
    bays,
    left: (w, hh, l) => storeys(p, s, w, hh, l, bays, door),
    right: (w, hh, l) => storeys(p, s, w, hh, l, Math.max(2, bays - 1)),
  });
}

function paintHotel(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  const k = s.roof.pitch;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0xc9c0aa);
  ctx.strokeStyle = 'rgba(96,86,70,.22)';
  ctx.lineWidth = 1;
  for (let t = 0.2; t < 2.95; t += 0.18) {
    const a = p.p(0.05, t, 0);
    const b = p.p(2.95, t, 0);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  block(p, s, CORPS, CORPS_H, 6);
  styledHip(p, s, ...CORPS, CORPS_H, 36, c.roof, 0.06);
  block(p, s, LEFT, WING_H, 2);
  styledHip(p, s, ...LEFT, WING_H, 48, c.roof, 0.06);
  // Central pavilion: portal, balcony window, pediment with the crest, the clock in the roof.
  const [cu0, cv0, cu1, cv1] = CENTRE;
  baroqueBlock(p, s, cu0, cv0, cu1, cv1, 0, CENTRE_H, {
    bays: 2,
    left: (w, h, l) => {
      cornice(ctx, w, 40, c.trim, l, 5);
      archedOpening(ctx, w / 2 - 12, 24, 34, c.trim, 0x22180f, l);
      p.door(w / 2 - 9, 18, 30, c.doors.main);
      baroqueWindow(p, s, w / 2 - 7, -h + 16, 14, 30, l);
      ctx.fillStyle = '#1e1c1c';
      ctx.fillRect(w / 2 - 12, -h + 46, 24, 1.6);
      for (let x = w / 2 - 11; x <= w / 2 + 11; x += 3) ctx.fillRect(x, -h + 40, 0.9, 6);
    },
    right: (w, h, l) => storeys(p, s, w, h, l, 3),
  });
  pediment(p, s, cu0 + 0.04, cu1 - 0.04, cv1, CENTRE_H, 26, team);
  styledHip(p, s, cu0, cv0, cu1, cv1, CENTRE_H, 58, c.roof, 0.06);
  const flat = CENTRE_H + 58 * k;
  const [mu, mv] = [(cu0 + cu1) / 2, (cv0 + cv1) / 2];
  // Campanile: open lantern on the flat, lead dome, gilt finial and the pennant.
  p.box(mu - 0.1, mv - 0.1, mu + 0.1, mv + 0.1, flat, flat + 18, { color: c.trim }, c.trim);
  p.leftFace(mu - 0.1, mu + 0.1, mv + 0.1, flat, (w) => {
    ctx.fillStyle = '#1c1814';
    ctx.beginPath();
    ctx.moveTo(w / 2 - 4, 0);
    ctx.lineTo(w / 2 - 4, -11);
    ctx.arc(w / 2, -11, 4, Math.PI, 0);
    ctx.lineTo(w / 2 + 4, 0);
    ctx.fill();
  }, 18);
  p.rightFace(mv - 0.1, mv + 0.1, mu + 0.1, flat, (w) => clockFace(ctx, w / 2, -9, 5.5), 18);
  helm(p, mu, mv, flat + 18, CAMPANILE, c.metal);
  finial(p, mu, mv, flat + 38, 14, false);
  p.flag(mu + 0.06, mv + 0.06, flat + 50, 18, team, true);
  block(p, s, RIGHT, WING_H, 2);
  styledHip(p, s, ...RIGHT, WING_H, 48, c.roof, 0.06);
  // Lanterns at the portal, a pair of team banners on the end pavilions.
  lantern(p, cu0 + 0.05, cv1 + 0.02, 30, cu0, cv1 + 0.3);
  lantern(p, cu1 - 0.05, cv1 + 0.02, 30, cu1, cv1 + 0.3);
  for (const [u0, , u1, v1] of [LEFT, RIGHT]) {
    p.leftFace(u0, u1, v1, 0, (w) => {
      ctx.fillStyle = css(team);
      ctx.fillRect(w / 2 - 4, -66, 8, 22);
      ctx.fillStyle = '#d9b14a';
      ctx.fillRect(w / 2 - 4, -66, 8, 1.6);
    }, WING_H);
  }
}

/** The French age-3 town centre: an hôtel de ville of slate pavilions. */
export function hotelDeVille(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 200 + s.headroom, paint: (p, team) => paintHotel(p, s, team) };
}
