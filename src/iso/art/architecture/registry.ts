import type { ArchStyleId } from '../../../config/civs';
import { baroqueArt } from './baroque';
import { ENGLISH_GEORGIAN, ENGLISH_ROMANO_BRITISH, ENGLISH_TUDOR } from './english/englishStyles';
import { gothicCathedral } from './english/gothicCathedral';
import { chateau } from './french/chateau';
import { classicTower } from './french/classicTower';
import { FRENCH_CLASSICISME, FRENCH_GALLO_ROMAN, FRENCH_GOTHIC } from './french/frenchStyles';
import { galloHouse } from './french/galloHouse';
import { galloTower } from './french/galloTower';
import { gothicTower } from './french/gothicTower';
import { hotelDeVille } from './french/hotelDeVille';
import { maisonCarree } from './french/maisonCarree';
import { versaillesPalace } from './french/versailles';
import { romanoBritishArt } from './english/romanoBritish';
import { georgianArt } from './families/georgian/georgian';
import { tudorArt } from './families/tudor/tudor';
import { GERMAN_BACKSTEIN, GERMAN_FACHWERK, GERMAN_LIMES } from './german/germanStyles';
import { kaiserdom } from './german/kaiserdom';
import { limesTower } from './german/limesTower';
import { portaNigra } from './german/portaNigra';
import { wehrturm } from './german/wehrturm';
import { hispaniaArt } from './spanish/hispania';
import { mudejarArt } from './spanish/mudejar';
import { SPANISH_COLONIAL, SPANISH_HISPANIA, SPANISH_MUDEJAR } from './spanish/spanishStyles';
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
  georgian: ENGLISH_GEORGIAN,
  limes: GERMAN_LIMES,
  fachwerk: GERMAN_FACHWERK,
  backstein: GERMAN_BACKSTEIN,
  gallo_roman: FRENCH_GALLO_ROMAN,
  gothic_fr: FRENCH_GOTHIC,
  classicisme: FRENCH_CLASSICISME,
  hispania: SPANISH_HISPANIA,
  mudejar: SPANISH_MUDEJAR,
  colonial: SPANISH_COLONIAL,
};

/** Painter families: each lays a style's palette, roofs and ornaments over its building layouts. */
export const ARCH_FAMILIES: Readonly<Record<ArchFamily, (s: ArchStyle) => AgeArtSet>> = {
  roman: romanArt,
  medieval: medievalArt,
  baroque: baroqueArt,
  romano_british: romanoBritishArt,
  tudor: tudorArt,
  georgian: (s) => ({ ...georgianArt(s), wonder: gothicCathedral(s) }),
  porta_nigra: (s) => ({ ...romanArt(s), town_center: portaNigra(s), tower: limesTower(s) }),
  kaiserdom: (s) => ({ ...georgianArt(s), tower: wehrturm(s), wonder: kaiserdom(s) }),
  maison_carree: (s) => ({ ...romanArt(s), town_center: maisonCarree(s), house: galloHouse(s), tower: galloTower(s) }),
  gothic_fr: (s) => ({ ...medievalArt(s), town_center: chateau(s), tower: gothicTower(s) }),
  versailles: (s) => ({ ...baroqueArt(s), town_center: hotelDeVille(s), tower: classicTower(s), wonder: versaillesPalace(s) }),
  hispania: hispaniaArt,
  mudejar: mudejarArt,
};

/** Every style's painted set, by style id. */
export const ARCH_ART = Object.fromEntries(
  Object.entries(ARCH_STYLES).map(([id, s]) => [id, ARCH_FAMILIES[s.family](s)]),
) as Readonly<Record<ArchStyleId, AgeArtSet>>;
