import type { ArchStyle } from '../style';
import type { AgeArtSet } from '../types';
import { hillfort } from './hillfort';
import { izbaHouse } from './izbaHouse';
import { izbaMilArt } from './izbaMil';
import { logTown } from './izbaParts';
import { izbaTower } from './izbaTower';
import { izbaWorkArt } from './izbaWork';
import { kremlin } from './kremlin';

/**
 * Log-town family (Russian ages 1-2): every type painted as a log
 * building with steep carved plank gables; the style's LogTownKits turn
 * it into the white-stone, tent-roofed and onion-domed Muscovite town.
 */
export function izbaArt(s: ArchStyle): AgeArtSet {
  return {
    town_center: logTown(s).civic === 'kremlin' ? kremlin(s) : hillfort(s),
    house: izbaHouse(s),
    ...izbaWorkArt(s),
    ...izbaMilArt(s),
    tower: izbaTower(s),
  };
}
