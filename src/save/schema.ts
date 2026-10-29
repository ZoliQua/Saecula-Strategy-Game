import { z } from 'zod';
import { PERSONALITIES } from '../config/aiPersonality';
import type { Entity } from '../ecs/components';
import type { MatchStatsSnapshot } from '../stats/MatchStats';
import {
  DIFFICULTIES,
  MAP_SIZE_IDS,
  MAX_AI,
  MIN_AI,
  VICTORY_MODES,
  type GameSetupConfig,
} from '../game/GameSetupConfig';
import { MAP_TEMPLATES } from '../map/generator';
import { DIRECTIONS } from '../types';
import { AIPlayerStateSchema } from './aiSchema';
import {
  ageId,
  buildingType,
  civId,
  enumOf,
  footprint,
  int,
  num,
  projectileKind,
  resourceType,
  techId,
  tile,
  unitType,
  type Assert,
  type Loose,
  type Exact,
} from './schemaKit';

/*
 * The versioned save format (CLAUDE.md §5.4, M6 Task 4). Every object
 * is strict: an unknown key is a corrupt save. Bump SCHEMA_VERSION (and
 * add a migration) for every gameplay-relevant change once a save has
 * shipped. v2 (M7): the match statistics (`stats`).
 */

export const SCHEMA_VERSION = 2;

const nonNeg = num.nonnegative();
const point = z.object({ x: num, y: num }).strict();
const attackValues = { meleeAtk: num, pierceAtk: num, bonusVsCavalry: num };

