import { beforeAll, describe, expect, it } from 'vitest';
import { installRecordingCanvas } from './testing/recordingCanvas.testkit';
import { HILL_ART, HILL_ART_FRAMES } from './hillArt';

beforeAll(() => installRecordingCanvas());

describe('hill art (M19)', () => {
  it('the whole marker costs less than 1 MB of textures, albedo and any normals', () => {
    const bytes = Object.values(HILL_ART).map((paint) => paint()).reduce((sum, c) => sum + c.width * c.height * 4, 0);
    expect(bytes * 2).toBeLessThan(1024 * 1024);
  });

  it('the waving cloths are strips of whole frames', () => {
    for (const key of ['flag', 'torn'] as const) expect(HILL_ART[key]().width % HILL_ART_FRAMES).toBe(0);
  });
});
