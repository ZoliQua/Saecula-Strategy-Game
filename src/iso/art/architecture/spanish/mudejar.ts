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
 * centre, a tower, a foundry and the Wonder of their own. The town
 * centre follows `courtyard.civic` (Castilian keep or bell-gabled
 * cabildo); the tower follows `courtyard.towers` (the Teruel brick tower,
 * or with miradors the bastion tower with garitas and a bell).
 */
export function mudejarArt(s: ArchStyle): AgeArtSet {
  const k = kitsOf(s);
  return {
    ...hispaniaArt(s),
    town_center: k.civic === 'cabildo' ? cabildo(s) : homenaje(s),
    tower: k.towers === 'mirador' ? colonialTower(s) : mudejarTower(s),
    foundry: realFabrica(s),
    wonder: alhambra(s),
  };
}
