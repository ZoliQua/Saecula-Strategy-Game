import { ellipse } from '../canvas';
import type { IsoPainter } from '../isoPainter';
import { css } from '../palette';
import { archedOpening, baroqueWindow } from './facade';
import { baroqueBlock, railFence } from './baroqueParts';
import { forgeLight, forgeMouth, goldPile, lantern, logPile, plankStack, post, target } from './parts';
import { hasOnionDomes, onionDome } from './kits/onionDome';
import { tentRoof, tentStand } from './kits/tentRoof';
import { finial, helm } from './roofs';
import type { ArchStyle } from './style';
import { roofChimney, roofLift, styledGable, styledHip } from './styledRoofs';
import type { AgeArtSet } from './types';

/** Sweep well (gémeskút): curb, forked post, long sweep with a counterweight, hanging pole and bucket. */
function sweepWell(p: IsoPainter, u: number, v: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 0);
  const g = ctx.createLinearGradient(x - 10, 0, x + 10, 0);
  g.addColorStop(0, '#8d6237');
  g.addColorStop(1, '#4d321b');
  ctx.fillStyle = g;
  ctx.fillRect(x - 10, y - 11, 20, 11);
  ellipse(ctx, x, y, 10, 5);
  ctx.fill();
  p.normalCylinder(x - 10, y - 11, 20, 14);
  ellipse(ctx, x, y - 11, 10, 5);
  ctx.fillStyle = '#7a5530';
  ctx.fill();
  ellipse(ctx, x, y - 11, 7.5, 3.6);
  ctx.fillStyle = '#120d08';
  ctx.fill();
  post(p, u - 0.05, v + 0.42, 0, 58, 2.6, 0x5a3b20);
  const piv = p.p(u - 0.05, v + 0.42, 58);
  const tip = p.p(u + 0.02, v - 0.02, 104);
  const butt: readonly [number, number] = [piv[0] + (piv[0] - tip[0]) * 0.6, piv[1] + (piv[1] - tip[1]) * 0.6];
  ctx.strokeStyle = '#6b4526';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(tip[0], tip[1]);
  ctx.lineTo(butt[0], butt[1]);
  ctx.stroke();
  ellipse(ctx, butt[0], butt[1] + 2, 4.5, 3.5);
  ctx.fillStyle = '#8a857c';
  ctx.fill();
  ctx.strokeStyle = '#5a3b20';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(tip[0], tip[1]);
  ctx.lineTo(x, y - 36);
  ctx.stroke();
  ctx.fillStyle = '#4a3a2a';
  ctx.fillRect(x - 3, y - 37, 6, 6);
  p.addVolumePoint(u - 0.05, v + 0.42, 58);
  p.addVolumePoint(u, v, 104);
}

/** Maize / wheat rows in neat lines (crop rotation era). */
function orderedField(p: IsoPainter): void {
  const ctx = p.ctx;
  p.ground(0.05, 0.05, 1.95, 1.95, 0x5e4126);
  for (let i = 0; i < 10; i++) {
    const v = 0.14 + i * 0.18;
    const maize = i < 5;
    for (let k = 0; k < 12; k++) {
      const [x, y] = p.p(0.16 + k * 0.145, v, 0);
      ctx.strokeStyle = maize ? '#5f8f34' : '#d4b048';
      ctx.lineWidth = maize ? 1.6 : 1.3;
      const tall = maize ? 15 : 10;
      for (let s = -1; s <= 1; s++) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + s * 4, y - tall * 0.6, x + s * 3, y - tall - p.random() * 3);
        ctx.stroke();
      }
      if (maize) {
        ctx.fillStyle = '#e8cf6a';
        ctx.fillRect(x - 0.8, y - tall - 4, 1.6, 3);
      }
    }
  }
}

