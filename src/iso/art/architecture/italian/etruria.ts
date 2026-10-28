import type { ArchStyle } from '../style';
import type { AgeArtSet } from '../types';
import { basilica } from './basilica';
import { insulaHouse } from './etruriaHouse';
import { etruriaMilArt } from './etruriaMil';
import { romanBrickTower } from './etruriaTower';
import { etruriaWorkArt } from './etruriaWork';

/**
 * Etruria family (Italian age 1): the Roman set of types, each painted as
 * an Italian insula-town building (kits/insula.ts) — a Roman-family
 * reading would only recolour the Hungarian villas, so every type has a
 * painter of its own.
 */
export function etruriaArt(s: ArchStyle): AgeArtSet {
  return {
    town_center: basilica(s),
    house: insulaHouse(s),
    ...etruriaWorkArt(s),
    ...etruriaMilArt(s),
    tower: romanBrickTower(s),
  };
}
