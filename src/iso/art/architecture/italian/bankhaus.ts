import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { cypress, pot } from '../kits/patio';
import { lantern } from '../parts';
import type { ArchStyle } from '../style';
import { parapet } from '../towerParts';
import type { BuildingArt } from '../types';
import { banco, familyArms, rusticPortal } from './bankParts';
import { lowHip, type Block } from './italianParts';
import { loggia } from './loggia';
import { openTop, palazzo, whiteWall } from './rinascParts';

/*
 * Italian landmark (M17): the Bankház, a banking family's palazzo after
 * the Palazzo Medici-Riccardi and Palazzo Strozzi in Florence. A cubic
 * block with a rusticated ground storey, two storeys of round-arched
 * twin lights (bifore) between string courses, a heavy cornicione and a
 * low tile hip with a roof altana; the family arms in a crowned
 * cartouche over the rusticated portal, iron lanterns at the corner. A
 * loggia of round arches on the front shelters the banker's table
 * (banco) with its green cloth, coins, ledger and scales; a walled
 * garden of cypresses closes the side. The stone, trim and roof follow
 * the age: grey pietra and travertine in the Comune, honey pietraforte
 * and pietra serena in the Rinascimento.
 */

const PAL: Block = [0.25, 0.25, 2.2, 1.95];
const LOGGIA: Block = [1.1, 1.95, 2.2, 2.52];
const GROUND = 54;
const STOREY = 34;
const LOGGIA_TOP = 40;
const ALTANA: Block = [0.45, 0.45, 1.25, 1.15];

function garden(p: IsoPainter, s: ArchStyle): void {
  const c = s.palette;
  p.ground(2.2, 0.25, 2.85, 2.85, 0x6f8a48);
  p.ground(2.3, 0.35, 2.75, 2.75, 0x7c9a52);
  for (const [u, v, h] of [[2.52, 0.55, 46], [2.5, 1.15, 52], [2.55, 1.75, 44]] as const) cypress(p, u, v, 0, h);
  pot(p, 2.45, 2.35, 0, '#f3c623');
  pot(p, 2.62, 2.5, 0, '#f3c623');
  const wall = { color: c.plaster, detail: 'plaster' as const };
  p.box(2.79, 0.25, 2.85, 2.85, 0, 16, wall, c.trim);
  p.box(2.2, 2.79, 2.85, 2.85, 0, 16, wall, c.trim);
}

function paintBank(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, shade(c.stone, 0.9));
  p.ground(0.12, 1.95, 2.2, 2.9, shade(c.ashlar, 0.92));
  const top = palazzo(p, s, PAL, {
    ground: GROUND,
    storey: STOREY,
    storeys: 2,
    finish: 'ashlar',
    bays: [4, 3],
    litRight: [0, 1, 2],
    overhang: 0.09,
    groundLeft: (w, h) => {
      // Stone bench (panca di via) along the foot of the façade.
      ctx.fillStyle = css(shade(c.ashlar, 1.05));
      ctx.fillRect(0, -6, w, 3);
      ctx.fillStyle = css(shade(c.ashlar, 0.6));
      ctx.fillRect(0, -3, w, 3);
      const x = (0.68 - PAL[0]) * 64;
      rusticPortal(ctx, s, x - 10, 20, 32, 1);
      familyArms(ctx, s, x, -h + 12, 7, team, 1);
    },
    groundRight: (w, h) => {
      ctx.fillStyle = '#17110c';
      for (const x of [w * 0.25, w * 0.55, w * 0.85]) {
        ctx.fillRect(x - 4, -h + 14, 8, 9);
        ctx.fillStyle = css(shade(0x2a2522, 1.4));
        for (let xx = x - 3; xx < x + 4; xx += 2.4) ctx.fillRect(xx, -h + 14, 0.8, 9);
        ctx.fillStyle = '#17110c';
      }
    },
  }, false);
  lowHip(p, s, PAL, top, 18, c.roof, 0.07);
  // The roof altana: an open arched loggia over the back of the roof.
  p.box(ALTANA[0], ALTANA[1], ALTANA[2], ALTANA[3], top, top + 8, { color: c.ashlar, detail: 'plaster' }, c.ashlar);
  openTop(p, s, ALTANA, top + 8, top + 30, [2, 2], whiteWall(s));
  p.flag(1.9, 0.6, top + 18 * s.roof.pitch, 30, team, true);
  garden(p, s);
  // Corner lantern and torch ring.
  lantern(p, 0.25, 1.95 + 0.04, 40, 0.25, 2.2);
  // The bankers' loggia on the front with the banco under it.
  const o = { wall: { color: c.ashlar, detail: 'plaster' as const }, trim: shade(c.trim, 1.02), bays: [3, 1] as const, pier: 0.05, band: 6 };
  loggia(p, LOGGIA, 0, LOGGIA_TOP, 'back', o);
  loggia(p, LOGGIA, 0, LOGGIA_TOP, 'front', o);
  // A flat terrace on the loggia behind a balustrade.
  const [u0, v0, u1, v1] = LOGGIA;
  p.ground(u0, v0, u1, v1, shade(c.ashlar, 0.88), LOGGIA_TOP);
  parapet(p, u0, v0, u1, v1, LOGGIA_TOP, { color: shade(c.ashlar, 1.06) }, 'back', 0);
  parapet(p, u0, v0, u1, v1, LOGGIA_TOP, { color: shade(c.ashlar, 1.06) }, 'front', 0);
  // The banker's table set out before the loggia, as on the Mercato Nuovo.
  banco(p, 1.62, 2.74);
}

/** The Italian landmark: the Bankház palazzo, in the age style's palette. */
export function bankhausArt(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: GROUND + STOREY * 2 + 6 + 40 + 40 + s.headroom, paint: (p, team) => paintBank(p, s, team) };
}
