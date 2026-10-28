import { TOWER_PLATFORM_Z } from '../../../../config/visual';
import type { IsoPainter, WallStyle } from '../../isoPainter';
import { N_UP } from '../../lighting/viewSpace';
import { css, shade } from '../../palette';
import { R } from '../facade';
import { post } from '../parts';
import type { ArchStyle } from '../style';
import { archer, brazier, parapet, type Headgear } from '../towerParts';
import type { BuildingArt } from '../types';
import { hasNeedleSpires, needleSpire, spireRoom } from '../kits/needleSpire';
import { hangingBanner } from './englishParts';
import { NORMAN_RAGSTONE as RAGSTONE } from './englishStyles';
import { drumWall } from './roundhouse';

type Pt = readonly [number, number];

/*
 * English towers, one silhouette per age: a timber watchtower with a
 * thatched cap on an earth mound (Romano-British), a square Norman
 * tower with clasping buttresses, a corbel table, square merlons and a
 * stair turret (Tudor / Norman), and a round brick Martello tower with
 * a raised door and a gun platform (Georgian). The fighting platform
 * stays at TOWER_PLATFORM_Z, where the arrows leave from.
 */

/** Platform contents: fire basket and the archer. */
function lookout(p: IsoPainter, u0: number, u1: number, z: number, team: number, hat: Headgear): void {
  brazier(p, u0 + 0.2, u1 - 0.18, z, 1.25, 1.35);
  archer(p, u1 - 0.26, u0 + 0.3, z, team, hat);
}

function line(p: IsoPainter, a: Pt, b: Pt, color: number, width: number): void {
  p.ctx.strokeStyle = css(color);
  p.ctx.lineWidth = width;
  p.ctx.beginPath();
  p.ctx.moveTo(a[0], a[1]);
  p.ctx.lineTo(b[0], b[1]);
  p.ctx.stroke();
}

/** Turfed earth mound under a timber tower (a small motte). */
function mound(p: IsoPainter, h: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(0.5, 0.5, 0);
  const rx = 52;
  const g = ctx.createLinearGradient(x - rx, y - h, x + rx, y);
  g.addColorStop(0, '#7c9a4c');
  g.addColorStop(0.6, '#5a7636');
  g.addColorStop(1, '#3c5226');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - rx, y - 2);
  ctx.quadraticCurveTo(x - rx * 0.6, y - h - 12, x, y - h - 14);
  ctx.quadraticCurveTo(x + rx * 0.6, y - h - 12, x + rx, y - 2);
  ctx.quadraticCurveTo(x, y + 14, x - rx, y - 2);
  ctx.fill();
  p.normalCylinder(x - rx, y - h - 14, rx * 2, h + 26);
}

/** Age 1: braced timber watchtower on a mound, plank breastwork, thatched pyramid cap on corner posts. */
export function timberWatchtower(s: ArchStyle): BuildingArt {
  const c = s.palette;
  return {
    size: 1,
    maxHeight: 240,
    paint: (p, team) => {
      const z = TOWER_PLATFORM_Z[1];
      const base = 8;
      p.footShadow();
      mound(p, base);
      const corners = [[0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]] as const;
      const legs: Pt[][] = [];
      // Back three posts, the braces on the two visible sides, then the front post.
      for (const [u, v] of corners.slice(0, 3)) post(p, u, v, base, z, 3.4, c.timber);
      for (const [a0, b0, a1, b1] of [[0.2, 0.8, 0.8, 0.8], [0.8, 0.2, 0.8, 0.8]] as const) {
        for (const [zl, zh] of [[base + 6, 64], [64, z - 8]] as const) {
          const pa: Pt[] = [p.p(a0, b0, zl), p.p(a1, b1, zh)];
          const pb: Pt[] = [p.p(a1, b1, zl), p.p(a0, b0, zh)];
          line(p, pa[0]!, pa[1]!, shade(c.timber, 0.9), 2.2);
          line(p, pb[0]!, pb[1]!, shade(c.timber, 0.9), 2.2);
          legs.push(pa, pb);
        }
      }
      // Ladder up the lit side.
      for (const du of [0.42, 0.56]) legs.push([p.p(du, 0.86, base), p.p(du, 0.8, z - 6)]);
      for (const l of legs.slice(-2)) line(p, l[0]!, l[1]!, shade(c.timber, 1.1), 1.6);
      for (let k = base + 8; k < z - 8; k += 9) line(p, p.p(0.42, 0.85, k), p.p(0.56, 0.85, k), shade(c.timber, 1.1), 1.2);
      p.normals.cylinderStroke(legs, 2.4, p.p(0.2, 0.8, 0)[0], p.p(0.8, 0.2, 0)[0] - p.p(0.2, 0.8, 0)[0]);
      post(p, 0.8, 0.8, base, z, 3.4, c.timber);
      // Platform and plank breastwork.
      const planks: WallStyle = { color: c.board, detail: 'planks' };
      p.box(0.1, 0.1, 0.9, 0.9, z - 7, z, planks, c.board);
      const breast = (side: 'back' | 'front') => {
        const t = 0.05;
        const boxes = side === 'back' ? [[0.1, 0.1, 0.9, 0.1 + t], [0.1, 0.1, 0.1 + t, 0.9]] : [[0.1, 0.9 - t, 0.9, 0.9], [0.9 - t, 0.1, 0.9, 0.9]];
        for (const [a, b, e, f] of boxes) p.box(a!, b!, e!, f!, z, z + 13, planks, c.board);
      };
      breast('back');
      lookout(p, 0.1, 0.9, z, team, 'galea');
      breast('front');
      p.rightFace(0.1, 0.9, 0.9, z, (w) => hangingBanner(p.ctx, w / 2 - 6, -12, 12, 24, team, R, s.charge), 13);
      // Cap posts and the steep thatched pyramid.
      const cap = z + 30;
      for (const [u, v] of corners) post(p, u - (u < 0.5 ? 0.06 : -0.06), v - (v < 0.5 ? 0.06 : -0.06), z + 13, cap, 2.4, c.timber);
      p.material = 'thatch';
      const rise = 34 * s.roof.pitch;
      p.hipRoof(0.1, 0.1, 0.9, 0.9, cap, rise, c.thatch, 0.1);
      p.flag(0.5, 0.5, cap + rise - 2, 22, team);
    },
  };
}

