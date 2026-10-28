import { describe, expect, it } from 'vitest';
import { resumeHeadlessMatch, type HeadlessMatch } from '../ai/testing/headlessMatch';
import { WONDER_HOLD_MS } from '../config/balance';
import type { Entity } from '../ecs/components';
import { createBuilding } from '../ecs/archetypes/building';
import { createUnit } from '../ecs/archetypes/createUnit';
import { killEntity } from '../game/kill';
import { VictoryChecker } from '../game/VictoryChecker';
import type { TileCoord } from '../iso/coordinates';
import type { MapData } from '../map/MapData';
import { parseSave } from './parse';
import type { SaveData } from './schema';
import { FIXED_DATE, MIN, STEP_MS, savableMatch } from './savedMatch.testkit';

/** Snapshot → JSON string → parser: what a loaded slot hands the game. */
function throughJson(save: SaveData): SaveData {
  const parsed = parseSave(JSON.stringify(save));
  if (!parsed.ok) throw new Error(`save did not parse: ${parsed.reason}`);
  return parsed.save;
}

function townCenter(match: HeadlessMatch, playerId: number): Entity & { position: TileCoord } {
  const tc = match.world.entities.find((e) => e.building?.type === 'town_center' && e.owner?.playerId === playerId);
  if (!tc?.position) throw new Error(`player ${playerId} has no town centre`);
  return tc as Entity & { position: TileCoord };
}

/** The free w×h spot (buildable, unblocked, one free tile around it) nearest `from`. */
function freeSpot(map: MapData, from: TileCoord, w: number, h: number): TileCoord {
  for (let r = 4; r < 30; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const o = { tx: from.tx + dx, ty: from.ty + dy };
        let ok = true;
        for (let y = -1; y <= h && ok; y++) {
          for (let x = -1; x <= w && ok; x++) ok = map.isBuildable(o.tx + x, o.ty + y) && !map.isBlocked(o.tx + x, o.ty + y);
        }
        if (ok) return o;
      }
    }
  }
  throw new Error('no free spot');
}

const byId = (match: HeadlessMatch, id: number | undefined): Entity | undefined => match.world.entities.find((e) => e.id === id);

/** Counts the AIs' (players 2..) own entities. */
const aiEntityCount = (save: SaveData): number => save.entities.filter((e) => (e.components.owner?.playerId ?? 0) >= 2).length;

