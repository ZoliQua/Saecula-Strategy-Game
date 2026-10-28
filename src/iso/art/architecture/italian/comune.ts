import type { ArchStyle } from '../style';
import type { AgeArtSet } from '../types';
import { casaTorre } from './comuneHouse';
import { comuneMilArt } from './comuneMil';
import { torreComunale } from './comuneTower';
import { comuneWorkArt } from './comuneWork';
import { palazzoPubblico } from './palazzoPubblico';

/** Comune family (Italian age 2): tower-houses, swallowtail merlons, the Palazzo Pubblico. */
export function comuneArt(s: ArchStyle): AgeArtSet {
  return {
    town_center: palazzoPubblico(s),
    house: casaTorre(s),
    ...comuneWorkArt(s),
    ...comuneMilArt(s),
    tower: torreComunale(s),
  };
}