/** Age 3 family workplaces. */
export function baroqueWorkArt(s: ArchStyle): AgeArtSet {
  const c = s.palette;
  const tall = (h: number) => h + s.headroom;
  return {
    farm: {
      size: 2,
      maxHeight: tall(118),
      paint: (p, team) => {
        orderedField(p);
        sweepWell(p, 0.42, 0.36);
        railFence(p, 0.05, 1.96, 1.96, 1.96, 12);
        railFence(p, 1.96, 0.05, 1.96, 1.96, 12);
        p.flag(1.96, 1.96, 0, 24, team);
      },
    },
    lumber_camp: {
      size: 2,
      maxHeight: tall(120),
      paint: (p, team) => {
        const ctx = p.ctx;
        p.footShadow();
        p.ground(0.1, 0.1, 1.9, 1.9, 0x8a7a5a);
        p.box(0.22, 0.22, 1.0, 1.3, 0, 8, { color: c.stone }, c.stone);
        p.box(0.22, 0.22, 1.0, 1.3, 8, 44, { color: c.board, detail: 'planks' });
        p.leftFace(0.22, 1.0, 1.3, 8, (w) => {
          p.door(w * 0.55, 14, 24, c.doors.work);
          p.window(w * 0.16, -26, 9, 11);
        }, 36);
        p.material = 'tile';
        styledGable(p, s, 0.22, 0.22, 1.0, 1.3, 44, 42, c.roof, c.board, 'v', 0.12);
        // Onion styles put a timber hoist on the store's gable: a beam out over the yard, a log bundle on its rope.
        if (hasOnionDomes(s)) gableHoist(p, 0.61, 1.3, 44 + 42 * s.roof.pitch - 14, c.timber);
        lantern(p, 0.94, 1.3, 32, 0.94, 1.5);
        // Open saw shed with a frame saw.
        for (const [u, v] of [[1.1, 0.3], [1.72, 0.3], [1.1, 0.92], [1.72, 0.92]] as const) post(p, u, v, 0, 40, 2.4, c.timber);
        const [fx, fy] = p.p(1.41, 0.61, 0);
        ctx.strokeStyle = '#3a2a1a';
        ctx.lineWidth = 2;
        ctx.strokeRect(fx - 8, fy - 36, 16, 30);
        ctx.strokeStyle = '#c8ccd2';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(fx, fy - 36);
        ctx.lineTo(fx, fy - 6);
        ctx.stroke();
        ctx.fillStyle = '#9a6a3a';
        ctx.fillRect(fx - 24, fy - 12, 48, 6);
        p.material = 'tile';
        styledHip(p, s, 1.05, 0.25, 1.77, 0.97, 40, 20, c.roof, 0.06, c.timber);
        plankStack(p, 1.2, 1.2, 1.78, 1.5, 14);
        plankStack(p, 1.2, 1.55, 1.78, 1.82, 9);
        logPile(p, 0.25, 1.82, 6, 0x6b4426, 0xe0b880);
        p.flag(1.86, 0.15, 0, 30, team);
      },
    },
    mining_camp: {
      size: 2,
      maxHeight: tall(150),
      paint: (p, team) => {
        const ctx = p.ctx;
        p.footShadow();
        p.ground(0.1, 0.1, 1.9, 1.9, 0x8b8070);
        // Shaft house (enclosed headframe) with a sheave wheel.
        p.box(1.15, 0.22, 1.75, 0.82, 0, 76, { color: c.darkWood, detail: 'planks' });
        p.leftFace(1.15, 1.75, 0.82, 0, (w) => {
          ctx.fillStyle = '#140d08';
          ctx.fillRect(w * 0.3, -30, w * 0.4, 30);
          ctx.strokeStyle = '#2a2420';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(w / 2, -58, 9, 0, Math.PI * 2);
          ctx.moveTo(w / 2 - 9, -58);
          ctx.lineTo(w / 2 + 9, -58);
          ctx.moveTo(w / 2, -67);
          ctx.lineTo(w / 2, -49);
          ctx.stroke();
        }, 76);
        // Onion styles raise the shaft house under a steep tent with an onion; others keep a slate hip.
        if (hasOnionDomes(s)) {
          p.material = 'copper';
          p.hipRoof(1.12, 0.19, 1.78, 0.85, 76, 66, c.roof, 0.06);
          onionDome(p, 1.45, 0.52, 0.07, 76 + 62, { color: c.metal });
        } else {
          p.material = 'slate';
          styledHip(p, s, 1.12, 0.19, 1.78, 0.85, 76, 36, c.roofAlt, 0.06, c.darkWood);
        }
        // Mine office with a bell turret.
        baroqueBlock(p, s, 0.2, 0.85, 1.05, 1.75, 0, 44, {
          left: (w, h, l) => {
            archedOpening(ctx, w * 0.55, 15, 24, c.trim, 0x2a1c12, l);
            p.door(w * 0.55 + 1, 13, 22, c.doors.work);
            baroqueWindow(p, s, w * 0.15, -h + 12, 10, 16, l);
          },
          right: (w, h, l) => baroqueWindow(p, s, w * 0.4, -h + 12, 10, 16, l),
        });
        p.material = 'tile';
        styledHip(p, s, 0.2, 0.85, 1.05, 1.75, 44, 34, c.roof, 0.08);
        const turret = roofLift(s, 34);
        p.box(0.54, 1.22, 0.7, 1.38, 70 + turret, 86 + turret, { color: c.trim }, c.trim);
        if (hasOnionDomes(s)) onionDome(p, 0.62, 1.3, 0.095, 86 + turret, { color: c.metal });
        else helm(p, 0.62, 1.3, 86 + turret, [[0, 0.11], [6, 0.1], [11, 0.05], [16, 0.01]], c.metal);
        lantern(p, 0.42, 1.75, 30, 0.42, 1.92);
        // Rails and an ore cart.
        for (const du of [-0.08, 0.08]) {
          const a = p.p(1.45 + du, 0.85, 0);
          const b = p.p(1.45 + du, 1.92, 0);
          ctx.strokeStyle = '#4a4440';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
          ctx.stroke();
        }
        p.box(1.3, 1.3, 1.6, 1.62, 5, 19, { color: 0x4a4440, detail: 'planks' });
        goldPile(p, 1.45, 1.47);
        p.flag(1.88, 1.0, 0, 30, team);
      },
    },
    archery_range: {
      size: 3,
      maxHeight: tall(150),
      paint: (p, team) => {
        const ctx = p.ctx;
        p.footShadow();
        p.ground(0.05, 0.05, 2.95, 2.95, 0x93a46a);
        p.ground(1.75, 0.25, 2.85, 2.6, 0x9fae78);
        baroqueBlock(p, s, 0.25, 0.25, 1.55, 1.25, 0, 50, {
          bays: 3,
          left: (w, h, l) => {
            for (let i = 0; i < 3; i++) archedOpening(ctx, (w / 3) * (i + 0.5) - 10, 20, h - 14, c.trim, 0x2e2014, l);
          },
          right: (w, h, l) => baroqueWindow(p, s, w / 2 - 6, -h + 12, 12, 20, l),
        });
        p.material = 'tile';
        styledHip(p, s, 0.25, 0.25, 1.55, 1.25, 50, 38, c.roof, 0.1);
        // Onion styles shoot from a tent-roofed stand at the range's head; others keep the ridge finial.
        if (hasOnionDomes(s)) tentStand(p, 1.75, 0.3, 2.2, 0.75, 30, 50, 66, c.board, c.roof, { material: 'copper', ribs: c.trim });
        else finial(p, 0.9, 0.75, 50 + 38 * s.roof.pitch, 14, false);
        lantern(p, 1.55, 1.0, 34, 1.72, 1.0);
        for (const [u, v] of [[2.5, 0.6], [2.5, 1.4], [2.5, 2.2]] as const) target(p, u, v);
        p.flag(0.4, 2.6, 0, 40, team, true);
      },
    },
    blacksmith: {
      size: 2,
      maxHeight: tall(140),
      paint: (p, team) => {
        const ctx = p.ctx;
        p.footShadow();
        p.ground(0.1, 0.1, 1.9, 1.9, 0x7f776a);
        roofChimney(p, s, 1.08, 0.28, 1.4, 0.6, 0, 118, 36, { color: c.stack, detail: 'brick' }, 'forge');
        // Onion styles hood the forge stack with a little tent on posts.
        if (hasOnionDomes(s)) {
          const z = 118 + roofLift(s, 36);
          for (const [u, v] of [[1.08, 0.6], [1.4, 0.6], [1.4, 0.28]] as const) post(p, u, v, z, z + 10, 1.2, 0x3a3530);
          tentRoof(p, 1.24, 0.44, 0.19, z + 10, 44, c.roof, { material: 'copper' });
        }
        baroqueBlock(p, s, 0.3, 0.3, 1.5, 1.5, 0, 46, {
          color: c.plasterDeep,
          left: (w, h, l) => {
            archedOpening(ctx, w * 0.6, 16, 26, c.trim, 0x2a1c12, l);
            p.door(w * 0.6 + 1, 14, 24, c.doors.work);
            baroqueWindow(p, s, w * 0.18, -h + 12, 11, 18, l);
          },
          right: (w) => forgeMouth(p, w * 0.32, 24, 28),
        });
        p.material = 'tile';
        styledHip(p, s, 0.3, 0.3, 1.5, 1.5, 46, 36, c.roof, 0.1, c.plasterDeep);
        forgeLight(p, 1.7, 0.95);
        lantern(p, 0.5, 1.5, 32, 0.5, 1.7);
        const [x, y] = p.p(1.75, 1.3, 0);
        ctx.fillStyle = '#5a3b20';
        ctx.fillRect(x - 5, y - 8, 10, 8);
        ctx.fillStyle = '#34343a';
        ctx.fillRect(x - 9, y - 12, 18, 4.5);
        ctx.fillRect(x - 3, y - 9, 6, 2);
        // Cart wheel leaning on the wall.
        const [wx, wy] = p.p(1.1, 1.55, 14);
        ctx.strokeStyle = css(0x4a3220);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(wx, wy, 9, 12, 0.4, 0, Math.PI * 2);
        ctx.stroke();
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI;
          ctx.beginPath();
          ctx.moveTo(wx - Math.cos(a) * 8, wy - Math.sin(a) * 11);
          ctx.lineTo(wx + Math.cos(a) * 8, wy + Math.sin(a) * 11);
          ctx.stroke();
        }
        p.flag(1.88, 1.88, 0, 26, team);
      },
    },
  };
}

