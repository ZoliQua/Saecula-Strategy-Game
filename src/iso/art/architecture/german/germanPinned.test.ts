import { pinBuildings } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the German building art: every building
 * type x age and every Wonder stage (testing/pinnedArt.testkit.ts), so
 * later civs' kit and family changes cannot silently change German.
 * wall@1-3 re-recorded in M5 Task 4, when German got its own wall styles
 * (the wall building type paints a wall piece); every other hash unchanged.
 * M5 final review I1: the styles drop hidden window glows (dropHiddenGlows,
 * lighting/glowCover.ts), so every painting with a window glowing behind a
 * later solid was re-recorded (its glow list shrank; draw log unchanged).
 */

pinBuildings('german', {
  'town_center@1': '0690ee2c04ee4b3c',
  'house@1': 'c9abb4c2e9d60ea2',
  'farm@1': '278f7a4da25b97a6',
  'lumber_camp@1': 'aebe6ce09f2ddc61',
  'mining_camp@1': '533fb3e93e8931f0',
  'barracks@1': '6e66e3599d9482fb',
  'archery_range@1': '715c10d9d9515bc8',
  'stable@1': 'b99394b9521e6ece',
  'blacksmith@1': 'c7d0139ad8ab5231',
  'foundry@1': 'f9e5112c06b26061',
  'tower@1': '82772e0111730855',
  'wall@1': '3852c4f78265d215',
  'wonder@1': 'be80c763d6742844',
  'town_center@2': '92e02df3d50d7284',
  'house@2': '34fb999d10cd20b6',
  'farm@2': 'b108129eb894e51d',
  'lumber_camp@2': 'd7bda84410758e51',
  'mining_camp@2': '511229aa37afd1a9',
  'barracks@2': '1dc9a063bf49862d',
  'archery_range@2': '10bcf9655439878e',
  'stable@2': 'cc24d1352c851f2b',
  'blacksmith@2': 'a9395818218a8250',
  'foundry@2': 'ee2b6c3d79ece03a',
  'tower@2': 'e9f4913047f4186f',
  'wall@2': '7c0406bffcd1d45e',
  'wonder@2': 'e841a07dd7964773',
  'town_center@3': '79a0d8e991f7694d',
  'house@3': '3c3fd92817a7c7d1',
  'farm@3': 'b273d40e48d408a2',
  'lumber_camp@3': '314ad73cb5f38087',
  'mining_camp@3': '297f793143a5f035',
  'barracks@3': '1f7247b32866602e',
  'archery_range@3': '4b4fe138de46f946',
  'stable@3': '43e1b8c53ae65c7f',
  'blacksmith@3': 'c882127f23284b56',
  'foundry@3': 'cfa28eb2b272e9e2',
  'tower@3': 'd8fa0bbf0a227c9a',
  'wall@3': '8c423bbe5a5bbbc6',
  'wonder@3': '9204191a603c7b06',
  'wonder~s1': '83aeae37fedc40b7',
  'wonder~s2': '8a7ba45ae9bcbbf5',
  'wonder~s3': '4b99abeeb08ff573',
});
