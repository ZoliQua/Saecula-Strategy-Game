import { describe, expect, it } from 'vitest';
import { AI_COMMON, AI_EASY, AI_HILL, AI_MEDIUM } from '../config/aiBalance';
import { createBuilding } from '../ecs/archetypes/building';
import { createWall } from '../ecs/archetypes/wall';
import type { Entity } from '../ecs/components';
import { inHillZone } from '../game/hill';
import { createRng } from '../map/random';
import { ArmyControl } from './ArmyControl';
import type { AIContext } from './AIPlayer';
import { Perception } from './perception';
import { EasyStrategy } from './strategies/EasyStrategy';
import { HardStrategy } from './strategies/HardStrategy';
import { MasterStrategy } from './strategies/MasterStrategy';
import { MediumStrategy } from './strategies/MediumStrategy';
import { ThoughtLog } from './thoughts';
import { arrive, CENTRE, headed, modeScene, PAST_HALF } from './testing/modeScene.testkit';

const MIN = 60_000;
const LATE = 20 * MIN;
type Scene = ReturnType<typeof modeScene>;

const army = () => new ArmyControl(new ThoughtLog(), createRng(3));
const launch = (ctx: AIContext, control: ArmyControl, units: readonly Entity[]) => control.launchWave(ctx, new Perception().update(ctx), units);
const tick = (ctx: AIContext, control: ArmyControl) => control.update(ctx, new Perception().update(ctx));
const swords = (s: Scene, n: number, tx = 9, ty = 9) => Array.from({ length: n }, (_, i) => s.unit('swordsman', tx + (i % 4), ty + Math.floor(i / 4)));

/** A wave standing on the hill. */
function holders(n = 4) {
  const s = modeScene();
  const own = swords(s, n, 22, 23);
  const control = army();
  launch(s.hill(), control, own);
  for (const u of own) arrive(s.world, u);
  return { s, own, control };
}

