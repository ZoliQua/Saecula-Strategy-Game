import type { ArchStyleId } from '../../../config/civs';
import { baroqueArt } from './baroque';
import { HUNGARIAN_BAROQUE, HUNGARIAN_MEDIEVAL, HUNGARIAN_ROMAN } from './hungarianStyles';
import { medievalArt } from './medieval';
import { romanArt } from './roman';
import type { ArchFamily, ArchStyle } from './style';
import type { AgeArtSet } from './types';

/** Architectural styles by registry id (config/civs.ts CivDef.architecture). */
export const ARCH_STYLES: Readonly<Record<ArchStyleId, ArchStyle>> = {
  roman: HUNGARIAN_ROMAN,
  medieval: HUNGARIAN_MEDIEVAL,
  baroque: HUNGARIAN_BAROQUE,
};

/** Painter families: each lays a style's palette, roofs and ornaments over its building layouts. */
export const ARCH_FAMILIES: Readonly<Record<ArchFamily, (s: ArchStyle) => AgeArtSet>> = {
  roman: romanArt,
  medieval: medievalArt,
  baroque: baroqueArt,
};

/** Every style's painted set, by style id. */
export const ARCH_ART = Object.fromEntries(
  Object.entries(ARCH_STYLES).map(([id, s]) => [id, ARCH_FAMILIES[s.family](s)]),
) as Readonly<Record<ArchStyleId, AgeArtSet>>;
