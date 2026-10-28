import { World } from 'miniplex';
import type { Entity } from './components';

export type EcsWorld = World<Entity>;

let _nextId = 1;

export function createEcsWorld(): EcsWorld {
  _nextId = 1;
  return new World<Entity>();
}

export function assignEntityId(entity: Entity): Entity {
  entity.id = _nextId++;
  return entity;
}

/** The id the next created entity will get (saved games). */
export function peekNextEntityId(): number {
  return _nextId;
}

/** Continues entity ids from `id` (loading a save: one past the highest saved id). */
export function setNextEntityId(id: number): void {
  if (!Number.isInteger(id) || id < 1) throw new RangeError(`Invalid next entity id ${id}`);
  _nextId = id;
}
