import type { ArchStyle } from '../style';
import type { AgeArtSet } from '../types';
import { nordicTownCentre } from './nordicCivic';
import { nordicCraftArt } from './nordicCraft';
import { nordicFoundry } from './nordicFoundry';
import { nordicHouse } from './nordicHouse';
import { nordicMilArt } from './nordicMil';
import { nordic } from './nordicParts';
import { nordicTower } from './nordicTower';
import { nordicFieldArt } from './nordicWork';
import { petajavesi } from './petajavesi';

/** The tower's platform age follows the style's belfry reading. */
const TOWER_AGE = { lookout: 1, kellotapuli: 2, lantern: 3 } as const;

/**
 * Nordic family (Finnish ages 1-3): low log or board buildings under
 * the age's turf, shingle or gambrel roofs, the age's town centre,
 * tower and trades, all chosen by the style's NordicKits. The foundry
 * and the Petäjävesi Wonder are painted in whichever style is the
 * civ's last (they exist only in age 3).
 */
export function nordicArt(s: ArchStyle): AgeArtSet {
  return {
    town_center: nordicTownCentre(s),
    house: nordicHouse(s),
    ...nordicFieldArt(s),
    ...nordicCraftArt(s),
    ...nordicMilArt(s),
    foundry: nordicFoundry(s),
    tower: nordicTower(s, TOWER_AGE[nordic(s).belfry]),
    wonder: petajavesi(s),
  };
}
