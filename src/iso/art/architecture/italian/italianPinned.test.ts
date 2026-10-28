import { pinBuildings } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Italian building art: every building
 * type x age and every Wonder stage (testing/pinnedArt.testkit.ts), so
 * later civs' kit and family changes cannot silently change Italian.
 * wall@1-3 still paint the Hungarian stub walls; Task 10 re-records them.
 */

pinBuildings('italian', {
  'town_center@1': '68629ff718bcb11e',
  'house@1': '43f27b93b31ac5fb',
  'farm@1': 'a4e1ff5872a9cd9a',
  'lumber_camp@1': '85142f07db47d158',
  'mining_camp@1': '9c63cb9eb9b8ebeb',
  'barracks@1': '2957d2ba624fb990',
  'archery_range@1': 'a405e56de4b100d2',
  'stable@1': 'a60fbb31b66f8ef5',
  'blacksmith@1': 'c674e332db064f6b',
  'foundry@1': '1ff192129ac42e46',
  'tower@1': '8881cb132185446d',
  'wall@1': 'd004c7f9cce02e8c',
  'wonder@1': '8c766082b0317bba',
  'town_center@2': 'a0fefe4ac02afef3',
  'house@2': '92e4764cb3403d55',
  'farm@2': '21308ac42896a57d',
  'lumber_camp@2': 'af876eda49f577c0',
  'mining_camp@2': '698849cd8bf5de4c',
  'barracks@2': '2df5addb7db5e70f',
  'archery_range@2': 'fa7afa24d473826e',
  'stable@2': '83d5a1904088c92f',
  'blacksmith@2': 'aab58a056da11192',
  'foundry@2': '96f0321a8f1598a8',
  'tower@2': 'bc3bcc22f1aa7bd6',
  'wall@2': '5d0c28b2b225990c',
  'wonder@2': 'f5013135469213d1',
  'town_center@3': '733655955192121d',
  'house@3': 'd8b0ccd798a76d79',
  'farm@3': '8fd5109ab7ddb341',
  'lumber_camp@3': '72e5e62e2413a969',
  'mining_camp@3': 'df8bda1e367c1cb5',
  'barracks@3': 'b82ce760fe0b1b4d',
  'archery_range@3': '648d13906e894521',
  'stable@3': '46f482d612aeea50',
  'blacksmith@3': '8e0317fd72cb0fec',
  'foundry@3': '6d1ab2a3e0769ec6',
  'tower@3': 'cf76be26d0fc32d1',
  'wall@3': '5cac2d4cffd65af9',
  'wonder@3': 'cf6a8ad5afb37444',
  'wonder~s1': '9eb399007134361e',
  'wonder~s2': '6dad5b306e538156',
  'wonder~s3': '1d0bb2c65385df3e',
});
