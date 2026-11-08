import { css, shade } from '../palette';
import { cornice, quoins, R } from './facade';
import type { ArchStyle } from './style';
import { roofLift, styledGable } from './styledRoofs';
import type { BuildingArt } from './types';

/** Native rise of the boathouse roof. */
const HOUSE_RISE = 30;
const PLANK = 0x8a6440;
const PILE = 0x4e3826;
const ROPE = 0xd8c89a;

/**
 * Dock (kikötő, M14), shared by every style and painted from its palette
 * and roof profile (the monastery precedent): a timber boathouse with a
 * gabled roof and a wide boat door, a plank pier on piles reaching over
 * the front edge, a crane with a hoisted net and stacked crates. A family
 * may later give it its own painter.
 */
export function dockArt(s: ArchStyle): BuildingArt {
  const c = s.palette;
  const corners = (ctx: CanvasRenderingContext2D, w: number, h: number, light: number) => {
    if (s.ornaments.quoins) quoins(ctx, w, h, c.trim, light);
  };
  return {
    size: 3,
    maxHeight: 170 + s.headroom,
    paint: (p, team) => {
      const ctx = p.ctx;
      p.footShadow();
      // Pier: a plank deck on piles along the front (water) side.
      p.ground(0.1, 1.9, 2.95, 2.95, PLANK);
      for (let i = 0; i < 6; i++) {
        const x = 0.25 + i * 0.5;
        p.box(x, 2.78, x + 0.12, 2.9, 0, 10, { color: PILE });
      }
      p.box(0.1, 1.9, 2.95, 2.95, 8, 11, { color: PLANK, detail: 'planks' });
      // Boathouse (behind): stone plinth, timber walls, a wide boat door.
      p.box(0.3, 0.25, 2.3, 1.75, 0, 6, { color: c.stone, detail: 'stone' }, c.stone);
      p.box(0.32, 0.27, 2.28, 1.73, 6, 54, { color: shade(PLANK, 0.95), detail: 'planks' });
      const wall = (light: number, door: boolean) => (w: number, h: number) => {
        corners(ctx, w, h, light);
        cornice(ctx, w, h - 4, c.trim, light, 3);
        if (door) {
          ctx.fillStyle = css(shade(0x2a2018, light));
          ctx.fillRect(w * 0.25, -34, w * 0.5, 34);
          ctx.fillStyle = css(shade(c.trim, light));
          ctx.fillRect(w * 0.25 - 2, -36, w * 0.5 + 4, 3);
        } else {
          for (const x of [w * 0.3, w * 0.7]) p.window(x - 3, -h + 14, 6, 10);
        }
      };
      p.leftFace(0.32, 2.28, 1.73, 6, wall(1, true), 48);
      p.rightFace(0.27, 1.73, 2.28, 6, wall(R, false), 48);
      p.material = 'tile';
      styledGable(p, s, 0.32, 0.27, 2.28, 1.73, 54, HOUSE_RISE, c.roof, shade(PLANK, 0.9), 'u');
      // Crane at the pier's end: a post, a jib and a hoisted net.
      p.box(2.55, 2.05, 2.7, 2.2, 11, 92, { color: PILE });
      const [jx, jy] = p.p(2.62, 2.12, 90);
      const [ex, ey] = p.p(2.9, 2.75, 96);
      ctx.strokeStyle = css(PILE);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(jx, jy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.strokeStyle = css(ROPE);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex, ey + 26);
      ctx.stroke();
      ctx.fillStyle = css(shade(ROPE, 0.85));
      ctx.beginPath();
      ctx.ellipse(ex, ey + 30, 6, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Crates and barrels on the pier.
      for (const [x, y] of [[0.5, 2.3], [0.85, 2.35], [0.65, 2.55]] as const) {
        p.box(x, y, x + 0.22, y + 0.22, 11, 22, { color: shade(PLANK, 1.1), detail: 'planks' });
      }
      p.flag(2.25, 0.3, 54 + roofLift(s, 54) + HOUSE_RISE, 22, team);
    },
  };
}
