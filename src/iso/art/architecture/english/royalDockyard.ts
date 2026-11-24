import type { IsoPainter } from '../../isoPainter';
import { css, mix, shade } from '../../palette';
import { cornice, quoins, R } from '../facade';
import { beam, ropeCoil } from '../landmarkProps';
import { barrel } from '../market';
import { logPile, plankStack, post } from '../parts';
import { finial, helm, type HelmProfile } from '../roofs';
import type { ArchStyle } from '../style';
import { roofLift, styledGable } from '../styledRoofs';
import type { BuildingArt } from '../types';
import { hullFar, hullNear, hullSpine, shores, stocks, type Hull } from './dockyardHull';

/*
 * English landmark (M17): the Királyi hajógyár, a Royal Dockyard of the
 * Chatham / Deptford kind. A ship in frame stands on its building slip —
 * the stern planked, the bow a cage of bare ribs — under a pair of sheer
 * legs hoisting the next frame; behind it the two-storey storehouse
 * (a stone ground storey, brick above, a loft door with its hoist beam and
 * a bell cupola flying the team ensign) and an open saw shed with its
 * timber stacks; rope coils, barrels and logs lie about the yard. The
 * storehouse takes the age style's palette and roof (Tudor peg tile,
 * Georgian slate); the ship is always fresh oak.
 */

const STORE: readonly [number, number, number, number] = [1.0, 0.25, 2.74, 1.12];
const STORE_GROUND = 28;
const STORE_EAVE = 84;
const STORE_RISE = 30;
const HULL: Hull = { u0: 0.55, u1: 2.4, vc: 2.12, half: 0.44, depth: 46, keelStern: 14, keelBow: 8, planked: 0.66, plankedUp: 0.97 };
const ROPE = 0xcdb47c;
const SLIP_TIMBER = 0x6a4a2c;
/** Sheer legs: the feet either side of the hull, the head leaning over the bow. */
const LEG_FAR = [0.8, 1.42, 0] as const;
const LEG_NEAR = [0.8, 2.84, 0] as const;
const LEG_HEAD = [0.5, 2.12, 150] as const;
/** Lead bell cupola of the storehouse. */
const CUPOLA: HelmProfile = [[0, 0.11], [5, 0.11], [11, 0.08], [15, 0.04], [18, 0.01]];

