import { ellipse } from '../../../canvas';
import type { IsoPainter } from '../../../isoPainter';
import { css, shade } from '../../../palette';
import { R } from '../../facade';
import { forgeLight, forgeMouth, goldPile, haystack, lantern, logPile, plankStack, post } from '../../parts';
import type { ArchStyle } from '../../style';
import { roofLift, styledGable, styledHip } from '../../styledRoofs';
import type { AgeArtSet } from '../../types';
import { hedge, spoilHeap } from '../familyParts';
import { georgianBlock, georgianStack, portico, sashWindow } from './georgianParts';
import { gravel, railings } from './georgianProps';
import { fiveBarGate, lawn, sheaveFrame, timberDrug, tripodTarget, turnipRows, wheatRows } from './georgianYard';

/*
 * Age 3 English workplaces: enclosed fields in the Norfolk rotation
 * (wheat and turnips) behind hedges with a black weatherboarded barn, a
 * timber yard with a sawmill and a timber drug, a brick engine house
 * with a square stack and a twin-sheave headframe, a toxophilite
 * pavilion on a striped lawn, and a brick forge with a horseshoe door.
 */

/** Horseshoe-shaped forge doorway (face-local, centred on x), a classic English smithy front. */
function horseshoeDoor(p: IsoPainter, s: ArchStyle, x: number, w: number, h: number, light: number): void {
  const ctx = p.ctx;
  const r = w / 2;
  const shape = (grow: number) => {
    ctx.beginPath();
    ctx.moveTo(x - r * 0.8 - grow, 0);
    ctx.lineTo(x - r - grow, -h + r);
    ctx.arc(x, -h + r, r + grow, Math.PI, 0);
    ctx.lineTo(x + r * 0.8 + grow, 0);
    ctx.closePath();
  };
  shape(3.5);
  ctx.fillStyle = css(shade(s.palette.trim, light));
  ctx.fill();
  shape(0);
  ctx.fillStyle = '#1c130d';
  ctx.fill();
  ctx.fillStyle = css(shade(0x3a3a3e, light));
  for (let k = 0; k < 7; k++) {
    const a = Math.PI + (k / 6) * Math.PI;
    ctx.fillRect(x + Math.cos(a) * (r + 1.8) - 0.6, -h + r + Math.sin(a) * (r + 1.8) - 0.6, 1.2, 1.2);
  }
}

