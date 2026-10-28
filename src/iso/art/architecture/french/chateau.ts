import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { crest, R } from '../facade';
import { turret } from '../kits/pepperpot';
import { torch } from '../parts';
import type { ArchStyle } from '../style';
import { styledHip } from '../styledRoofs';
import type { BuildingArt } from '../types';
import { lucarnes, machicolations, moat, pointedDoor, tallStack } from './gothicParts';

/*
 * French age-2 town centre: a Loire château keep standing in its moat —
 * a square tuffeau donjon with a machicolated wall-walk under a steep
 * slate pavilion of a roof with stone lucarnes and tall stacks, a round
 * turret at each corner carrying a candle-snuffer pepperpot, the
 * fleur-de-lis over the pointed portal and a stone bridge to the yard.
 */

const [U0, V0, U1, V1] = [0.82, 0.72, 2.18, 2.08];
const WALL = 126;
const RISE = 62;
const TURRET_R = 0.25;
const TURRET_TOP = 132;

/** Lancet windows of one face: three storeys of bays, the portal bay left for the door on the front. */
function keepFace(p: IsoPainter, s: ArchStyle, w: number, h: number, light: number, team: number, front: boolean): void {
  const ctx = p.ctx;
  const stone = s.palette.ashlar;
  for (const y of [40, 82]) {
    ctx.fillStyle = css(shade(stone, light * 1.1));
    ctx.fillRect(0, -y - 3, w, 3);
    ctx.fillStyle = 'rgba(40,30,20,.2)';
    ctx.fillRect(0, -y, w, 1.2);
  }
  const bays = [0.22, 0.5, 0.78];
  for (const [i, x] of bays.entries()) {
    const portal = front && i === 1;
    if (!portal) p.window(w * x - 3.5, -32, 7, 18, true);
    p.window(w * x - 4.5, -74, 9, 26, true);
    p.window(w * x - 4, -108, 8, 20, true);
  }
  if (front) {
    pointedDoor(ctx, w / 2 - 9, 18, 30, stone, s.palette.doors.main, light);
    crest(ctx, s, w / 2, -48, 7, team);
  }
  machicolations(ctx, w, h, stone, light);
}

function paintChateau(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const stone = c.ashlar;
  const rise = RISE * s.roof.pitch;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0x8f9a6a);
  moat(p, 0.32, 0.28, 2.72, 2.66);
  // Back turret first, then the keep rising from its battered plinth.
  turret(p, s, U0, V0, TURRET_R, 0, TURRET_TOP, { corbels: true, steep: 2.5 });
  p.box(U0 - 0.06, V0 - 0.06, U1 + 0.06, V1 + 0.06, 0, 14, { color: shade(stone, 0.86), detail: 'stone' }, stone);
  p.box(U0, V0, U1, V1, 14, WALL, { color: stone, detail: 'stone' });
  p.leftFace(U0, U1, V1, 14, (w, h) => keepFace(p, s, w, h, 1, team, true), WALL - 14);
  p.rightFace(V0, V1, U1, 14, (w, h) => keepFace(p, s, w, h, R, team, false), WALL - 14);
  styledHip(p, s, U0 - 0.02, V0 - 0.02, U1 + 0.02, V1 + 0.02, WALL, RISE, c.roof, 0.05);
  const run = (V1 - V0) / 2 + 0.07;
  lucarnes(p, s, 'v', [1.22, 1.78], V1 + 0.07, run, WALL, rise);
  lucarnes(p, s, 'u', [1.22, 1.78], U1 + 0.07, run, WALL, rise);
  // Tall stacks on the side slopes (the hip falls away from the apex).
  const roofAt = (u: number, v: number) => WALL + rise * (1 - Math.max(Math.abs(u - 1.5), Math.abs(v - 1.4)) / run);
  tallStack(p, 1.18, 1.5, roofAt(1.18, 1.5) - 4, WALL + rise + 16, shade(stone, 0.96));
  tallStack(p, 1.62, 1.08, roofAt(1.62, 1.08) - 4, WALL + rise + 22, shade(stone, 0.96));
  p.flag(1.5, 1.4, WALL + rise + 2, 24, team, true);
  // Side turrets, then the front one.
  turret(p, s, U0, V1, TURRET_R, 0, TURRET_TOP, { corbels: true, steep: 2.5, lights: [60, 100] });
  turret(p, s, U1, V0, TURRET_R, 0, TURRET_TOP, { corbels: true, steep: 2.5, lights: [100] });
  turret(p, s, U1, V1, TURRET_R, 0, TURRET_TOP, { corbels: true, steep: 2.5, lights: [40, 76, 110], team });
  // Stone bridge over the moat to the portal, with low parapets and torches.
  p.box(1.3, V1 + 0.06, 1.7, 2.92, 0, 8, { color: shade(stone, 0.9), detail: 'stone' }, shade(stone, 1.02));
  p.box(1.3, V1 + 0.06, 1.36, 2.92, 8, 14, { color: stone }, stone);
  p.box(1.64, V1 + 0.06, 1.7, 2.92, 8, 14, { color: stone }, stone);
  torch(p, 1.3, 2.9, 22, 1.2, 3.05);
  torch(p, 1.7, 2.9, 22, 1.8, 3.05);
}

/** The French age-2 town centre: a moated Loire château keep with four pepperpot turrets. */
export function chateau(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 236 + s.headroom, paint: (p, team) => paintChateau(p, s, team) };
}
