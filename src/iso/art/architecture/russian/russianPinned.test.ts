import { pinBuildings } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Russian building art: every building
 * type x age and every Wonder stage (testing/pinnedArt.testkit.ts), so
 * later civs' kit and family changes cannot silently change Russian.
 * wall@1-3 pin the Hungarian stub walls until Task 12 paints the
 * Russian walls. Fix round 1 re-recorded the age-1 workplaces (granary,
 * log stack, windlass, smoke hood), the age-2 tents and tower onions
 * (town centre, house, mining camp, barracks, range, stable, smithy,
 * tower), the age-3 house, farm, range and stable, and Wonder stage 3
 * (unlit while scaffolded).
 */

pinBuildings('russian', {
  'town_center@1': '91d0eef2f63db3e6',
  'house@1': 'ed4e49bbdc21d612',
  'farm@1': 'bcbc6348314f98b6',
  'lumber_camp@1': 'a6d1f743ae7978eb',
  'mining_camp@1': 'a579c52cdf2fb776',
  'barracks@1': 'bea77b37976be0d3',
  'archery_range@1': '52c66cc189295492',
  'stable@1': '6d63106f024f3b01',
  'blacksmith@1': '85eaa36687e76c50',
  'foundry@1': '963bbca83d2988f3',
  'tower@1': 'f3e4bb6b0272761d',
  'wall@1': '77f597783545cec5',
  'wonder@1': '424622ed67deeefd',
  'town_center@2': '090ba717c413f509',
  'house@2': 'c60afda2bc8a6b96',
  'farm@2': '24a98e8dc2f26046',
  'lumber_camp@2': '360737e9ed6178f5',
  'mining_camp@2': '364815f91fed9954',
  'barracks@2': '20e08db317fec8b9',
  'archery_range@2': '7a83a9f4e28fed15',
  'stable@2': '971fbcdae5a333f0',
  'blacksmith@2': '4f669a5eca206764',
  'foundry@2': '27f213dcfd001957',
  'tower@2': '4c7074ca529db966',
  'wall@2': '0593149e07b5d670',
  'wonder@2': '424622ed67deeefd',
  'town_center@3': '4b4663c4035eb921',
  'house@3': 'bdd7aa00a8b4b23b',
  'farm@3': '1a47aca6624baa32',
  'lumber_camp@3': '951f315ea1f3fe94',
  'mining_camp@3': '495207282fb63e96',
  'barracks@3': '3661983c30edd8af',
  'archery_range@3': 'f127274d1baaf2df',
  'stable@3': '06be5638975390af',
  'blacksmith@3': '623373f00fc3d97d',
  'foundry@3': 'aa166ec468e26856',
  'tower@3': '36529b00268a1bc5',
  'wall@3': 'dceb7eec587bbfd8',
  'wonder@3': '424622ed67deeefd',
  'wonder~s1': '6819aaac25fddc96',
  'wonder~s2': 'c89cd827754d428c',
  'wonder~s3': '1faa69ddf25ee869',
});