/** Age 2: square Norman tower — battered plinth, clasping buttresses, corbel table, square merlons, stair turret. */
export function normanTower(s: ArchStyle): BuildingArt {
  const c = s.palette;
  return {
    size: 1,
    maxHeight: 220 + spireRoom(s, 40),
    paint: (p, team) => {
      const z = TOWER_PLATFORM_Z[2];
      const stone = c.towerStone ?? RAGSTONE;
      const wall: WallStyle = { color: stone, detail: 'stone' };
      const ctx = p.ctx;
      p.footShadow();
      p.box(0.07, 0.07, 0.93, 0.93, 0, 16, { color: shade(c.stone, 0.9), detail: 'fieldstone' }, c.stone);
      p.box(0.13, 0.13, 0.87, 0.87, 16, z, wall);
      const face = (light: number, front: boolean) => (w: number, h: number) => {
        for (const x of [0, w - 7]) {
          ctx.fillStyle = css(shade(stone, light * 1.12));
          ctx.fillRect(x, -h, 7, h);
          ctx.fillStyle = css(shade(stone, light * 0.7));
          ctx.fillRect(x + (x === 0 ? 6 : 0), -h, 1.2, h);
        }
        for (const y of [h * 0.38, h * 0.74]) {
          ctx.fillStyle = css(shade(stone, light * 1.15));
          ctx.fillRect(0, -y - 2.6, w, 2.2);
        }
        // Corbel table under the parapet.
        ctx.fillStyle = css(shade(stone, light * 0.82));
        ctx.fillRect(0, -h, w, 3);
        for (let x = 4; x < w - 3; x += 6) ctx.fillRect(x, -h + 3, 3, 3.5);
        ctx.fillStyle = '#17120e';
        ctx.fillRect(w / 2 - 1.3, -h * 0.3, 2.6, 13);
        ctx.fillRect(w / 2 - 3.5, -h * 0.3 + 5, 7, 1.5);
        // Paired belfry lights with a colonnette.
        p.window(w / 2 - 7, -h * 0.68, 5.5, 14, true);
        p.window(w / 2 + 1.5, -h * 0.68, 5.5, 14, true);
        ctx.fillStyle = css(shade(stone, light * 1.1));
        ctx.fillRect(w / 2 - 0.9, -h * 0.68 + 2, 1.8, 13);
        if (front) {
          ctx.fillStyle = css(shade(stone, light * 1.15));
          ctx.beginPath();
          ctx.arc(w / 2, -18, 8.5, Math.PI, 0);
          ctx.lineTo(w / 2 + 8.5, 0);
          ctx.lineTo(w / 2 - 8.5, 0);
          ctx.fill();
          p.door(w / 2 - 6, 12, 22, c.doors.main);
        } else hangingBanner(ctx, w / 2 - 6, -h * 0.5, 12, 26, team, light, s.charge);
      };
      p.leftFace(0.13, 0.87, 0.87, 16, face(1, true), z - 16);
      p.rightFace(0.13, 0.87, 0.87, 16, face(R, false), z - 16);
      p.ground(0.13, 0.13, 0.87, 0.87, shade(c.roofAlt, 0.9), z);
      // Stair turret at the back corner rising above the wall-walk.
      const t = 0.26;
      p.box(0.1, 0.1, 0.1 + t, 0.1 + t, z, z + 26, wall, shade(stone, 1.08));
      const needle = hasNeedleSpires(s);
      if (needle) needleSpire(p, 0.1 + t / 2, 0.1 + t / 2, t / 2 + 0.02, z + 26, 46, c.metal, 'slate', 4);
      else {
        for (const [a, b] of [[0.1, 0.1], [0.1 + t - 0.075, 0.1], [0.1, 0.1 + t - 0.075], [0.1 + t - 0.075, 0.1 + t - 0.075]] as const) {
          p.box(a, b, a + 0.075, b + 0.075, z + 26, z + 33, wall, shade(stone, 1.08));
        }
      }
      parapet(p, 0.1, 0.1, 0.9, 0.9, z, wall, 'back', 3);
      lookout(p, 0.1, 0.9, z, team, 'kettle');
      parapet(p, 0.1, 0.1, 0.9, 0.9, z, wall, 'front', 3);
      if (needle) p.flag(0.86, 0.86, z + 6, 24, team, true);
      else p.flag(0.23, 0.23, z + 33, 24, team, true);
    },
  };
}

