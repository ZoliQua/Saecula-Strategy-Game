import { pinUnits } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the German unit art (split pins, see
 * testing/pinnedArt.testkit.ts): pixels must never change; geometry may
 * be re-recorded when the sheet packing changes, with the reason in the
 * commit. Recorded in M5 Task 4.
 */

pinUnits('german', {
  pixels: {
    villager: '5e2ac642eb584912',
    swordsman: '885b8f9a70e9b130',
    archer: '0195ee768c86665f',
    pikeman: '40722be7e7aec77c',
    crossbowman: 'c42f331f4a0c80ae',
    musketeer: 'b51201925856fc4f',
    scout: 'eea06e90cff292b2',
    knight: '95a294f190a27c6f',
    cavalry: '11535f071cb22c12',
    cannon: 'b483bc4777f72a79',
  },
  geometry: {
    villager: 'fadb8e7156295053',
    swordsman: '051fd418a3a6a990',
    archer: '0667f61227405596',
    pikeman: 'f36b520f6f6d139f',
    crossbowman: '05a19de67e919026',
    musketeer: '75a508816f612329',
    scout: 'e3ff30c2beb65e59',
    knight: '2059184faa44a489',
    cavalry: '966eeba71788e942',
    cannon: '10be5a8ab9cb6fec',
  },
});
