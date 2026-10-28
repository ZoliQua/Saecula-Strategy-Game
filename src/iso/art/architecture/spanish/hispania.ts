import type { ArchStyle } from '../style';
import type { AgeArtSet } from '../types';
import { faroTower } from './faroTower';
import { forum } from './forum';
import { hispaniaHouse } from './hispaniaHouse';
import { hispaniaMilArt } from './hispaniaMil';
import { hispaniaWorkArt } from './hispaniaWork';

/** Courtyard family layouts (Spanish age 1; the Mudéjar family spreads them). */
export function hispaniaArt(s: ArchStyle): AgeArtSet {
  return {
    town_center: forum(s),
    house: hispaniaHouse(s),
    ...hispaniaWorkArt(s),
    ...hispaniaMilArt(s),
    tower: faroTower(s),
  };
}
