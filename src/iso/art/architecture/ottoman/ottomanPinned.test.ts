import { pinBuildings } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Ottoman building art: every building
 * type x age and every Wonder stage (testing/pinnedArt.testkit.ts), so
 * later kit and family changes cannot silently change Ottoman.
 * Recorded at M21 Task 4's final art; M21 Task 5 re-recorded wall@1-3
 * with the Ottoman walls (opus mixtum, Rumelihisarı, ashlar bastion trace).
 * M22 Task 1 re-recorded archery_range@1-3, blacksmith@1-3 and stable@3
 * with the Ottoman workshops (ottomanWorkshops.ts); its fix round 1 re-recorded
 * archery_range@1-3, blacksmith@1, blacksmith@3 and stable@3 (silhouettes, forge stack).
 * M22 Task 3 re-recorded wall@2-3 (machicolated Rumeli towers, domed köşk bastions).
 */

pinBuildings('ottoman', {
  'town_center@1': '706509b5ca32ac4a',
  'house@1': 'dce9ebf7def2a960',
  'farm@1': 'e21698b0f2a93dff',
  'lumber_camp@1': '9afe9986512283a6',
  'mining_camp@1': '6676b5a8b19784b4',
  'barracks@1': '018a2b46b2902ca2',
  'archery_range@1': 'fa10812d13563d41',
  'stable@1': '403709bd9c468f2f',
  'blacksmith@1': '0b5c6e908a2e246c',
  'foundry@1': 'ba9dc40cd65ecd95',
  'tower@1': '9d08f8cd45061aeb',
  'wall@1': '4eb1b44a27c07476',
  'wonder@1': '40eb9b1e74a2e513',
  'town_center@2': '4db099b4e7024d1f',
  'house@2': '7652977a0fad6ef2',
  'farm@2': '8066459d2dea9ccf',
  'lumber_camp@2': '266261de3ffbcc66',
  'mining_camp@2': '2389975a5776423e',
  'barracks@2': 'ed15c82bb32b2415',
  'archery_range@2': '7c269efae068ab28',
  'stable@2': '9b947a583d94303e',
  'blacksmith@2': '1ffe04e7190d2f83',
  'foundry@2': '3e2ea4c6e8a4daa5',
  'tower@2': 'c6736b9e5362e420',
  'wall@2': 'c275d8d780b75e36',
  'wonder@2': '40eb9b1e74a2e513',
  'town_center@3': '2180840002eb1cb6',
  'house@3': '0ec349c3530ab1ef',
  'farm@3': '5e3caec4b7a5794c',
  'lumber_camp@3': 'eac982939ea82a35',
  'mining_camp@3': '39615a0c5881ee0a',
  'barracks@3': '1f50dabe3fa7e908',
  'archery_range@3': '7a180b979105ce5c',
  'stable@3': '74b53b79c961706b',
  'blacksmith@3': '20811b06b94763fa',
  'foundry@3': '2dd5e0fe471d7103',
  'tower@3': '4ab6eefa900bf6de',
  'wall@3': '09a1c01ff9e8f2c3',
  'wonder@3': '40eb9b1e74a2e513',
  'wonder~s1': 'c277d3d542de1a44',
  'wonder~s2': '8ed937621cbdddc4',
  'wonder~s3': '4616d6111de218d9',
});