/** Inner face of the far half of a round parapet (seen across the platform), with its coping. */
function ringBack(p: IsoPainter, uc: number, vc: number, r: number, z: number, h: number, color: number): void {
  const n = 18;
  const at = (a: number, rr: number, zz: number) => p.p(uc + rr * Math.cos(a), vc + rr * Math.sin(a), zz);
  const outer: Pt[] = [];
  const inner: Pt[] = [];
  for (let k = 0; k <= n; k++) {
    const a = Math.PI * 0.75 + (k / n) * Math.PI;
    outer.push(at(a, r - 0.06, z + h));
    inner.push(at(a, r - 0.06, z));
  }
  const band = [...outer, ...inner.reverse()];
  p.fillPoly(band, css(shade(color, 0.62)));
  p.normals.fill(band, N_UP);
}

/** Round flat roof (gun platform floor) of radius r at height z. */
function disc(p: IsoPainter, uc: number, vc: number, r: number, z: number, color: number): void {
  const pts: Pt[] = [];
  for (let k = 0; k < 24; k++) pts.push(p.p(uc + r * Math.cos((k / 24) * Math.PI * 2), vc + r * Math.sin((k / 24) * Math.PI * 2), z));
  p.fillPoly(pts, css(color));
  p.normals.fill(pts, N_UP);
}

/**
 * Age 3 with needle spires: a round town-wall tower (Wehrturm) — brick
 * drum on a stone footing with stone bands, a corbelled fighting gallery
 * whose posts carry a tall octagonal tiled helm over the archer.
 */
function wehrturm(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const z = TOWER_PLATFORM_Z[3];
  p.footShadow();
  drumWall(p, 0.5, 0.5, 0.46, 0, 16, c.ashlar, 'stone');
  drumWall(p, 0.5, 0.5, 0.43, 16, 70, c.brick, 'brick');
  drumWall(p, 0.5, 0.5, 0.44, 70, 74, c.ashlar, 'stone');
  drumWall(p, 0.5, 0.5, 0.43, 74, z - 16, c.brick, 'brick');
  // Corbel course and the overhanging gallery storey.
  drumWall(p, 0.5, 0.5, 0.47, z - 16, z - 12, c.ashlar, 'stone');
  drumWall(p, 0.5, 0.5, 0.48, z - 12, z, c.brick, 'brick');
  const ctx = p.ctx;
  const door = p.p(0.5 + 0.43 * Math.cos(1.25), 0.5 + 0.43 * Math.sin(1.25), 0);
  ctx.fillStyle = css(c.ashlar);
  ctx.fillRect(door[0] - 7, door[1] - 25, 14, 25);
  ctx.fillStyle = css(c.doors.main);
  ctx.fillRect(door[0] - 5, door[1] - 22, 10, 22);
  for (const [a, h] of [[0.4, 52], [1.9, 98], [1.1, 110]] as const) {
    const [wx, wy] = p.p(0.5 + 0.43 * Math.cos(a), 0.5 + 0.43 * Math.sin(a), h);
    ctx.fillStyle = '#1a110c';
    ctx.fillRect(wx - 1.3, wy - 11, 2.6, 11);
  }
  disc(p, 0.5, 0.5, 0.48, z, 0x6c6a64);
  ringBack(p, 0.5, 0.5, 0.48, z, 8, c.brick);
  lookout(p, 0.12, 0.88, z, team, 'tricorn');
  drumWall(p, 0.5, 0.5, 0.48, z, z + 8, c.brick, 'brick');
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    if (Math.cos(a) + Math.sin(a) < -0.4) continue;
    post(p, 0.5 + 0.44 * Math.cos(a), 0.5 + 0.44 * Math.sin(a), z + 8, z + 30, 2.2, c.timber);
  }
  needleSpire(p, 0.5, 0.5, 0.5, z + 30, 104, c.roof, 'tile');
  p.flag(0.9, 0.62, z + 8, 26, team, true);
}