/** Hoist on a store's gable at (u, v, z): a beam out along +v with a bracket, a rope and a hanging bundle of logs. */
function gableHoist(p: IsoPainter, u: number, v: number, z: number, timber: number): void {
  const ctx = p.ctx;
  ctx.save();
  const [ax, ay] = p.p(u, v - 0.08, z);
  const [bx, by] = p.p(u, v + 0.34, z);
  ctx.lineCap = 'butt';
  ctx.strokeStyle = css(timber);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
  // Diagonal bracket under the beam.
  const [cx, cy] = p.p(u, v + 0.02, z - 16);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo((ax + bx * 2) / 3, (ay + by * 2) / 3);
  ctx.stroke();
  ctx.strokeStyle = '#d8c8a0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(bx - 2, by);
  ctx.lineTo(bx - 2, by + 18);
  ctx.stroke();
  for (const [dy, dx] of [[19, 0], [23, 1.5], [23, -2.5]] as const) {
    ctx.fillStyle = '#6b4426';
    ctx.fillRect(bx - 9 + dx, by + dy, 14, 3.6);
    ctx.fillStyle = '#e0b880';
    ctx.fillRect(bx + 4 + dx, by + dy, 1.6, 3.6);
  }
  ctx.restore();
  p.addVolumePoint(u, v + 0.34, z);
}
