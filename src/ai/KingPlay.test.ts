import { describe, expect, it } from 'vitest';
import { AI_COMMON, AI_KING, AI_MASTER } from '../config/aiBalance';
import { createBuilding } from '../ecs/archetypes/building';
import { createResourceNode } from '../ecs/archetypes/resource';
import { MovementSystem } from '../ecs/systems/MovementSystem';
import { PathfindingSystem } from '../ecs/systems/PathfindingSystem';
import { chebyshev } from '../iso/coordinates';
import { createRng } from '../map/random';
import { ArmyControl } from './ArmyControl';
import type { AIContext } from './AIPlayer';
import { FlankControl } from './FlankControl';
import { Perception } from './perception';
import { EasyStrategy } from './strategies/EasyStrategy';
import { HardStrategy } from './strategies/HardStrategy';
import { MasterStrategy } from './strategies/MasterStrategy';
import { MediumStrategy } from './strategies/MediumStrategy';
import { ThoughtLog } from './thoughts';
import { headed, modeScene } from './testing/modeScene.testkit';

const LEVELS = {
  easy: () => new EasyStrategy(createRng(3)),
  medium: () => new MediumStrategy(createRng(3)),
  hard: () => new HardStrategy(createRng(3)),
  master: () => new MasterStrategy(createRng(3)),
};
const steer = (ctx: AIContext, control: ArmyControl) => control.update(ctx, new Perception().update(ctx));
const army = () => new ArmyControl(new ThoughtLog(), createRng(3));

describe.each(Object.entries(LEVELS))("%s: the AI's own king (M19)", (_, make) => {
  it('stays by its town centre while all is quiet', () => {
    const s = modeScene();
    const king = s.unit('king', 5, 8);
    const ai = make();
    for (let t = 0; t <= 30_000; t += 1000) ai.update(s.regicide(t), 1000);
    expect(headed(king)).toBeUndefined();
  });

  it('walks home when it is away', () => {
    const s = modeScene();
    const king = s.unit('king', 25, 25);
    make().update(s.regicide(), 100);
    expect(chebyshev(headed(king)!, { tx: 5, ty: 5 })).toBeLessThanOrEqual(AI_KING.homeRadius);
  });

  it('steps away from a seen threat, and settles', () => {
    const s = modeScene();
    const king = s.unit('king', 7, 7);
    const foe = s.unit('swordsman', 9, 7, 1);
    const ai = make();
    const paths = new PathfindingSystem(s.world, s.map);
    const move = new MovementSystem(s.world);
    const goals: string[] = [];
    for (let t = 0; t <= 60_000; t += 100) {
      ai.update(s.regicide(t), 100);
      if (king.moveIntent) goals.push(`${king.moveIntent.target.tx},${king.moveIntent.target.ty}`);
      paths.update();
      move.update(100);
    }
    expect(chebyshev(king.position!, foe.position!)).toBeGreaterThan(AI_KING.villagerRadius + 1);
    expect(chebyshev(king.position!, { tx: 5, ty: 5 })).toBeLessThanOrEqual(AI_KING.homeRadius + 1);
    expect(goals.length).toBeLessThanOrEqual(3);
    expect(new Set(goals).size).toBe(goals.length);
    expect(headed(king)).toBeUndefined();
  });

  it('does not react to what it cannot see', () => {
    const s = modeScene({ lit: false });
    const king = s.unit('king', 7, 7);
    s.unit('swordsman', 9, 7, 1);
    make().update(s.regicide(), 100);
    expect(headed(king)).toBeUndefined();
  });

  it('stands through the treaty', () => {
    const s = modeScene();
    const king = s.unit('king', 7, 7);
    s.unit('swordsman', 9, 7, 1);
    make().update({ ...s.regicide(), treatyActive: true }, 100);
    expect(headed(king)).toBeUndefined();
  });

  it('is never drafted', () => {
    const s = modeScene();
    const king = s.unit('king', 5, 8);
    for (let i = 0; i < 20; i++) s.unit('swordsman', 9 + (i % 5), 9 + Math.floor(i / 5));
    for (let i = 0; i < 6; i++) s.unit('scout', 12, 5 + i);
    const ai = make();
    for (let t = 20 * 60_000; t <= 21 * 60_000; t += 1000) ai.update(s.regicide(t), 1000);
    const state = ai.snapshot();
    expect(state.kind === 'null' ? [] : state.army.wave).not.toContain(king.id);
    expect(state.kind === 'null' ? [] : state.army.wave.length).not.toBe(0);
    expect(king.attackIntent).toBeUndefined();
    expect(headed(king)).toBeUndefined();
  });

  it('outside the mode nobody steers a king', () => {
    const s = modeScene();
    const king = s.unit('king', 7, 7);
    s.unit('swordsman', 9, 7, 1);
    make().update(s.base, 100);
    expect(headed(king)).toBeUndefined();
  });

  it('calls off an attack on a king it no longer sees', () => {
    const s = modeScene({ lit: false });
    const own = s.unit('swordsman', 12, 12);
    const king = s.unit('king', 30, 30, 1);
    s.world.addComponent(own, 'attackIntent', { targetId: king.id! });
    make().update(s.regicide(), 100);
    expect(own.attackIntent).toBeUndefined();
  });
});

