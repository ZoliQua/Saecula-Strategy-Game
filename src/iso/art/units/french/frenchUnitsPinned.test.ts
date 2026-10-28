import { pinUnits } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the French unit art (split pins, see
 * testing/pinnedArt.testkit.ts): pixels must never change; geometry may
 * be re-recorded when the sheet packing changes, with the reason in the
 * commit. Recorded in M5 Task 6.
 */

pinUnits('french', {
  pixels: {
    villager: '3cc94d3a173fb553',
    swordsman: 'a2f9b01b76497da9',
    archer: 'f28be082e3fa74ee',
    pikeman: '038f4c7ee8ffce5f',
    crossbowman: 'ee7b65b3df13e4ce',
    musketeer: 'fd35c27087886896',
    scout: 'a5d45d44bd7f2ce5',
    knight: '2df6467add3539a7',
    cavalry: '5b1900944910a429',
    cannon: '2f711e90624650b3',
  },
  geometry: {
    villager: 'fadb8e7156295053',
    swordsman: '137b07ff7e63f826',
    archer: '0667f61227405596',
    pikeman: '74a3244a59cb9cea',
    crossbowman: '70334895d60c43c7',
    musketeer: '0733975da1ad9d9c',
    scout: '8f62e92e3aa77e7c',
    knight: '2698bf65fe1bc2e5',
    cavalry: '41aa4a2628282404',
    cannon: '10be5a8ab9cb6fec',
  },
});
