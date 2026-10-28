import { pinBuildings } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Russian building art: every building
 * type x age and every Wonder stage (testing/pinnedArt.testkit.ts), so
 * later civs' kit and family changes cannot silently change Russian.
 * wall@1-3 pin the Hungarian stub walls until Task 12 paints the
 * Russian walls.
 */

pinBuildings('russian', {
  'town_center@1': '91d0eef2f63db3e6',
  'house@1': 'ed4e49bbdc21d612',
  'farm@1': 'eb468af509d3fa6b',
  'lumber_camp@1': 'abf287692199f03d',
  'mining_camp@1': '0ec8b990ab89492e',
  'barracks@1': 'bea77b37976be0d3',
  'archery_range@1': '52c66cc189295492',
  'stable@1': '6d63106f024f3b01',
  'blacksmith@1': '38630451f38eda58',
  'foundry@1': '963bbca83d2988f3',
  'tower@1': 'f3e4bb6b0272761d',
  'wall@1': '77f597783545cec5',
  'wonder@1': '424622ed67deeefd',
  'town_center@2': 'a6d40e2cfca3a9c8',
  'house@2': 'b52a851b814b090c',
  'farm@2': '24a98e8dc2f26046',
  'lumber_camp@2': '360737e9ed6178f5',
  'mining_camp@2': '649cd0c8a13f2ef5',
  'barracks@2': '49bd6c1247c12f55',
  'archery_range@2': '9cb29987d27facdf',
  'stable@2': '187450f9853bb8ad',
  'blacksmith@2': 'b24ebe46ab7ffda1',
  'foundry@2': '27f213dcfd001957',
  'tower@2': '18a2879606141eb6',
  'wall@2': '0593149e07b5d670',
  'wonder@2': '424622ed67deeefd',
  'town_center@3': '4b4663c4035eb921',
  'house@3': '44845d1f54366c14',
  'farm@3': '637274de2397b201',
  'lumber_camp@3': '951f315ea1f3fe94',
  'mining_camp@3': '495207282fb63e96',
  'barracks@3': '3661983c30edd8af',
  'archery_range@3': 'ef62f99e7adfabc5',
  'stable@3': '985d433d3fa00dbd',
  'blacksmith@3': '623373f00fc3d97d',
  'foundry@3': 'aa166ec468e26856',
  'tower@3': '36529b00268a1bc5',
  'wall@3': 'dceb7eec587bbfd8',
  'wonder@3': '424622ed67deeefd',
  'wonder~s1': '6819aaac25fddc96',
  'wonder~s2': 'c89cd827754d428c',
  'wonder~s3': 'fb3513cf689f97f7',
});
