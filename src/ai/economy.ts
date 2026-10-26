import type { Entity } from '../ecs/components';
import type { TrainAccount } from '../ecs/queueUnit';
import { playerWallet } from '../ecs/research';
import type { EcsWorld } from '../ecs/world';
import { UNIT_SPECS } from '../ecs/archetypes/unit';
import { houseBonus } from '../game/modifiers';
import type { Player } from '../game/Player';
import { computePopulation } from '../game/population';
import type { Population, ResourceType, Resources } from '../types';
import type { WorldView } from './perception';

export type VillagerTask = ResourceType | 'build' | 'idle';

/** What a villager is busy with, read from its components. */
export function villagerTask(v: Entity, byId: ReadonlyMap<number, Entity>): VillagerTask {
  if (v.buildCommand) return 'build';
  const g = v.gatherer;
  if (!g) return 'idle';
  const nodeId = v.gatherIntent?.nodeId ?? g.targetNodeId;
  if (nodeId !== undefined) {
    const type = byId.get(nodeId)?.resourceNode?.type;
    if (type) return type;
  }
  // Walking a full load home after its node ran out still counts as working that resource.
  if (g.carryingType && g.carrying >= g.capacity && v.movable && v.movable.path.length > 0) return g.carryingType;
  return 'idle';
}

export interface EconomySnapshot {
  readonly resources: Resources;
  /** Units alive plus units already queued, against the cap. */
  readonly population: Population;
  readonly tasks: Readonly<Record<VillagerTask, number>>;
}

/** Population of units alive plus everything waiting in the player's training queues. */
export function populationWithQueued(world: EcsWorld, player: Player): Population {
  const pop = computePopulation(world.with('owner'), player.id, houseBonus(player));
  let queued = 0;
  for (const b of world.with('trainingQueue', 'owner')) {
    if (b.owner.playerId !== player.id) continue;
    for (const entry of b.trainingQueue.entries) queued += UNIT_SPECS[entry.unitType].populationCost;
  }
  return { current: pop.current + queued, cap: pop.cap };
}

export function snapshotEconomy(world: EcsWorld, player: Player, view: WorldView): EconomySnapshot {
  const tasks: Record<VillagerTask, number> = { food: 0, wood: 0, gold: 0, build: 0, idle: 0 };
  for (const v of view.villagers) tasks[villagerTask(v, view.byId)]++;
  return { resources: { ...player.resources }, population: populationWithQueued(world, player), tasks };
}

/** The AI's training account: its own stockpile, its population with queued units counted. */
export function aiTrainAccount(world: EcsWorld, player: Player): TrainAccount {
  return { wallet: playerWallet(player), population: () => populationWithQueued(world, player) };
}

export function canAfford(have: Resources, cost: Resources, reserve: Resources = NO_RESERVE): boolean {
  return (
    have.food - cost.food >= reserve.food &&
    have.wood - cost.wood >= reserve.wood &&
    have.gold - cost.gold >= reserve.gold
  );
}

export const NO_RESERVE: Resources = { food: 0, wood: 0, gold: 0 };

/** `fraction` of a cost, for keeping savings while spending. */
export function scaleCost(cost: Resources, fraction: number): Resources {
  return { food: cost.food * fraction, wood: cost.wood * fraction, gold: cost.gold * fraction };
}