/** Age 3 English workplaces. */
export function georgianWorkArt(s: ArchStyle): AgeArtSet {
  const c = s.palette;
  return {
    farm: {
      size: 2,
      maxHeight: 110,
      paint: (p, team) => {
        p.ground(0.05, 0.05, 1.95, 1.95, 0x5c4a30);
        wheatRows(p, 0.12, 0.92, 0.98, 1.86);
        turnipRows(p, 1.08, 0.12, 1.86, 1.86);
        hedge(p, 1.02, 0.15, 1.02, 1.9, 9);
        // Black weatherboarded barn on a brick plinth under slate, wagon doors to the yard.
        p.box(0.14, 0.14, 0.92, 0.76, 0, 8, { color: c.brick, detail: 'brick' }, c.brick);
        p.box(0.14, 0.14, 0.92, 0.76, 8, 36, { color: c.darkWood, detail: 'planks' });
        p.leftFace(0.14, 0.92, 0.76, 0, (w) => {
          p.ctx.fillStyle = '#17120e';
          p.ctx.fillRect(w * 0.35, -30, w * 0.3, 30);
          p.ctx.fillStyle = css(0x3a3530);
          p.ctx.fillRect(w * 0.35, -30, w * 0.13, 30);
          p.ctx.fillStyle = css(team);
          p.ctx.fillRect(w * 0.15, -26, 5, 5);
        }, 36);
        p.material = 'slate';
        styledGable(p, s, 0.14, 0.14, 0.92, 0.76, 36, 28, c.roof, c.darkWood, 'u', 0.08);
        haystack(p, 0.5, 1.0, 11, 22);
        fiveBarGate(p, 1.02, 1.92, 1.4, 1.92);
        hedge(p, 0.08, 1.92, 1.0, 1.92, 10);
        hedge(p, 1.42, 1.92, 1.92, 1.92, 10);
        hedge(p, 1.92, 0.1, 1.92, 1.9, 10);
        p.flag(1.92, 1.92, 0, 26, team);
      },
    },
    lumber_camp: {
      size: 2,
      maxHeight: 120,
      paint: (p, team) => {
        p.footShadow();
        p.ground(0.08, 0.08, 1.92, 1.92, 0x9a8462);
        // Sawmill: tarred weatherboard on brick, the frame saw seen through the open bay.
        p.box(0.2, 0.2, 1.05, 0.95, 0, 10, { color: c.brick, detail: 'brick' }, c.brick);
        p.box(0.2, 0.2, 1.05, 0.95, 10, 42, { color: c.darkWood, detail: 'planks' });
        p.leftFace(0.2, 1.05, 0.95, 0, (w) => {
          const ctx = p.ctx;
          ctx.fillStyle = '#16110c';
          ctx.fillRect(w * 0.18, -36, w * 0.5, 34);
          ctx.strokeStyle = '#8a6a44';
          ctx.lineWidth = 2;
          ctx.strokeRect(w * 0.34, -32, 10, 26);
          ctx.strokeStyle = '#c8ccd2';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(w * 0.34 + 5, -32);
          ctx.lineTo(w * 0.34 + 5, -6);
          ctx.stroke();
          ctx.fillStyle = '#b48858';
          ctx.fillRect(w * 0.2, -10, w * 0.46, 4);
          sashWindow(p, s, w * 0.78, -30, 8, 11, 1, false);
        }, 42);
        p.rightFace(0.2, 0.95, 1.05, 0, (w) => sashWindow(p, s, w * 0.4, -30, 8, 11, R, false), 42);
        p.material = 'slate';
        styledGable(p, s, 0.2, 0.2, 1.05, 0.95, 42, 26, c.roof, c.darkWood, 'v', 0.08);
        lantern(p, 0.95, 0.95, 30, 0.95, 1.2);
        // Open drying shed: slate on posts over stickered stacks.
        for (const [u, v] of [[1.25, 0.2], [1.85, 0.2], [1.25, 1.05], [1.85, 1.05]] as const) post(p, u, v, 0, 34, 2.4, c.timber);
        plankStack(p, 1.32, 0.3, 1.78, 0.6, 18);
        plankStack(p, 1.32, 0.68, 1.78, 0.98, 12);
        p.material = 'slate';
        styledHip(p, s, 1.22, 0.17, 1.88, 1.08, 34, 14, c.roofAlt, 0.05, c.timber);
        logPile(p, 0.2, 1.65, 7, 0x6b4426, 0xe0b880);
        timberDrug(p, 1.35, 1.45, c.timber);
        p.flag(1.88, 1.85, 0, 28, team);
      },
    },
    mining_camp: {
      size: 2,
      maxHeight: 180,
      paint: (p, team) => {
        p.footShadow();
        p.ground(0.08, 0.08, 1.92, 1.92, 0x857a6c);
        spoilHeap(p, 1.62, 1.62, 24, 20, 0x5c5650);
        // Engine house: tall brick box, slate gable, round-headed engine window; square stack at its back corner.
        georgianStack(p, s, 0.16, 0.22, 0.38, 0.44, 0, 164, 0, 'forge');
        georgianBlock(p, s, 0.22, 0.4, 0.9, 1.15, 0, 72, {
          bands: [30],
          left: (w, _h, l) => {
            const ctx = p.ctx;
            ctx.fillStyle = css(shade(c.ashlar, l));
            ctx.fillRect(w / 2 - 9, -56, 18, 34);
            ctx.beginPath();
            ctx.arc(w / 2, -56, 9, Math.PI, 0);
            ctx.fill();
            sashWindow(p, s, w / 2 - 6, -54, 12, 30, l, false);
            p.door(w * 0.15, 10, 18, c.doors.work);
          },
          right: (w, _h, l) => sashWindow(p, s, w / 2 - 5, -56, 10, 18, l),
        });
        p.material = 'slate';
        styledGable(p, s, 0.22, 0.4, 0.9, 1.15, 72, 26, c.roof, c.brick, 'v', 0.06);
        // Cast-iron beam out of the bob wall over the shaft.
        const ctx = p.ctx;
        const a = p.p(0.9, 0.78, 64);
        const b = p.p(1.3, 0.78, 62);
        ctx.strokeStyle = '#2a2622';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
        p.normals.cylinderStroke([[a, b]], 4, a[0], b[0] - a[0]);
        sheaveFrame(p, 1.35, 0.72, 78, c.timber);
        for (const du of [-0.07, 0.07]) {
          const r0 = p.p(1.35 + du, 0.95, 0);
          const r1 = p.p(1.35 + du, 1.9, 0);
          ctx.strokeStyle = '#4a4440';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(r0[0], r0[1]);
          ctx.lineTo(r1[0], r1[1]);
          ctx.stroke();
        }
        p.box(1.22, 1.15, 1.48, 1.38, 3, 16, { color: 0x3e3a36, detail: 'planks' }, 0x2e2a26);
        goldPile(p, 1.35, 1.27);
        goldPile(p, 0.55, 1.6);
        lantern(p, 0.62, 1.15, 30, 0.62, 1.4);
        p.flag(1.88, 0.3, 0, 30, team);
      },
    },
    archery_range: {
      size: 3,
      maxHeight: 140,
      paint: (p, team) => {
        p.footShadow();
        lawn(p, 0.05, 0.05, 2.95, 2.95);
        gravel(p, 0.2, 1.55, 1.4, 1.75, 0xc9bfa4);
        // Toxophilite society pavilion: stucco, a Tuscan portico, slate hip.
        p.box(0.25, 0.3, 1.35, 1.2, 0, 6, { color: c.ashlar, detail: 'stone' }, c.ashlar);
        p.box(0.25, 0.3, 1.35, 1.2, 6, 44, { color: c.plaster, detail: 'plaster' });
        p.leftFace(0.25, 1.35, 1.2, 6, (w) => {
          for (const x of [0.12, 0.78]) sashWindow(p, s, w * x, -32, 10, 20);
          p.door(w / 2 - 6, 12, 24, c.doors.main);
        }, 38);
        p.rightFace(0.3, 1.2, 1.35, 6, (w) => {
          for (const x of [0.2, 0.62]) sashWindow(p, s, w * x, -32, 10, 20, R);
        }, 38);
        p.material = 'slate';
        styledHip(p, s, 0.25, 0.3, 1.35, 1.2, 44, 24, c.roof, 0.06);
        portico(p, s, 0.5, 1.1, 1.2, 1.5, 40, 4, 16, team);
        // Shooting line: targets on tripods across the lawn, bow stand by the path.
        for (const v of [0.55, 1.35, 2.15]) tripodTarget(p, 2.5, v);
        for (let k = 0; k < 4; k++) post(p, 1.5 + k * 0.06, 1.62, 0, 30, 0.8, 0x6b4a2a);
        railings(p, 0.15, 2.85, 2.85, 2.85, 10);
        p.flag(0.3, 2.6, 0, 44, team, true);
      },
    },
    blacksmith: {
      size: 2,
      maxHeight: 140,
      paint: (p, team) => {
        p.footShadow();
        gravel(p, 0.08, 0.08, 1.92, 1.92, 0x7f776a);
        georgianStack(p, s, 0.5, 0.48, 0.76, 0.66, 20, 112 + roofLift(s, 30), 2, 'forge');
        georgianBlock(p, s, 0.3, 0.35, 1.45, 1.35, 0, 44, {
          cornice: false,
          left: (w, _h, l) => {
            horseshoeDoor(p, s, w * 0.4, 18, 30, l);
            sashWindow(p, s, w * 0.75, -32, 9, 14, l);
          },
          right: (w) => forgeMouth(p, w * 0.3, 22, 26),
        });
        p.material = 'slate';
        styledGable(p, s, 0.3, 0.35, 1.45, 1.35, 44, 30, c.roof, c.brick, 'u', 0.08);
        forgeLight(p, 1.7, 0.9);
        lantern(p, 0.36, 1.35, 30, 0.36, 1.6);
        // Anvil on its block, shoeing frame, cart wheel.
        const [x, y] = p.p(1.7, 1.45, 0);
        const ctx = p.ctx;
        ctx.fillStyle = '#5a3b20';
        ctx.fillRect(x - 5, y - 8, 10, 8);
        ctx.fillStyle = '#34343a';
        ctx.fillRect(x - 9, y - 12, 18, 4.5);
        ctx.fillRect(x - 3, y - 9, 6, 2);
        for (const [u, v] of [[0.35, 1.6], [0.95, 1.6], [0.35, 1.85], [0.95, 1.85]] as const) post(p, u, v, 0, 26, 2, c.timber);
        for (const v of [1.6, 1.85]) {
          const a = p.p(0.35, v, 24);
          const b = p.p(0.95, v, 24);
          ctx.strokeStyle = css(c.timber);
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
          ctx.stroke();
        }
        const [wx, wy] = p.p(1.5, 1.4, 13);
        ctx.strokeStyle = '#3a2a1c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(wx, wy, 8, 12, 0.4, 0, Math.PI * 2);
        ctx.stroke();
        ellipse(ctx, wx, wy, 2, 2.4);
        ctx.fill();
        p.flag(1.88, 1.88, 0, 26, team);
      },
    },
  };
}
