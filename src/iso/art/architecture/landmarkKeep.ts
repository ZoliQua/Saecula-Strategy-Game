import type { IsoPainter, WallStyle } from '../isoPainter';
import { shade } from '../palette';
import { archedOpening, cornice, quoins, R } from './facade';
import type { ArchStyle } from './style';
import type { BuildingArt } from './types';

/** Height of the keep's walls (art px). */
const KEEP_TOP = 120;
/** Height of the low curtain wall around the yard. */
const CURTAIN = 20;

/** A run of merlons on a parapet edge from (u0, v0) to (u1, v1) at z. */
function merlons(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, z: number, n: number, wall: WallStyle): void {
  const cap = shade(wall.color, 1.08);
  for (let i = 0; i < n; i++) {
    const a = i / n;
    const b = (i + 0.5) / n;
    const mu0 = u0 + (u1 - u0) * a;
    const mv0 = v0 + (v1 - v0) * a;
    const mu1 = u0 + (u1 - u0) * b;
    const mv1 = v0 + (v1 - v0) * b;
    p.box(Math.min(mu0, mu1), Math.min(mv0, mv1), Math.max(mu0, mu1) + 0.07, Math.max(mv0, mv1) + 0.07, z, z + 9, wall, cap);
  }
}

/**
 * The placeholder landmark (M17): a plain square keep in the style's
 * palette, crenellated, inside a low curtain wall with a gate, flying the
 * team flag. Every civ shows it until its own landmark painter lands
 * (architecture/registry.ts LANDMARK_ART, M17 Tasks 4–5).
 */
export function landmarkKeepArt(s: ArchStyle): BuildingArt {
  const c = s.palette;
  const stone: WallStyle = { color: c.stone, detail: 'stone' };
  const ashlar: WallStyle = { color: c.ashlar, detail: 'stone' };
  return {
    size: 3,
    maxHeight: KEEP_TOP + 60,
    paint: (p, team) => {
      const ctx = p.ctx;
      p.footShadow();
      p.ground(0.05, 0.05, 2.95, 2.95, shade(c.stone, 0.85));
      // Back curtain walls (behind the keep).
      p.box(0.15, 0.15, 2.85, 0.35, 0, CURTAIN, stone, c.stone);
      p.box(0.15, 0.15, 0.35, 2.85, 0, CURTAIN, stone, c.stone);
      merlons(p, 0.15, 0.15, 2.85, 0.15, CURTAIN, 6, stone);
      merlons(p, 0.15, 0.15, 0.15, 2.85, CURTAIN, 6, stone);
      // The keep: plinth, ashlar walls with arched windows, a cornice and a crenellated top.
      p.box(0.8, 0.8, 2.2, 2.2, 0, 10, stone, c.stone);
      p.box(0.85, 0.85, 2.15, 2.15, 10, KEEP_TOP, ashlar, c.stone);
      const face = (light: number, door: boolean) => (w: number, h: number) => {
        if (s.ornaments.quoins) quoins(ctx, w, h, c.trim, light);
        cornice(ctx, w, h - 6, c.trim, light, 5);
        for (const x of [w * 0.28, w * 0.72]) p.window(x - 4, -h + 24, 8, 18, true);
        p.window(w / 2 - 3, -h + 58, 6, 14, true);
        if (door) archedOpening(ctx, w / 2 - 8, 16, 26, shade(c.trim, 0.95), c.doors.main, light);
      };
      p.leftFace(0.85, 2.15, 2.15, 10, face(1, true), KEEP_TOP - 10);
      p.rightFace(0.85, 2.15, 2.15, 10, face(R, false), KEEP_TOP - 10);
      merlons(p, 0.85, 0.85, 2.15, 0.85, KEEP_TOP, 5, ashlar);
      merlons(p, 0.85, 0.85, 0.85, 2.15, KEEP_TOP, 5, ashlar);
      merlons(p, 0.85, 2.08, 2.15, 2.08, KEEP_TOP, 5, ashlar);
      merlons(p, 2.08, 0.85, 2.08, 2.15, KEEP_TOP, 5, ashlar);
      p.flag(1.5, 1.5, KEEP_TOP, 30, team, true);
      // Front curtain walls with a gate (low, below the keep's windows).
      p.box(0.15, 2.65, 1.2, 2.85, 0, CURTAIN, stone, c.stone);
      p.box(1.8, 2.65, 2.85, 2.85, 0, CURTAIN, stone, c.stone);
      p.box(2.65, 0.15, 2.85, 2.65, 0, CURTAIN, stone, c.stone);
      merlons(p, 0.15, 2.65, 1.2, 2.65, CURTAIN, 3, stone);
      merlons(p, 1.8, 2.65, 2.85, 2.65, CURTAIN, 3, stone);
      merlons(p, 2.65, 0.15, 2.65, 2.65, CURTAIN, 6, stone);
      // Gate towers.
      p.box(1.05, 2.55, 1.3, 2.9, 0, CURTAIN + 14, stone, c.stone);
      p.box(1.7, 2.55, 1.95, 2.9, 0, CURTAIN + 14, stone, c.stone);
    },
  };
}
