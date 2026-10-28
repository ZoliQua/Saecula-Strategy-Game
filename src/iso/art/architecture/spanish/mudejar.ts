import type { ArchStyle } from '../style';
import type { AgeArtSet } from '../types';
import { alhambra } from './alhambra';
import { cabildo } from './cabildo';
import { colonialTower } from './colonialTower';
import { kitsOf } from './courtyardKits';
import { hispaniaArt } from './hispania';
import { homenaje } from './homenaje';
import { mudejarTower } from './mudejarTower';
import { realFabrica } from './realFabrica';

/**
 * Mudéjar family (Spanish ages 2-3): the courtyard layouts with a town
 * centre, a tower, a foundry and the Wonder of their own. Its medieval
 * reading has the Castilian keep and the Teruel brick tower; with
 * espadañas (the Colonial reading) the town centre is the bell-gabled
 * cabildo and the tower the bastion tower with garitas and a bell.
 */
export function mudejarArt(s: ArchStyle): AgeArtSet {
  const bells = kitsOf(s).espadanas;
  return {
    ...hispaniaArt(s),
    town_center: bells ? cabildo(s) : homenaje(s),
    tower: bells ? colonialTower(s) : mudejarTower(s),
    foundry: realFabrica(s),
    wonder: alhambra(s),
  };
}
