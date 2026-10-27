import { CIV_DEFS, DEFAULT_CIV, type ArchStyleId } from '../../config/civs';
import type { AgeId, BuildingType, CivId } from '../../types';
import { BAROQUE_ART } from './architecture/baroque';
import { MEDIEVAL_ART } from './architecture/medieval';
import { ROMAN_ART } from './architecture/roman';
import { TOWER_ART } from './architecture/towers';
import { FOUNDRY_ART } from './architecture/foundry';
import { paintWonder, WONDER_ART } from './architecture/wonder';
import type { AgeArtSet, BuildingArt } from './architecture/types';
import { ellipse } from './canvas';
import { IsoPainter } from './isoPainter';
import type { LitArt } from './lighting/normalLayer';
import { paintWallPieceInto, wallMaxHeight } from './walls/paintWall';
import { wallStyleFor } from './walls/wallStyles';
import { wallPiece } from './walls/wallPiece';
import { WALL_E, WALL_W } from '../../game/wallNeighbours';
import { css, shade } from './palette';

/** The piece shown for walls outside the world (build menu, placement): a run with a post. */
const WALL_ICON_PIECE = wallPiece(WALL_E | WALL_W, 0, 0);

/** Building painter sets by registry id (config/civs.ts architecture). */
const ARCH_ART: Record<ArchStyleId, AgeArtSet> = { roman: ROMAN_ART, medieval: MEDIEVAL_ART, baroque: BAROQUE_ART };

/** The art for a type in a civ's age style, falling back to that civ's age-1 set. */
function artFor(type: BuildingType, age: AgeId, civ: CivId): BuildingArt {
  if (type === 'foundry') return FOUNDRY_ART;
  if (type === 'wall') {
    const style = wallStyleFor(age, civ);
    return { size: 1, maxHeight: wallMaxHeight(style), paint: (p) => paintWallPieceInto(p, WALL_ICON_PIECE, style) };
  }
  if (type === 'tower') return TOWER_ART[age];
  if (type === 'wonder') return WONDER_ART;
  const arch = CIV_DEFS[civ].architecture;
  const art = ARCH_ART[arch[age]][type] ?? ARCH_ART[arch[1]][type];
  if (!art) throw new Error(`no art for ${type}`);
  return art;
}

const ALL_TYPES: readonly BuildingType[] = [
  'town_center', 'house', 'farm', 'lumber_camp', 'mining_camp', 'barracks', 'archery_range',
  'stable', 'blacksmith', 'foundry', 'tower', 'wall', 'wonder',
];

export const BUILDING_ART_SIZES: Record<BuildingType, number> = Object.fromEntries(
  ALL_TYPES.map((t) => [t, artFor(t, 1, DEFAULT_CIV).size]),
) as Record<BuildingType, number>;

/**
 * Paints a building in a civ's age style for a team colour (albedo,
 * normals, shadow volume, glows, light / smoke anchors). Team variants
 * pass withNormals=false and share the base map, so a (type, age, civ)
 * paints the same geometry for every team.
 */
export function paintBuilding(type: BuildingType, team: number, age: AgeId, civ: CivId, withNormals = true): LitArt {
  const art = artFor(type, age, civ);
  const p = new IsoPainter(art.size, art.size, art.maxHeight, type.length * 977 + (age - 1) * 131);
  art.paint(p, team);
  return p.result(withNormals);
}

/** The Wonder at a scaffolding stage (no team colour shows yet); one Wonder design for now. */
export function paintWonderStage(stage: number, _civ: CivId): LitArt {
  const p = new IsoPainter(WONDER_ART.size, WONDER_ART.size, WONDER_ART.maxHeight, 5077 + stage * 13);
  paintWonder(p, 0xffffff, stage);
  return p.result();
}

/** Foundation stones + scaffolding shown while a site is being built. */
export function paintConstructionSite(size: number): LitArt {
  const p = new IsoPainter(size, size, 40 + size * 20, size * 31);
  const ctx = p.ctx;
  p.ground(0.1, 0.1, size - 0.1, size - 0.1, 0x9b8a6a);
  for (let i = 0; i < size * 10; i++) {
    const [x, y] = p.p(0.2 + p.random() * (size - 0.4), 0.2 + p.random() * (size - 0.4), 0);
    ellipse(ctx, x, y, 3 + p.random() * 3, 2 + p.random() * 1.5);
    ctx.fillStyle = css(shade(0xb0a48c, 0.8 + p.random() * 0.4));
    ctx.fill();
  }
  // Scaffolding poles at the corners.
  for (const [u, v] of [[0.2, 0.2], [size - 0.2, 0.2], [0.2, size - 0.2], [size - 0.2, size - 0.2]] as const) {
    const [x, y] = p.p(u, v, 0);
    ctx.fillStyle = '#7a5530';
    ctx.fillRect(x - 1.5, y - 30 - size * 12, 3, 30 + size * 12);
  }
  const s = size - 0.2;
  for (const z of [16, 34 + size * 6]) {
    for (const [a, b] of [[[0.2, s], [s, s]], [[s, s], [s, 0.2]]] as const) {
      const pa = p.p(a[0], a[1], z);
      const pb = p.p(b[0], b[1], z);
      ctx.strokeStyle = '#8a6238';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(pa[0], pa[1]);
      ctx.lineTo(pb[0], pb[1]);
      ctx.stroke();
    }
  }
  return p.result();
}
