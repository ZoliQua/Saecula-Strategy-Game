import { describe, expect, it, vi } from 'vitest';
import { KING } from '../config/balance';
import { createUnit } from '../ecs/archetypes/createUnit';
import type { CargoUnit, Entity } from '../ecs/components';
import { createEcsWorld, type EcsWorld } from '../ecs/world';
import { hu } from '../i18n/hu';
import { applyDamage } from './kill';
import { KingWatch } from './kingWatch';
import { createPlayer } from './Player';
import { PlayerManager } from './PlayerManager';

type Mortal = Entity & { health: { current: number; max: number } };
const king = (world: EcsWorld, playerId: number) => createUnit(world, { type: 'king', tile: { tx: playerId, ty: 2 }, playerId }) as Mortal;

function setup(allies = 0, startMs = 0) {
  const world = createEcsWorld();
  const players = new PlayerManager([1, 2, 3].map((id) => createPlayer({ id, isHuman: id === 1 })));
  players.assignTeams(allies);
  const kings = [king(world, 1), king(world, 2), king(world, 3)] as const;
  const notify = vi.fn();
  const watch = new KingWatch(world, players, 1, notify);
  watch.update(startMs);
  return { world, kings, notify, watch };
}

describe('"king attacked" (M19)', () => {
  it("tells of damage to the human's king", () => {
    const { world, kings, notify, watch } = setup();
    applyDamage(world, kings[0], 5, 2);
    watch.update(100);
    expect(notify.mock.calls).toEqual([[hu.kings.attacked, 'alert']]);
    watch.destroy();
  });

  it('is throttled by KING.alertEveryMs of game time', () => {
    const { world, kings, notify, watch } = setup();
    const hit = (atMs: number) => {
      applyDamage(world, kings[0], 1, 2);
      watch.update(atMs);
    };
    hit(1000);
    hit(1000 + KING.alertEveryMs - 1);
    expect(notify).toHaveBeenCalledTimes(1);
    hit(1000 + KING.alertEveryMs);
    expect(notify).toHaveBeenCalledTimes(2);
    watch.destroy();
  });

  it("says nothing for other players' kings or other units", () => {
    const { world, kings, notify, watch } = setup(1);
    const knight = createUnit(world, { type: 'knight', tile: { tx: 6, ty: 6 }, playerId: 1 }) as Mortal;
    watch.update(50);
    applyDamage(world, kings[1], 5, 3);
    applyDamage(world, kings[2], 5, 1);
    applyDamage(world, knight, 5, 3);
    watch.update(100);
    expect(notify).not.toHaveBeenCalled();
    watch.destroy();
  });

  it('says nothing for healing', () => {
    const { kings, notify, watch } = setup();
    kings[0].health.current += 20;
    watch.update(100);
    expect(notify).not.toHaveBeenCalled();
    watch.destroy();
  });

  it('a wounded king in a loaded match is no new attack', () => {
    const world = createEcsWorld();
    king(world, 1).health.current = 20;
    const notify = vi.fn();
    const watch = new KingWatch(world, new PlayerManager([createPlayer({ id: 1, isHuman: true })]), 1, notify);
    watch.update(90_000);
    expect(notify).not.toHaveBeenCalled();
    watch.destroy();
  });
});

describe('"king fell" (M19)', () => {
  it("names the human's, an ally's and an enemy's", () => {
    const { world, kings, notify, watch } = setup(1);
    for (const k of kings) applyDamage(world, k, 10_000, 3);
    watch.update(100);
    expect(notify.mock.calls).toEqual([
      [hu.kings.fellOwn, 'alert'],
      [hu.kings.fellAlly(2), 'alert'],
      [hu.kings.fellEnemy(3), 'ok'],
    ]);
    expect(hu.kings.fellEnemy(3)).toContain('3. játékos');
    expect(hu.kings.fellAlly(2)).toContain('2. játékos');
    watch.destroy();
  });

  it('tells of a king sunk with its transport', () => {
    const { world, kings, notify, watch } = setup();
    const ship = createUnit(world, { type: 'transport', tile: { tx: 9, ty: 9 }, playerId: 2 }) as Mortal;
    world.remove(kings[1]);
    world.addComponent(ship, 'cargo', { units: [kings[1] as CargoUnit] });
    applyDamage(world, ship, 10_000, 1);
    expect(notify.mock.calls).toEqual([[hu.kings.fellEnemy(2), 'ok']]);
    watch.destroy();
  });

  it('hears only its own match, and nothing once destroyed', () => {
    const { world, kings, notify, watch } = setup();
    const other = createEcsWorld();
    applyDamage(other, king(other, 2), 10_000, 1);
    watch.destroy();
    applyDamage(world, kings[1], 10_000, 1);
    expect(notify).not.toHaveBeenCalled();
  });
});
