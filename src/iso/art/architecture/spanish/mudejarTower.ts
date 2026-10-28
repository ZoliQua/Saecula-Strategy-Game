import { TOWER_PLATFORM_Z } from '../../../../config/visual';
import type { Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { R } from '../facade';
import { archPath } from '../kits/patio';
import type { ArchStyle } from '../style';
import { archer, brazier, parapet } from '../towerParts';
import type { BuildingArt } from '../types';
import { glazedDiscs, portal, tileBand } from './hispaniaOrnament';

/*
 * Spanish age-2 tower: a Mudéjar brick tower after San Martín and El
 * Salvador at Teruel — a square brick shaft dressed with glazed bands,
 * green-and-white discs and blind interlaced horseshoe arcades, a door in
 * its alfiz, and on top an open loggia on four brick piers under a low
 * pyramid of green glazed tile, the archer at the gameplay height.
 */

const GLAZED_ROOF = 0x3f7a5c;

/** Blind arcade of interlaced horseshoe arches in relief (face-local), its foot `y` px up. */
function blindArcade(ctx: Ctx, w: number, y: number, h: number, brick: number, light: number): void {
  const n = 4;
  const bay = w / n;
  ctx.strokeStyle = css(shade(brick, light * 1.25));
  ctx.lineWidth = 1.6;
  for (let i = -0.5; i < n; i += 0.5) {
    const x = i * bay + bay * 0.1;
    ctx.save();
    ctx.translate(0, -y);
    archPath(ctx, x, bay * 0.8, h, 'horseshoe');
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = css(shade(0x2e1f17, light), 0.55);
  for (let i = 0; i < n; i++) {
    ctx.save();
    ctx.translate(0, -y);
    archPath(ctx, i * bay + bay * 0.25, bay * 0.5, h * 0.8, 'horseshoe');
    ctx.fill();
    ctx.restore();
  }
}

function paintTower(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const z = TOWER_PLATFORM_Z[2];
  const brick = { color: c.brick, detail: 'brick' as const };
  p.footShadow();
  p.box(0.12, 0.12, 0.88, 0.88, 0, 14, { color: c.stone, detail: 'stone' }, shade(c.stone, 1.08));
  p.box(0.17, 0.17, 0.83, 0.83, 14, z, brick);
  const face = (light: number, front: boolean) => (w: number, h: number) => {
    const ctx = p.ctx;
    tileBand(ctx, w, h - 4, 4, light);
    blindArcade(ctx, w, h - 34, 20, c.brick, light);
    tileBand(ctx, w, h - 40, 3.5, light);
    glazedDiscs(ctx, [w * 0.2, w * 0.4, w * 0.6, w * 0.8], -h + 48, light);
    tileBand(ctx, w, h * 0.45, 3.5, light);
    blindArcade(ctx, w, h * 0.45 - 26, 18, c.brick, light);
    p.window(w / 2 - 4, -h * 0.3 - 14, 8, 14, true);
    if (front) portal(p, s, w / 2 - 7, 14, 24, team, light);
  };
  p.leftFace(0.17, 0.83, 0.83, 14, face(1, true), z - 14);
  p.rightFace(0.17, 0.83, 0.83, 14, face(R, false), z - 14);
  // Corbelled cornice and the loggia: piers at the four corners, a parapet, the archer.
  p.box(0.13, 0.13, 0.87, 0.87, z - 4, z, { color: shade(c.brick, 1.08) }, 0x8a6a50);
  const pier = 0.12;
  const top = z + 34;
  const piers: Array<readonly [number, number]> = [[0.15, 0.15], [0.85 - pier, 0.15], [0.15, 0.85 - pier], [0.85 - pier, 0.85 - pier]];
  const [back, ...rest] = piers;
  if (back) p.box(back[0], back[1], back[0] + pier, back[1] + pier, z, top, brick);
  parapet(p, 0.15, 0.15, 0.85, 0.85, z, { color: c.brick }, 'back', 0);
  brazier(p, 0.32, 0.32, z, 0.6, 1.1);
  archer(p, 0.62, 0.42, z, team, 'kettle');
  parapet(p, 0.15, 0.15, 0.85, 0.85, z, { color: c.brick }, 'front', 0);
  for (const [u, v] of rest) p.box(u, v, u + pier, v + pier, z, top, brick);
  // Lintel band and the glazed pyramid.
  p.box(0.13, 0.13, 0.87, 0.87, top, top + 5, { color: shade(c.brick, 1.05) }, 0x8a6a50);
  p.leftFace(0.13, 0.87, 0.87, top, (w) => tileBand(p.ctx, w, 4.5, 3.5, 1), 5);
  p.rightFace(0.13, 0.87, 0.87, top, (w) => tileBand(p.ctx, w, 4.5, 3.5, R), 5);
  const prev = p.material;
  p.material = 'tile';
  p.hipRoof(0.13, 0.13, 0.87, 0.87, top + 5, 34, GLAZED_ROOF, 0.07);
  p.material = prev;
  const [x, y] = p.p(0.5, 0.5, top + 39);
  const ctx = p.ctx;
  ctx.fillStyle = '#1e1a18';
  ctx.fillRect(x - 0.7, y - 12, 1.4, 12);
  ctx.fillStyle = '#d9b14a';
  for (const dy of [3, 7]) {
    ctx.beginPath();
    ctx.arc(x, y - dy, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  p.addVolumePoint(0.5, 0.5, top + 51);
  p.flag(0.86, 0.14, top + 5, 20, team);
}

/** The Spanish age-2 tower: a Teruel Mudéjar brick tower with a glazed pyramid over its loggia. */
export function mudejarTower(s: ArchStyle): BuildingArt {
  return { size: 1, maxHeight: 250, paint: (p, team) => paintTower(p, s, team) };
}
