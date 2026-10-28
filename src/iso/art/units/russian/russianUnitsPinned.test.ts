import { pinUnits } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Russian unit art (split pins, see
 * testing/pinnedArt.testkit.ts): pixels must never change; geometry may
 * be re-recorded when the sheet packing changes, with the reason in the
 * commit. Recorded in M5 Task 12.
 */

pinUnits('russian', {
  pixels: {
    villager: 'f79bd2236e3ee6af',
    swordsman: '31dc05097a896c75',
    archer: '864b6290169271bb',
    pikeman: '456e30579de9ec78',
    crossbowman: '91efa23d5e14028d',
    musketeer: 'c0c8d491a1016dfe',
    scout: 'c61d3ec82627394d',
    knight: '2acff037e83995bc',
    cavalry: '2149a17b2fee9e9c',
    cannon: 'b3359711ead32ec6',
  },
  geometry: {
    villager: 'fadb8e7156295053',
    swordsman: '1609b7ebfe0f8f97',
    archer: '0667f61227405596',
    pikeman: '1ed9ce2e4660f844',
    crossbowman: 'cd8432706badce56',
    musketeer: '4c9cb29c5ea0002c',
    scout: '7d59a3ef6643f95b',
    knight: 'df22fb66173d1cb4',
    cavalry: 'ee8da6523b24442d',
    cannon: '10be5a8ab9cb6fec',
  },
});