/** Every ECS component but `id` (kept beside it) and `sprite` (a render proxy, never saved). */
export const EntityComponentsSchema = z
  .object({
    position: tile.optional(),
    renderable: z.object({ textureKey: z.string(), frame: z.union([z.string(), num]).optional() }).strict().optional(),
    unit: z.object({ unitType }).strict().optional(),
    health: z.object({ current: num, max: num }).strict().optional(),
    selectable: z.object({ selected: z.boolean() }).strict().optional(),
    moveIntent: z.object({ target: tile }).strict().optional(),
    movable: z
      .object({ speed: num, path: z.array(tile), progress: num, facing: enumOf(DIRECTIONS) })
      .strict()
      .optional(),
    resourceNode: z.object({ type: resourceType, amount: num, maxAmount: num }).strict().optional(),
    gatherer: z
      .object({
        carryingType: resourceType.nullable(),
        carrying: num,
        capacity: num,
        gatherRate: num,
        targetNodeId: int.optional(),
        dropoffId: int.optional(),
      })
      .strict()
      .optional(),
    gatherIntent: z.object({ nodeId: int }).strict().optional(),
    resourceDropoff: z.object({ accepts: z.array(resourceType).readonly() }).strict().optional(),
    building: z.object({ type: buildingType, footprint, minStyleAge: ageId.optional() }).strict().optional(),
    underConstruction: z.object({ totalTime: num, elapsed: num }).strict().optional(),
    buildCommand: z.object({ targetId: int }).strict().optional(),
    trainingQueue: z
      .object({
        entries: z.array(z.object({ unitType, elapsed: num, totalTime: num }).strict()),
        maxQueue: int,
      })
      .strict()
      .optional(),
    research: z.object({ techId, elapsed: num, totalTime: num }).strict().optional(),
    owner: z.object({ playerId: int }).strict().optional(),
    populationCost: z.object({ amount: num }).strict().optional(),
    attacker: z
      .object({ ...attackValues, range: num, cooldownMs: num, cooldownRemaining: num })
      .strict()
      .optional(),
    armor: z.object({ melee: num, pierce: num }).strict().optional(),
    attackIntent: z.object({ targetId: int, resumeTargetId: int.optional() }).strict().optional(),
    dying: z.object({ ttlMs: num }).strict().optional(),
    wonder: z.object({ heldMs: nonNeg }).strict().optional(),
    fogEmitter: z.object({ sightRange: num }).strict().optional(),
    projectile: z
      .object({
        kind: projectileKind,
        from: point,
        to: point,
        elapsedMs: num,
        durationMs: num,
        arcHeight: num,
        ownerId: int,
        payload: z.object(attackValues).strict(),
        targetId: int,
        aoeRadius: num,
        launchHeight: num.optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type EntityComponents = z.infer<typeof EntityComponentsSchema>;

/** A new component (or field) without a schema entry, or a stale entry, fails `tsc` here. */
export type EntityComponentsSchemaCheck = Assert<Exact<EntityComponents, Loose<Omit<Entity, 'id' | 'sprite'>>>>;

export const GameSetupConfigSchema = z
  .object({
    template: enumOf(MAP_TEMPLATES),
    mapSize: enumOf(MAP_SIZE_IDS),
    aiCount: int.min(MIN_AI).max(MAX_AI),
    difficulty: enumOf(DIFFICULTIES),
    civ: civId,
    aiCivs: z.union([z.literal('mixed'), civId]),
    seed: int,
    victory: enumOf(VICTORY_MODES),
  })
  .strict();

export type GameSetupConfigSchemaCheck = Assert<Exact<z.infer<typeof GameSetupConfigSchema>, GameSetupConfig>>;

const playerId = int.positive();
/** Record keys are player ids in decimal. */
const playerKey = z.string().regex(/^[1-9]\d*$/);

const PlayerSchema = z
  .object({
    id: playerId,
    isHuman: z.boolean(),
    civ: civId,
    color: z.string().regex(/^#[0-9A-F]{6}$/),
    age: ageId,
    resources: z.object({ food: num, wood: num, gold: num }).strict(),
    /** Written per §5.4; recomputed from the entities on load. */
    population: z.object({ current: nonNeg, cap: nonNeg }).strict(),
    defeated: z.boolean(),
    researched: z.array(techId),
    gatherHandicap: num.positive(),
    personality: enumOf(PERSONALITIES).optional(),
  })
  .strict();

const count = int.nonnegative();

/** MatchStats.snapshot(): counters by player id and the score / population timeline (player id order). */
export const MatchStatsSchema = z
  .object({
    players: z.record(
      playerKey,
      z
        .object({
          gathered: nonNeg,
          killValue: nonNeg,
          unitsTrained: count,
          unitsLost: count,
          buildingsBuilt: count,
          buildingsLost: count,
          ageUpAtMs: z.array(nonNeg),
        })
        .strict(),
    ),
    timeline: z.array(z.object({ tMs: nonNeg, scores: z.array(num), pops: z.array(nonNeg) }).strict()),
  })
  .strict();

export type MatchStatsSchemaCheck = Assert<Exact<z.infer<typeof MatchStatsSchema>, Loose<MatchStatsSnapshot>>>;

export const SaveDataSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    createdAt: z.string().datetime(),
    gameTimeMs: nonNeg,
    setup: GameSetupConfigSchema,
    /** Derived from `setup` and the players, for slot lists. */
    meta: z
      .object({
        humanCiv: civId,
        humanAge: ageId,
        template: enumOf(MAP_TEMPLATES),
        mapSize: enumOf(MAP_SIZE_IDS),
        difficulty: enumOf(DIFFICULTIES),
        aiCount: int.nonnegative(),
      })
      .strict(),
    map: z
      .object({
        width: int.positive(),
        height: int.positive(),
        seed: int,
        /** Base64 of width × height terrain ids. */
        terrain: z.string(),
        /** Base64 of the width × height blocked mask. */
        blocked: z.string(),
      })
      .strict(),
    players: z.array(PlayerSchema).min(1),
    /** In `world.entities` order. */
    entities: z.array(z.object({ id: playerId, components: EntityComponentsSchema }).strict()),
    nextEntityId: playerId,
    /** Base64 fog states per player id (the human's and each AI's). */
    fogOfWar: z.record(playerKey, z.string()),
    /** Each AI's state outside the ECS, by player id. */
    ai: z.record(playerKey, AIPlayerStateSchema),
    camera: z.object({ tx: num, ty: num, zoom: num.positive() }).strict(),
    lightPhase: num,
    stats: MatchStatsSchema,
  })
  .strict();

export type SaveData = z.infer<typeof SaveDataSchema>;
export type SavedPlayer = SaveData['players'][number];