/** The yard's paving and the stone slip with its timber ways. */
function ground(p: IsoPainter, s: ArchStyle): void {
  const c = s.palette;
  const ctx = p.ctx;
  const yard = shade(mix(c.stone, 0x8c8270, 0.4), 1.02);
  p.ground(0.05, 0.05, 2.95, 2.95, yard);
  ctx.strokeStyle = css(shade(yard, 0.8), 0.5);
  ctx.lineWidth = 1;
  for (let t = 0.3; t < 2.95; t += 0.3) {
    const a = p.p(0.05, t, 0);
    const b = p.p(2.95, t, 0);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  const slip = shade(c.ashlar, 0.92);
  p.ground(0.4, 1.55, 2.95, 2.7, slip);
  // The ways: two timber rails running down the slip, sleepers across.
  for (const v of [1.82, 2.42]) p.ground(0.45, v - 0.04, 2.95, v + 0.04, SLIP_TIMBER);
  ctx.strokeStyle = css(shade(slip, 0.7), 0.6);
  for (let u = 0.6; u < 2.95; u += 0.22) {
    const a = p.p(u, 1.58, 0);
    const b = p.p(u, 2.67, 0);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
}

/** The storehouse: stone ground storey with loading doors, brick upper storey with windows, the loft door and hoist beam. */
function storehouse(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  const [u0, v0, u1, v1] = STORE;
  p.box(u0, v0, u1, v1, 0, STORE_GROUND, { color: c.stone, detail: 'stone' });
  p.leftFace(u0, u1, v1, 0, (w) => {
    if (s.ornaments.quoins) quoins(ctx, w, STORE_GROUND, c.ashlar, 1);
    for (const x of [w * 0.18, w * 0.5, w * 0.82]) {
      ctx.fillStyle = css(shade(c.ashlar, 1.02));
      ctx.fillRect(x - 11, -24, 22, 24);
      ctx.fillStyle = css(c.doors.gate);
      ctx.fillRect(x - 9, -22, 18, 22);
      ctx.fillStyle = css(shade(c.doors.gate, 0.6));
      ctx.fillRect(x - 0.5, -22, 1, 22);
      for (const y of [-6, -16]) ctx.fillRect(x - 9, y, 18, 1.2);
    }
  }, STORE_GROUND);
  p.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, STORE_GROUND, STORE_EAVE, { color: c.brick, detail: 'brick' });
  const upper = (light: number, bays: number, loft: boolean) => (w: number, h: number) => {
    cornice(ctx, w, 0, c.ashlar, light, 3);
    cornice(ctx, w, h - 4, c.trim, light, 4);
    for (let i = 0; i < bays; i++) {
      const x = (w / bays) * (i + 0.5);
      if (loft && i === Math.floor(bays / 2)) {
        ctx.fillStyle = css(shade(c.trim, light));
        ctx.fillRect(x - 8, -h + 4, 16, 26);
        ctx.fillStyle = css(shade(c.doors.work, light));
        ctx.fillRect(x - 6.5, -h + 6, 13, 24);
        continue;
      }
      for (const y of [-h + 11, -h + 33]) {
        ctx.fillStyle = css(shade(c.trim, light));
        ctx.fillRect(x - 5.5, y - 2, 11, 2);
        p.window(x - 4, y, 8, 14);
      }
    }
  };
  p.leftFace(u0 - 0.02, u1 + 0.02, v1 + 0.02, STORE_GROUND, upper(1, 5, true), STORE_EAVE - STORE_GROUND);
  p.rightFace(v0 - 0.02, v1 + 0.02, u1 + 0.02, STORE_GROUND, upper(R, 2, false), STORE_EAVE - STORE_GROUND);
  p.material = s.roof.material ?? (s.family === 'georgian' ? 'slate' : 'tile');
  styledGable(p, s, u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, STORE_EAVE, STORE_RISE, c.roof, c.brick, 'u');
  // Hoist beam over the loft door, its rope and a bale.
  const um = (u0 + u1) / 2;
  beam(p, [um, v1 + 0.02, STORE_EAVE - 2], [um, v1 + 0.2, STORE_EAVE - 2], c.timber, 3);
  beam(p, [um, v1 + 0.18, STORE_EAVE - 3], [um, v1 + 0.18, STORE_EAVE - 12], ROPE, 1);
  p.box(um - 0.05, v1 + 0.13, um + 0.05, v1 + 0.23, STORE_EAVE - 20, STORE_EAVE - 12, { color: 0xb89a66 }, 0xc8aa76);
  // Bell cupola on the ridge with the team ensign.
  const ridge = STORE_EAVE + STORE_RISE + roofLift(s, STORE_RISE);
  const [cu, cv] = [u1 - 0.45, (v0 + v1) / 2];
  p.box(cu - 0.12, cv - 0.12, cu + 0.12, cv + 0.12, ridge - 12, ridge + 14, { color: c.trim }, c.trim);
  const louvre = (light: number) => (w: number, h: number) => {
    ctx.fillStyle = css(shade(0x1c1814, light));
    ctx.beginPath();
    ctx.moveTo(w / 2 - 4, -12);
    ctx.lineTo(w / 2 - 4, -h + 7);
    ctx.arc(w / 2, -h + 7, 4, Math.PI, 0);
    ctx.lineTo(w / 2 + 4, -12);
    ctx.fill();
  };
  p.leftFace(cu - 0.12, cu + 0.12, cv + 0.12, ridge - 12, louvre(1), 26);
  p.rightFace(cv - 0.12, cv + 0.12, cu + 0.12, ridge - 12, louvre(R), 26);
  helm(p, cu, cv, ridge + 14, CUPOLA, c.metal);
  finial(p, cu, cv, ridge + 31, 10, false);
  p.flag(cu, cv, ridge + 38, 22, team, true);
}

/** Open saw shed on posts with stacked planks and a log pile under its roof. */
function sawShed(p: IsoPainter, s: ArchStyle): void {
  const c = s.palette;
  const [u0, v0, u1, v1] = [0.2, 0.28, 0.86, 1.22];
  plankStack(p, u0 + 0.1, v0 + 0.1, u1 - 0.12, v0 + 0.45, 14);
  logPile(p, u0 + 0.32, v1 - 0.12, 6, 0x7a4e2a, 0xd9b07a);
  for (const [u, v] of [[u0, v0], [u1, v0], [u0, v1], [u1, v1]] as const) post(p, u, v, 0, 36, 2.4, c.timber);
  p.material = s.roof.material ?? (s.family === 'georgian' ? 'slate' : 'tile');
  p.gableRoof(u0, v0, u1, v1, 36, 20, c.roofAlt, c.planks, 'v', 0.08);
}

/** One sheer leg, from its foot to the shared head. */
function leg(p: IsoPainter, foot: readonly [number, number, number], color: number): void {
  beam(p, foot, LEG_HEAD, color, 4);
}

function paintDockyard(p: IsoPainter, s: ArchStyle, team: number): void {
  const legWood = 0x5e4026;
  p.footShadow();
  ground(p, s);
  sawShed(p, s);
  storehouse(p, s, team);
  // The far sheer leg and the back-stay to its anchor, then the ship on its slip.
  leg(p, LEG_FAR, legWood);
  beam(p, LEG_HEAD, [1.7, 1.45, 0], ROPE, 1);
  stocks(p, HULL, SLIP_TIMBER);
  shores(p, HULL, -1, SLIP_TIMBER);
  hullFar(p, HULL);
  hullSpine(p, HULL);
  hullNear(p, HULL);
  shores(p, HULL, 1, SLIP_TIMBER);
  // The near leg, the lashing at the head, the tackle hoisting a frame and the pennant.
  leg(p, LEG_NEAR, legWood);
  const ctx = p.ctx;
  const [hx, hy] = p.p(...LEG_HEAD);
  ctx.fillStyle = css(ROPE);
  ctx.fillRect(hx - 3, hy - 1, 6, 4);
  beam(p, LEG_HEAD, [0.5, 2.12, 106], ROPE, 1.1);
  const frame = [...Array(9).keys()].map((k) => {
    const a = -Math.PI / 2 + (k / 8) * Math.PI;
    return [0.5, 2.12 + Math.sin(a) * 0.22, 104 - Math.cos(a) * 20] as const;
  });
  for (let k = 0; k < 8; k++) beam(p, frame[k]!, frame[k + 1]!, 0x8a5c30, 2.6);
  p.flag(LEG_HEAD[0], LEG_HEAD[1], LEG_HEAD[2], 14, team);
  // Stores in the yard: rope coils, barrels, a log pile.
  ropeCoil(p, 0.42, 2.8, 0, 9, ROPE);
  ropeCoil(p, 0.72, 2.86, 0, 7, ROPE);
  barrel(p, 1.05, 2.82);
  barrel(p, 1.25, 2.88);
  barrel(p, 1.15, 2.7);
  logPile(p, 2.0, 2.85, 7, 0x7a4e2a, 0xd9b07a);
  ropeCoil(p, 2.8, 1.4, 0, 8, ROPE);
  barrel(p, 2.62, 1.36);
}

/** The English landmark: the Royal Dockyard, in the age style's palette. */
export function royalDockyardArt(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 200 + s.headroom, paint: (p, team) => paintDockyard(p, s, team) };
}
