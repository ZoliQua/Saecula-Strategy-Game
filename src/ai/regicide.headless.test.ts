import { describe, expect, it } from 'vitest';
import { createUnit } from '../ecs/archetypes/createUnit';
import type { Entity } from '../ecs/components';
import { BUILDING_DEATH_TTL_MS } from '../config/balance';
import { applyDamage, killEntity } from '../game/kill';
import { hasLivingKing } from '../game/regicide';
import { NEIGHBOUR_STEPS } from '../map/gridSteps';
import { TERRAIN } from '../map/TerrainTypes';
import { parseSave } from '../save/parse';
import type { SaveData } from '../save/schema';
import { FIXED_DATE, MIN, savableMatch, STEP_MS } from '../save/savedMatch.testkit';
import { prepareMatch } from '../scenes/game/MatchStart';
import { classicCivs, resumeHeadlessMatch, type HeadlessMatch } from './testing/headlessMatch';

type Mortal = Entity & { health: { current: number; max: number } };

const find = (m: HeadlessMatch, test: (e: Entity) => boolean) => m.world.entities.find(test) as Mortal;
const kingOf = (m: HeadlessMatch, id: number) => find(m, (e) => e.unit?.unitType === 'king' && e.owner?.playerId === id);
const tcOf = (m: HeadlessMatch, id: number) => find(m, (e) => e.building?.type === 'town_center' && e.owner?.playerId === id);

const outOf = (m: HeadlessMatch) => m.players.all().filter((p) => p.defeated).map((p) => p.id);

function reload(m: HeadlessMatch) {
  const parsed = parseSave(JSON.stringify(m.snapshot(FIXED_DATE)));
  if (!parsed.ok) throw new Error(parsed.reason);
  return parsed.save;
}

