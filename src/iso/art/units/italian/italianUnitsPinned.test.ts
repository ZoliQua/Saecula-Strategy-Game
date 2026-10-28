import { pinUnits } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Italian unit art (split pins, see
 * testing/pinnedArt.testkit.ts): pixels must never change; geometry may
 * be re-recorded when the sheet packing changes, with the reason in the
 * commit. Recorded in M5 Task 10.
 */

pinUnits('italian', {
  pixels: {
    villager: 'c455543fda113bbe',
    swordsman: '330010eeb700c3a2',
    archer: '99209a65866fba36',
    pikeman: 'f68f7bdd17a2d76a',
    crossbowman: 'f66712e6fd273d93',
    musketeer: 'ab098d0dd61b852d',
    scout: '1ffd438fe90f2364',
    knight: '9132d1402ba1aa57',
    cavalry: '4b98125e7d1ba898',
    cannon: '91b37a71fdd8c716',
  },
  geometry: {
    villager: 'fadb8e7156295053',
    swordsman: 'ce03c9960de3353c',
    archer: '0667f61227405596',
    pikeman: 'b1ea5cfd31c4bdc9',
    crossbowman: 'ecaa3500382c4b99',
    musketeer: '21d8c1d39bfa5140',
    scout: 'd1d926c801160ff8',
    knight: '028c46eaf9d27737',
    cavalry: 'f568fbe10d89a514',
    cannon: '10be5a8ab9cb6fec',
  },
});
