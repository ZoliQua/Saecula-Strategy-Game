import { pinBuildings } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the German building art: every building
 * type x age and every Wonder stage (testing/pinnedArt.testkit.ts), so
 * later civs' kit and family changes cannot silently change German.
 * Walls are still the Hungarian set until the German (b) task.
 */

pinBuildings('german', {
  'town_center@1': '181887c494582685',
  'house@1': '573cc00ff3630798',
  'farm@1': '278f7a4da25b97a6',
  'lumber_camp@1': '13d62afcbf39cd0f',
  'mining_camp@1': 'a1b8ce3ce015b279',
  'barracks@1': 'f4387b42d1280ae7',
  'archery_range@1': 'c328733ece8f7a07',
  'stable@1': '7e07653394ea8664',
  'blacksmith@1': 'e6f3748f3f8cb76c',
  'foundry@1': '11e56ced0cf14c03',
  'tower@1': '204816079e8e5773',
  'wall@1': 'd496cde743196aea',
  'wonder@1': '8703324ec0ea86b4',
  'town_center@2': '92e02df3d50d7284',
  'house@2': '34fb999d10cd20b6',
  'farm@2': 'b108129eb894e51d',
  'lumber_camp@2': 'd7bda84410758e51',
  'mining_camp@2': '511229aa37afd1a9',
  'barracks@2': '9d34035dfcceb903',
  'archery_range@2': '10bcf9655439878e',
  'stable@2': 'cc24d1352c851f2b',
  'blacksmith@2': '11f36ebaa9a35105',
  'foundry@2': '21e83e523f8f0bc6',
  'tower@2': 'e9f4913047f4186f',
  'wall@2': '8975e6ba24296c82',
  'wonder@2': '112c86017dc21235',
  'town_center@3': 'e256d52edd5ca417',
  'house@3': '3c3fd92817a7c7d1',
  'farm@3': 'b273d40e48d408a2',
  'lumber_camp@3': 'b1be6bfd1ee080b7',
  'mining_camp@3': '297f793143a5f035',
  'barracks@3': '0efa4ad3113019e4',
  'archery_range@3': '368c9912be0a548d',
  'stable@3': '43e1b8c53ae65c7f',
  'blacksmith@3': 'c882127f23284b56',
  'foundry@3': '37679da43d91129e',
  'tower@3': '1d54b43491e77e5d',
  'wall@3': 'afd04fb85f847990',
  'wonder@3': '8c8cdd81578c1604',
  'wonder~s1': '83aeae37fedc40b7',
  'wonder~s2': 'c3a76dc07e07be4e',
  'wonder~s3': '01fe54129f90c4c0',
});