describe.each(Object.entries(LEVELS))('%s: the king is defended (M19 Regicide)', (_, make) => {
  /** The AI's king by its town centre, `count` villagers working round it, and an enemy scout `tx` along. */
  function raid(count: number, scoutTx = 9) {
    const s = modeScene();
    const king = s.unit('king', 7, 7);
    for (let i = 0; i < 6; i++) createResourceNode(s.world, { tile: { tx: 14, ty: 2 + i }, type: 'wood' });
    const villagers = Array.from({ length: count }, (_, i) => s.unit('villager', 9 + (i % 4), 3 + Math.floor(i / 4)));
    const scout = s.unit('scout', scoutTx, 7, 1);
    return { s, king, villagers, scout };
  }
  const guarding = (vs: readonly { attackIntent?: { targetId: number } }[], id: number) => vs.filter((v) => v.attackIntent?.targetId === id).length;

  it('villagers turn on a scout by the king, two for it, the nearest first', () => {
    const { s, villagers, scout } = raid(8);
    make().update(s.regicide(), 100);
    expect(guarding(villagers, scout.id!)).toBe(AI_KING.guardsPerFoe);
    const nearest = [...villagers].sort((a, b) => chebyshev(a.position!, { tx: 7, ty: 7 }) - chebyshev(b.position!, { tx: 7, ty: 7 }));
    expect(nearest.slice(0, AI_KING.guardsPerFoe).every((v) => v.attackIntent?.targetId === scout.id)).toBe(true);
  });

  it('at most maxGuards of them, however many come', () => {
    const { s, villagers } = raid(12);
    for (let i = 0; i < 5; i++) s.unit('scout', 9, 8 + i, 1);
    make().update(s.regicide(), 100);
    expect(villagers.filter((v) => v.attackIntent).length).toBe(AI_KING.maxGuards);
  });

  it('a home soldier answers the scout instead, and no villager goes', () => {
    const { s, villagers, scout } = raid(4);
    const guard = s.unit('swordsman', 6, 9);
    make().update(s.regicide(), 100);
    expect(guard.attackIntent?.targetId).toBe(scout.id);
    expect(villagers.filter((v) => v.attackIntent)).toHaveLength(0);
  });

  it('the villagers go back to work once it is gone', () => {
    const { s, villagers, scout } = raid(4);
    const ai = make();
    ai.update(s.regicide(), 100);
    expect(villagers.some((v) => v.attackIntent)).toBe(true);
    s.world.remove(scout);
    ai.update(s.regicide(1000), 100);
    expect(villagers.filter((v) => v.attackIntent)).toHaveLength(0);
    expect(villagers.every((v) => v.gatherIntent)).toBe(true);
  });

  it('and once it runs beyond the guard radius', () => {
    const { s, villagers, scout } = raid(4);
    const ai = make();
    ai.update(s.regicide(), 100);
    scout.position = { tx: 7 + AI_KING.guardRadius + 1, ty: 20 };
    ai.update(s.regicide(1000), 100);
    expect(villagers.filter((v) => v.attackIntent)).toHaveLength(0);
  });

  it('a scout far from the king is left alone', () => {
    const { s, villagers } = raid(4, 7 + AI_KING.guardRadius + 1);
    make().update(s.regicide(), 100);
    expect(villagers.filter((v) => v.attackIntent)).toHaveLength(0);
  });

  it('nobody is sent under the treaty, nor outside the mode', () => {
    const one = raid(4);
    make().update({ ...one.s.regicide(), treatyActive: true }, 100);
    expect(one.villagers.filter((v) => v.attackIntent)).toHaveLength(0);
    const two = raid(4);
    make().update(two.s.base, 100);
    expect(two.villagers.filter((v) => v.attackIntent)).toHaveLength(0);
  });

  it('the threatened king keeps by its town centre, not off into the open', () => {
    const { s, king } = raid(0, 8);
    // Between the king and its town centre: the clearest tile at home lies away from both.
    king.position = { tx: 9, ty: 9 };
    s.world.remove(s.world.entities.find((e) => e.unit?.unitType === 'scout')!);
    s.unit('scout', 8, 8, 1);
    expect(AI_KING.rallyRadius).toBeLessThan(AI_KING.homeRadius);
    make().update(s.regicide(), 100);
    const to = headed(king);
    expect(to).toBeDefined();
    expect(Math.max(4 - to!.tx, 0, to!.tx - 6, 4 - to!.ty, to!.ty - 6)).toBeLessThanOrEqual(AI_KING.rallyRadius);
  });
});

