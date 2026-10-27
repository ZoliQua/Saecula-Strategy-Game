import { beforeAll, describe, expect, it } from 'vitest';
import { lightingData, PIN_TEAM, pinBuildings } from './testing/pinnedArt.testkit';
import { canonicalColor, hashPainting, installRecordingCanvas } from './testing/recordingCanvas.testkit';

/*
 * Pixel-identity guard for the Hungarian building art (M4 Task 2): every
 * Hungarian building type × age, and every Wonder stage (see
 * testing/pinnedArt.testkit.ts), compared to hashes recorded at 543b214,
 * before the ArchStyle refactor.
 */

pinBuildings('hungarian', {
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
});

describe('building pin hashes', () => {
  let buildings: typeof import('./buildings');
  beforeAll(async () => {
    installRecordingCanvas();
    buildings = await import('./buildings');
  });

  it('logs equal colours equally whatever their CSS spelling', () => {
    expect(canonicalColor('#2b1d12')).toBe('rgb(43,29,18)');
    expect(canonicalColor('rgba(43,29,18,.9)')).toBe('rgba(43,29,18,0.9)');
    expect(canonicalColor('rgba(43,29,18,1)')).toBe('rgb(43,29,18)');
    expect(canonicalColor('blur(4px)')).toBe('blur(4px)');
  });

  it('notices a one-colour change (the log hash is sensitive)', () => {
    const paint = (team: number) => hashPainting(() => lightingData(buildings.paintBuilding('town_center', team, 1, 'hungarian', false)));
    expect(paint(PIN_TEAM)).toBe(paint(PIN_TEAM));
    expect(paint(PIN_TEAM + 1)).not.toBe(paint(PIN_TEAM));
  });
});
