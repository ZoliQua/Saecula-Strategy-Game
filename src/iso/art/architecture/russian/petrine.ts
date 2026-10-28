import { baroqueArt } from '../baroque';
import type { ArchStyle } from '../style';
import type { AgeArtSet } from '../types';
import { petrinePalace } from './petrinePalace';
import { petrineFarm, petrineTower } from './petrineWork';
import { stBasil } from './stBasil';

/**
 * Petrine family (Russian age 3): the baroque layouts with the style's
 * onion domes (kits.onionDomes) in their skyline spots, a palace and
 * five-domed church town centre, an estate granary farm, an onion-domed
 * belfry on the tower, and St Basil's as Wonder.
 */
export function petrineArt(s: ArchStyle): AgeArtSet {
  return {
    ...baroqueArt(s),
    town_center: petrinePalace(s),
    farm: petrineFarm(s),
    tower: petrineTower(s),
    wonder: stBasil(s),
  };
}