describe('a wave in King of the Hill (M19)', () => {
  it('goes to several passable tiles of the zone, though the centre is blocked', () => {
    const s = modeScene();
    s.map.setBlocked(CENTRE.tx, CENTRE.ty, true);
    const own = swords(s, 8);
    const control = army();
    launch(s.hill(), control, own);
    for (let t = 0; t <= AI_HILL.retryMs; t += AI_COMMON.upkeepMs) tick(s.hill({}, t), control);
    const goals = own.map((u) => headed(u)!);
    for (const g of goals) {
      expect(inHillZone(CENTRE, g)).toBe(true);
      expect(s.map.isPassable(g.tx, g.ty)).toBe(true);
    }
    expect(new Set(goals.map((g) => `${g.tx},${g.ty}`)).size).toBeGreaterThan(2);
  });

  it('takes a marching unit off a path that leads away', () => {
    const s = modeScene();
    const own = swords(s, 3);
    for (const u of own) u.movable!.path = [{ tx: 8, ty: 8 }, { tx: 2, ty: 12 }];
    const control = army();
    launch(s.hill(), control, own);
    tick(s.hill({}, AI_HILL.retryMs), control);
    for (const u of own) expect(inHillZone(CENTRE, u.moveIntent!.target)).toBe(true);
  });

  it('stays after clearing it, whatever enemy town it knows', () => {
    const { s, own, control } = holders();
    for (let t = 1000; t <= 120_000; t += 1000) tick(s.hill({ holderTeam: 2 }, t), control);
    for (const u of own) {
      expect(u.attackIntent).toBeUndefined();
      expect(headed(u)).toBeUndefined();
    }
    expect(control.waveSize).toBe(own.length);
  });

  it('engages what it sees on the zone, any enemy team and not only the chosen enemy', () => {
    const { s, own, control } = holders();
    const foe = s.unit('swordsman', 26, 26, 3);
    tick(s.hill({ contested: true }, 1000), control);
    for (const u of own) expect(u.attackIntent?.targetId).toBe(foe.id);
  });

  it('never what it cannot see', () => {
    const s = modeScene({ lit: false });
    const own = swords(s, 4, 22, 23);
    s.unit('swordsman', 26, 26, 1);
    const control = army();
    launch(s.hill(), control, own);
    tick(s.hill({}, 1000), control);
    for (const u of own) expect(u.attackIntent).toBeUndefined();
  });

  it("an ally's hold is its hold", () => {
    const s = modeScene({ allies: 1 });
    const own = swords(s, 4, 22, 23);
    s.unit('swordsman', 26, 26, 1);
    const control = army();
    launch(s.hill({ holderTeam: 1 }), control, own);
    tick(s.hill({ holderTeam: 1 }, 1000), control);
    for (const u of own) expect(u.attackIntent).toBeUndefined();
    expect(control.waveSize).toBe(4);
  });

  it('armed units come before villagers', () => {
    const { s, own, control } = holders();
    const villager = s.unit('villager', 24, 25, 1);
    tick(s.hill({}, 1000), control);
    expect(own[0]!.attackIntent?.targetId).toBe(villager.id);
    const foe = s.unit('swordsman', 27, 24, 1);
    tick(s.hill({}, 2000), control);
    expect(own[0]!.attackIntent?.targetId).toBe(foe.id);
  });

  it('a villager off the zone and a plain building are left alone', () => {
    const { s, own, control } = holders();
    s.unit('villager', CENTRE.tx + 5, CENTRE.ty, 1);
    createBuilding(s.world, { type: 'house', origin: { tx: CENTRE.tx - 1, ty: CENTRE.ty + 5 }, playerId: 1, mapData: s.map });
    tick(s.hill({}, 1000), control);
    for (const u of own) expect(u.attackIntent).toBeUndefined();
  });

  it('razes a tower that shoots at the zone', () => {
    const { s, own, control } = holders();
    const tower = createBuilding(s.world, { type: 'tower', origin: { tx: CENTRE.tx + 6, ty: CENTRE.ty }, playerId: 1, mapData: s.map });
    tick(s.hill({}, 1000), control);
    expect(own[0]!.attackIntent?.targetId).toBe(tower.id);
  });

  it('no chase across the map, and no flapping at the edge', () => {
    const { s, own, control } = holders();
    const edge = CENTRE.tx + AI_HILL.guard;
    const foe = s.unit('swordsman', edge + 1, CENTRE.ty, 1);
    const at = (dx: number, t: number) => {
      foe.position = { tx: edge + dx, ty: CENTRE.ty };
      tick(s.hill({}, t), control);
      return own[0]!.attackIntent?.targetId;
    };
    expect(at(1, 1000)).toBeUndefined();
    expect(at(0, 2000)).toBe(foe.id);
    expect(at(1, 3000)).toBe(foe.id);
    expect(at(0, 4000)).toBe(foe.id);
    expect(at(AI_HILL.slack + 1, 5000)).toBeUndefined();
    expect(at(AI_HILL.slack, 6000)).toBeUndefined();
    expect(inHillZone(CENTRE, own[0]!.position!)).toBe(true);
    expect(headed(own[0]!)).toBeUndefined();
  });

  it('a holder drawn out walks back once the target is dropped', () => {
    const { s, own, control } = holders();
    const u = own[0]!;
    const foe = s.unit('swordsman', CENTRE.tx + AI_HILL.guard + AI_HILL.slack + 4, CENTRE.ty, 1);
    u.position = { tx: CENTRE.tx + AI_HILL.guard, ty: CENTRE.ty };
    s.world.addComponent(u, 'attackIntent', { targetId: foe.id! });
    u.movable!.path = [{ tx: u.position.tx + 1, ty: u.position.ty }];
    tick(s.hill({}, 1000), control);
    tick(s.hill({}, 2000), control);
    expect(u.attackIntent).toBeUndefined();
    expect(inHillZone(CENTRE, u.moveIntent!.target)).toBe(true);
  });

  it('on the way it fights who bars the way, not who is behind it', () => {
    const s = modeScene();
    const own = swords(s, 3, 9, 9);
    const behind = s.unit('swordsman', 4, 12, 1);
    const control = army();
    launch(s.hill(), control, own);
    expect(own[0]!.attackIntent).toBeUndefined();
    s.world.remove(behind);
    const ahead = s.unit('swordsman', 14, 14, 1);
    tick(s.hill({}, 1000), control);
    expect(own[0]!.attackIntent?.targetId).toBe(ahead.id);
  });

  it('breaks through a wall that bars the zone', () => {
    const s = modeScene();
    const own = swords(s, 3, 16, 22);
    own[0]!.position = { tx: 19, ty: 24 };
    const walls = [23, 24, 25].map((ty) => createWall(s.world, { tile: { tx: 20, ty }, playerId: 1, mapData: s.map }));
    const control = army();
    launch(s.hill(), control, own);
    tick(s.hill({}, 1000), control);
    expect(walls.map((w) => w.id)).toContain(own[0]!.attackIntent?.targetId);
  });

  it('looks round a contested zone when it sees nobody', () => {
    const { s, own, control } = holders();
    for (let t = 1000; t <= AI_HILL.retryMs + 1000; t += 1000) tick(s.hill({ contested: true }, t), control);
    expect(own.some((u) => u.moveIntent && inHillZone(CENTRE, u.moveIntent.target))).toBe(true);
  });

  it('a lone holder keeps the hill; outnumbered, a spent wave goes home', () => {
    const { s, own, control } = holders(1);
    tick(s.hill({ holderTeam: 2 }, 1000), control);
    expect(control.waveSize).toBe(1);
    s.unit('swordsman', 25, 25, 1);
    s.unit('swordsman', 26, 25, 1);
    tick(s.hill({ contested: true }, 2000), control);
    expect(control.attacking).toBe(false);
    expect(own[0]!.moveIntent?.target).toEqual(s.tc.position);
  });

  it('the treaty still rules', () => {
    const s = modeScene();
    const ctx = { ...s.hill({ heldMs: { 1: PAST_HALF } }, LATE), treatyActive: true };
    expect(launch(ctx, army(), swords(s, 8))).toBe(0);
  });

  it('a defeated AI marches as in Conquest', () => {
    const s = modeScene();
    s.me.defeated = true;
    const own = swords(s, 4);
    const control = army();
    launch(s.hill(), control, own);
    expect(control.target?.id).toBe(s.enemyTc.id);
  });

  it('a wave from a save plays on the same', () => {
    const a = holders();
    const b = holders();
    const restored = army();
    restored.restore(JSON.parse(JSON.stringify(b.control.snapshot())));
    const inA = a.s.unit('swordsman', 26, 26, 1);
    const inB = b.s.unit('swordsman', 26, 26, 1);
    tick(a.s.hill({}, 1000), a.control);
    tick(b.s.hill({}, 1000), restored);
    expect(restored.members()).toEqual(new Set(b.own.map((u) => u.id)));
    expect(a.own.map((u) => u.attackIntent?.targetId === inA.id)).toEqual([true, true, true, true]);
    expect(b.own.map((u) => u.attackIntent?.targetId === inB.id)).toEqual([true, true, true, true]);
  });
});

