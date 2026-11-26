import { baroqueArt } from '../baroque';
import { medievalArt } from '../medieval';
import { wawel } from './wawel';
import { zamoscHouse, zamoscTownHall } from './zamosc';
import { krakowBarracks, krakowRange, krakowSmithy, krakowStable } from './krakowMil';
import { zamoscBarracks, zamoscRange, zamoscSmithy, zamoscStable } from './zamoscMil';
import { biskupinBarracks, biskupinRange, biskupinSmithy, biskupinStable } from './biskupinMil';
import { krakowChurch, krakowHouse, krakowTower } from './krakow';
import { biskupinGate, biskupinHouse, biskupinTower } from './biskupin';
import type { ArchStyle } from '../style';
import type { AgeArtSet } from '../types';

/** Biskupin family (Polish age 1): the medieval layouts under reed thatch, with the settlement's own houses, gate, tower and workshops (M22). */
export function biskupinArt(s: ArchStyle): AgeArtSet {
  return {
    ...medievalArt(s),
    town_center: biskupinGate(s),
    house: biskupinHouse(s),
    tower: biskupinTower(s),
    barracks: biskupinBarracks(s),
    archery_range: biskupinRange(s),
    stable: biskupinStable(s),
    blacksmith: biskupinSmithy(s),
  };
}

/** Kraków family (Polish age 2): the medieval workplaces in brick and plain tile; St Mary's, the houses, tower, military halls and smithy (M22) are its own. */
export function krakowArt(s: ArchStyle): AgeArtSet {
  return {
    ...medievalArt(s),
    town_center: krakowChurch(s),
    house: krakowHouse(s),
    tower: krakowTower(s),
    barracks: krakowBarracks(s),
    stable: krakowStable(s),
    archery_range: krakowRange(s),
    blacksmith: krakowSmithy(s),
  };
}

/** Zamość family (Polish age 3): the baroque layouts under attic parapets, with Wawel as Wonder and arcaded workshops of its own (M22). */
export function zamoscArt(s: ArchStyle): AgeArtSet {
  return {
    ...baroqueArt(s),
    town_center: zamoscTownHall(s),
    house: zamoscHouse(s),
    wonder: wawel(s),
    barracks: zamoscBarracks(s),
    archery_range: zamoscRange(s),
    stable: zamoscStable(s),
    blacksmith: zamoscSmithy(s),
  };
}
