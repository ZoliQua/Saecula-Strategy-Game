import { TOWER_PLATFORM_Z } from '../../../../config/visual';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { crest, quoins, R } from '../facade';
import { pot } from '../kits/patio';
import { archer } from '../towerParts';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';
import { balustrade } from '../wonderParts';
import { banner, block, cornicione, cupola, rustication, type Block } from './italianParts';
import { loggia } from './loggia';
import { ashlarWall, openTop, palazzo } from './rinascParts';

/*
 * Italian age-3 house and tower. The house is a palazzetto: rusticated
 * ground storey, a piano nobile of round-headed bifore, a heavy cornice
 * over a near-flat roof and an open roof loggia (altana) on its back
 * corner. The tower rises from a rusticated foot to a balustraded
 * platform whose corner piers carry a small ribbed dome and lantern.
 */

const HOUSE: Block = [0.25, 0.3, 1.75, 1.72];

function paintPalazzetto(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.1, 0.1, 1.9, 1.9, 0xc2b394);
  const top = palazzo(p, s, HOUSE, {
    ground: 26, storey: 26, storeys: 2, finish: 'ashlar', bays: [3, 2], litLeft: [0, 1],
    groundLeft: (w) => p.door(w * 0.45, 13, 19, shade(team, 0.75)),
    nobileLeft: (w, h) => banner(p.ctx, w * 0.9, -h + 30, 6, 16, team, 1),
    rise: 14,
  });
  const alt: Block = [0.38, 0.42, 0.98, 1.0];
  p.box(alt[0], alt[1], alt[2], alt[3], top, top + 4, ashlarWall(s), shade(c.ashlar, 0.9));
  openTop(p, s, alt, top + 4, top + 30, [2, 2], ashlarWall(s), () => pot(p, 0.7, 0.72, top + 4));
}

function paintRinascTower(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const z = TOWER_PLATFORM_Z[3];
  const ctx = p.ctx;
  p.footShadow();
  block(p, [0.08, 0.08, 0.92, 0.92], 0, 32, { color: c.stone }, (w, h) => {
    rustication(ctx, w, 0, h, c.stone, 1, 8);
    p.door(w / 2 - 6, 12, 22, shade(team, 0.75));
  }, (w, h) => rustication(ctx, w, 0, h, c.stone, R, 8), c.stone);
  const face = (light: number, front: boolean) => (w: number, h: number) => {
    quoins(ctx, w, h, shade(c.ashlar, 1.1), light);
    ctx.fillStyle = css(shade(c.trim, light));
    ctx.fillRect(w / 2 - 6, -h + 12, 12, 24);
    p.window(w / 2 - 4, -h + 15, 8, 19, true);
    if (front) crest(ctx, s, w / 2, -h * 0.4, 6.5, team);
  };
  block(p, [0.14, 0.14, 0.86, 0.86], 32, z - 7, ashlarWall(s), face(1, true), face(R, false));
  cornicione(p, [0.14, 0.14, 0.86, 0.86], z - 7, 7, 0.06, shade(c.ashlar, 1.06));
  const room: Block = [0.12, 0.12, 0.88, 0.88];
  const o = { wall: ashlarWall(s), trim: c.trim, bays: [1, 1] as const, pier: 0.08, band: 6 };
  loggia(p, room, z, z + 34, 'back', o);
  archer(p, 0.5, 0.58, z, team, 'tricorn');
  loggia(p, room, z, z + 34, 'front', o);
  balustrade(p, 0.1, 0.1, 0.9, 0.9, z);
  cornicione(p, room, z + 34, 5, 0.04, shade(c.ashlar, 1.06));
  cupola(p, 0.5, 0.5, z + 39, 0.3, 6, c.ashlar, c.metal, c.trim);
}

/** The Italian age-3 house: a palazzetto with a roof altana. */
export function palazzetto(s: ArchStyle): BuildingArt {
  return { size: 2, maxHeight: 150, paint: (p, team) => paintPalazzetto(p, s, team) };
}

/** The Italian age-3 tower: a rusticated tower under a small dome. */
export function torreCupola(s: ArchStyle): BuildingArt {
  return { size: 1, maxHeight: 250, paint: (p, team) => paintRinascTower(p, s, team) };
}