function opened(strategy: MediumStrategy): MediumStrategy {
  const state = strategy.snapshot();
  if (state.kind === 'null' || state.kind === 'easy') throw new Error(state.kind);
  strategy.restore({ ...state, pressure: { sent: true, raidOutSinceMs: 0 } });
  return strategy;
}
const waveOf = (ai: MediumStrategy | EasyStrategy): readonly number[] => {
  const state = ai.snapshot();
  return state.kind === 'null' ? [] : state.army.wave;
};

describe('the strategies in King of the Hill (M19)', () => {
  it.each([
    ['easy', () => new EasyStrategy(createRng(3)), AI_EASY.attackWave],
    ['medium', () => opened(new MediumStrategy(createRng(3))), AI_MEDIUM.attackWave],
    ['hard', () => opened(new HardStrategy(createRng(3))), 20],
    ['master', () => opened(new MasterStrategy(createRng(3))), 20],
  ] as const)('%s sends its wave to the zone', (_, make, n) => {
    const s = modeScene();
    const own = swords(s, n);
    const ai = make();
    for (let t = LATE; t <= LATE + 3000; t += 1000) ai.update(s.hill({}, t), 1000);
    expect(waveOf(ai)).toHaveLength(n);
    for (const u of own) expect(inHillZone(CENTRE, headed(u)!)).toBe(true);
  });

  it.each([
    ['easy', () => new EasyStrategy(createRng(3)), AI_EASY.hill],
    ['medium', () => new MediumStrategy(createRng(3)), AI_MEDIUM.hill],
  ] as const)('%s: an enemy clock past half sends urgentArmy at once', (_, make, tune) => {
    const run = (heldMs: Record<number, number>, treatyActive = false, allies = 0) => {
      const s = modeScene({ allies });
      swords(s, tune.urgentArmy);
      const ai = make();
      ai.update({ ...s.hill({ heldMs }, MIN), treatyActive }, 100);
      return waveOf(ai).length;
    };
    expect(run({})).toBe(0);
    expect(run({ 1: PAST_HALF })).toBe(tune.urgentArmy);
    expect(run({ 3: PAST_HALF })).toBe(tune.urgentArmy);
    expect(run({ 2: PAST_HALF })).toBe(0);
    expect(run({ 1: PAST_HALF }, false, 1)).toBe(0);
    expect(run({ 1: PAST_HALF }, true)).toBe(0);
  });

  it('reinforcements reach a hold that goes on', () => {
    const s = modeScene();
    swords(s, AI_MEDIUM.attackWave);
    const ai = opened(new MediumStrategy(createRng(3)));
    ai.update(s.hill({}, LATE), 100);
    expect(waveOf(ai)).toHaveLength(AI_MEDIUM.attackWave);
    const fresh = swords(s, AI_MEDIUM.hill.reinforce, 12, 4);
    ai.update(s.hill({ holderTeam: 2 }, LATE + MIN), 100);
    expect(waveOf(ai)).toEqual(expect.arrayContaining(fresh.map((u) => u.id)));
  });

  it('the opening raid joins a hold instead of waiting for its end', () => {
    const s = modeScene();
    const own = swords(s, AI_MEDIUM.hill.urgentArmy);
    const ai = new MediumStrategy(createRng(3));
    ai.update(s.hill({ heldMs: { 1: PAST_HALF } }, MIN), 100);
    expect(waveOf(ai)).toHaveLength(own.length);
    const raiders = [0, 1, 2, 3, 4].map((i) => s.unit('scout', 8, 10 + i));
    ai.update(s.hill({}, LATE), 100);
    expect(waveOf(ai).some((id) => raiders.some((r) => r.id === id))).toBe(true);
  });

  it("Mesteri's raid recall leaves a hold alone", () => {
    const s = modeScene();
    const ai = new MasterStrategy(createRng(3));
    const own = swords(s, 4, 22, 23);
    const state = ai.snapshot();
    if (state.kind !== 'master') throw new Error(state.kind);
    ai.restore({ ...state, army: { wave: own.map((u) => u.id!), waveTarget: null, exploreGoal: null }, pressure: { sent: true, raidOutSinceMs: 0 } });
    ai.update(s.hill({ holderTeam: 2 }, LATE), 100);
    expect(waveOf(ai)).toHaveLength(4);
  });

  it('Mesteri splits no flank off the hill', () => {
    const s = modeScene();
    createBuilding(s.world, { type: 'farm', origin: { tx: 40, ty: 8 }, playerId: 1, mapData: s.map });
    swords(s, 20);
    const ai = opened(new MasterStrategy(createRng(3))) as MasterStrategy;
    ai.update(s.hill({}, LATE), 100);
    expect(ai.flanksLaunched).toBe(0);
    expect(waveOf(ai)).toHaveLength(20);
  });
});
