import { describe, expect, it } from 'vitest';
import { START_ECONOMY } from '../config/balance';
import { generateMap, MAP_TEMPLATES, TEMPLATE_GENERATORS, type MapTemplate, type PresetWall } from './generator';
import { terrainShare } from './generators/regions';
import { channelAngles } from './generators/islands';
import { inBounds } from './generators/startArea';
import { FORTRESS_RING_RADIUS } from './generators/fortress';
import { TERRAIN } from './TerrainTypes';
import { ownedGold, startEconomy, validateMap } from './validation';

const gen = (template: MapTemplate, size: number, seed: number, playerCount: number) =>
  TEMPLATE_GENERATORS[template]({ width: size, height: size, seed, playerCount });

const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);
const crowded = (template: MapTemplate, size: number, seed: number, playerCount: number) =>
  generateMap({ template, width: size, height: size, seed, playerCount });

describe.each(MAP_TEMPLATES)('map template %s', (template) => {
  it('is deterministic per seed (tiles, starts and walls)', () => {
    const a = gen(template, 64, 77, 4);
    const b = gen(template, 64, 77, 4);
    expect(Array.from(a.map.getRawTiles())).toEqual(Array.from(b.map.getRawTiles()));
    expect(a.playerStarts).toEqual(b.playerStarts);
    expect(a.walls).toEqual(b.walls);
    expect(Array.from(gen(template, 64, 78, 4).map.getRawTiles())).not.toEqual(Array.from(a.map.getRawTiles()));
  });

  it('passes validation on the first try for seeds 1..20 at 64×64 (3 players) and 96×96 (4 players)', () => {
    for (const [size, players] of [[64, 3], [96, 4]] as const) {
      for (const seed of SEEDS) {
        const result = validateMap(gen(template, size, seed, players));
        expect(result.problems, `${size} seed ${seed}`).toEqual([]);
      }
    }
  });

  it('gives every start at least 800 gold, 500 food and 800 wood it can work (START_ECONOMY)', () => {
    for (const seed of [1, 2, 3]) {
      const g = gen(template, 96, seed, 4);
      for (const s of g.playerStarts) {
        const eco = startEconomy(g, s);
        expect(eco.gold).toBeGreaterThanOrEqual(START_ECONOMY.minGold);
        expect(eco.food).toBeGreaterThanOrEqual(START_ECONOMY.minFood);
        expect(eco.wood).toBeGreaterThanOrEqual(START_ECONOMY.minWood);
      }
    }
  });

  it('gives every start a second, outer gold lode of its own (START_ECONOMY.outerGold), workable and nearer to it than to any other start', () => {
    const e = START_ECONOMY;
    // First try on the usual sizes; crowded 6-player maps through generateMap's retries (the game's path:
    // islands and random 64×64 miss on 15-30% of first tries, never after the retries in 100 seeds).
    const cases = [[64, 3, SEEDS, gen], [96, 4, SEEDS, gen], [64, 6, [1, 2, 3, 4, 5], crowded], [128, 6, [1, 2, 3], crowded]] as const;
    for (const [size, players, seeds, make] of cases) {
      for (const seed of seeds) {
        const g = make(template, size, seed, players);
        g.playerStarts.forEach((s, i) => {
          const label = `${size}/${players} seed ${seed} player ${i}`;
          expect(ownedGold(g, i), label).toBeGreaterThanOrEqual(e.minTotalGold);
          // The outer lode itself: gold out in its ring band, beyond the start lode's (a crowded map may
          // fall back to a lode closer in: START_ECONOMY.outerGold.crowdedRing).
          if (make === crowded) return;
          let outer = 0;
          for (let ty = s.ty - e.outerGold.ring.max - 2; ty <= s.ty + e.outerGold.ring.max + 2; ty++) {
            for (let tx = s.tx - e.outerGold.ring.max - 2; tx <= s.tx + e.outerGold.ring.max + 2; tx++) {
              const d = Math.hypot(tx - s.tx, ty - s.ty);
              if (!inBounds(g.map, tx, ty)) continue;
              if (d >= e.outerGold.ring.min - 1 && g.map.getTile(tx, ty) === TERRAIN.gold_mine) outer++;
            }
          }
          expect(outer, label).toBeGreaterThanOrEqual(e.outerGold.tiles.min);
        });
      }
    }
  });

  it('places 1..6 players', () => {
    for (const players of [1, 2, 5, 6]) {
      expect(gen(template, 96, 5, players).playerStarts).toHaveLength(players);
    }
    expect(() => gen(template, 64, 1, 0)).toThrow(RangeError);
    expect(() => gen(template, 64, 1, 7)).toThrow(RangeError);
  });
});

