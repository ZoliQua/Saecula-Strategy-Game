import { baroqueArt } from '../baroque';
import { medievalArt } from '../medieval';
import { wawel } from './wawel';
import { zamoscHouse, zamoscTownHall } from './zamosc';
import { krakowBarracks, krakowRange, krakowStable } from './krakowMil';
import { krakowChurch, krakowHouse, krakowTower } from './krakow';
import { biskupinGate, biskupinHouse, biskupinTower } from './biskupin';
import type { ArchStyle } from '../style';
import type { AgeArtSet } from '../types';

/** Biskupin family (Polish age 1): the medieval layouts under reed thatch, with the settlement's own buildings. */
export function biskupinArt(s: ArchStyle): AgeArtSet {
  return { ...medievalArt(s), town_center: biskupinGate(s), house: biskupinHouse(s), tower: biskupinTower(s) };
}

/** Kraków family (Polish age 2): the medieval workplaces in brick and plain tile; St Mary's, the houses, tower and military halls are its own. */
export function krakowArt(s: ArchStyle): AgeArtSet {
  return { ...medievalArt(s), town_center: krakowChurch(s), house: krakowHouse(s), tower: krakowTower(s), barracks: krakowBarracks(s), stable: krakowStable(s), archery_range: krakowRange(s) };
}

/** Zamość family (Polish age 3): the baroque layouts under attic parapets, with Wawel as Wonder. */
export function zamoscArt(s: ArchStyle): AgeArtSet {
  return { ...baroqueArt(s), town_center: zamoscTownHall(s), house: zamoscHouse(s), wonder: wawel(s) };
}
