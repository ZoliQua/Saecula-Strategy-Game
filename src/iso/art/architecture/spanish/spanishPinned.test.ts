import { pinBuildings } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Spanish building art: every building
 * type x age and every Wonder stage (testing/pinnedArt.testkit.ts), so
 * later civs' kit and family changes cannot silently change Spanish.
 * The wall pins still paint the Hungarian wall styles until Task 8.
 * Fix round 1 re-recorded tower@1 (Tower of Hercules outline), the
 * farm and camps of every age (palomar), town_center@3 (window clear of
 * the wing) and wonder~s2/s3 (the Vela rises last).
 */

pinBuildings('spanish', {
  'town_center@1': 'b528a015b9a26900',
  'house@1': '4281aeb781be5128',
  'farm@1': 'b6749cb4796db0c2',
  'lumber_camp@1': '5132e86c47b75ef2',
  'mining_camp@1': '4ec44c690e5a361b',
  'barracks@1': '56719f320ccaf78a',
  'archery_range@1': '7962814fecdacfef',
  'stable@1': '7b4cde7d4259ddb5',
  'blacksmith@1': '145e9825eb70b375',
  'foundry@1': 'ca064aec20c50567',
  'tower@1': '9d17e00240275ae4',
  'wall@1': 'a3011815d870defe',
  'wonder@1': '3b8e295d09cc8ca6',
  'town_center@2': '024566c74a42f6e1',
  'house@2': 'e58314726c2803c3',
  'farm@2': '8bd6d06ff506c3c5',
  'lumber_camp@2': '962f692d6b1596e2',
  'mining_camp@2': 'd07a796445ced81b',
  'barracks@2': '38e3b586ce670c26',
  'archery_range@2': 'c65b923354b1d5d8',
  'stable@2': 'bcd0b3ff628ad13f',
  'blacksmith@2': 'f875010e5face825',
  'foundry@2': 'a859d6c34cf9ea8d',
  'tower@2': 'b353577c951fe87c',
  'wall@2': '703fc75db10fe961',
  'wonder@2': '4bf7d89a7e25e474',
  'town_center@3': 'b6bfd651869123d8',
  'house@3': '4d79650e8001f794',
  'farm@3': 'c35b98a57b3e9e42',
  'lumber_camp@3': '70d9f910ef7a823c',
  'mining_camp@3': '6a1e1b15869b05d7',
  'barracks@3': '14a1e62f2774d2ec',
  'archery_range@3': 'c3b267832f47640d',
  'stable@3': '5ba8589e226111d9',
  'blacksmith@3': '548a62d22899c8f9',
  'foundry@3': 'e6f6df5d409c6c59',
  'tower@3': 'd80b2d2b2af86cb0',
  'wall@3': 'd5751a3a3893902f',
  'wonder@3': '490562cfdf4d0f99',
  'wonder~s1': '830f88e0975efb0f',
  'wonder~s2': 'e8b209bd82b02490',
  'wonder~s3': '6d91008baafc2c45',
});
