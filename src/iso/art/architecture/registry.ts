import type { ArchStyleId } from '../../../config/civs';
import { baroqueArt } from './baroque';
import { ENGLISH_ROMANO_BRITISH, ENGLISH_TUDOR } from './english/englishStyles';
import { romanoBritishArt } from './english/romanoBritish';
import { tudorArt } from './english/tudor';
import { HUNGARIAN_BAROQUE, HUNGARIAN_MEDIEVAL, HUNGARIAN_ROMAN } from './hungarianStyles';
import { medievalArt } from './medieval';
import { romanArt } from './roman';
import type { ArchFamily, ArchStyle } from './style';
import type { AgeArtSet } from './types';

/*
 * Adding a civ's architecture:
 * 1. Style ids: extend ArchStyleId (config/civs.ts) and point the civ's
 *    CivDef.architecture at them.
 * 2. Styles: ArchStyle objects (e.g. architecture/english/), non-zero
 *    seedSalt, headroom sized for the pitch; register them below.
 * 3. Bespoke buildings: add an ArchFamily id (style.ts) and a factory
 *    here that spreads an existing family and overrides types, e.g.
 *    `gothic: (s) => ({ ...medievalArt(s), town_center: gothicHall(s) })`.
 *    The age-3 family must provide `wonder` (WonderArt with paintStage).
 */

/** Architectural styles by registry id (config/civs.ts CivDef.architecture). */
export const ARCH_STYLES: Readonly<Record<ArchStyleId, ArchStyle>> = {
  roman: HUNGARIAN_ROMAN,
  medieval: HUNGARIAN_MEDIEVAL,
  baroque: HUNGARIAN_BAROQUE,
  romano_british: ENGLISH_ROMANO_BRITISH,
  tudor: ENGLISH_TUDOR,
};

/** Painter families: each lays a style's palette, roofs and ornaments over its building layouts. */
export const ARCH_FAMILIES: Readonly<Record<ArchFamily, (s: ArchStyle) => AgeArtSet>> = {
  roman: romanArt,
  medieval: medievalArt,
  baroque: baroqueArt,
  romano_british: romanoBritishArt,
  tudor: tudorArt,
};

/** Every style's painted set, by style id. */
export const ARCH_ART = Object.fromEntries(
  Object.entries(ARCH_STYLES).map(([id, s]) => [id, ARCH_FAMILIES[s.family](s)]),
) as Readonly<Record<ArchStyleId, AgeArtSet>>;
