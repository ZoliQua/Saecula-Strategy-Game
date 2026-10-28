import { pinBuildings } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Finnish building art: every building
 * type x age and every Wonder stage (testing/pinnedArt.testkit.ts), so
 * later kit and family changes cannot silently change Finnish.
 * Fix round 1 re-recorded town_center@1, mining_camp@1-3, stable@1,
 * barracks@2-3, farm@3, archery_range@3, wonder@1-3 and wonder~s3.
 * Task 14 re-recorded wall@1-3 (the Finnish walls replace the Hungarian
 * stub) and town_center@1, house@1 and blacksmith@1 (age-1 windows and
 * forge mouth lowered clear of the turf eave: the hardened glow test).
 */

pinBuildings('finnish', {
  'town_center@1': '3885a4b2608207c3',
  'house@1': '0188142b7ae7c807',
  'farm@1': '13f1faab40ecf265',
  'lumber_camp@1': '266de939f151ba38',
  'mining_camp@1': 'c0ca1e2c0e1d143a',
  'barracks@1': '70e2dd5b904414d1',
  'archery_range@1': '741435b2b9fb95ea',
  'stable@1': '36dc1216b1ac1230',
  'blacksmith@1': 'ec8d1c8a12070bd1',
  'foundry@1': '11dab0ad0085d62e',
  'tower@1': '873b92a80ffcdf5c',
  'wall@1': 'd8ee85b27f913f15',
  'wonder@1': '8fdf8ae50209a775',
  'town_center@2': 'aca1f333a2a41389',
  'house@2': '592730a75dfbc1d1',
  'farm@2': 'ea6b9ec50469264b',
  'lumber_camp@2': '9f6416a578227e23',
  'mining_camp@2': 'de44eb39ed243adf',
  'barracks@2': '6d16ee6af4ae9fe7',
  'archery_range@2': 'e0509ef76c2a83f8',
  'stable@2': 'd72f805b01467fa8',
  'blacksmith@2': 'd5a895378e6459a8',
  'foundry@2': 'bdacf7f0b09aa03c',
  'tower@2': '3a1bc1bbe3d8fd0f',
  'wall@2': '041985dec9fb2128',
  'wonder@2': '4c20dfb7b622658e',
  'town_center@3': '8a0a777285865733',
  'house@3': '3908ded8c12fc40a',
  'farm@3': '9b88ddc6693529b6',
  'lumber_camp@3': 'f456f046fc91a6ce',
  'mining_camp@3': '21e1122886d5e3a8',
  'barracks@3': '3a895088646b278a',
  'archery_range@3': '76fd82abc5b8ca73',
  'stable@3': '72a72d70cbaf732a',
  'blacksmith@3': '19463f9c811c3810',
  'foundry@3': '94321aa7993b76a6',
  'tower@3': '6fcf3037f1a1ebf4',
  'wall@3': '6ac8e7cd66f8f5a9',
  'wonder@3': 'f07d31d617fd93fc',
  'wonder~s1': '2234b0677e1e1830',
  'wonder~s2': '287b409c809d7509',
  'wonder~s3': 'c910489331a67ccb',
});
