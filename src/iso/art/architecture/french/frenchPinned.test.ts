import { pinBuildings } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the French building art: every building
 * type x age and every Wonder stage (testing/pinnedArt.testkit.ts), so
 * later civs' kit and family changes cannot silently change French.
 * wall@1-3 paint the Hungarian wall styles until French gets its own
 * (its (b) task re-records them).
 */

pinBuildings('french', {
  'town_center@1': '46e9db9aa251c50d',
  'house@1': '7326a5f64fa6cdb0',
  'farm@1': '4ab7040dcb09e895',
  'lumber_camp@1': 'a0f0b7e818440240',
  'mining_camp@1': 'ea47946a10c90be7',
  'barracks@1': '256c20bf16918119',
  'archery_range@1': 'a162547dd869be23',
  'stable@1': 'f137e6fd88c792cb',
  'blacksmith@1': '844d0dba640aafa9',
  'foundry@1': 'a7cfb2d7dbedd334',
  'tower@1': 'f162ec06236a899d',
  'wall@1': 'd66b24913ae3e99f',
  'wonder@1': '32d07b4f81da1b24',
  'town_center@2': 'e49b87de0bc5756d',
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
  'town_center@3': 'b31bbebe08c6d01a',
  'house@3': '82899c74be072c9b',
  'farm@3': '9289228fd69e4f58',
  'lumber_camp@3': '0b0b593217d59025',
  'mining_camp@3': '39f187b83d93680b',
  'barracks@3': '55d34949d07f0f61',
  'archery_range@3': '65559c326b353fe0',
  'stable@3': 'b0913538b17a0e34',
  'blacksmith@3': '66fb91695ac9c7e8',
  'foundry@3': '6b2844d39c867f02',
  'tower@3': '2eaa9a4dfd25a78d',
  'wall@3': '8ff8aff035f28811',
  'wonder@3': '21964fe35805dbb8',
  'wonder~s1': '57fa9a732f04b99b',
  'wonder~s2': 'cb4ab7b5bfefaa35',
  'wonder~s3': '839eb2e8cec7d0c8',
});
