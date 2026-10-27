import type { With } from 'miniplex';
import type { Entity } from '../../components';

/** A unit running the gather cycle. */
export type Villager = With<Entity, 'position' | 'gatherer' | 'movable' | 'owner'>;
/** A tree, mine, berry bush or farm. */
export type ResourceNode = With<Entity, 'position' | 'resourceNode'>;
/** A building that accepts resources. */
export type Dropoff = With<Entity, 'position' | 'resourceDropoff' | 'building'>;
