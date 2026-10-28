import type { WallStyle } from '../../isoPainter';
import { shade } from '../../palette';
import type { ArchStyle, CourtyardKits } from '../style';

/** The first-age reading, for styles that set no courtyard kits. */
const FIRST_AGE: CourtyardKits = {
  walls: 'whitewash',
  portal: 'voussoir',
  tileBands: false,
  merlons: false,
  towers: 'none',
  espadanas: false,
  balconies: false,
  water: 'impluvium',
  field: 'olives',
};

/** The courtyard families' reading of a style (style.kits.courtyard). */
export function kitsOf(s: ArchStyle): CourtyardKits {
  return s.kits?.courtyard ?? FIRST_AGE;
}

/** Wall finish of the age: whitewash (plaster) or Toledan brick. */
export function wallOf(s: ArchStyle): WallStyle {
  return kitsOf(s).walls === 'toledan' ? { color: s.palette.brick, detail: 'brick' } : { color: s.palette.plaster, detail: 'plaster' };
}

/** Coping and parapet-top colour of the age's walls. */
export function copingOf(s: ArchStyle): number {
  return kitsOf(s).walls === 'toledan' ? shade(s.palette.brick, 1.1) : shade(s.palette.plaster, 1.04);
}

/** Terrace floor colour: lime-washed tiles or worn brick. */
export function floorOf(s: ArchStyle): number {
  return kitsOf(s).walls === 'toledan' ? 0xb48a68 : 0xd9cdb3;
}
