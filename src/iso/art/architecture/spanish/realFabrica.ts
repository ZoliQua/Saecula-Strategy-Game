import type { IsoPainter } from '../../isoPainter';
import { FURNACE_LIGHT } from '../../lighting/buildingLights';
import { pilasters, R } from '../facade';
import { barrel, furnaceMouth, heap, shotPyramid } from '../foundry';
import { chimney } from '../parts';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';
import { wallOf } from './courtyardKits';
import { portal, windowAt } from './hispaniaOrnament';
import { block, hip, type Block } from './hispaniaParts';
import { gateway, yardWalls } from './hispaniaYard';

/*
 * Spanish foundry (ágyúöntöde), after the Real Fábrica de Artillería of
 * Seville: a long whitewashed casting hall between ochre pilasters under
 * low terracotta hips, its furnace mouths glowing in the front, two tall
 * brick stacks behind, a plateresque portal with the royal arms, and a
 * walled yard of cast barrels and shot entered through the hacienda gate.
 */

const HALL: Block = [0.3, 0.3, 2.7, 1.25];
const FURNACE: Block = [0.3, 1.25, 1.05, 2.3];
const BRICK = 0xb5683f;

function paintFabrica(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0x7d7064);
  for (const u of [0.9, 2.1]) chimney(p, u, 0.36, u + 0.24, 0.6, 0, 168, { color: BRICK, detail: 'brick' });
  block(p, s, HALL, 0, 58, (w, h) => {
    pilasters(ctx, h - 4, [8, w * 0.36, w * 0.64, w - 8], c.plasterDeep, 7, 1);
    portal(p, s, w / 2 - 11, 22, 34, team, 1);
    for (const x of [0.16, 0.8]) windowAt(p, s, w * x, -h + 14, 9, 16, 1, true);
    for (const x of [0.16, 0.8]) furnaceMouth(p, c.plasterDeep, w * x - 3, 15, 20, 1);
  }, (w, h) => {
    pilasters(ctx, h - 4, [8, w - 8], c.plasterDeep, 7, R);
    windowAt(p, s, w * 0.45, -h + 14, 9, 16, R, true);
  });
  hip(p, s, HALL, 58, 30);
  // Furnace house: a lower block with the blast furnace mouth on its yard side.
  block(p, s, FURNACE, 0, 46, (w, h) => {
    pilasters(ctx, h - 4, [6, w - 6], c.plasterDeep, 6, 1);
    windowAt(p, s, w * 0.4, -h + 12, 8, 13, 1);
  }, (w) => furnaceMouth(p, c.plasterDeep, w / 2 - 12, 24, 30, R));
  hip(p, s, FURNACE, 46, 22);
  chimney(p, 0.5, 1.5, 0.72, 1.72, 40, 120, wallOf(s));
  p.addLight(1.4, 1.8, FURNACE_LIGHT);
  // Yard: barrels on skids, shot, coal.
  for (const v of [1.6, 1.85]) barrel(p, 1.35, 2.15, v);
  shotPyramid(p, 2.45, 1.55);
  heap(p, 2.4, 2.25, 13, 13, 0x2a2624);
  yardWalls(p, s, 1.05, 1.25, 2.85, 2.85, 18, 1.5, 2.15);
  gateway(p, s, 1.5, 2.15, 2.85, 36, team);
}

/** The Spanish foundry: the royal artillery works. */
export function realFabrica(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 200, paint: (p, team) => paintFabrica(p, s, team) };
}