describe('resuming a save', () => {
  it('the same save resumed twice runs to identical states, and the AIs keep acting (Decision 3b)', () => {
    const match = savableMatch();
    match.run(6 * MIN, STEP_MS);
    const s1 = match.snapshot(FIXED_DATE);

    const first = resumeHeadlessMatch(s1);
    first.run(3 * MIN, STEP_MS);
    const a = first.snapshot(FIXED_DATE);
    const second = resumeHeadlessMatch(throughJson(s1));
    second.run(3 * MIN, STEP_MS);
    const b = second.snapshot(FIXED_DATE);

    expect(a.gameTimeMs).toBe(s1.gameTimeMs + 3 * MIN);
    expect(b).toEqual(a);
    expect(aiEntityCount(a)).not.toBe(aiEntityCount(s1));
    expect(a.ai['2']).not.toEqual(s1.ai['2']);
    // s1 itself is never aliased by a resumed match.
    expect(throughJson(s1)).toEqual(s1);
  }, 180_000);

  describe('mid-action saves (Review Focus 1)', () => {
    it('mid-construction: a 40 % site with two builders finishes within its remaining time + 20 s', () => {
      const match = savableMatch();
      match.run(5_000, STEP_MS);
      const origin = freeSpot(match.map, townCenter(match, 1).position, 2, 2);
      const site = createBuilding(match.world, { type: 'house', origin, playerId: 1, mapData: match.map, underConstruction: true });
      const uc = site.underConstruction;
      if (!uc || !site.health) throw new Error('site not under construction');
      uc.elapsed = uc.totalTime * 0.4;
      site.health.current = Math.round(site.health.max * 0.4);
      for (const tile of [{ tx: origin.tx - 1, ty: origin.ty }, { tx: origin.tx, ty: origin.ty - 1 }]) {
        const v = createUnit(match.world, { type: 'villager', tile, playerId: 1 });
        match.world.addComponent(v, 'buildCommand', { targetId: site.id ?? -1 });
      }
      match.run(1_000, STEP_MS);
      const save = throughJson(match.snapshot(FIXED_DATE));
      const savedSite = save.entities.find((e) => e.id === site.id)?.components.underConstruction;
      expect(savedSite?.elapsed).toBeGreaterThan(uc.totalTime * 0.4);

      const resumed = resumeHeadlessMatch(save);
      let doneAt = -1;
      resumed.run(uc.totalTime * 0.6 * 1000 + 20_000, STEP_MS, (t) => {
        if (!byId(resumed, site.id)?.underConstruction) {
          doneAt = t;
          return true;
        }
      });
      expect(doneAt).toBeGreaterThan(0);
      expect(byId(resumed, site.id)?.health?.current).toBe(byId(resumed, site.id)?.health?.max);
    }, 60_000);

    it('mid-attack: an arrow in flight at save time lands after loading', () => {
      const match = savableMatch();
      match.run(5_000, STEP_MS);
      const home = townCenter(match, 1).position;
      const origin = freeSpot(match.map, home, 2, 2);
      const target = createBuilding(match.world, { type: 'house', origin, playerId: 2, mapData: match.map });
      const archer = createUnit(match.world, { type: 'archer', tile: { tx: origin.tx - 1, ty: origin.ty - 1 }, playerId: 1 });
      match.world.addComponent(archer, 'attackIntent', { targetId: target.id ?? -1 });
      let arrow: Entity | undefined;
      match.run(10_000, STEP_MS, () => {
        arrow = match.world.entities.find((e) => e.projectile?.ownerId === 1 && e.projectile.targetId === target.id);
        return arrow !== undefined;
      });
      if (!arrow?.projectile) throw new Error('the archer never shot');
      expect(arrow.projectile.elapsedMs).toBeLessThan(arrow.projectile.durationMs);
      const save = throughJson(match.snapshot(FIXED_DATE));
      const hpAtSave = save.entities.find((e) => e.id === target.id)?.components.health?.current ?? 0;
      expect(save.entities.find((e) => e.id === archer.id)?.components.attackIntent).toEqual({ targetId: target.id });

      const resumed = resumeHeadlessMatch(save);
      resumed.run(2_000, STEP_MS);
      expect(byId(resumed, arrow.id)).toBeUndefined();
      expect(byId(resumed, target.id)?.health?.current).toBeLessThan(hpAtSave);
    }, 60_000);

    it('dying: a dying building is removed after its ttl and frees its footprint', () => {
      const match = savableMatch();
      match.run(5_000, STEP_MS);
      const origin = freeSpot(match.map, townCenter(match, 1).position, 2, 2);
      const house = createBuilding(match.world, { type: 'house', origin, playerId: 1, mapData: match.map });
      if (!house.health) throw new Error('house has no health');
      killEntity(match.world, house as Entity & { health: { current: number; max: number } });
      match.run(500, STEP_MS);
      const save = throughJson(match.snapshot(FIXED_DATE));
      const ttl = save.entities.find((e) => e.id === house.id)?.components.dying?.ttlMs ?? 0;
      expect(ttl).toBeGreaterThan(0);

      const resumed = resumeHeadlessMatch(save);
      expect(resumed.map.isBlocked(origin.tx, origin.ty)).toBe(true);
      resumed.run(ttl + STEP_MS, STEP_MS);
      expect(byId(resumed, house.id)).toBeUndefined();
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) expect(resumed.map.isBlocked(origin.tx + dx, origin.ty + dy)).toBe(false);
    }, 60_000);

    it('defeated AI: stays defeated and changes no victory result', () => {
      const match = savableMatch();
      match.run(5_000, STEP_MS);
      const tc = townCenter(match, 3);
      killEntity(match.world, tc as Entity & { health: { current: number; max: number } });
      match.run(3_000, STEP_MS);
      const checker = new VictoryChecker(match.world, match.players, WONDER_HOLD_MS);
      const before = checker.check();
      expect(match.players.get(3)?.defeated).toBe(true);
      const save = throughJson(match.snapshot(FIXED_DATE));
      expect(save.players.find((p) => p.id === 3)?.defeated).toBe(true);
      expect(save.entities.some((e) => e.id === tc.id)).toBe(false);

      const resumed = resumeHeadlessMatch(save);
      const after = new VictoryChecker(resumed.world, resumed.players, WONDER_HOLD_MS);
      expect(after.check()).toEqual(before);
      resumed.run(30_000, STEP_MS);
      expect(resumed.players.get(3)?.defeated).toBe(true);
      expect(after.check()).toEqual(before);
    }, 60_000);
  });
});
