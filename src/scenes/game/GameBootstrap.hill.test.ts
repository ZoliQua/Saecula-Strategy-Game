import { describe, expect, it } from 'vitest';
import { createEcsWorld } from '../../ecs/world';
import { defaultSetupConfig, HILL_TEMPLATES, matchCivs, VICTORY_MODES, withSetup, type GameSetupConfig } from '../../game/GameSetupConfig';
import { findHillSite, hillState, hillTiles, inHillZone } from '../../game/hill';
import { createPlayers } from '../../game/PlayerManager';
import { TERRAIN } from '../../map/TerrainTypes';
import { spawnNewMatch, tryGenerateGameMap } from './GameBootstrap';

function spawned(config: GameSetupConfig) {
  const game = tryGenerateGameMap(config);
  if (!game) throw new Error('no map');
  const layout = { map: game.mapData, playerStarts: game.starts, walls: game.walls };
  const site = findHillSite(layout);
  const world = createEcsWorld();
  spawnNewMatch(world, createPlayers(config.civ, matchCivs(config).ais), game, config);
  return { world, site, ...game };
}

describe('King of the Hill spawn (M19)', () => {
  const base = withSetup(defaultSetupConfig(6), { template: 'fortress', mapSize: 'small', aiCount: 2 });

  it.each(VICTORY_MODES.filter((m) => m !== 'hill'))('%s: no hill, nothing unbuildable', (victory) => {
    const m = spawned(withSetup(base, { victory }));
    expect(hillState(m.world)).toBeNull();
    for (const t of hillTiles(m.site!)) {
      const open = m.mapData.isPassable(t.tx, t.ty) && m.mapData.getTile(t.tx, t.ty) === TERRAIN.grass;
      expect(m.mapData.isBuildable(t.tx, t.ty)).toBe(open);
    }
  });

  it.each(HILL_TEMPLATES)('%s: the hill comes last, every other entity keeps its id, order and components', (template) => {
    const plainMatch = spawned(withSetup(base, { template, victory: 'conquest' }));
    const plain = structuredClone(plainMatch.world.entities);
    const m = spawned(withSetup(base, { template, victory: 'hill' }));
    expect(m.world.entities).toHaveLength(plain.length + 1);
    expect(m.world.entities.slice(0, plain.length)).toEqual(plain);
    expect(m.world.entities.at(-1)).toEqual({
      id: Math.max(...plain.map((e) => e.id!)) + 1,
      position: m.site,
      hill: { heldMs: {}, holderTeam: null, contested: false },
    });
  });

  it.each(HILL_TEMPLATES)('%s: the map is the same seed’s map, only the zone takes no building', (template) => {
    const plain = spawned(withSetup(base, { template, victory: 'conquest' })).mapData;
    const m = spawned(withSetup(base, { template, victory: 'hill' }));
    expect(m.mapData.getRawTiles()).toEqual(plain.getRawTiles());
    expect(m.mapData.getRawBlocked()).toEqual(plain.getRawBlocked());
    plain.forEachTile(({ tx, ty }) => {
      const at = `${tx},${ty}`;
      expect(m.mapData.isPassable(tx, ty), at).toBe(plain.isPassable(tx, ty));
      expect(m.mapData.isBuildable(tx, ty), at).toBe(plain.isBuildable(tx, ty) && !inHillZone(m.site!, { tx, ty }));
    });
  });
});
