import type { ArchStyle } from '../style';
import type { AgeArtSet } from '../types';
import { arsenale } from './arsenale';
import { duomo } from './duomo';
import { palazzoSignoria } from './palazzoSignoria';
import { palazzetto, torreCupola } from './rinascHouse';
import { rinascMilArt } from './rinascMil';
import { rinascWorkArt } from './rinascWork';

/** Rinascimento family (Italian age 3): palazzi under cornices, loggias, small domes, the Arsenale and the Duomo. */
export function rinascimentoArt(s: ArchStyle): AgeArtSet {
  return {
    wonder: duomo(s),
    town_center: palazzoSignoria(s),
    house: palazzetto(s),
    ...rinascWorkArt(s),
    ...rinascMilArt(s),
    tower: torreCupola(s),
    foundry: arsenale(s),
  };
}
