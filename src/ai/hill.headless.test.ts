import { describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { HILL } from '../config/balance';
import { createUnit } from '../ecs/archetypes/createUnit';
import type { Entity } from '../ecs/components';
import { SelectionSystem } from '../ecs/systems/SelectionSystem';
import { hillState, hillTiles, inHillZone } from '../game/hill';
import { killEntity } from '../game/kill';
import { FogOfWarData } from '../map/FogOfWarData';
import { parseSave } from '../save/parse';
import { restoreMatch } from '../save/deserializer';
import { FIXED_DATE, savableMatch, STEP_MS } from '../save/savedMatch.testkit';
import type { SaveData } from '../save/schema';
import { prepareMatch } from '../scenes/game/MatchStart';
import { restoredBuildingArt } from '../scenes/game/restoredArt';
import { Perception } from './perception';
import { resumeHeadlessMatch, type HeadlessMatch } from './testing/headlessMatch';

// SelectionSystem only picks here: no browser, so no Phaser.
vi.mock('phaser', () => ({ default: {} }));

type Mortal = Entity & { health: { current: number; max: number } };

/** A knight of `playerId` on a free tile of the zone. */
function garrison(m: HeadlessMatch, playerId: number): Mortal {
  const tile = [...hillTiles(hillState(m.world)!.centre)].find((t) => m.map.isPassable(t.tx, t.ty))!;
  return createUnit(m.world, { type: 'knight', tile, playerId }) as Mortal;
}

function reload(m: HeadlessMatch): SaveData {
  const parsed = parseSave(JSON.stringify(m.snapshot(FIXED_DATE)));
  if (!parsed.ok) throw new Error(parsed.reason);
  return parsed.save;
}

const hillOf = (m: HeadlessMatch) => m.world.entities.find((e) => e.hill)!;

describe('a headless King of the Hill match (M19)', () => {
  it('spawns a hill, only in this mode', () => {
    expect(hillState(savableMatch().world)).toBeNull();
    expect(hillState(savableMatch({ victory: 'hill' }).world)).not.toBeNull();
  });

  it("a unit on the hill runs its team's clock by game time", () => {
    const m = savableMatch({ victory: 'hill' });
    garrison(m, 1);
    m.run(2_000, STEP_MS);
    expect(hillState(m.world)).toMatchObject({ heldMs: { 1: 2_000 }, holderTeam: 1, contested: false });
  });

  it('judges every step as the game does; the first result stands', () => {
    const m = savableMatch({ victory: 'hill', aiCount: 1 });
    const knight = garrison(m, 1);
    hillOf(m).hill!.heldMs[1] = HILL.holdMs - 2 * STEP_MS;
    m.run(STEP_MS, STEP_MS);
    expect(m.judge()).toEqual({ kind: 'playing' });
    m.run(STEP_MS, STEP_MS);
    killEntity(m.world, knight);
    killEntity(m.world, m.world.entities.find((e) => e.building?.type === 'town_center' && e.owner?.playerId === 1) as Mortal);
    expect(m.judge()).toEqual({ kind: 'victory', winnerId: 1, cause: 'hill' });
  });

  it('stepping marks the defeated, whose units then hold nothing', () => {
    const m = savableMatch({ victory: 'hill' });
    killEntity(m.world, m.world.entities.find((e) => e.building?.type === 'town_center' && e.owner?.playerId === 3) as Mortal);
    m.run(STEP_MS, STEP_MS);
    expect(m.players.get(3)?.defeated).toBe(true);
    garrison(m, 3);
    m.run(1_000, STEP_MS);
    expect(hillState(m.world)).toMatchObject({ heldMs: {}, holderTeam: null });
  });

  it('the treaty stops the clock until its end', () => {
    const m = savableMatch({ victory: 'hill' });
    m.run(1_000, STEP_MS);
    garrison(m, 1);
    const save = reload(m);
    const resumed = resumeHeadlessMatch({ ...save, gameTimeMs: 10 * 60_000 - 1_000, setup: { ...save.setup, treatyMin: 10 } });
    resumed.run(900, STEP_MS);
    expect(hillState(resumed.world)).toMatchObject({ heldMs: {}, holderTeam: 1 });
    resumed.run(1_100, STEP_MS);
    expect(hillState(resumed.world)?.heldMs).toEqual({ 1: 1_100 });
  });

  it('save round trip: the clock, the id and the no-build mask, which is never saved', () => {
    const m = savableMatch({ victory: 'hill' });
    m.run(1_000, STEP_MS);
    garrison(m, 1);
    m.run(1_000, STEP_MS);
    const save = reload(m);
    expect(save.map.blocked).toBe(m.snapshot(FIXED_DATE).map.blocked);
    expect(Object.keys(save.map).sort()).toEqual(['blocked', 'height', 'seed', 'terrain', 'width']);

    const resumed = resumeHeadlessMatch(save);
    expect(hillOf(resumed).id).toBe(hillOf(m).id);
    expect(hillState(resumed.world)).toEqual(hillState(m.world));
    const { centre } = hillState(m.world)!;
    m.map.forEachTile(({ tx, ty }) => {
      expect(resumed.map.isBuildable(tx, ty), `${tx},${ty}`).toBe(m.map.isBuildable(tx, ty));
      if (inHillZone(centre, { tx, ty })) expect(resumed.map.isBuildable(tx, ty)).toBe(false);
    });
    for (const map of [restoreMatch(save).mapData, loadedMap(save)]) {
      for (const t of hillTiles(centre)) expect(map.isBuildable(t.tx, t.ty)).toBe(false);
    }
    resumed.run(1_000, STEP_MS);
    expect(hillState(resumed.world)?.heldMs).toEqual({ 1: 2_000 });
  });

  it('the bare hill is no target, no obstacle, no art and nobody’s', () => {
    const m = savableMatch({ victory: 'hill' });
    const hill = hillOf(m);
    expect(Object.keys(hill).sort()).toEqual(['hill', 'id', 'position']);
    const { tx, ty } = hill.position!;
    expect(m.map.isBlocked(tx, ty)).toBe(false);

    const picked = new SelectionSystem({} as Phaser.Scene, m.world).selectAtTile(tx, ty);
    expect(picked).not.toBe(hill);
    expect(restoredBuildingArt([hill], () => 1, () => 'hungarian')).toEqual([]);

    const fog = new FogOfWarData(m.map.width, m.map.height);
    for (const t of hillTiles(hill.position!)) fog.markVisible(t.tx, t.ty);
    const view = new Perception().update({ world: m.world, mapData: m.map, player: m.players.get(2)!, timeMs: 0, fog });
    expect(view.visibleEnemyUnits).not.toContain(hill);
    expect(view.visibleEnemyBuildings).not.toContain(hill);
    for (const list of Object.values(view.resources)) expect(list).not.toContain(hill);

    const knight = garrison(m, 1);
    m.world.addComponent(knight, 'attackIntent', { targetId: hill.id! });
    m.run(STEP_MS, STEP_MS);
    expect(knight.attackIntent).toBeUndefined();
    expect(m.world.entities).toContain(hill);
  });
});

function loadedMap(save: SaveData) {
  const prepared = prepareMatch({ load: save });
  if (!prepared.ok || prepared.match.start.kind !== 'load') throw new Error('the save did not restore');
  return prepared.match.start.restored.mapData;
}
