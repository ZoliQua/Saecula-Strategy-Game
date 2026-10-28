import { pinUnits } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Finnish unit art (split pins, see
 * testing/pinnedArt.testkit.ts): pixels must never change; geometry may
 * be re-recorded when the sheet packing changes, with the reason in the
 * commit. Recorded in M5 Task 14.
 */

pinUnits('finnish', {
  pixels: {
    villager: '7bb5a19989e7cc97',
    swordsman: '02769434b84d37bd',
    archer: 'a1c7ca1d39924c86',
    pikeman: '34288cea90f29b12',
    crossbowman: 'ae0b07c31a7a5c28',
    musketeer: '4c14b47185b78b58',
    scout: 'cdb614e95af3fd9c',
    knight: '3493cc70a92169ad',
    cavalry: '20c2b4bd198d3367',
    cannon: 'a32f4142a554f2d9',
  },
  geometry: {
    villager: 'b68ec0e91736fcde',
    swordsman: '08d7c3a042e7f739',
    archer: '77cb89329c775027',
    pikeman: '29d9ceffbe688c6c',
    crossbowman: 'eeebc2cf3a0d7c6c',
    musketeer: '681aeceabc8a7320',
    scout: 'c2f653d36e239103',
    knight: 'db40cb4b2338e1d8',
    cavalry: '2527da342111cf32',
    cannon: '10be5a8ab9cb6fec',
  },
});
