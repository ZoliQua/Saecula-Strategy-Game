import { pinBuildings } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Polish building art: every building
 * type x age and every Wonder stage (testing/pinnedArt.testkit.ts), so
 * later kit and family changes cannot silently change Polish.
 * Recorded at M21 Task 2's final art; M21 Task 3 re-recorded wall@1-3
 * with the Polish walls (box rampart, barbican curtain, Zamość bastion).
 * M22 Task 2 re-recorded barracks@1, archery_range@1, stable@1,
 * blacksmith@1-3, barracks@3, archery_range@3 and stable@3 with the
 * Polish workshops (Biskupin, Kraków smithy, Zamość); its fix round
 * re-recorded stable@1, blacksmith@1 and blacksmith@3.
 * M22 Task 3 re-recorded wall@3 (the attic-crested Zamość bastion); the M22
 * final review re-recorded wall@3 (volume points on the crest pinnacles).
 */

pinBuildings('polish', {
  'town_center@1': '6bbc957bfd8df52f',
  'house@1': '2882995935b77a37',
  'farm@1': '22fac49f54c522aa',
  'lumber_camp@1': '8df7efc35f3664d5',
  'mining_camp@1': 'ee5944898873fee4',
  'barracks@1': 'e3a800b58dcd4ca1',
  'archery_range@1': 'a959db437631fcfa',
  'stable@1': '4ed881ecc435d308',
  'blacksmith@1': '2a899f92561f0803',
  'foundry@1': 'b7ed0076c70f1553',
  'tower@1': '47bc003032e21e41',
  'wall@1': '70706bac5976713e',
  'wonder@1': 'df12a9524a3e09c2',
  'town_center@2': '44b9983f0a1112bd',
  'house@2': '677380fe667a638c',
  'farm@2': 'ab37954e04ac885e',
  'lumber_camp@2': '33014b163750f8ea',
  'mining_camp@2': '2f51b08e4a696fbc',
  'barracks@2': '8413a3e70fada316',
  'archery_range@2': '2c364aa37447996c',
  'stable@2': '90c2cb0d0164d777',
  'blacksmith@2': '5955c71ee4685c20',
  'foundry@2': 'b6d59bd4b539ba2d',
  'tower@2': '067a698322fe47a4',
  'wall@2': 'd45af7686fd44019',
  'wonder@2': '09c3a6f4cc503073',
  'town_center@3': 'b1d57fb700a036f7',
  'house@3': '6869c0980147654e',
  'farm@3': '9e248a3b6376311b',
  'lumber_camp@3': '52ef5c6bf4e134ec',
  'mining_camp@3': 'ddb2805b4527474d',
  'barracks@3': '83ddd257a85f7c27',
  'archery_range@3': '91181fea914dde63',
  'stable@3': '9e162219ebff515d',
  'blacksmith@3': '5abfcc6e3b67a68b',
  'foundry@3': '67c99b8c3f7eb6ba',
  'tower@3': 'e6d60a6438b80085',
  'wall@3': '88f2fc82fdeb255f',
  'wonder@3': '63bf8335ad41ae43',
  'wonder~s1': '2b094b221f34cb08',
  'wonder~s2': '7c604244b5d35810',
  'wonder~s3': '868b330d8018bf2a',
});
