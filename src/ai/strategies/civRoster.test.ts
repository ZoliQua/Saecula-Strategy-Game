import { describe, expect, it, vi } from 'vitest';
import { canCivTrain } from '../../game/civUnits';
import type { queueUnit as QueueUnitFn } from '../../ecs/queueUnit';

/** Every unit an AI asks queueUnit for, with the owner's civ (so a refused, civ-locked try shows too). */
const attempts = vi.hoisted(() => [] as { civ: CivId; type: UnitType; ok: boolean }[]);
vi.mock('../../ecs/queueUnit', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../ecs/queueUnit')>();
  const queueUnit: typeof QueueUnitFn = (trainer, type, owner, account) => {
    const result = real.queueUnit(trainer, type, owner, account);
    attempts.push({ civ: owner.civ, type, ok: result.ok });
    return result;
  };
  return { ...real, queueUnit };
});
import { CIV_DEFS } from '../../config/civs';
import { UNIT_BALANCE } from '../../config/balance';
import { createBuilding } from '../../ecs/archetypes/building';
import { createUnit } from '../../ecs/archetypes/createUnit';
import { createVillager } from '../../ecs/archetypes/villager';
import { createEcsWorld } from '../../ecs/world';
import type { Difficulty } from '../../game/GameSetupConfig';
import { createPlayer } from '../../game/Player';
import { FogOfWarData } from '../../map/FogOfWarData';
import { MapData } from '../../map/MapData';
import { createRng } from '../../map/random';
import type { BaseUnitType, CivId, UnitType } from '../../types';
import type { AIContext } from '../AIPlayer';
import { createStrategy } from '../createStrategy';
import { countByType, enemyClassShares } from '../decisions/army';
import { enemyArmySeen } from '../decisions/stance';
import type { WorldView } from '../perception';
import { createHeadlessMatch } from '../testing/headlessMatch';
import { MediumStrategy } from './MediumStrategy';

const MIN = 60_000;
const ALL_CIVS = Object.keys(CIV_DEFS) as CivId[];

/** Medium with its training helpers opened up for the test. */
class Probe extends MediumStrategy {
  trainNow(ctx: AIContext, type: BaseUnitType): boolean {
    return this.train(ctx, this.perception.update(ctx), type, 5);
  }
  mixNow(ctx: AIContext): ReturnType<MediumStrategy['armyMix']> {
    return this.armyMix(ctx, this.perception.update(ctx));
  }
  view(ctx: AIContext): WorldView {
    return this.perception.update(ctx);
  }
}

/** An AI base (town centre, houses, barracks, stable) at `age`, and a context that sees the whole map. */
function base(civ: CivId, age: 1 | 2 | 3) {
  const map = new MapData(48, 48);
  const world = createEcsWorld();
  const buildings = [
    ['town_center', 20, 20],
    ['barracks', 12, 12],
    ['stable', 26, 12],
    ['house', 12, 28],
    ['house', 15, 28],
  ] as const;
  for (const [type, tx, ty] of buildings) createBuilding(world, { type, origin: { tx, ty }, playerId: 2, mapData: map });
  createVillager(world, { tile: { tx: 24, ty: 19 }, playerId: 2 });
  const player = createPlayer({ id: 2, civ, age, resources: { food: 5000, wood: 5000, gold: 5000 } });
  const fog = new FogOfWarData(48, 48);
  for (let ty = 0; ty < 48; ty++) for (let tx = 0; tx < 48; tx++) fog.markVisible(tx, ty);
  const ctx: AIContext = { world, mapData: map, player, enemyPlayerId: 1, timeMs: 0, fog };
  const probe = new Probe(createRng(5));
  const queued = () =>
    world.entities.flatMap((e) => (e.owner?.playerId === 2 ? (e.trainingQueue?.entries ?? []) : [])).map((q) => q.unitType);
  return { world, probe, ctx, queued };
}

