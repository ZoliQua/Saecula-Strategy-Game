import { baroqueArt } from '../baroque';
import { medievalArt } from '../medieval';
import { romanArt } from '../roman';
import type { ArchStyle } from '../style';
import type { AgeArtSet } from '../types';
import { cumbaHouse, domedBarracks, kioskTower, osmanliMosque } from './osmanli';
import { byzantineRange, byzantineSmithy, osmanliRange, osmanliSmithy, osmanliStable, seljukRange, seljukSmithy } from './ottomanWorkshops';
import { suleymaniye } from './suleymaniye';
import { caravanserai, kumbetTower, seljukBarracks, seljukHouse, seljukStable } from './seljuk';
import { byzantineBarracks, byzantineChurch, byzantineFarm, byzantineHouse, byzantineStable, byzantineTower } from './byzantine';

/** Byzantine family (Ottoman age 1): the Roman camps under low tile; the banded, domed halls, workshops, house and tower are its own. */
export function byzantineArt(s: ArchStyle): AgeArtSet {
  return { ...romanArt(s), town_center: byzantineChurch(s), house: byzantineHouse(s), tower: byzantineTower(s), barracks: byzantineBarracks(s), stable: byzantineStable(s), farm: byzantineFarm(s), archery_range: byzantineRange(s), blacksmith: byzantineSmithy(s) };
}

/** Seljuk family (Ottoman age 2): the medieval camps in ashlar under low stone roofs; the caravanserai, kümbets, portals and workshops are its own. */
export function seljukArt(s: ArchStyle): AgeArtSet {
  return { ...medievalArt(s), town_center: caravanserai(s), house: seljukHouse(s), tower: kumbetTower(s), barracks: seljukBarracks(s), stable: seljukStable(s), archery_range: seljukRange(s), blacksmith: seljukSmithy(s) };
}

/** Osmanlı family (Ottoman age 3): the baroque layouts under wide-eaved low hips; the domed mosque, cumba house, kiosk tower, domed halls, workshops, stable and the Süleymaniye are its own. */
export function osmanliArt(s: ArchStyle): AgeArtSet {
  return { ...baroqueArt(s), town_center: osmanliMosque(s), house: cumbaHouse(s), tower: kioskTower(s), barracks: domedBarracks(s), archery_range: osmanliRange(s), stable: osmanliStable(s), blacksmith: osmanliSmithy(s), wonder: suleymaniye(s) };
}
