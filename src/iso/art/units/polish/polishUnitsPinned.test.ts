import { pinUnits } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Polish unit art (split pins, see
 * testing/pinnedArt.testkit.ts): pixels must never change; geometry may
 * be re-recorded when the sheet packing changes, with the reason in the
 * commit. Recorded in M21 Task 3.
 */

pinUnits('polish', {
  pixels: {
    villager: 'e56af7dfb7c8866a',
    swordsman: 'c35785b90a621290',
    archer: '3088a96e6091960a',
    pikeman: '3cd19e2b93d2eb71',
    crossbowman: 'f07862736871c879',
    musketeer: 'eefe98fe7a112f9e',
    scout: '7265a52e943fc9b9',
    knight: '70164e476ce44897',
    cavalry: '75d42212b907041b',
    cannon: '195105fb854fc529',
  },
  geometry: {
    villager: '582d580c5abcd21e',
    swordsman: '50ccdcac72ce3412',
    archer: '0785d1f2e6b203d6',
    pikeman: 'fa9eb34fab9d1c8f',
    crossbowman: '4fdd079de8b76c56',
    musketeer: 'b981cdd22a686e62',
    scout: '81edddd2a5b61eae',
    knight: '5315ab4e72f65b68',
    cavalry: '2c360314fa343ce8',
    cannon: '10be5a8ab9cb6fec',
  },
});
