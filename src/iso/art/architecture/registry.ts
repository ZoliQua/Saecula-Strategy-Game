import { CIV_DEFS, CIV_IDS, type ArchStyleId } from '../../../config/civs';
import type { CivId } from '../../../types';
import { dockArt } from './dock';
import { marketArt } from './market';
import { monasteryArt } from './monastery';
import { baroqueArt } from './baroque';
import { ENGLISH_GEORGIAN, ENGLISH_ROMANO_BRITISH, ENGLISH_TUDOR } from './english/englishStyles';
import { gothicCathedral } from './english/gothicCathedral';
import { royalDockyardArt } from './english/royalDockyard';
import { FINNISH_FINNIC, FINNISH_GREYSTONE, FINNISH_GUSTAVIAN } from './finnish/finnishStyles';
import { nordicArt } from './finnish/nordic';
import { saunaArt } from './finnish/sauna';
import { akademiaArt } from './french/akademia';
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
import { hanseKontorArt } from './german/hanseKontor';
import { kaiserdom } from './german/kaiserdom';
import { limesTower } from './german/limesTower';
import { portaNigra } from './german/portaNigra';
import { wehrturm } from './german/wehrturm';
import { bankhausArt } from './italian/bankhaus';
import { comuneArt } from './italian/comune';
import { etruriaArt } from './italian/etruria';
import { ITALIAN_COMUNE, ITALIAN_ETRURIA, ITALIAN_RINASCIMENTO } from './italian/italianStyles';
import { rinascimentoArt } from './italian/rinascimento';
import { izbaArt } from './russian/izba';
import { ostrogArt } from './russian/ostrog';
import { petrineArt } from './russian/petrine';
import { RUSSIAN_GORD, RUSSIAN_MUSCOVY, RUSSIAN_PETRINE } from './russian/russianStyles';
import { hispaniaArt } from './spanish/hispania';
import { casaMonedaArt } from './spanish/casaMoneda';
import { mudejarArt } from './spanish/mudejar';
import { SPANISH_COLONIAL, SPANISH_HISPANIA, SPANISH_MUDEJAR } from './spanish/spanishStyles';
import { vegvarArt } from './hungarian/vegvar';
import { HUNGARIAN_BAROQUE, HUNGARIAN_MEDIEVAL, HUNGARIAN_ROMAN } from './hungarianStyles';
import { medievalArt } from './medieval';
import { romanArt } from './roman';
import type { ArchFamily, ArchStyle } from './style';
import type { AgeArtSet, BuildingArt } from './types';

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
  etruria: ITALIAN_ETRURIA,
  comune: ITALIAN_COMUNE,
  rinascimento: ITALIAN_RINASCIMENTO,
  rus_gord: RUSSIAN_GORD,
  muscovy: RUSSIAN_MUSCOVY,
  petrine: RUSSIAN_PETRINE,
  finnic: FINNISH_FINNIC,
  greystone: FINNISH_GREYSTONE,
  gustavian: FINNISH_GUSTAVIAN,
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
  etruria: etruriaArt,
  comune: comuneArt,
  rinascimento: rinascimentoArt,
  izba: izbaArt,
  petrine: petrineArt,
  nordic: nordicArt,
};

/**
 * Each nation's landmark painter (M17), painted in every one of the civ's
 * age styles (the palette follows the age, the silhouette is the
 * landmark's). Until a civ's own painter lands (M17 Tasks 4–5) it shows
 * the shared placeholder keep.
 */
export const LANDMARK_ART: Readonly<Record<CivId, (s: ArchStyle) => BuildingArt>> = {
  hungarian: vegvarArt,
  english: royalDockyardArt,
  german: hanseKontorArt,
  french: akademiaArt,
  spanish: casaMonedaArt,
  italian: bankhausArt,
  russian: ostrogArt,
  finnish: saunaArt,
};

/** The civ whose age styles include `id` (every style belongs to one civ). */
const STYLE_CIV = new Map<ArchStyleId, CivId>(
  CIV_IDS.flatMap((civ) => Object.values(CIV_DEFS[civ].architecture).map((id) => [id, civ] as const)),
);

/** The landmark of the civ owning style `id`, painted in that style (none for a style no civ uses). */
function landmarkFor(id: ArchStyleId, s: ArchStyle): { landmark?: BuildingArt } {
  const civ = STYLE_CIV.get(id);
  return civ ? { landmark: LANDMARK_ART[civ](s) } : {};
}

/**
 * Every style's painted set, by style id; the shared monastery (M11), dock (M14) and market (M17) unless
 * the family paints its own, and the owning civ's landmark (M17).
 */
export const ARCH_ART = Object.fromEntries(
  (Object.entries(ARCH_STYLES) as Array<[ArchStyleId, ArchStyle]>).map(([id, s]) => [
    id,
    { monastery: monasteryArt(s), dock: dockArt(s), market: marketArt(s), ...ARCH_FAMILIES[s.family](s), ...landmarkFor(id, s) },
  ]),
) as Readonly<Record<ArchStyleId, AgeArtSet>>;
