import { beforeAll, describe, expect, it } from 'vitest';
import type { AgeId, BuildingType } from '../../types';
import type { LitArt } from './lighting/normalLayer';
import { canonicalColor, hashPainting, installRecordingCanvas } from './recordingCanvas';

/*
 * Pixel-identity guard for the Hungarian building art (M4 Task 2): every
 * Hungarian building type × age, and every Wonder stage, is painted onto
 * recording canvases (albedo + face-normal layer) and the hash of the
 * full draw log plus the lighting data (volume, glows, lights, smoke) is
 * compared to hashes recorded before the style refactor. A draw log that
 * matches call for call paints the same pixels.
 */

const TYPES: readonly BuildingType[] = [
  'town_center', 'house', 'farm', 'lumber_camp', 'mining_camp', 'barracks', 'archery_range',
  'stable', 'blacksmith', 'foundry', 'tower', 'wall', 'wonder',
];
const AGES: readonly AgeId[] = [1, 2, 3];
const TEAM = 0x3b6fd6;

/** Recorded at 543b214, before the ArchStyle refactor. */
const EXPECTED: Record<string, string> = {
  'town_center@1': '2bd4ba82ec0d2cd8',
  'house@1': '770321401bb75cb2',
  'farm@1': '934780d76e02a741',
  'lumber_camp@1': '7d1ee9a788f4f955',
  'mining_camp@1': 'e5bf0580f3784d23',
  'barracks@1': '804763ffb8ea81d1',
  'archery_range@1': '43a5fa1bd5b546d3',
  'stable@1': '48f56164c4f32511',
  'blacksmith@1': '9ed50e48c474db62',
  'foundry@1': 'a64a652ecafe6383',
  'tower@1': '15ffab1430182b30',
  'wall@1': '2d9e80c27ed44766',
  'wonder@1': '8ec2f54d27cd87d2',
  'town_center@2': '2cee8103dcdb5fc2',
  'house@2': 'e26c326b3d7280bb',
  'farm@2': '40c68428b711eb95',
  'lumber_camp@2': 'e2c5ee75b01afb33',
  'mining_camp@2': '2e6cfeb21dcc0d15',
  'barracks@2': '36dc9c2d45aba29f',
  'archery_range@2': 'febc21b10fc3760b',
  'stable@2': 'd14e9216321d30ed',
  'blacksmith@2': '36aa9ef008e4fbb6',
  'foundry@2': '8a31b680bbbd6cc8',
  'tower@2': '2dc07198c34aa204',
  'wall@2': '52391ba120e2779e',
  'wonder@2': 'd689d7aff646cf30',
  'town_center@3': '2a709387bddf1346',
  'house@3': '949ca1aa4a6b1e8d',
  'farm@3': '24e4f5a1688a99f8',
  'lumber_camp@3': '8f43bd778f1fe438',
  'mining_camp@3': '624c73525d74fe58',
  'barracks@3': '475bd1146796bafb',
  'archery_range@3': 'a405d65c4ab1d773',
  'stable@3': '17a1347f1daa6847',
  'blacksmith@3': 'd1c642066840d3c5',
  'foundry@3': '6fd05ce8e87ee85f',
  'tower@3': 'e123758e4f448711',
  'wall@3': '6d43c0398d050e48',
  'wonder@3': '183da39f23403928',
  'wonder~s1': '6bed279c75fca7e1',
  'wonder~s2': 'b373622070a961a1',
  'wonder~s3': '1667e726c6577523',
};

function lightingData(art: LitArt): unknown {
  return { volume: art.volume, glows: art.glows, lights: art.lights, smoke: art.smoke, normal: art.normal !== null };
}

describe('Hungarian building art stays pixel-identical', () => {
  let buildings: typeof import('./buildings');
  beforeAll(async () => {
    installRecordingCanvas();
    buildings = await import('./buildings');
  });

  const cases: Array<[string, () => string]> = [];
  for (const age of AGES) {
    for (const type of TYPES) {
      cases.push([`${type}@${age}`, () => hashPainting(() => lightingData(buildings.paintBuilding(type, TEAM, age, 'hungarian', false)))]);
    }
  }
  for (const stage of [1, 2, 3]) {
    cases.push([`wonder~s${stage}`, () => hashPainting(() => lightingData(buildings.paintWonderStage(stage, 'hungarian')))]);
  }

  it.each(cases)('%s', (name, run) => {
    const hash = run();
    if (process.env.PRINT_ART_HASHES) console.log(`  '${name}': '${hash}',`);
    expect(hash).toBe(EXPECTED[name]);
  });

  it('logs equal colours equally whatever their CSS spelling', () => {
    expect(canonicalColor('#2b1d12')).toBe('rgb(43,29,18)');
    expect(canonicalColor('rgba(43,29,18,.9)')).toBe('rgba(43,29,18,0.9)');
    expect(canonicalColor('rgba(43,29,18,1)')).toBe('rgb(43,29,18)');
    expect(canonicalColor('blur(4px)')).toBe('blur(4px)');
  });

  it('notices a one-colour change (the log hash is sensitive)', () => {
    const paint = (team: number) => hashPainting(() => lightingData(buildings.paintBuilding('town_center', team, 1, 'hungarian', false)));
    expect(paint(TEAM)).toBe(paint(TEAM));
    expect(paint(TEAM + 1)).not.toBe(paint(TEAM));
  });
});