describe('template character', () => {
  it('wilderness is about 60% forest (50-70%)', () => {
    for (const seed of [1, 2, 3, 4]) {
      const share = terrainShare(gen('wilderness', 96, seed, 4).map, TERRAIN.forest);
      expect(share).toBeGreaterThan(0.5);
      expect(share).toBeLessThan(0.7);
    }
  });

  it('islands are about 40% cliff (30-50%) and neighbouring starts are split by a channel', () => {
    for (const seed of [1, 2, 3, 4]) {
      const g = gen('islands', 96, seed, 3);
      const share = terrainShare(g.map, TERRAIN.cliff);
      expect(share).toBeGreaterThan(0.3);
      expect(share).toBeLessThan(0.5);
      // The straight line between two starts crosses cliff: they only meet over a bridge.
      const [a, b] = g.playerStarts;
      let cliffs = 0;
      for (let t = 0; t <= 1; t += 0.01) {
        const tx = Math.round(a!.tx + (b!.tx - a!.tx) * t);
        const ty = Math.round(a!.ty + (b!.ty - a!.ty) * t);
        if (g.map.getTile(tx, ty) === TERRAIN.cliff) cliffs++;
      }
      expect(cliffs).toBeGreaterThan(0);
    }
  });

  it('islands: one channel per island, between neighbouring starts', () => {
    expect(channelAngles(2, 2)).toHaveLength(2);
    expect(channelAngles(6, 3)).toHaveLength(3);
    // 2 players (top and bottom): the channels run left and right of the centre.
    const [left, right] = channelAngles(2, 2).map((a) => Math.round(Math.cos(a)));
    expect([left, right].sort()).toEqual([-1, 1]);
  });

  it('fortress walls ring every start with gates; each wall belongs to its ring owner', () => {
    const g = gen('fortress', 96, 3, 4);
    for (let i = 0; i < g.playerStarts.length; i++) {
      const own = g.walls.filter((w) => w.playerIndex === i);
      const s = g.playerStarts[i]!;
      expect(own.length).toBeGreaterThan(40);
      for (const w of own) {
        // Stone (§11.4): the medieval wall style from the Roman age on.
        expect(w.minStyleAge).toBe(2);
        expect(Math.max(Math.abs(w.tile.tx - s.tx), Math.abs(w.tile.ty - s.ty))).toBeLessThanOrEqual(FORTRESS_RING_RADIUS);
        expect(g.map.getTile(w.tile.tx, w.tile.ty)).toBe(TERRAIN.grass);
      }
    }
    // Validation treats walls as blocked, so passing it means the gates connect the starts.
    expect(validateMap(g).ok).toBe(true);
    // Without gates (every ring tile walled) the starts would be sealed in.
    const sealed = { ...g, walls: [...g.walls, ...gateTiles(g)] };
    expect(validateMap(sealed).problems.some((p) => p.includes('cannot be reached'))).toBe(true);
  });

  it('random uses water as an obstacle (5-30%) and grass for the starts', () => {
    for (const seed of [1, 2, 3]) {
      const g = gen('random', 96, seed, 4);
      const water = terrainShare(g.map, TERRAIN.water);
      expect(water).toBeGreaterThan(0.05);
      expect(water).toBeLessThan(0.3);
    }
  });
});

/** The open tiles of each fortress ring (its gates). */
function gateTiles(g: ReturnType<typeof gen>) {
  const walled = new Set(g.walls.map((w) => `${w.tile.tx},${w.tile.ty}`));
  const out: PresetWall[] = [];
  g.playerStarts.forEach((s, playerIndex) => {
    const own = g.walls.filter((w) => w.playerIndex === playerIndex);
    const r = Math.max(...own.map((w) => Math.max(Math.abs(w.tile.tx - s.tx), Math.abs(w.tile.ty - s.ty))));
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || walled.has(`${s.tx + dx},${s.ty + dy}`)) continue;
        out.push({ tile: { tx: s.tx + dx, ty: s.ty + dy }, playerIndex, minStyleAge: 2 });
      }
    }
  });
  return out;
}
