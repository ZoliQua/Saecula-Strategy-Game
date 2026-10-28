import { pinBuildings } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Finnish building art: every building
 * type x age and every Wonder stage (testing/pinnedArt.testkit.ts), so
 * later kit and family changes cannot silently change Finnish.
 * wall@1-3 pin the Hungarian stub walls until Task 14 re-records them.
 */

pinBuildings('finnish', {
  'town_center@1': 'f13b178b24b2e2c2',
  'house@1': '7f0073f35a87dc5c',
  'farm@1': '13f1faab40ecf265',
  'lumber_camp@1': '266de939f151ba38',
  'mining_camp@1': '36ca52c6bc8f5c7e',
  'barracks@1': '70e2dd5b904414d1',
  'archery_range@1': '741435b2b9fb95ea',
  'stable@1': 'd0967263343a1a5e',
  'blacksmith@1': 'c8726499b783bf9f',
  'foundry@1': '11dab0ad0085d62e',
  'tower@1': '873b92a80ffcdf5c',
  'wall@1': '0ea14c2f9ad91699',
  'wonder@1': 'cac5aaadf1b04406',
  'town_center@2': 'aca1f333a2a41389',
  'house@2': '592730a75dfbc1d1',
  'farm@2': 'ea6b9ec50469264b',
  'lumber_camp@2': '9f6416a578227e23',
  'mining_camp@2': '38705b7298f67595',
  'barracks@2': '07e12c723b6ca24a',
  'archery_range@2': 'e0509ef76c2a83f8',
  'stable@2': 'd72f805b01467fa8',
  'blacksmith@2': 'd5a895378e6459a8',
  'foundry@2': 'bdacf7f0b09aa03c',
  'tower@2': '3a1bc1bbe3d8fd0f',
  'wall@2': '4d157163a4891b6e',
  'wonder@2': '6ae656a95b73aaca',
  'town_center@3': '8a0a777285865733',
  'house@3': '3908ded8c12fc40a',
  'farm@3': 'f003f33ac2b4197a',
  'lumber_camp@3': 'f456f046fc91a6ce',
  'mining_camp@3': 'fd5d5c883687bf14',
  'barracks@3': 'e3396045d9763d83',
  'archery_range@3': '1650aff08c12bcce',
  'stable@3': '72a72d70cbaf732a',
  'blacksmith@3': '19463f9c811c3810',
  'foundry@3': '94321aa7993b76a6',
  'tower@3': '6fcf3037f1a1ebf4',
  'wall@3': 'a092d744f32bc0ba',
  'wonder@3': 'f947ea3ae7052183',
  'wonder~s1': '2234b0677e1e1830',
  'wonder~s2': '287b409c809d7509',
  'wonder~s3': 'a206a4821da2a5b5',
});