describe('a headless Regicide match (M19)', () => {
  it('spawns and judges like the game', () => {
    const m = savableMatch({ victory: 'regicide' });
    expect(m.setup.victory).toBe('regicide');
    for (const id of [1, 2, 3]) expect(hasLivingKing(m.world, id)).toBe(true);
    expect(m.judge()).toEqual({ kind: 'playing' });
    killEntity(m.world, kingOf(m, 2));
    m.run(STEP_MS, STEP_MS);
    expect(m.players.get(2)?.defeated).toBe(true);
    expect(m.judge()).toEqual({ kind: 'playing' });
    killEntity(m.world, kingOf(m, 3));
    m.run(STEP_MS, STEP_MS);
    expect(m.judge()).toEqual({ kind: 'victory', winnerId: 1, cause: 'regicide' });
  });

  it('the first decided result stands, as at the game-over screen', () => {
    const m = savableMatch({ victory: 'regicide', aiCount: 1 });
    killEntity(m.world, kingOf(m, 2));
    m.run(STEP_MS, STEP_MS);
    killEntity(m.world, kingOf(m, 1));
    m.run(STEP_MS, STEP_MS);
    expect(m.judge()).toEqual({ kind: 'victory', winnerId: 1, cause: 'regicide' });
  });

  it('the other modes get no king, and stepping judges nobody', () => {
    const m = savableMatch();
    expect(m.world.entities.some((e) => e.unit?.unitType === 'king')).toBe(false);
    killEntity(m.world, tcOf(m, 2));
    m.run(STEP_MS, STEP_MS);
    expect(m.players.get(2)?.defeated).toBe(false);
  });

  it('a king killed in combat takes the town centre along in that step', () => {
    const m = savableMatch({ victory: 'regicide' });
    const king = kingOf(m, 3);
    const tc = tcOf(m, 3);
    king.health.current = 1;
    const { tx, ty } = king.position!;
    const tile = NEIGHBOUR_STEPS.map(([dx, dy]) => ({ tx: tx + dx, ty: ty + dy })).find((t) => m.map.isPassable(t.tx, t.ty))!;
    const knight = createUnit(m.world, { type: 'knight', tile, playerId: 1 });
    m.world.addComponent(knight, 'attackIntent', { targetId: king.id! });
    let fell = false;
    m.run(5_000, STEP_MS, () => {
      if (!king.dying) expect(tc.dying).toBeUndefined();
      else {
        fell = true;
        expect(tc.dying).toEqual({ ttlMs: BUILDING_DEATH_TTL_MS });
        expect(m.players.get(3)?.defeated).toBe(true);
      }
      return fell;
    });
    expect(fell).toBe(true);
  });

  it('save round trip during the collapse: it ends, nobody else is out, nobody is revived', () => {
    const m = savableMatch({ victory: 'regicide' });
    m.run(5_000, STEP_MS);
    const origin = { ...tcOf(m, 3).position! };
    killEntity(m.world, kingOf(m, 3));
    m.run(1_000, STEP_MS);
    const save = reload(m);
    expect(save.players.find((p) => p.id === 3)?.defeated).toBe(true);
    const left = save.entities.find((e) => e.components.building?.type === 'town_center' && e.components.owner?.playerId === 3)?.components.dying?.ttlMs;
    expect(left).toBe(BUILDING_DEATH_TTL_MS - 1_000 + STEP_MS);

    const prepared = prepareMatch({ load: save });
    if (!prepared.ok) throw new Error('the save did not restore');
    expect(prepared.match.players.get(3)?.defeated).toBe(true);

    const resumed = resumeHeadlessMatch(save);
    expect(resumed.map.isBlocked(origin.tx + 1, origin.ty + 1)).toBe(true);
    resumed.run(left!, STEP_MS);
    expect(tcOf(resumed, 3)).toBeUndefined();
    expect(resumed.map.isBlocked(origin.tx + 1, origin.ty + 1)).toBe(false);
    for (const id of [1, 2]) {
      expect(hasLivingKing(resumed.world, id)).toBe(true);
      expect(tcOf(resumed, id).dying).toBeUndefined();
    }
    resumed.run(10_000, STEP_MS);
    expect(outOf(resumed)).toEqual([3]);
    expect(resumed.judge()).toEqual({ kind: 'playing' });
  });

  it('save round trip after the collapse: still out', () => {
    const m = savableMatch({ victory: 'regicide' });
    m.run(1_000, STEP_MS);
    killEntity(m.world, kingOf(m, 3));
    m.run(BUILDING_DEATH_TTL_MS + 2 * STEP_MS, STEP_MS);
    expect(tcOf(m, 3)).toBeUndefined();
    const resumed = resumeHeadlessMatch(reload(m));
    resumed.run(10_000, STEP_MS);
    expect(outOf(resumed)).toEqual([3]);
    expect(resumed.judge()).toEqual({ kind: 'playing' });
  });

  it('save round trip between the death and the check: the first step brings it down', () => {
    const m = savableMatch({ victory: 'regicide' });
    m.run(1_000, STEP_MS);
    killEntity(m.world, kingOf(m, 3));
    const resumed = resumeHeadlessMatch(reload(m));
    expect(outOf(resumed)).toEqual([]);
    resumed.run(STEP_MS, STEP_MS);
    expect(outOf(resumed)).toEqual([3]);
    expect(tcOf(resumed, 3).dying).toEqual({ ttlMs: BUILDING_DEATH_TTL_MS });
  });

  it('save round trip: out by a razed town centre, the living king revives nobody', () => {
    const m = savableMatch({ victory: 'regicide' });
    m.run(1_000, STEP_MS);
    killEntity(m.world, tcOf(m, 3));
    m.run(3_000, STEP_MS);
    const resumed = resumeHeadlessMatch(reload(m));
    resumed.run(2_000, STEP_MS);
    expect(hasLivingKing(resumed.world, 3)).toBe(true);
    expect(resumed.players.get(3)?.defeated).toBe(true);
  });

  it('save round trip: a king under way in a transport', () => {
    const m = savableMatch({ victory: 'regicide' });
    m.run(1_000, STEP_MS);
    const king = kingOf(m, 2);
    const shore = king.position!;
    // The meadow has no sea: one tile of water beside the king floats the transport.
    const berth = NEIGHBOUR_STEPS.map(([dx, dy]) => ({ tx: shore.tx + dx, ty: shore.ty + dy })).find((t) => m.map.isPassable(t.tx, t.ty))!;
    m.map.setTile(berth.tx, berth.ty, TERRAIN.water);
    const ship = createUnit(m.world, { type: 'transport', tile: berth, playerId: 2 });
    m.world.addComponent(king, 'boardIntent', { transportId: ship.id! });
    m.run(STEP_MS, STEP_MS);
    expect(m.world.has(king)).toBe(false);
    expect(ship.cargo?.units.map((u) => u.unit?.unitType)).toEqual(['king']);
    const resumed = resumeHeadlessMatch(reload(m));
    expect(resumed.world.entities.find((e) => e.id === ship.id)?.cargo?.units.map((u) => u.unit?.unitType)).toEqual(['king']);
    expect(hasLivingKing(resumed.world, 2)).toBe(true);
    resumed.run(1_000, STEP_MS);
    expect(resumed.players.get(2)?.defeated).toBe(false);
  });

});

