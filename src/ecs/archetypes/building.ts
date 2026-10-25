import type { TileCoord } from '../../iso/coordinates';
import type { MapData } from '../../map/MapData';
import {
  BUILDING_BALANCE,
  BUILDING_MELEE_DEF,
  BUILDING_PIERCE_DEF,
  TRAINER_BUILDINGS,
} from '../../config/balance';
import type { BuildingType, ResourceType } from '../../types';
import type { Entity } from '../components';
import { assignEntityId, type EcsWorld } from '../world';

export interface BuildingSpec {
  readonly type: BuildingType;
  readonly width: number;
  readonly height: number;
  readonly maxHp: number;
  readonly textureKey: string;
  readonly dropoffAccepts?: readonly ResourceType[];
  readonly cost: { food: number; wood: number; gold: number };
  /** Builder-seconds required to complete (one villager = 1s/s). */
  readonly buildTime: number;
  /** Fog-of-war sight range in tiles. */
  readonly los: number;
}

const TEXTURE_KEYS: Record<BuildingType, string> = {
  town_center: 'building_town_center',
  house: 'building_house',
  farm: 'building_farm',
  lumber_camp: 'building_lumber_camp',
  mining_camp: 'building_mining_camp',
  barracks: 'building_barracks',
  archery_range: 'building_archery_range',
  stable: 'building_stable',
  blacksmith: 'building_blacksmith',
  foundry: 'building_foundry',
  tower: 'building_tower',
  wall: 'building_wall',
  wonder: 'building_wonder',
};

function toSpec(type: BuildingType): BuildingSpec {
  const b = BUILDING_BALANCE[type];
  return {
    type,
    width: b.width,
    height: b.height,
    maxHp: b.hp,
    textureKey: TEXTURE_KEYS[type],
    ...(b.dropoff ? { dropoffAccepts: b.dropoff } : {}),
    cost: b.cost,
    buildTime: b.buildTime,
    los: b.los,
  };
}

export const BUILDING_SPECS: Record<BuildingType, BuildingSpec> = Object.fromEntries(
  (Object.keys(BUILDING_BALANCE) as BuildingType[]).map((t) => [t, toSpec(t)]),
) as Record<BuildingType, BuildingSpec>;

export interface CreateBuildingOptions {
  readonly type: BuildingType;
  readonly origin: TileCoord;
  readonly playerId: number;
  readonly mapData: MapData;
  /** When true, the building starts under construction at 1 HP. */
  readonly underConstruction?: boolean;
}

/**
 * Creates a building at `origin` (top tile of the footprint). Blocks
 * the affected tiles in the MapData so pathfinding routes around it.
 * With `underConstruction: true` the building starts at 1 HP and is
 * tagged for ConstructionSystem; HP scales up as progress advances.
 */
export function createBuilding(
  world: EcsWorld,
  options: CreateBuildingOptions,
): Entity {
  const spec = BUILDING_SPECS[options.type];
  blockFootprint(options.mapData, options.origin, spec, true);

  const underConstruction = options.underConstruction ?? false;
  const entity: Entity = assignEntityId({
    position: { tx: options.origin.tx, ty: options.origin.ty },
    renderable: { textureKey: spec.textureKey },
    building: {
      type: spec.type,
      footprint: { width: spec.width, height: spec.height },
    },
    health: {
      current: underConstruction ? 1 : spec.maxHp,
      max: spec.maxHp,
    },
    selectable: { selected: false },
    owner: { playerId: options.playerId },
    armor: { melee: BUILDING_MELEE_DEF, pierce: BUILDING_PIERCE_DEF },
  });
  if (underConstruction) {
    entity.underConstruction = {
      totalTime: spec.buildTime,
      elapsed: 0,
    };
  }
  if (spec.dropoffAccepts && !underConstruction) {
    entity.resourceDropoff = { accepts: spec.dropoffAccepts };
  }
  if (TRAINER_BUILDINGS.has(spec.type) && !underConstruction) {
    entity.trainingQueue = { entries: [], maxQueue: 5 };
  }
  entity.fogEmitter = { sightRange: spec.los };
  world.add(entity);
  return entity;
}

function blockFootprint(
  map: MapData,
  origin: TileCoord,
  spec: BuildingSpec,
  blocked: boolean,
): void {
  for (let dy = 0; dy < spec.height; dy++) {
    for (let dx = 0; dx < spec.width; dx++) {
      map.setBlocked(origin.tx + dx, origin.ty + dy, blocked);
    }
  }
}

export function unblockBuilding(map: MapData, entity: Entity): void {
  if (!entity.position || !entity.building) return;
  const { width, height } = entity.building.footprint;
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      map.setBlocked(entity.position.tx + dx, entity.position.ty + dy, false);
    }
  }
}
