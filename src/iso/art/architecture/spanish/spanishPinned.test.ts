import { pinBuildings } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Spanish building art: every building
 * type x age and every Wonder stage (testing/pinnedArt.testkit.ts), so
 * later civs' kit and family changes cannot silently change Spanish.
 * Fix round 1 re-recorded tower@1 (Tower of Hercules outline), the
 * farm and camps of every age (palomar), town_center@3 (window clear of
 * the wing) and wonder~s2/s3 (the Vela rises last). Task 8 re-recorded
 * farm@3, lumber_camp@3 and mining_camp@3 (no palomar beside the ridge
 * espadaña), and wall@1-3 (the wall building type now paints the Spanish
 * wall pieces).
 * M5 final review I1: the styles drop hidden window glows (dropHiddenGlows,
 * lighting/glowCover.ts), so every painting with a window glowing behind a
 * later solid was re-recorded (its glow list shrank; draw log unchanged).
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
  'foundry@1': '6f106a516680ecb5',
  'tower@1': '9d17e00240275ae4',
  'wall@1': '164ea0742297a6b0',
  'wonder@1': '3b8e295d09cc8ca6',
  'town_center@2': '71b383aa1a50ec08',
  'house@2': 'e58314726c2803c3',
  'farm@2': '8bd6d06ff506c3c5',
  'lumber_camp@2': '962f692d6b1596e2',
  'mining_camp@2': 'd07a796445ced81b',
  'barracks@2': '98ddebad5c242429',
  'archery_range@2': 'c65b923354b1d5d8',
  'stable@2': 'bcd0b3ff628ad13f',
  'blacksmith@2': 'f875010e5face825',
  'foundry@2': '2525ae6dbdaf91b1',
  'tower@2': '14ffaa2e329e4d1c',
  'wall@2': '0f56ef1cf68d9850',
  'wonder@2': '4bf7d89a7e25e474',
  'town_center@3': 'b6bfd651869123d8',
  'house@3': '7f49402815cb4cf5',
  'farm@3': '2cfa8277e61ada05',
  'lumber_camp@3': 'c86660316190a40c',
  'mining_camp@3': 'a6acd6e6014f1cbc',
  'barracks@3': '6998cc5aadaaa65e',
  'archery_range@3': 'c3b267832f47640d',
  'stable@3': '5ba8589e226111d9',
  'blacksmith@3': '548a62d22899c8f9',
  'foundry@3': '2217cef24b4e0155',
  'tower@3': 'd80b2d2b2af86cb0',
  'wall@3': '129d9d24d1660548',
  'wonder@3': '490562cfdf4d0f99',
  'wonder~s1': '830f88e0975efb0f',
  'wonder~s2': 'e8b209bd82b02490',
  'wonder~s3': '6d91008baafc2c45',
});
