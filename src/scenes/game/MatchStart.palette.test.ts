import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { getTeamPalette, setTeamPalette } from '../../game/Player';
import { FIXED_DATE, STEP_MS, savableMatch } from '../../save/savedMatch.testkit';
import type { SaveData } from '../../save/schema';
import { settingsStore } from '../../ui/settings';
import { prepareMatch } from './MatchStart';

let save: SaveData;
beforeAll(() => {
  const match = savableMatch();
  match.run(2_000, STEP_MS);
  save = match.snapshot(FIXED_DATE);
});

afterEach(() => {
  settingsStore.getState().setTeamPalette('default');
  setTeamPalette('default');
});

describe('prepareMatch applies the stored team palette', () => {
  it('for a new game and for a load', () => {
    settingsStore.getState().setTeamPalette('colorblind');
    const fresh = prepareMatch({ seed: 3 });
    expect(getTeamPalette()).toBe('colorblind');
    expect(fresh.ok && fresh.match.players.get(1)?.color).toBe(0xe69f00);

    settingsStore.getState().setTeamPalette('default');
    const loaded = prepareMatch({ load: save });
    expect(getTeamPalette()).toBe('default');
    expect(loaded.ok && loaded.match.players.get(1)?.color).toBe(0x4a8ad0);

    settingsStore.getState().setTeamPalette('colorblind');
    const reloaded = prepareMatch({ load: save });
    expect(reloaded.ok && reloaded.match.players.get(1)?.color).toBe(0xe69f00);
  });
});
