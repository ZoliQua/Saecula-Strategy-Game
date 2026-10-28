import type { IsoPainter } from '../../isoPainter';
import type { ArchStyle } from '../style';
import { apexSmoke, coneRoof, drumEaveShade, drumOpening, drumWall, type DrumDetail } from '../kits/drum';

/*
 * Celtic roundhouse (Romano-British): the round drum and cone kits
 * (kits/drum.ts) composed into a footed, doored, thatched house.
 */

export interface RoundhouseSpec {
  /** Drum radius (tiles). */
  readonly r: number;
  /** Wall height (art px). */
  readonly wall: number;
  /** Cone rise at pitch 1 (scaled by the style's pitch). */
  readonly rise: number;
  /** Doorway facing direction (radians in tile axes, π/2 = +v); none when undefined. */
  readonly door?: number;
  /** Doorway interior: firelit (glows at dusk) or dark. */
  readonly fire?: boolean;
  readonly color?: number;
  readonly detail?: DrumDetail;
  readonly cover?: 'thatch' | 'slate';
  readonly roofColor?: number;
  /** Hearth smoke seeping from the apex (domestic: follows the chimneys ornament). */
  readonly smoke?: boolean;
}

/**
 * Celtic roundhouse: stone footing, daub / wattle / stone drum, a
 * timber doorway, and a tall cone roof overhanging the wall. Returns
 * the apex height (art px).
 */
export function roundhouse(p: IsoPainter, s: ArchStyle, uc: number, vc: number, spec: RoundhouseSpec): number {
  const c = s.palette;
  const { r, wall } = spec;
  drumWall(p, uc, vc, r + 0.02, 0, 6, c.stone, 'stone');
  drumWall(p, uc, vc, r, 6, wall, spec.color ?? c.plaster, spec.detail ?? 'daub');
  if (spec.door !== undefined) drumOpening(p, uc, vc, r, spec.door, 8, 2, Math.min(24, wall - 10), c.timber, spec.fire === false ? 'dark' : 'fire');
  drumEaveShade(p, uc, vc, r, wall - 12, wall);
  const rise = spec.rise * s.roof.pitch;
  const eave = wall - 3;
  coneRoof(p, uc, vc, r + 0.17, eave, rise, spec.roofColor ?? c.thatch, spec.cover ?? 'thatch');
  if (spec.smoke && s.ornaments.chimneys) apexSmoke(p, uc, vc, eave + rise);
  return eave + rise;
}
