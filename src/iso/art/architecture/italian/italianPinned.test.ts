import { pinBuildings } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Italian building art: every building
 * type x age and every Wonder stage (testing/pinnedArt.testkit.ts), so
 * later civs' kit and family changes cannot silently change Italian.
 * Fix round 1 re-recorded house@1, lumber_camp@1, mining_camp@1, the
 * age-2 farm, camps, archery range, stable and smithy, town_center@3
 * and barracks@3 (visible-window glows, workplace skyline cues, the
 * age-3 barracks' armoury tower). Fix round 2 re-recorded mining_camp@1
 * (furnace clear of the ore house, its right face unlit). Task 10
 * re-recorded wall@1-3 (the wall building type now paints the Italian
 * wall pieces).
 */

pinBuildings('italian', {
  'town_center@1': '68629ff718bcb11e',
  'house@1': 'c010e9892545fc30',
  'farm@1': 'a4e1ff5872a9cd9a',
  'lumber_camp@1': '2c5aaa892bb3851c',
  'mining_camp@1': '81ae3ce710c2e776',
  'barracks@1': '2957d2ba624fb990',
  'archery_range@1': 'a405e56de4b100d2',
  'stable@1': 'a60fbb31b66f8ef5',
  'blacksmith@1': 'c674e332db064f6b',
  'foundry@1': '1ff192129ac42e46',
  'tower@1': '8881cb132185446d',
  'wall@1': '6d27e3aa88461183',
  'wonder@1': '8c766082b0317bba',
  'town_center@2': 'a0fefe4ac02afef3',
  'house@2': '92e4764cb3403d55',
  'farm@2': 'c3bec801f76bc648',
  'lumber_camp@2': 'dd34822b3198278e',
  'mining_camp@2': '151c91e95f0d37db',
  'barracks@2': '2df5addb7db5e70f',
  'archery_range@2': 'dd9aba98f34a003f',
  'stable@2': '41d555f50276a307',
  'blacksmith@2': 'a89eb06ddae6010f',
  'foundry@2': '96f0321a8f1598a8',
  'tower@2': 'bc3bcc22f1aa7bd6',
  'wall@2': 'd6d351a9ae1f4e3c',
  'wonder@2': 'f5013135469213d1',
  'town_center@3': '2bb517dfaf0b2e9e',
  'house@3': 'd8b0ccd798a76d79',
  'farm@3': '8fd5109ab7ddb341',
  'lumber_camp@3': '72e5e62e2413a969',
  'mining_camp@3': 'df8bda1e367c1cb5',
  'barracks@3': '6c96ff18d8205620',
  'archery_range@3': '648d13906e894521',
  'stable@3': '46f482d612aeea50',
  'blacksmith@3': '8e0317fd72cb0fec',
  'foundry@3': '6d1ab2a3e0769ec6',
  'tower@3': 'cf76be26d0fc32d1',
  'wall@3': '392320f410f35d14',
  'wonder@3': 'cf6a8ad5afb37444',
  'wonder~s1': '9eb399007134361e',
  'wonder~s2': '6dad5b306e538156',
  'wonder~s3': '1d0bb2c65385df3e',
});
