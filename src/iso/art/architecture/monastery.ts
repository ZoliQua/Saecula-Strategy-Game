import { css, shade } from '../palette';
import { archedOpening, cornice, quoins, R } from './facade';
import { hasOnionDomes, onionDome } from './kits/onionDome';
import type { ArchStyle } from './style';
import { roofLift, styledGable, styledHip } from './styledRoofs';
import type { BuildingArt } from './types';

/** Native rise of the church nave's roof. */
const NAVE_RISE = 40;
/** Native rise of the dormitory range's roof. */
const RANGE_RISE = 22;
const GARTH = 0x5f7a3c;

/**
 * Monastery (kolostor, M11), shared by every style and painted from its
 * palette, roof profile and ornaments (the foundryArt precedent): a stone
 * church nave with tall arched windows, a bell tower with open belfry
 * arches (crowned by a gilt onion in onion styles, a pyramid roof and a
 * cross elsewhere), a cloister garth with clipped shrubs and a low
 * dormitory range in front. A family may later give it its own painter.
 */
export function monasteryArt(s: ArchStyle): BuildingArt {
  const c = s.palette;
  const corners = (ctx: CanvasRenderingContext2D, w: number, h: number, light: number) => {
    if (s.ornaments.quoins) quoins(ctx, w, h, c.trim, light);
  };
  return {
    size: 3,
    maxHeight: 250 + s.headroom,
    paint: (p, team) => {
      const ctx = p.ctx;
      p.footShadow();
      p.ground(0.05, 0.05, 2.95, 2.95, c.stone);
      // Church nave (behind): plinth, ashlar walls, arched windows, west door.
      p.box(0.25, 0.3, 1.95, 1.3, 0, 8, { color: c.stone, detail: 'stone' }, c.stone);
      p.box(0.28, 0.33, 1.92, 1.27, 8, 72, { color: c.ashlar, detail: 'stone' });
      const nave = (light: number, bays: number, door: boolean) => (w: number, h: number) => {
        corners(ctx, w, h, light);
        cornice(ctx, w, h - 4, c.trim, light, 4);
        for (let i = 0; i < bays; i++) {
          const x = (w / bays) * (i + 0.5);
          if (door && i === 0) continue;
          p.window(x - 4, -h + 12, 8, 30, true);
        }
        if (door) archedOpening(ctx, w / bays / 2 - 9, 18, 30, shade(c.trim, 0.95), c.doors.main, light);
      };
      p.leftFace(0.28, 1.92, 1.27, 8, nave(1, 4, true), 64);
      // The bell tower stands in front of the nave's east wall: no windows there (no glow behind it).
      p.rightFace(0.33, 1.27, 1.92, 8, nave(R, 0, false), 64);
      p.material = 'tile';
      styledGable(p, s, 0.28, 0.33, 1.92, 1.27, 72, NAVE_RISE, c.roof, c.ashlar, 'u');
      // Bell tower at the nave's east end.
      const top = 150;
      p.box(1.92, 0.32, 2.62, 1.02, 0, top, { color: c.stone, detail: 'stone' });
      const belfry = (light: number) => (w: number, h: number) => {
        corners(ctx, w, h, light);
        cornice(ctx, w, h - 34, c.trim, light, 3);
        cornice(ctx, w, h - 4, c.trim, light, 4);
        for (const x of [w * 0.3, w * 0.7]) archedOpening(ctx, x - 5, 10, 22, shade(c.trim, 0.9), 0x15110d, light);
        p.window(w / 2 - 3, -h * 0.45, 6, 14, true);
      };
      p.leftFace(1.92, 2.62, 1.02, 0, belfry(1), top);
      p.rightFace(0.32, 1.02, 2.62, 0, belfry(R), top);
      if (hasOnionDomes(s)) {
        onionDome(p, 2.27, 0.67, 0.2, top, { color: c.metal });
      } else {
        p.material = 'tile';
        const apex = styledHip(p, s, 1.88, 0.28, 2.66, 1.06, top, 44, c.roof, 0.06);
        // Gilt cross on the apex.
        ctx.fillStyle = css(0xe8c35a);
        ctx.fillRect(apex[0] - 1, apex[1] - 16, 2, 16);
        ctx.fillRect(apex[0] - 5, apex[1] - 12, 10, 2);
      }
      // Cloister garth: a lawn crossed by paths, clipped shrubs and a well.
      p.ground(0.3, 1.45, 2.7, 2.0, GARTH);
      for (let i = 0; i < 6; i++) {
        const [x, y] = p.p(0.5 + i * 0.4, 1.72, 0);
        ctx.fillStyle = css(shade(0x3e5a2a, 0.9 + p.random() * 0.3));
        ctx.beginPath();
        ctx.ellipse(x, y - 4, 4, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Dormitory range in front: rendered walls over a stone arcade.
      p.box(0.3, 2.05, 2.7, 2.75, 0, 18, { color: c.stone, detail: 'stone' }, c.stone);
      p.box(0.32, 2.07, 2.68, 2.73, 18, 44, { color: c.plaster });
      const range = (light: number, bays: number) => (w: number, h: number) => {
        corners(ctx, w, h, light);
        for (let i = 0; i < bays; i++) {
          const x = (w / bays) * (i + 0.5);
          archedOpening(ctx, x - 5, 10, 14, shade(c.ashlar, 0.95), 0x2a2018, light);
          p.window(x - 3, -h + 8, 6, 10);
        }
      };
      p.leftFace(0.3, 2.7, 2.75, 0, range(1, 7), 44);
      p.rightFace(2.05, 2.75, 2.7, 0, range(R, 2), 44);
      styledGable(p, s, 0.32, 2.07, 2.68, 2.73, 44, RANGE_RISE, c.roofAlt, c.plaster, 'u');
      p.flag(2.6, 1.0, top + 12 + roofLift(s, 44), 26, team);
    },
  };
}
