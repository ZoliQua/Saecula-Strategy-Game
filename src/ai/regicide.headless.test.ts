import { describe, expect, it } from 'vitest';
import { createUnit } from '../ecs/archetypes/createUnit';
import type { Entity } from '../ecs/components';
import { killEntity } from '../game/kill';
import { hasLivingKing } from '../game/regicide';
import { NEIGHBOUR_STEPS } from '../map/gridSteps';
import { TERRAIN } from '../map/TerrainTypes';
import { parseSave } from '../save/parse';
import { FIXED_DATE, MIN, savableMatch, STEP_MS } from '../save/savedMatch.testkit';
import { prepareMatch } from '../scenes/game/MatchStart';
import { resumeHeadlessMatch, type HeadlessMatch } from './testing/headlessMatch';

type Mortal = Entity & { health: { current: number; max: number } };

const find = (m: HeadlessMatch, test: (e: Entity) => boolean) => m.world.entities.find(test) as Mortal;
const kingOf = (m: HeadlessMatch, id: number) => find(m, (e) => e.unit?.unitType === 'king' && e.owner?.playerId === id);
const tcOf = (m: HeadlessMatch, id: number) => find(m, (e) => e.building?.type === 'town_center' && e.owner?.playerId === id);

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

  it('save round trip: a kingless player with a town centre stays out, the rest plays on', () => {
    const m = savableMatch({ victory: 'regicide' });
    m.run(5_000, STEP_MS);
    killEntity(m.world, kingOf(m, 3));
    m.run(2_000, STEP_MS);
    const save = reload(m);
    expect(save.players.find((p) => p.id === 3)?.defeated).toBe(true);

    const prepared = prepareMatch({ load: save });
    if (!prepared.ok) throw new Error('the save did not restore');
    expect(prepared.match.players.get(3)?.defeated).toBe(true);

    const resumed = resumeHeadlessMatch(save);
    expect(tcOf(resumed, 3)).toBeDefined();
    expect(hasLivingKing(resumed.world, 1)).toBe(true);
    expect(hasLivingKing(resumed.world, 2)).toBe(true);
    resumed.run(10_000, STEP_MS);
    expect(resumed.players.all().filter((p) => p.defeated).map((p) => p.id)).toEqual([3]);
    expect(resumed.judge()).toEqual({ kind: 'playing' });
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

  it('a kingless AI town centre takes no new villager or age-up, and the match goes on', () => {
    const m = savableMatch({ victory: 'regicide' });
    m.run(MIN, STEP_MS);
    killEntity(m.world, kingOf(m, 3));
    m.run(STEP_MS, STEP_MS);
    const villagers = () => m.world.entities.filter((e) => e.unit?.unitType === 'villager' && e.owner?.playerId === 3).length;
    const queued = tcOf(m, 3).trainingQueue!.entries.length;
    const most = villagers() + queued;
    const others = () => m.world.entities.filter((e) => e.unit?.unitType === 'villager' && e.owner?.playerId === 2).length;
    const before = others();
    m.run(3 * MIN, STEP_MS);
    expect(villagers()).toBeLessThanOrEqual(most);
    expect(tcOf(m, 3).trainingQueue!.entries).toEqual([]);
    expect(m.players.get(3)?.age).toBe(1);
    expect(others()).toBeGreaterThan(before);
  }, 60_000);
});
