import { villagerTask } from '../ai/economy';
import type { Entity } from '../ecs/components';
import type { EcsWorld } from '../ecs/world';

/** The rows of the side panel's villager view (M7 Decision 9). */
export type VillagerActivity = 'food' | 'wood' | 'gold' | 'build' | 'idle' | 'other';

export const VILLAGER_ACTIVITIES: readonly VillagerActivity[] = ['food', 'wood', 'gold', 'build', 'idle', 'other'];

/** Villager ids per activity, ascending. */
export type VillagerActivityIds = Record<VillagerActivity, number[]>;

/**
 * What one villager is doing: gathering a resource (or carrying a load
 * of it home), building, idle (no task and standing still), or something
 * else (walking with no task, fighting).
 */
export function activityOf(v: Entity, nodes: ReadonlyMap<number, Entity>): VillagerActivity {
  const task = villagerTask(v, nodes);
  if (task !== 'idle') return task;
  const moving = !!v.moveIntent || (v.movable?.path.length ?? 0) > 0;
  return moving || v.attackIntent ? 'other' : 'idle';
}

/** `playerId`'s living villagers by activity. */
export function villagerActivity(world: EcsWorld, playerId: number): VillagerActivityIds {
  const out: VillagerActivityIds = { food: [], wood: [], gold: [], build: [], idle: [], other: [] };
  const nodes = new Map<number, Entity>();
  for (const n of world.with('resourceNode')) if (n.id !== undefined) nodes.set(n.id, n);
  for (const v of world.with('unit', 'owner')) {
    if (v.unit.unitType !== 'villager' || v.owner.playerId !== playerId || v.dying || v.id === undefined) continue;
    out[activityOf(v, nodes)].push(v.id);
  }
  for (const a of VILLAGER_ACTIVITIES) out[a].sort((x, y) => x - y);
  return out;
}
