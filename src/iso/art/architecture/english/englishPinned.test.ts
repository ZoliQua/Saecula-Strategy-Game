import { beforeAll, describe, expect, it } from 'vitest';
import type { AgeId, BuildingType } from '../../../../types';
import type { LitArt } from '../../lighting/normalLayer';
import { hashPainting, installRecordingCanvas } from '../../testing/recordingCanvas';

/*
 * Pixel-identity guard for the English building art (M4 final review M1):
 * every English building type x age and every Wonder stage is painted onto
 * recording canvases and the draw-log hash (plus lighting data) is pinned,
 * so later shared-helper refactors cannot silently change civ #2.
 */

const TYPES: readonly BuildingType[] = [
  'town_center', 'house', 'farm', 'lumber_camp', 'mining_camp', 'barracks', 'archery_range',
  'stable', 'blacksmith', 'foundry', 'tower', 'wall', 'wonder',
];
const AGES: readonly AgeId[] = [1, 2, 3];
const TEAM = 0x3b6fd6;

/** Recorded at 39e00c4 (end of M4). */
const EXPECTED: Record<string, string> = {
  'town_center@1': '3ee6f5e804a944c8',
  'house@1': '03ad224b6b045771',
  'farm@1': '003c9732d64fa7e5',
  'lumber_camp@1': '823025140158c891',
  'mining_camp@1': '665a6f6ec6ad9922',
  'barracks@1': 'e4007cea9810a40a',
  'archery_range@1': 'e3b6d60f2739e825',
  'stable@1': '58ca06b1ac34b3c8',
  'blacksmith@1': '149b6c32a2391bbf',
  'foundry@1': '10287c11d3f4401e',
  'tower@1': 'c16a2e013ddc8742',
  'wall@1': 'ca27a08f85b944cb',
  'wonder@1': 'eaf6c2df4a29f981',
  'town_center@2': '9934a351268ad712',
  'house@2': 'de397d104db910da',
  'farm@2': '5aa8d20cf74547b4',
  'lumber_camp@2': '05dc2b0cedb1826f',
  'mining_camp@2': '7411af3635c18cb4',
  'barracks@2': '812469cd014ea61c',
  'archery_range@2': 'ddcdfbbec9521a61',
  'stable@2': 'f3efd7c075c89b4e',
  'blacksmith@2': '7f9b1453d630e19e',
  'foundry@2': '416d4d3a7c388c0d',
  'tower@2': '12a1fc723d2610bd',
  'wall@2': '534386faf40e08e8',
  'wonder@2': '941d98410348d2e3',
  'town_center@3': '9b20943429620e89',
  'house@3': '2063c73902bc3206',
  'farm@3': '5396499ae0aec0b1',
  'lumber_camp@3': 'ac364700384f5e6a',
  'mining_camp@3': '1f1e96e7c95d4683',
  'barracks@3': '7f20bffe9922276d',
  'archery_range@3': '2a9b716f2b0dfcca',
  'stable@3': 'a42f7309238dceb7',
  'blacksmith@3': 'c60d885fefb9fcb2',
  'foundry@3': '50cf381ff1054ffd',
  'tower@3': 'f43c875f525d5437',
  'wall@3': '2cfc945a9659beb5',
  'wonder@3': '88e5b1813811b138',
  'wonder~s1': 'b9e928c29acde161',
  'wonder~s2': '2729ffbc05dc1492',
  'wonder~s3': '84f331d250d4c693',
};

function lightingData(art: LitArt): unknown {
  return { volume: art.volume, glows: art.glows, lights: art.lights, smoke: art.smoke, normal: art.normal !== null };
}

describe('English building art stays pixel-identical', () => {
  let buildings: typeof import('../../buildings');
  beforeAll(async () => {
    installRecordingCanvas();
    buildings = await import('../../buildings');
  });

  const cases: Array<[string, () => string]> = [];
  for (const age of AGES) {
    for (const type of TYPES) {
      cases.push([`${type}@${age}`, () => hashPainting(() => lightingData(buildings.paintBuilding(type, TEAM, age, 'english', false)))]);
    }
  }
  for (const stage of [1, 2, 3]) {
    cases.push([`wonder~s${stage}`, () => hashPainting(() => lightingData(buildings.paintWonderStage(stage, 'english')))]);
  }

  it.each(cases)('%s', (name, run) => {
    const hash = run();
    if (process.env.PRINT_ART_HASHES) console.log(`  '${name}': '${hash}',`);
    expect(hash).toBe(EXPECTED[name]);
  });
});
