import type { Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { crest, R } from '../facade';
import { stringCourse } from '../kits/insula';
import { arcade } from '../kits/patio';
import { column, torch } from '../parts';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';
import { statue } from '../wonderParts';
import { banner, block, brickWall, type Block } from './italianParts';

/*
 * Italian age-1 town centre: a Roman basilica on its travertine podium
 * (after the Basilica Julia). Two tiers of arcades on half-columns wrap
 * the front and the right side, statues stand along their attic, and the
 * brick nave rises behind them to an arched clerestory under a low
 * terracotta gable whose pediment bears the arms.
 */

const PODIUM = 7;
const NAVE: Block = [0.6, 0.45, 2.4, 1.75];
const NAVE_TOP = 122;
const FRONT: Block = [0.3, 1.75, 2.75, 2.6];
const SIDE: Block = [2.4, 0.4, 2.75, 1.75];
const TIER = 30;

/** Two arcade tiers with an entablature between them (face-local). */
function twoTiers(ctx: Ctx, s: ArchStyle, w: number, bays: number, light: number, team: number | null): void {
  const c = s.palette;
  const tier = (dy: number) => {
    ctx.save();
    ctx.translate(0, dy);
    arcade(ctx, w, TIER - 4, { bays, head: 'round', wall: c.ashlar, column: shade(c.ashlar, 1.06), light, rise: 0.86 });
    ctx.restore();
  };
  tier(0);
  stringCourse(ctx, w, TIER - 3, c.ashlar, light, 4);
  tier(-TIER);
  stringCourse(ctx, w, 2 * TIER - 3, c.ashlar, light, 4);
  if (team === null) return;
  const bay = w / bays;
  for (const i of [1, bays - 2]) banner(ctx, i * bay + bay * 0.5 - 4, -2 * TIER + 6, 8, 18, team, light);
}

/** Attic statues along the front and right edges of the arcades' terrace. */
function statues(p: IsoPainter, z: number): void {
  for (let v = SIDE[1] + 0.15; v < SIDE[3]; v += 0.45) statue(p, SIDE[2] - 0.05, v, z);
  for (let u = FRONT[0] + 0.15; u < FRONT[2] - 0.05; u += 0.42) statue(p, u, FRONT[3] - 0.05, z);
}

function paintBasilica(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0xc9bfa6);
  p.box(0.15, 0.15, 2.88, 2.88, 0, PODIUM, { color: c.ashlar, detail: 'stone' }, shade(c.ashlar, 1.04));
  // Honorific column beside the nave, its statue over the skyline.
  p.box(0.22, 0.98, 0.42, 1.18, PODIUM, PODIUM + 12, { color: c.ashlar, detail: 'stone' }, c.trim);
  column(p, 0.32, 1.08, PODIUM + 12, PODIUM + 150, 5.5, c.trim);
  p.box(0.25, 1.01, 0.39, 1.15, PODIUM + 150, PODIUM + 155, { color: c.trim }, c.trim);
  statue(p, 0.32, 1.08, PODIUM + 155);
  // Nave: brick walls, arched clerestory, a low gable with the pediment on the right end.
  const clerestory = (light: number) => (w: number, h: number) => {
    stringCourse(ctx, w, h - 34, c.ashlar, light, 3);
    const n = Math.max(2, Math.round(w / 26));
    for (let i = 0; i < n; i++) {
      const x = ((i + 0.5) * w) / n - 4;
      if (i % 2 === 0) p.window(x, -h + 12, 8, 14, true);
      else {
        ctx.fillStyle = css(shade(0x2a1d14, light));
        ctx.fillRect(x, -h + 16, 8, 10);
      }
    }
  };
  block(p, NAVE, PODIUM, NAVE_TOP, brickWall(s), clerestory(1), clerestory(R));
  const prev = p.material;
  p.material = 'tile';
  p.gableRoof(NAVE[0], NAVE[1], NAVE[2], NAVE[3], NAVE_TOP, 26, c.roof, c.ashlar, 'u', 0.08, (w, rise) => {
    // Pediment: a travertine frame round the tympanum, the arms in the middle.
    ctx.strokeStyle = css(shade(c.ashlar, 1.1 * R));
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -1.5);
    ctx.lineTo(w, -1.5);
    ctx.lineTo(w / 2, -rise + 2);
    ctx.closePath();
    ctx.stroke();
    crest(ctx, s, w / 2, -rise * 0.42, 5.5, team);
  });
  p.material = prev;
  p.flag((NAVE[0] + NAVE[2]) / 2, (NAVE[1] + NAVE[3]) / 2, NAVE_TOP + 26, 30, team, true);
  // Arcades round the right side and the front, terraced on top with an attic of statues.
  const top = PODIUM + 2 * TIER;
  block(p, SIDE, PODIUM, top, { color: c.ashlar, detail: 'stone' }, undefined, (w) => twoTiers(ctx, s, w, 4, R, null), shade(c.ashlar, 0.84));
  block(p, FRONT, PODIUM, top, { color: c.ashlar, detail: 'stone' }, (w) => twoTiers(ctx, s, w, 7, 1, team), (w) => twoTiers(ctx, s, w, 2, R, null), shade(c.ashlar, 0.84));
  p.box(FRONT[0], FRONT[3] - 0.05, FRONT[2], FRONT[3], top, top + 5, { color: c.ashlar }, c.trim);
  p.box(SIDE[2] - 0.05, SIDE[1], SIDE[2], FRONT[3], top, top + 5, { color: c.ashlar }, c.trim);
  statues(p, top + 5);
  // Broad steps up the podium.
  p.box(1.1, 2.6, 1.95, 2.95, 0, 4, { color: c.ashlar }, shade(c.ashlar, 1.08));
  torch(p, 1.0, 2.62, 26, 1.0, 2.95);
  torch(p, 2.05, 2.62, 26, 2.05, 2.95);
}

/** The Italian age-1 town centre: a two-tier arcaded basilica. */
export function basilica(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 190, paint: (p, team) => paintBasilica(p, s, team) };
}
