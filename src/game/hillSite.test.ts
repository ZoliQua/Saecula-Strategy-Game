import { describe, expect, it } from 'vitest';
import { HILL } from '../config/balance';
import { createEcsWorld } from '../ecs/world';
import { chebyshev } from '../iso/coordinates';
import { generateMap } from '../map/generator';
import { reachMask } from '../map/gridSteps';
import { villagerSpawnTiles } from '../map/startLayout';
import { spawnNewMatch } from '../scenes/game/GameBootstrap';
import { findHillSite, hillTiles } from './hill';
import { HILL_TEMPLATES } from './GameSetupConfig';
import { createPlayers } from './PlayerManager';

const SEEDS = 20;
const PLAYER_COUNTS = [2, 3, 4, 5, 6] as const;

describe('the hill site on generated maps (M19)', () => {
  const layouts = HILL_TEMPLATES.flatMap((template) => [64, 96, 128].map((size) => [template, size] as const));

  it.each(layouts)('%s %i, 2 to 6 players: always a site, at most 4 tiles from the centre', (template, size) => {
    const mid = Math.floor(size / 2);
    for (const playerCount of PLAYER_COUNTS) {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const where = `${playerCount} players, seed ${seed}`;
        const generated = generateMap({ template, width: size, height: size, seed, playerCount });
        const site = findHillSite(generated);
        if (!site) throw new Error(`no site: ${where}`);
        expect(chebyshev(site, { tx: mid, ty: mid }), where).toBeLessThanOrEqual(4);
        if (seed > 3) continue;

        // The rule checked against the spawned match's own blockers.
        const { map, playerStarts: starts, walls } = generated;
        const players = createPlayers('hungarian', Array.from({ length: playerCount - 1 }, () => 'english' as const));
        spawnNewMatch(createEcsWorld(), players, { mapData: map, starts, walls }, { victory: 'conquest' });
        const masks = starts.map((start) => reachMask(map, villagerSpawnTiles(start)[1]!));
        const zone = [...hillTiles(site)].filter((t) => masks.every((mask) => mask[t.ty * size + t.tx] === 1));
        expect(zone.length, where).toBeGreaterThanOrEqual(HILL.minPassable);
      }
    }
  }, 120_000);
});
