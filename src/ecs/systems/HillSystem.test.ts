import { describe, expect, it } from 'vitest';
import { HILL } from '../../config/balance';
import { killEntity } from '../../game/kill';
import { createPlayers } from '../../game/PlayerManager';
import type { TreatyGate } from '../../game/treaty';
import { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';
import type { UnitType } from '../../types';
import { createUnit } from '../archetypes/createUnit';
import { createHill } from '../archetypes/hill';
import type { Entity } from '../components';
import { createEcsWorld } from '../world';
import { DeathSystem } from './DeathSystem';
import { HillSystem } from './HillSystem';
import { TransportSystem } from './TransportSystem';

const CENTRE = { tx: 16, ty: 16 };

/** Four players on a hill map; `allies` as in the setup. */
function setup({ allies = 0, treaty }: { allies?: number; treaty?: TreatyGate } = {}) {
  const map = new MapData(32, 32);
  const world = createEcsWorld();
  const players = createPlayers('hungarian', ['english', 'german', 'french'], undefined, allies);
  const hill = createHill(world, map, CENTRE).hill!;
  const system = new HillSystem(world, players, treaty);
  const put = (playerId: number, type: UnitType = 'knight', dx = 0, dy = 0) =>
    createUnit(world, { type, tile: { tx: CENTRE.tx + dx, ty: CENTRE.ty + dy }, playerId });
  const kill = (e: Entity) => killEntity(world, e as Entity & { health: { current: number; max: number } });
  return { map, world, players, hill, system, put, kill };
}

describe('HillSystem (M19)', () => {
  it('an empty hill: no clock runs', () => {
    const { hill, system } = setup();
    system.update(1000);
    expect(hill).toEqual({ heldMs: {}, holderTeam: null, contested: false });
  });

  it('one team alone: its clock runs, once per step however many units', () => {
    const { hill, system, put } = setup();
    put(2);
    put(2, 'archer', 1);
    system.update(1000);
    expect(hill).toEqual({ heldMs: { 2: 1000 }, holderTeam: 2, contested: false });
  });

  it('several teams: contested, every clock stops', () => {
    const { hill, system, put, kill } = setup();
    const first = put(1);
    system.update(500);
    put(3, 'scout', 3, -3);
    system.update(1000);
    expect(hill).toEqual({ heldMs: { 1: 500 }, holderTeam: null, contested: true });
    kill(first);
    system.update(250);
    expect(hill).toEqual({ heldMs: { 1: 500, 3: 250 }, holderTeam: 3, contested: false });
  });

  it('allies share one clock and do not contest each other', () => {
    const { hill, system, put } = setup({ allies: 1 });
    put(1);
    put(2, 'archer', 1);
    system.update(800);
    expect(hill).toEqual({ heldMs: { 1: 800 }, holderTeam: 1, contested: false });
  });

  it('the enemy team shares team 2, whoever of it stands there', () => {
    const { hill, system, put } = setup({ allies: 1 });
    put(4);
    put(3, 'archer', 1);
    system.update(800);
    expect(hill).toEqual({ heldMs: { 2: 800 }, holderTeam: 2, contested: false });
  });

  it('without allies every player is a team of its own', () => {
    const { hill, system, put } = setup();
    put(3);
    put(4, 'archer', 1);
    system.update(800);
    expect(hill).toEqual({ heldMs: {}, holderTeam: null, contested: true });
  });

  it('the treaty stops every clock, and the holder still shows', () => {
    let truce = true;
    const { hill, system, put } = setup({ treaty: () => truce });
    put(2);
    system.update(1000);
    expect(hill).toEqual({ heldMs: {}, holderTeam: 2, contested: false });
    truce = false;
    system.update(1000);
    expect(hill.heldMs).toEqual({ 2: 1000 });
  });

  it('only the zone counts, to its edge', () => {
    const { hill, system, put } = setup();
    put(1, 'knight', -3, 3);
    put(2, 'knight', 4, 0);
    put(3, 'knight', 0, -4);
    system.update(1000);
    expect(hill.heldMs).toEqual({ 1: 1000 });
  });

  it('villagers, kings, monks, traders, ships and Gaia neither hold nor contest', () => {
    const { hill, system, put } = setup();
    put(1);
    for (const type of ['villager', 'king', 'monk', 'trade_cart', 'galley', 'transport'] as const) put(2, type);
    put(0);
    system.update(1000);
    expect(hill).toEqual({ heldMs: { 1: 1000 }, holderTeam: 1, contested: false });
  });

  it('a dying or removed unit neither holds nor contests', () => {
    const { map, world, hill, system, put, kill } = setup();
    const knight = put(2);
    kill(knight);
    system.update(1000);
    expect(hill.heldMs).toEqual({});
    new DeathSystem(world, map).update(60_000);
    system.update(1000);
    expect(hill).toEqual({ heldMs: {}, holderTeam: null, contested: false });
  });

  it("a defeated player's units neither hold nor contest", () => {
    const { players, hill, system, put } = setup();
    put(1);
    put(2);
    players.markDefeated(2);
    system.update(1000);
    expect(hill).toEqual({ heldMs: { 1: 1000 }, holderTeam: 1, contested: false });
  });

  it('cargo never occupies', () => {
    const { map, world, hill, system, put } = setup();
    const knight = put(2);
    map.setTile(CENTRE.tx + 1, CENTRE.ty, TERRAIN.water);
    const ship = put(2, 'transport', 1);
    world.addComponent(knight, 'boardIntent', { transportId: ship.id! });
    new TransportSystem(world, map).update(100);
    expect(ship.cargo?.units.map((u) => u.unit?.unitType)).toEqual(['knight']);
    system.update(1000);
    expect(hill).toEqual({ heldMs: {}, holderTeam: null, contested: false });
  });

  it('a clock never falls and never resets', () => {
    const { hill, system, put, kill } = setup();
    const seen: number[] = [];
    const step = () => {
      system.update(100);
      seen.push(hill.heldMs[1] ?? 0);
    };
    const first = put(1);
    step();
    kill(first); // empty
    step();
    const rival = put(2);
    step();
    const back = put(1); // contested
    step();
    kill(rival);
    step();
    kill(back);
    step();
    expect(seen).toEqual([100, 100, 100, 100, 200, 200]);
  });

  it('a clock stops at holdMs', () => {
    const { hill, system, put } = setup();
    put(2);
    hill.heldMs[2] = HILL.holdMs - 30;
    system.update(1000);
    expect(hill.heldMs[2]).toBe(HILL.holdMs);
    system.update(1000);
    expect(hill.heldMs[2]).toBe(HILL.holdMs);
  });

  it('the first full clock is the last to move', () => {
    const { hill, system, put } = setup();
    hill.heldMs[1] = HILL.holdMs;
    hill.heldMs[3] = HILL.holdMs - 10;
    put(3);
    system.update(1000);
    expect(hill.heldMs[3]).toBe(HILL.holdMs - 10);
  });

  it('a full clock of a team wholly out does not stop the others', () => {
    const { players, hill, system, put } = setup();
    hill.heldMs[2] = HILL.holdMs;
    players.markDefeated(2);
    put(3);
    system.update(1000);
    expect(hill.heldMs[3]).toBe(1000);
  });

  it.each([16, 1000, 60_000, 2 * HILL.holdMs])('a step of %i ms does not depend on entity order', (dt) => {
    const run = (order: readonly number[], rivals: boolean) => {
      const { hill, system, put } = setup();
      hill.heldMs[1] = HILL.holdMs - 20;
      hill.heldMs[2] = HILL.holdMs - 20;
      for (const id of order) if (rivals || id === 2) put(id, 'knight', id - 2);
      system.update(dt);
      return hill;
    };
    expect(run([1, 2, 3], true)).toEqual(run([3, 2, 1], true));
    expect(run([1, 2], true).heldMs).toEqual({ 1: HILL.holdMs - 20, 2: HILL.holdMs - 20 });
    expect(run([2], false).heldMs).toEqual({ 1: HILL.holdMs - 20, 2: Math.min(HILL.holdMs, HILL.holdMs - 20 + dt) });
  });

  it('without a hill there is nothing to do', () => {
    const world = createEcsWorld();
    const knight = createUnit(world, { type: 'knight', tile: CENTRE, playerId: 1 });
    const before = structuredClone(knight);
    new HillSystem(world, createPlayers('hungarian', ['english'])).update(1000);
    expect(world.entities).toEqual([before]);
  });
});
