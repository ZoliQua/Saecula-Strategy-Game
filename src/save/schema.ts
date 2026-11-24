import { z } from 'zod';
import { PERSONALITIES } from '../config/aiPersonality';
import { MARKET } from '../config/balance';
import type { Entity } from '../ecs/components';
import type { MatchStatsSnapshot } from '../stats/MatchStats';
import {
  DIFFICULTIES,
  MAP_SIZE_IDS,
  MAX_AI,
  MIN_AI,
  MODE_DEFAULTS,
  SPEED_CHOICES,
  START_RESOURCE_IDS,
  TREATY_MINUTES,
  VICTORY_MODES,
  type GameSetupConfig,
} from '../game/GameSetupConfig';
import { MISSION_IDS } from '../campaign/missions';
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
  numberOf,
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
 * shipped. v2 (M7): the match statistics (`stats`). v3 (M8): the unit-type enum gains the unique units.
 * v4 (M9): the setup's victory enum gains the time-victory modes.
 * v5 (M11): the monk and the monastery, and the monk components (convertIntent, converter, originCiv).
 * v6 (M12): the technology enum gains the ten M12 technologies.
 * v7 (M13): a campaign mission (setup.mission) and its objective state (campaign).
 * v8 (0.8.1): a Medium-family AI's given-up monk targets (strategy.monkAvoid).
 * v9 (M14): ships and the dock, fish-school terrain, transport cargo and orders.
 * v10 (M16): the setup's mode fields (allies, treatyMin, startResources, speed).
 * v11 (M17): the market building and each player's market prices (marketPrices); the trade
 *   cart and trade ship and their components (tradeHome, tradeRoute).
 */

export const SCHEMA_VERSION = 11;

const nonNeg = num.nonnegative();
const point = z.object({ x: num, y: num }).strict();
const attackValues = { meleeAtk: num, pierceAtk: num, bonusVsCavalry: num };

/** The component shapes every saved entity can have (a transport's cargo units too, M14). */
const COMPONENT_SHAPE = {
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
    resourceNode: z.object({ type: resourceType, amount: num, maxAmount: num, sea: z.boolean().optional() }).strict().optional(),
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
    convertIntent: z.object({ targetId: int, elapsedMs: nonNeg }).strict().optional(),
    converter: z.object({ rechargeMs: nonNeg, healCarry: nonNeg, busy: z.boolean() }).strict().optional(),
    originCiv: z.object({ civ: civId }).strict().optional(),
    tradeHome: z.object({ buildingId: int }).strict().optional(),
    tradeRoute: z.object({ homeId: int, targetId: int, toTarget: z.boolean(), armed: z.boolean() }).strict().optional(),
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
    boardIntent: z.object({ transportId: int }).strict().optional(),
    unloadIntent: z.object({ target: tile }).strict().optional(),
};

/** A unit in a transport's cargo (M14): its id and components, never a cargo of its own. */
const CargoUnitSchema = z.object({ id: int.optional(), ...COMPONENT_SHAPE }).strict();

/** Every ECS component but `id` (kept beside it) and `sprite` (a render proxy, never saved). */
export const EntityComponentsSchema = z
  .object({ ...COMPONENT_SHAPE, cargo: z.object({ units: z.array(CargoUnitSchema) }).strict().optional() })
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
    mission: enumOf(MISSION_IDS).optional(),
    allies: int.min(0).max(MAX_AI - 1),
    treatyMin: numberOf(TREATY_MINUTES),
    startResources: enumOf(START_RESOURCE_IDS),
    speed: numberOf(SPEED_CHOICES),
  })
  .strict();

/**
 * A setup stored before M16 (a match-log record): the mode fields may be
 * missing and read as today's defaults. Saves never use this: they get the
 * fields from the v9 → v10 migration.
 */
export const StoredSetupSchema = GameSetupConfigSchema.extend({
  allies: GameSetupConfigSchema.shape.allies.default(MODE_DEFAULTS.allies),
  treatyMin: GameSetupConfigSchema.shape.treatyMin.default(MODE_DEFAULTS.treatyMin),
  startResources: GameSetupConfigSchema.shape.startResources.default(MODE_DEFAULTS.startResources),
  speed: GameSetupConfigSchema.shape.speed.default(MODE_DEFAULTS.speed),
});

export type GameSetupConfigSchemaCheck = Assert<Exact<z.infer<typeof GameSetupConfigSchema>, GameSetupConfig>>;

const playerId = int.positive();
/** Record keys are player ids in decimal. */
const playerKey = z.string().regex(/^[1-9]\d*$/);

const marketPrice = num.min(MARKET.minPrice).max(MARKET.maxPrice);

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
    /** Gold per MARKET.lot of food and wood (M17); always within the MARKET bounds. */
    marketPrices: z.object({ food: marketPrice, wood: marketPrice }).strict(),
    personality: enumOf(PERSONALITIES).optional(),
  })
  .strict();

const count = int.nonnegative();

/** One player's MatchStats counters (also kept in the match log, src/stats/matchRecord.ts). */
export const PlayerMatchStatsSchema = z
  .object({
    gathered: nonNeg,
    killValue: nonNeg,
    unitsTrained: count,
    unitsLost: count,
    buildingsBuilt: count,
    buildingsLost: count,
    ageUpAtMs: z.array(nonNeg),
  })
  .strict();

/** A score / population timeline point (player id order). */
export const TimelineSampleSchema = z.object({ tMs: nonNeg, scores: z.array(num), pops: z.array(nonNeg) }).strict();

/** MatchStats.snapshot(): counters by player id and the score / population timeline (player id order). */
export const MatchStatsSchema = z
  .object({
    players: z.record(playerKey, PlayerMatchStatsSchema),
    timeline: z.array(TimelineSampleSchema),
  })
  .strict();

export type MatchStatsSchemaCheck = Assert<Exact<z.infer<typeof MatchStatsSchema>, Loose<MatchStatsSnapshot>>>;

export const SaveDataSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    createdAt: z.string().datetime(),
    /** The match's stable id (src/game/matchId.ts): the same in every save of one match; the match log's key. */
    matchId: z.string().min(1).max(64),
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
    /** A campaign mission's objective state (M13): indices of the objectives done. */
    campaign: z.object({ done: z.array(int.nonnegative()) }).strict().optional(),
  })
  .strict();

export type SaveData = z.infer<typeof SaveDataSchema>;
export type SavedPlayer = SaveData['players'][number];
