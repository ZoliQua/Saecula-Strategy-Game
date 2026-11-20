import { describe, expect, it } from 'vitest';
import { createUnit } from '../../ecs/archetypes/createUnit';
import type { Entity } from '../../ecs/components';
import type { SelectionSystem } from '../../ecs/systems/SelectionSystem';
import { createMiniSim } from '../../ecs/testing/miniSim';
import { createPlayers } from '../../game/PlayerManager';
import type { TreatyGate } from '../../game/treaty';
import { hu } from '../../i18n/hu';
import { cursorFor } from '../../ui/cursor';
import { cursorContext } from './CursorWiring';
import { OrderIssuer, resolveOrderTarget } from './OrderIssuer';

const selectionOf = (selected: Entity[]) => ({ getAllSelected: () => selected }) as unknown as SelectionSystem;

function setup() {
  const sim = createMiniSim(32);
  const players = createPlayers('hungarian', ['english']);
  const state = { on: true };
  const treaty: TreatyGate = () => state.on;
  const notices: string[] = [];
  const sword = createUnit(sim.world, { type: 'swordsman', tile: { tx: 6, ty: 6 }, playerId: 1 });
  const monk = createUnit(sim.world, { type: 'monk', tile: { tx: 6, ty: 7 }, playerId: 1 });
  const foe = createUnit(sim.world, { type: 'swordsman', tile: { tx: 12, ty: 10 }, playerId: 2 });
  const orders = new OrderIssuer(sim.world, selectionOf([sword, monk]), { playSFX: () => {} }, {
    map: sim.map,
    teams: players,
    treaty,
    notice: (m) => void notices.push(m),
  });
  return { sim, players, state, treaty, notices, sword, monk, foe, orders };
}

describe('player orders under the treaty (M16)', () => {
  it('an attack order on an enemy becomes a move with a notice; no conversion', () => {
    const { sword, monk, foe, orders, notices } = setup();
    orders.issueOrders({ tx: 12, ty: 10 });
    expect(sword.attackIntent).toBeUndefined();
    expect(sword.moveIntent?.target).toEqual({ tx: 12, ty: 10 });
    expect(monk.convertIntent).toBeUndefined();
    expect(monk.moveIntent).toBeDefined();
    expect(notices).toEqual([hu.treaty.blocked]);
    expect(foe.owner!.playerId).toBe(2);
  });

  it('the cursor shows no attack sword over an enemy while it holds, and does after', () => {
    const { sim, players, state, treaty, sword } = setup();
    const ctx = () => cursorContext(sim.world, sim.map, selectionOf([sword]), { tx: 12, ty: 10 }, 1, undefined, players, treaty);
    expect(ctx().target.kind).toBe('none');
    expect(cursorFor(ctx())).toBe('move');
    state.on = false;
    expect(ctx().target.kind).toBe('enemy');
    expect(cursorFor(ctx())).toBe('attack');
  });

  it('after the treaty the same order attacks, with no notice', () => {
    const { sword, orders, notices, state, foe } = setup();
    orders.issueOrders({ tx: 12, ty: 10 });
    state.on = false;
    orders.issueOrders({ tx: 12, ty: 10 });
    expect(sword.attackIntent?.targetId).toBe(foe.id);
    expect(notices).toHaveLength(1);
  });

  it('Gaia stays an order target during the treaty', () => {
    const { sim, players, treaty, sword } = setup();
    const deer = createUnit(sim.world, { type: 'scout', tile: { tx: 3, ty: 3 }, playerId: 0 });
    expect(resolveOrderTarget(sim.world, { tx: 3, ty: 3 }, sword, undefined, players, treaty)).toEqual({ kind: 'enemy', entity: deer });
  });
});
