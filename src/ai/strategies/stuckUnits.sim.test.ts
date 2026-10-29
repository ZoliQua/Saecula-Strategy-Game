import { describe, expect, it } from 'vitest';
import type { Entity } from '../../ecs/components';
import { createRng } from '../../map/random';
import { createHeadlessMatch } from '../testing/headlessMatch';
import { HardStrategy } from './HardStrategy';

const MIN = 60_000;
/** A living unit may stand on blocked ground this long (walking its escape steps off a fresh foundation). */
const MAX_BLOCKED_MS = 2000;
/** A unit with an order may stay on one tile, doing nothing, this long. */
const MAX_IDLE_ORDER_MS = 20_000;

interface Stuck {
  readonly kind: 'blocked' | 'idleOrder';
  readonly atMs: number;
  readonly unit: string;
}

/** Whether the unit holds an order it should be acting on. */
function hasOrder(e: Entity): boolean {
  return !!(e.moveIntent || e.attackIntent || e.buildCommand || e.gatherer?.targetNodeId !== undefined || (e.movable?.path.length ?? 0) > 0);
}

/**
 * Plays a seeded four-AI Hard match on a 96×96 meadow (2 against 3, 4 against 5, the human passive)
 * and records every unit that stood on blocked ground too long, or held an order on one tile without
 * making any progress (no step, no gathered resource, no swing, no build progress) too long.
 */
function play(seed: number, minutes: number): Stuck[] {
  const match = createHeadlessMatch({
    seed,
    size: 96,
    aiCount: 4,
    strategy: (id) => new HardStrategy(createRng(seed * 31 + id)),
    enemyOf: (id) => (id === 2 ? 3 : id === 3 ? 2 : id === 4 ? 5 : 4),
    difficulty: () => 'hard',
  });
  const blockedSince = new Map<Entity, number>();
  const lastProgress = new Map<Entity, { key: string; at: number }>();
  const reported = new Set<Entity>();
  const out: Stuck[] = [];
  const report = (e: Entity, kind: Stuck['kind'], atMs: number) => {
    if (reported.has(e)) return;
    reported.add(e);
    out.push({ kind, atMs, unit: `${e.unit?.unitType}#${e.id} p${e.owner?.playerId} @${e.position?.tx},${e.position?.ty}` });
  };
  match.run(minutes * MIN, 100, (t) => {
    const sites = new Map<number, Entity>();
    for (const s of match.world.with('underConstruction')) if (s.id !== undefined) sites.set(s.id, s);
    for (const e of match.world.with('unit', 'position')) {
      if (e.dying) continue;
      const p = e.position;
      if (match.map.isPassable(p.tx, p.ty)) blockedSince.delete(e);
      else if (!blockedSince.has(e)) blockedSince.set(e, t);
      else if (t - blockedSince.get(e)! > MAX_BLOCKED_MS) report(e, 'blocked', t);

      const site = e.buildCommand ? sites.get(e.buildCommand.targetId) : undefined;
      const key = `${p.tx},${p.ty}|${Math.floor(e.gatherer?.carrying ?? 0)}|${e.attacker?.cooldownRemaining ?? 0}|${Math.floor(site?.underConstruction?.elapsed ?? 0)}`;
      const prev = lastProgress.get(e);
      if (!hasOrder(e) || !prev || prev.key !== key) lastProgress.set(e, { key, at: t });
      else if (t - prev.at > MAX_IDLE_ORDER_MS) report(e, 'idleOrder', t);
    }
  });
  return out;
}

/**
 * M7 guard (decision 1): with foundations laid over units (the AI places them without looking at
 * units, then evicts), tiles blocked under walking units, and blocked starts, no unit stays trapped.
 * Before the fix, seed 5 left nine villagers on foundations (first at 2.9 min) and seed 1 six.
 * About 4 s per 15-minute match.
 */
describe('stuck units guard (96×96 meadow, four Hard AIs)', () => {
  it.each([5, 1])('seed %i: no unit stays on blocked ground or idles on an order', (seed) => {
    expect(play(seed, 15)).toEqual([]);
  }, 120_000);
});
