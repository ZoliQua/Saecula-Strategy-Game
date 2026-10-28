import { pinBuildings } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the German building art: every building
 * type x age and every Wonder stage (testing/pinnedArt.testkit.ts), so
 * later civs' kit and family changes cannot silently change German.
 * wall@1-3 re-recorded in M5 Task 4, when German got its own wall styles
 * (the wall building type paints a wall piece); every other hash unchanged.
 */

pinBuildings('german', {
  'town_center@1': 'e5cde49589f17324',
  'house@1': 'c9abb4c2e9d60ea2',
  'farm@1': '278f7a4da25b97a6',
  'lumber_camp@1': 'aebe6ce09f2ddc61',
  'mining_camp@1': '533fb3e93e8931f0',
  'barracks@1': '6e66e3599d9482fb',
  'archery_range@1': '715c10d9d9515bc8',
  'stable@1': 'b99394b9521e6ece',
  'blacksmith@1': 'c7d0139ad8ab5231',
  'foundry@1': '11e56ced0cf14c03',
  'tower@1': '65f4a60fbdf25f53',
  'wall@1': '3852c4f78265d215',
  'wonder@1': '882750bec748e722',
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
  'wall@2': '7c0406bffcd1d45e',
  'wonder@2': '052130d307d88b20',
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
  'tower@3': '824921b34f4144cc',
  'wall@3': '8c423bbe5a5bbbc6',
  'wonder@3': '1037d1a59f3f6cf4',
  'wonder~s1': '83aeae37fedc40b7',
  'wonder~s2': '8a7ba45ae9bcbbf5',
  'wonder~s3': '4b99abeeb08ff573',
});
