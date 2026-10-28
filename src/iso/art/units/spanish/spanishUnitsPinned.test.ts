import { pinUnits } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Spanish unit art (split pins, see
 * testing/pinnedArt.testkit.ts): pixels must never change; geometry may
 * be re-recorded when the sheet packing changes, with the reason in the
 * commit. Recorded in M5 Task 8.
 */

pinUnits('spanish', {
  pixels: {
    villager: 'c59d29c7a6299c6e',
    swordsman: '2e89522632451d1b',
    archer: '4de385f85602e9b3',
    pikeman: 'bb083c8485ebcabd',
    crossbowman: '9cee414375499521',
    musketeer: 'e93a77c6f0b81446',
    scout: 'ada4d2daa140616a',
    knight: 'dfe2507736c58726',
    cavalry: '7dfd40b41c9e985d',
    cannon: '6ce43ddbb70b3e60',
  },
  geometry: {
    villager: '582d580c5abcd21e',
    swordsman: 'b0fa382e33846077',
    archer: '0667f61227405596',
    pikeman: '9d96cc3b7954b13a',
    crossbowman: '30c18ee7f67000ab',
    musketeer: '5936fa390cc60f55',
    scout: 'e817cbb3642bd167',
    knight: '5315ab4e72f65b68',
    cavalry: '673ff8c0954b79cc',
    cannon: '10be5a8ab9cb6fec',
  },
});
