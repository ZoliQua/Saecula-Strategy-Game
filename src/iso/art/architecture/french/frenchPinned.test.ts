import { pinBuildings } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the French building art: every building
 * type x age and every Wonder stage (testing/pinnedArt.testkit.ts), so
 * later civs' kit and family changes cannot silently change French.
 * wall@1-3 paint the Hungarian wall styles until French gets its own
 * (its (b) task re-records them). Fix round 1 re-recorded the age-1
 * set (steeper slate, porticus kit), town_center@2 (bays clear of the
 * turrets), town_center@3 and tower@3 (no hidden glazing or dormers).
 */

pinBuildings('french', {
  'town_center@1': '4b1ea67918c3c537',
  'house@1': 'c9a2bf4e6acc18a5',
  'farm@1': '03513f730bdd1cbb',
  'lumber_camp@1': 'a4e7b030ce1f8e36',
  'mining_camp@1': '6eddddba6f7deee8',
  'barracks@1': '2372586c341d4c62',
  'archery_range@1': 'deec7558c8002d4b',
  'stable@1': '33ac4d8209e0def7',
  'blacksmith@1': 'b4f7700e32f9bf69',
  'foundry@1': 'a7cfb2d7dbedd334',
  'tower@1': '5a1f0c50721ed531',
  'wall@1': 'd66b24913ae3e99f',
  'wonder@1': '32d07b4f81da1b24',
  'town_center@2': '89e1cfa739ef028c',
  'house@2': 'b97a4a9f2ffef20f',
  'farm@2': 'f76b6f47cd9f8579',
  'lumber_camp@2': '4fafb8a446e614d2',
  'mining_camp@2': 'f37288a23548475e',
  'barracks@2': 'ce43486a8da1d7ea',
  'archery_range@2': '5e91f6aa646adb5d',
  'stable@2': '340a3cfe733c9955',
  'blacksmith@2': 'b88f8d47735311a2',
  'foundry@2': '030614cd0de899f3',
  'tower@2': 'c928df8b12520c08',
  'wall@2': '53e8494371d82728',
  'wonder@2': 'f2eb0f708930fc7f',
  'town_center@3': '90b9c7d0e3c4d7a8',
  'house@3': '82899c74be072c9b',
  'farm@3': '9289228fd69e4f58',
  'lumber_camp@3': '0b0b593217d59025',
  'mining_camp@3': '39f187b83d93680b',
  'barracks@3': '55d34949d07f0f61',
  'archery_range@3': '65559c326b353fe0',
  'stable@3': 'b0913538b17a0e34',
  'blacksmith@3': '66fb91695ac9c7e8',
  'foundry@3': '6b2844d39c867f02',
  'tower@3': '2cb3f5bdd365879d',
  'wall@3': '8ff8aff035f28811',
  'wonder@3': '21964fe35805dbb8',
  'wonder~s1': '57fa9a732f04b99b',
  'wonder~s2': 'cb4ab7b5bfefaa35',
  'wonder~s3': '839eb2e8cec7d0c8',
});