/** Age 3: round Martello tower — battered brick drum, stone cordon, raised door and ladder, gun platform. */
export function georgianTower(s: ArchStyle): BuildingArt {
  const c = s.palette;
  return {
    size: 1,
    maxHeight: 210 + spireRoom(s, 120),
    paint: (p, team) => {
      if (hasNeedleSpires(s)) {
        wehrturm(p, s, team);
        return;
      }
      const z = TOWER_PLATFORM_Z[3];
      const ctx = p.ctx;
      p.footShadow();
      // Battered drum: stone footing, brick in three set-back lifts with stone cordons.
      drumWall(p, 0.5, 0.5, 0.49, 0, 16, c.ashlar, 'stone');
      drumWall(p, 0.5, 0.5, 0.47, 16, 54, c.brick, 'brick');
      drumWall(p, 0.5, 0.5, 0.475, 54, 58, c.ashlar, 'stone');
      drumWall(p, 0.5, 0.5, 0.45, 58, 100, c.brick, 'brick');
      drumWall(p, 0.5, 0.5, 0.455, 100, 104, c.ashlar, 'stone');
      drumWall(p, 0.5, 0.5, 0.43, 104, z - 6, c.brick, 'brick');
      drumWall(p, 0.5, 0.5, 0.46, z - 6, z, c.ashlar, 'stone');
      // Raised door on the lit side with a timber ladder; two small windows.
      const door = p.p(0.5 + 0.47 * Math.cos(1.2), 0.5 + 0.47 * Math.sin(1.2), 64);
      ctx.fillStyle = css(c.ashlar);
      ctx.fillRect(door[0] - 7, door[1] - 24, 14, 25);
      ctx.fillStyle = css(c.doors.main);
      ctx.fillRect(door[0] - 5, door[1] - 21, 10, 21);
      // Machicolation box over the door.
      ctx.fillStyle = css(shade(c.ashlar, 0.95));
      ctx.fillRect(door[0] - 9, door[1] - 40, 18, 9);
      ctx.fillStyle = 'rgba(30,22,16,.6)';
      for (const dx of [-6, -1, 4]) ctx.fillRect(door[0] + dx, door[1] - 31, 2.5, 3);
      const ladder: Pt[][] = [];
      for (const dx of [-4, 4]) ladder.push([[door[0] + dx, door[1]], [door[0] + dx + 8, door[1] + 64]]);
      for (const l of ladder) line(p, l[0]!, l[1]!, c.timber, 1.6);
      for (let k = 6; k < 64; k += 7) line(p, [door[0] - 4 + k * 0.125, door[1] + k], [door[0] + 4 + k * 0.125, door[1] + k], c.timber, 1.2);
      p.normals.cylinderStroke(ladder, 2, door[0] - 4, 14);
      for (const a of [0.35, 1.9]) {
        const [wx, wy] = p.p(0.5 + 0.43 * Math.cos(a), 0.5 + 0.43 * Math.sin(a), 124);
        ctx.fillStyle = css(c.ashlar);
        ctx.fillRect(wx - 4, wy - 13, 8, 14);
        const g = ctx.createLinearGradient(0, wy - 11, 0, wy);
        g.addColorStop(0, css(c.window.glassTop));
        g.addColorStop(1, css(c.window.glassBottom));
        ctx.fillStyle = g;
        ctx.fillRect(wx - 2.5, wy - 11, 5, 10);
        p.addGlow(wx, wy - 6, 8);
      }
      // Gun platform: far parapet, the archer and brazier, the near parapet ring.
      disc(p, 0.5, 0.5, 0.46, z, 0x6c6a64);
      ringBack(p, 0.5, 0.5, 0.46, z, 12, c.brick);
      lookout(p, 0.12, 0.88, z, team, 'tricorn');
      // Traversing gun on the platform, its muzzle over the parapet.
      const g0 = p.p(0.45, 0.5, z + 6);
      const g1 = p.p(0.95, 0.62, z + 18);
      line(p, g0, g1, 0x2c2a28, 5);
      line(p, [g0[0], g0[1] - 1.5], [g1[0], g1[1] - 1.5], 0x5a5856, 1.5);
      p.normals.cylinderStroke([[g0, g1]], 5, g0[0], g1[0] - g0[0]);
      drumWall(p, 0.5, 0.5, 0.46, z, z + 12, c.brick, 'brick');
      drumWall(p, 0.5, 0.5, 0.475, z + 12, z + 15, c.ashlar, 'stone');
      p.flag(0.22, 0.3, z + 12, 34, team, true);
    },
  };
}