describe('AI civ roster (M8)', () => {
  it('a Hungarian AI asked for a knight queues a hussar at its stable', () => {
    const { probe, ctx, world } = base('hungarian', 2);
    expect(probe.trainNow(ctx, 'knight')).toBe(true);
    const stable = world.entities.find((e) => e.building?.type === 'stable')!;
    expect(stable.trainingQueue!.entries.map((q) => q.unitType)).toEqual(['hussar']);
  });

  it('counts units by their base type', () => {
    const units = [{ unit: { unitType: 'hussar' as UnitType } }, { unit: { unitType: 'knight' as UnitType } }];
    expect(countByType(units)).toEqual({ knight: 2 });
  });

  it('a German AI that saw 5 conquistadors counts them as cavalry and answers with landsknechts', () => {
    const { probe, ctx, world, queued } = base('german', 2);
    const plain = probe.mixNow(ctx);
    for (let i = 0; i < 5; i++) createUnit(world, { type: 'conquistador', tile: { tx: 22 + i, ty: 30 }, playerId: 1 });
    const mix = probe.mixNow(ctx);
    const seen = probe.view(ctx).enemySightings;
    expect(seen).toEqual({ conquistador: 5 });
    expect(enemyClassShares(seen).cavalry).toBe(1);
    expect(mix.pikeman ?? 0).toBeGreaterThan(plain.pikeman ?? 0);
    expect(probe.trainNow(ctx, 'pikeman')).toBe(true);
    expect(queued()).toEqual(['landsknecht']);
  });

  it('a sighted enemy cossack is an armed threat, a scout is not; an own cossack fills the scout slot', () => {
    const { probe, ctx, world } = base('russian', 1);
    createUnit(world, { type: 'cossack', tile: { tx: 24, ty: 24 }, playerId: 1 });
    createUnit(world, { type: 'scout', tile: { tx: 25, ty: 24 }, playerId: 1 });
    const own = createUnit(world, { type: 'cossack', tile: { tx: 18, ty: 18 }, playerId: 2 });
    const view = probe.view(ctx);
    expect(view.threats.map((u) => u.unit!.unitType)).toEqual(['cossack']);
    expect(enemyArmySeen(view.enemySightings)).toBe(1);
    expect(enemyClassShares(view.enemySightings).cavalry).toBe(1);
    expect(view.scouts).toContain(own);
    expect(view.military).not.toContain(own);
  });

  // Every strategy, every civ, age 3 from the start: no AI path queues the base unit its civ's unique unit replaces.
  for (const difficulty of ['easy', 'medium', 'hard', 'master'] as const satisfies readonly Difficulty[]) {
    it(`no ${difficulty} AI path queues a replaced base type`, () => {
      const offenders: string[] = [];
      attempts.length = 0;
      for (const civs of [ALL_CIVS.slice(0, 4), ALL_CIVS.slice(4, 8)]) {
        const [human, ...ais] = civs as [CivId, ...CivId[]];
        const seed = 11;
        const match = createHeadlessMatch({
          seed,
          size: 64,
          aiCount: ais.length,
          civs: { human, ais },
          strategy: (id) => createStrategy(difficulty, createRng(seed * 31 + id)),
          difficulty: () => difficulty,
          enemyOf: (id) => (id % 4) + 1,
          humanStrategy: createStrategy(difficulty, createRng(seed * 31 + 1)),
          humanEnemy: () => 2,
        });
        for (const p of match.players.all()) {
          p.age = 3;
          p.resources = { food: 3000, wood: 3000, gold: 3000 };
        }
        match.run(12 * MIN, 100, () => {
          for (const e of match.world.entities) {
            const owner = e.owner && match.players.get(e.owner.playerId);
            if (!owner || !e.trainingQueue) continue;
            const replaced = UNIT_BALANCE[CIV_DEFS[owner.civ].uniqueUnit].replaces;
            for (const q of e.trainingQueue.entries) {
              if (q.unitType === replaced) offenders.push(`${owner.civ}:${q.unitType}`);
            }
          }
        });
      }
      for (const a of attempts) if (!canCivTrain(a.civ, a.type)) offenders.push(`${a.civ} tried ${a.type}`);
      expect(attempts.length).toBeGreaterThan(0);
      // Every civ's AI trains its own unique unit (queued successfully at least once), not just the age-1 ones.
      if (difficulty !== 'easy') {
        const missing = ALL_CIVS.filter(
          (civ) => !attempts.some((a) => a.ok && a.civ === civ && a.type === CIV_DEFS[civ].uniqueUnit),
        );
        expect(missing, `${difficulty}: civs that never queued their unique unit`).toEqual([]);
      }
      expect([...new Set(offenders)]).toEqual([]);
    }, 120_000);
  }
});