describe('a villager is a threat only at arm\'s length (M19)', () => {
  it('far: the king stands; next to it: it steps away', () => {
    const run = (tx: number) => {
      const s = modeScene();
      const king = s.unit('king', 7, 7);
      s.unit('villager', tx, 7, 1);
      new MediumStrategy(createRng(3)).update(s.regicide(), 100);
      return headed(king);
    };
    expect(run(7 + AI_KING.villagerRadius + 1)).toBeUndefined();
    expect(run(8)).toBeDefined();
  });
});

describe('a wave and the enemy king (M19)', () => {
  function met() {
    const s = modeScene();
    const own = [0, 1, 2].map((i) => s.unit('swordsman', 20, 20 + i));
    const guard = s.unit('swordsman', 22, 21, 1);
    const king = s.unit('king', 27, 21, 1);
    return { s, own, guard, king, control: army() };
  }

  it('engages a visible king before the nearer armed unit', () => {
    const { s, own, king, control } = met();
    control.launchWave(s.regicide(), new Perception().update(s.regicide()), own);
    expect(own.map((u) => u.attackIntent?.targetId)).toEqual([king.id, king.id, king.id]);
  });

  it('only in Regicide', () => {
    const { s, own, guard, control } = met();
    control.launchWave(s.base, new Perception().update(s.base), own);
    expect(own.map((u) => u.attackIntent?.targetId)).toEqual([guard.id, guard.id, guard.id]);
  });

  it('a unit already fighting switches to it', () => {
    const { s, own, guard, king, control } = met();
    control.launchWave(s.regicide(), new Perception().update(s.regicide()), own);
    for (const u of own) u.attackIntent!.targetId = guard.id!;
    steer(s.regicide(), control);
    expect(own.map((u) => u.attackIntent?.targetId)).toEqual([king.id, king.id, king.id]);
  });

  it('keeps the breach toward it', () => {
    const { s, own, king, control } = met();
    control.launchWave(s.regicide(), new Perception().update(s.regicide()), own);
    const house = createBuilding(s.world, { type: 'house', origin: { tx: 23, ty: 24 }, playerId: 1, mapData: s.map });
    const order = own[0]!.attackIntent!;
    order.resumeTargetId = king.id!;
    order.targetId = house.id!;
    steer(s.regicide(), control);
    expect(own[0]!.attackIntent).toBe(order);
    expect(order.targetId).toBe(house.id);
  });

  it('not one out of reach', () => {
    const { s, own, guard, king, control } = met();
    king.position = { tx: 20 + AI_COMMON.engageRadius + 1, ty: 21 };
    control.launchWave(s.regicide(), new Perception().update(s.regicide()), own);
    expect(own[1]!.attackIntent?.targetId).toBe(guard.id);
  });

  it('never one it does not see: the march is still on the remembered town centre', () => {
    const s = modeScene({ lit: false });
    s.fog.markVisible(41, 41);
    const perception = new Perception();
    perception.update(s.regicide());
    s.fog.dimVisibleToExplored();
    const own = [0, 1, 2].map((i) => s.unit('swordsman', 20, 20 + i));
    s.unit('king', 22, 21, 1);
    army().launchWave(s.regicide(), perception.update(s.regicide()), own);
    for (const u of own) {
      expect(u.attackIntent).toBeUndefined();
      expect(u.moveIntent?.target).toEqual(s.enemyTc.position);
    }
  });

  it('a defeated AI fights on as in Conquest', () => {
    const { s, own, guard, control } = met();
    s.me.defeated = true;
    control.launchWave(s.regicide(), new Perception().update(s.regicide()), own);
    expect(own[0]!.attackIntent?.targetId).toBe(guard.id);
  });

  it('a flank does the same, fighting or not', () => {
    const { s, own, guard, king } = met();
    const farm = createBuilding(s.world, { type: 'farm', origin: { tx: 35, ty: 30 }, playerId: 1, mapData: s.map });
    const view = new Perception().update(s.regicide());
    const goal = view.knownEnemyBuildings.find((b) => b.id === farm.id)!;
    const flank = new FlankControl(new ThoughtLog(), AI_MASTER.flank);
    flank.launch(s.regicide(), view, own, goal);
    s.world.addComponent(own[0]!, 'attackIntent', { targetId: guard.id! });
    flank.update(s.regicide(), view);
    expect(own.map((u) => u.attackIntent?.targetId)).toEqual([king.id, king.id, king.id]);
  });
});
