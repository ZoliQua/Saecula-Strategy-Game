import { findPlacement } from '../ai/decisions/placement';
import { BUILDING_SPECS, createBuilding } from '../ecs/archetypes/building';
import type { Entity } from '../ecs/components';
import type { EcsWorld } from '../ecs/world';
import { buildingHpMultiplier } from '../game/modifiers';
import type { PlayerManager } from '../game/PlayerManager';
import { TECH_SPECS } from '../game/technologies';
import type { MapData } from '../map/MapData';
import { TOWN_CENTER_SIZE, villagerSpawnTiles } from '../map/startLayout';
import type { TechId } from '../types';
import { DAMAGED_HOUSE_HP_FRACTION, MISSIONS, type ScenarioId } from './missions';

/** The age-up technologies that lead to `age` (so a mission started later in time is consistent). */
function ageTechsUpTo(age: number): TechId[] {
  return (Object.keys(TECH_SPECS) as TechId[]).filter((id) => {
    const e = TECH_SPECS[id].effect;
    return e.kind === 'age' && e.age <= age;
  });
}

/**
 * A new mission match's start state (M13), applied to the freshly created
 * players before anything is spawned: every player begins in the mission's
 * age (with the age-up technologies counted as researched), and the human
 * gets the mission's extra stock.
 */
export function applyMissionStart(players: PlayerManager, id: ScenarioId): void {
  const { start } = MISSIONS[id];
  if (start.age) {
    for (const p of players.all()) {
      p.age = start.age;
      for (const t of ageTechsUpTo(start.age)) p.researched.add(t);
    }
  }
  const human = players.human();
  if (human && start.bonus) {
    const r = human.resources;
    human.resources = { food: r.food + start.bonus.food, wood: r.wood + start.bonus.wood, gold: r.gold + start.bonus.gold };
  }
}

/** How far from the town centre's middle the tutorial's damaged house may stand (tiles). */
const HOUSE_RADIUS = { min: 3, max: 10 } as const;

/**
 * A new mission match's extra entities, spawned after the starting ones
 * (M18): the tutorial's damaged house — a finished house of the human on
 * the nearest free spot by its town centre (the AI's placement rules, kept
 * off the starting villagers), at DAMAGED_HOUSE_HP_FRACTION of its HP.
 * Returns the house (null when the mission has none or no spot is free).
 */
export function spawnMissionExtras(world: EcsWorld, players: PlayerManager, map: MapData, id: ScenarioId): Entity | null {
  if (!MISSIONS[id].start.damagedHouse) return null;
  const human = players.human();
  const tc = world.entities.find((e) => e.building?.type === 'town_center' && e.owner?.playerId === human?.id);
  if (!human || !tc?.position) return null;
  const half = Math.floor(TOWN_CENTER_SIZE / 2);
  const centre = { tx: tc.position.tx + half, ty: tc.position.ty + half };
  const villagerTiles = new Set(villagerSpawnTiles(centre).map((t) => `${t.tx},${t.ty}`));
  const spec = BUILDING_SPECS.house;
  const origin = findPlacement(map, centre, spec.width, spec.height, {
    minRadius: HOUSE_RADIUS.min,
    maxRadius: HOUSE_RADIUS.max,
    clearance: 1,
    tileAllowed: (tx, ty) => !villagerTiles.has(`${tx},${ty}`),
  });
  if (!origin) return null;
  const house = createBuilding(world, { type: 'house', origin, playerId: human.id, mapData: map, hpMultiplier: buildingHpMultiplier(human) });
  if (house.health) house.health.current = Math.round(house.health.max * DAMAGED_HOUSE_HP_FRACTION);
  return house;
}
