import { describe, expect, it } from 'vitest';
import { createEcsWorld } from '../../ecs/world';
import { chebyshev } from '../../iso/coordinates';
import { defaultSetupConfig, matchCivs, VICTORY_MODES, withSetup, type GameSetupConfig } from '../../game/GameSetupConfig';
import { createPlayers } from '../../game/PlayerManager';
import { computePopulation } from '../../game/population';
import { MAP_TEMPLATES } from '../../map/generator';
import { reachMask } from '../../map/gridSteps';
import { townCenterOrigin, TOWN_CENTER_SIZE, villagerSpawnTiles } from '../../map/startLayout';
import { spawnNewMatch, tryGenerateGameMap } from './GameBootstrap';

function spawned(config: GameSetupConfig) {
  const game = tryGenerateGameMap(config);
  if (!game) return null;
  const world = createEcsWorld();
  const players = createPlayers(config.civ, matchCivs(config).ais);
  spawnNewMatch(world, players, game, config);
  return { world, players, ...game };
}

describe('Regicide spawn (M19)', () => {
  it.each(VICTORY_MODES.filter((m) => m !== 'regicide'))('%s: no king', (victory) => {
    const m = spawned(withSetup(defaultSetupConfig(4), { template: 'meadow', mapSize: 'small', aiCount: 1, victory }))!;
    expect(m.world.entities.some((e) => e.unit?.unitType === 'king')).toBe(false);
  });

  it('the kings come last: every other entity keeps its id, order and components', () => {
    const base = withSetup(defaultSetupConfig(5), { template: 'fortress', mapSize: 'small', aiCount: 2 });
    const plain = structuredClone(spawned(withSetup(base, { victory: 'conquest' }))!.world.entities);
    const m = spawned(withSetup(base, { victory: 'regicide' }))!;
    expect(m.world.entities.slice(0, plain.length)).toEqual(plain);
    const kings = m.world.entities.slice(plain.length);
    expect(kings.map((e) => [e.unit?.unitType, e.owner?.playerId])).toEqual([['king', 1], ['king', 2], ['king', 3]]);
    for (const id of [1, 2, 3]) expect(computePopulation(m.world.entities, id, 0).current).toBe(3);
  });

  it('the same setup gives the same tiles', () => {
    const config = withSetup(defaultSetupConfig(8), { template: 'meadow', mapSize: 'small', aiCount: 2, victory: 'regicide' });
    const tiles = () => spawned(config)!.world.entities.filter((e) => e.unit?.unitType === 'king').map((e) => e.position);
    expect(tiles()).toEqual(tiles());
  });

  const layouts = [['small', 1], ['small', 5], ['medium', 3], ['large', 5]] as const;
  it.each(MAP_TEMPLATES)('%s: one king each, on a free tile by the town centre that walks wherever the villagers do', (template) => {
    let checked = 0;
    for (const [mapSize, aiCount] of layouts) {
      for (let seed = 1; seed <= 5; seed++) {
        const m = spawned(withSetup(defaultSetupConfig(seed), { template, mapSize, aiCount, victory: 'regicide' }));
        if (!m) continue;
        checked++;
        const kings = m.world.entities.filter((e) => e.unit?.unitType === 'king');
        expect(kings.map((k) => k.owner?.playerId)).toEqual(m.players.all().map((p) => p.id));
        kings.forEach((king, i) => {
          const start = m.starts[i]!;
          const at = king.position!;
          const where = `${mapSize}/${aiCount} seed ${seed} player ${i + 1}`;
          expect(m.mapData.isPassable(at.tx, at.ty), where).toBe(true);
          const o = townCenterOrigin(start);
          const inside = at.tx >= o.tx && at.tx < o.tx + TOWN_CENTER_SIZE && at.ty >= o.ty && at.ty < o.ty + TOWN_CENTER_SIZE;
          expect(inside, where).toBe(false);
          expect(villagerSpawnTiles(start), where).not.toContainEqual(at);
          expect(chebyshev(at, start), where).toBe(2);
          // Not trapped: the same walkable area as the villagers, which the validation links to the rest of the map.
          const villager = villagerSpawnTiles(start)[1]!;
          const fromKing = reachMask(m.mapData, at);
          expect(fromKing[villager.ty * m.mapData.width + villager.tx], where).toBe(1);
          if (template === 'fortress') {
            for (const other of m.starts) {
              const v = villagerSpawnTiles(other)[1]!;
              expect(fromKing[v.ty * m.mapData.width + v.tx], `${where}: out through the gates`).toBe(1);
            }
          }
        });
      }
    }
    expect(checked).toBeGreaterThan(10);
  }, 120_000);
});
