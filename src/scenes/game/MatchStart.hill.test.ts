import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultSetupConfig, withSetup } from '../../game/GameSetupConfig';
import { hu } from '../../i18n/hu';
import type { GeneratedMap } from '../../map/generator';
import { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';

let custom: GeneratedMap | null = null;
vi.mock('../../map/generator', async (original) => {
  const real = await original<typeof import('../../map/generator')>();
  return { ...real, generateMap: (...args: Parameters<typeof real.generateMap>) => custom ?? real.generateMap(...args) };
});

const { prepareMatch } = await import('./MatchStart');

/** A valid-looking map whose two starts share no land: no tile is reachable from both. */
function noSiteMap(): GeneratedMap {
  const map = new MapData(64, 64);
  for (let ty = 0; ty < 64; ty++) map.setTile(32, ty, TERRAIN.water);
  return { map, playerStarts: [{ tx: 10, ty: 10 }, { tx: 54, ty: 54 }], walls: [], outerLodes: [[], []] };
}

afterEach(() => {
  custom = null;
  vi.restoreAllMocks();
});

const setup = withSetup(defaultSetupConfig(3), { template: 'meadow', mapSize: 'small', aiCount: 1, victory: 'hill' });

describe('starting King of the Hill (M19)', () => {
  it('a map with a site starts', () => {
    expect(prepareMatch(setup).ok).toBe(true);
  });

  it('no site goes back to the setup like a bad seed, the choices kept', () => {
    custom = noSiteMap();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(prepareMatch(setup)).toEqual({ ok: false, back: { config: setup, notice: hu.setup.mapFailed } });
    expect(warn).toHaveBeenCalledOnce();
  });

  it('the other modes need no site', () => {
    custom = noSiteMap();
    expect(prepareMatch(withSetup(setup, { victory: 'conquest' })).ok).toBe(true);
  });
});
