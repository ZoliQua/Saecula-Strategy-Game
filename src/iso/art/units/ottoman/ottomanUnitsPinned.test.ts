import { pinUnits } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Ottoman unit art (split pins, see
 * testing/pinnedArt.testkit.ts): pixels must never change; geometry may
 * be re-recorded when the sheet packing changes, with the reason in the
 * commit. Recorded in M21 Task 5.
 */

pinUnits('ottoman', {
  pixels: {
    villager: '90527ca3f76c8758',
    swordsman: 'bc6875dbe99a4411',
    archer: '26e5c79844701767',
    pikeman: '1f9cf41ee5f7d66e',
    crossbowman: 'f7d04f948c7d0161',
    musketeer: '8e1d0eb368638d6c',
    scout: '5541e2ae3278d3fb',
    knight: 'a94738072637414b',
    cavalry: '1866060ed737d801',
    cannon: '6b5e53aa1182d123',
  },
  geometry: {
    villager: 'e16f6a14d8baec54',
    swordsman: '37cf5965d094d7af',
    archer: '2ee675a3b16d2238',
    pikeman: '91ee42919da83814',
    crossbowman: '83a4337d3222e2c3',
    musketeer: '5678c4bb8207265b',
    scout: '908c173e62abb907',
    knight: '04cb16dfde2d5227',
    cavalry: '2f19b61d5bf1c35a',
    cannon: '10be5a8ab9cb6fec',
  },
});