type Exit = 'king' | 'razed' | 'both' | 'none';

/**
 * One setup up to the moment player 3's age-up is under way at its town
 * centre, then its exit, then five more minutes. The treaty keeps the
 * passive human in the match throughout. Deaths have no attacker, so
 * nobody's score differs by a kill.
 * M21 Task 3: Polish joined the mixed pool, which reshuffles this draw
 * (no Polish is drawn); the test keeps its pre-M21 civs (classicCivs):
 * with the nine-civ pool (player 3 French, not Spanish) player 3's
 * economy differed between the king and the razed run.
 */
function playOn(exit: Exit) {
  const m = savableMatch({ victory: 'regicide', treatyMin: 20, civs: classicCivs(3, 2) });
  let exitMs = 0;
  m.run(15 * MIN, STEP_MS, (now) => {
    const tc = tcOf(m, 3);
    if (tc.research?.techId !== 'feudalism' || tc.research.elapsed <= 5) return false;
    exitMs = now;
    if (exit === 'king' || exit === 'both') applyDamage(m.world, kingOf(m, 3), 10_000, null);
    if (exit === 'razed') applyDamage(m.world, tc, 10_000, null);
    // With no event of its own, as the collapse has none.
    if (exit === 'both') killEntity(m.world, tc);
    m.judge();
    return true;
  });
  expect(exitMs).toBeGreaterThan(0);
  m.run(5 * MIN, STEP_MS);
  expect(m.judge()).toEqual({ kind: 'playing' });
  const { unitsTrained, gathered, gatheredBy, buildingsBuilt, builtBy } = m.stats.of(3);
  const player = m.players.get(3)!;
  const finished = m.world.entities
    .filter((e) => e.building && e.owner?.playerId === 3 && !e.underConstruction && !e.dying)
    .map((e) => `${e.building!.type}@${e.position!.tx},${e.position!.ty}`)
    .sort();
  const economy = { unitsTrained, gathered, gatheredBy, buildingsBuilt, builtBy, finished, age: player.age, resources: { ...player.resources }, researched: [...player.researched] };
  return { exitMs, economy, defeated: player.defeated, save: m.snapshot(FIXED_DATE) };
}

/**
 * A save with the king taken out of the comparison: player 3's king and its
 * death (one lost unit, against one lost building), the list order (removing
 * an entity moves the last one into its place) and the AIs' decaying memory
 * of having seen a king. Everything else is compared.
 */
function apartFromTheKing(save: SaveData): unknown {
  const s = JSON.parse(JSON.stringify(save, (key, value: unknown) => (key === 'sightings' ? { ...(value as object), king: undefined } : value))) as SaveData;
  s.entities = s.entities.filter((e) => e.components.unit?.unitType !== 'king' || e.components.owner?.playerId !== 3).sort((a, b) => a.id - b.id);
  const { unitsLost: _unit, buildingsLost: _building, ...stats } = s.stats.players['3']!;
  return { ...s, stats: { ...s.stats, players: { ...s.stats.players, '3': stats } } };
}

describe('out by the king is out as in Conquest (M19)', () => {
  it('the same match with the king killed or the town centre razed at the same step', () => {
    const king = playOn('king');
    const razed = playOn('razed');
    const both = playOn('both');
    const control = playOn('none');

    for (const run of [razed, both, control]) expect(run.exitMs).toBe(king.exitMs);
    expect([king.defeated, razed.defeated, control.defeated]).toEqual([true, true, false]);
    // Left alone, this player ages up, trains and earns more in those minutes.
    expect(control.economy.age).toBe(2);
    expect(control.economy.unitsTrained).toBeGreaterThan(king.economy.unitsTrained);
    expect(control.economy.gathered).toBeGreaterThan(king.economy.gathered);

    expect(king.economy).toEqual(razed.economy);
    expect(king.economy.age).toBe(1);
    expect(apartFromTheKing(king.save)).toEqual(apartFromTheKing(razed.save));
    expect(king.save.stats.players['3']).toMatchObject({ unitsLost: 1, buildingsLost: 0 });
    expect(razed.save.stats.players['3']).toMatchObject({ unitsLost: 0, buildingsLost: 1 });
    // With the king dead in both, nothing at all differs: the collapse is that death.
    expect(king.save).toEqual(both.save);
  }, 120_000);
});
