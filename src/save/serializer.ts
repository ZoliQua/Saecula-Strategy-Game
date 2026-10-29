import type { AIPlayer } from '../ai/AIPlayer';
import type { Entity } from '../ecs/components';
import { peekNextEntityId, type EcsWorld } from '../ecs/world';
import type { GameSetupConfig } from '../game/GameSetupConfig';
import { houseBonus } from '../game/modifiers';
import type { Player } from '../game/Player';
import type { PlayerManager } from '../game/PlayerManager';
import { computePopulation } from '../game/population';
import type { FogOfWarData } from '../map/FogOfWarData';
import type { MapData } from '../map/MapData';
import type { MatchStats } from '../stats/MatchStats';
import { encodeBytes } from './base64';
import { SCHEMA_VERSION, type EntityComponents, type SaveData, type SavedPlayer } from './schema';

/** Everything a save is written from (the live game and the headless match both provide it). */
export interface MatchState {
  setup: GameSetupConfig;
  world: EcsWorld;
  players: PlayerManager;
  mapData: MapData;
  /** Fog per player id: the human's and each AI's. */
  fogs: ReadonlyMap<number, FogOfWarData>;
  ais: readonly AIPlayer[];
  gameTimeMs: number;
  camera: { tx: number; ty: number; zoom: number };
  lightPhase: number;
  /** The match statistics (scores, timeline). */
  stats: MatchStats;
}

/**
 * A JSON-faithful deep copy: undefined object values are dropped (as
 * JSON.stringify would), so a save compares equal to its own JSON round
 * trip. Throws on a non-finite number, which JSON cannot hold.
 */
function plain(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(plain);
  if (typeof value === 'number' && !Number.isFinite(value)) throw new RangeError(`Cannot save the number ${value}`);
  if (typeof value !== 'object' || value === null) return value;
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) if (v !== undefined) out[key] = plain(v);
  return out;
}

/** An entity's components: no `id` (saved beside them), no `sprite` (render proxy), nothing selected. */
function savedComponents(entity: Entity): EntityComponents {
  const fields: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(entity)) if (key !== 'id' && key !== 'sprite') fields[key] = v;
  // Every Entity field but id / sprite has the schema's shape (EntityComponentsSchemaCheck).
  const components = plain(fields) as EntityComponents;
  if (components.selectable) components.selectable.selected = false;
  return components;
}

const hexColor = (color: number): string => `#${(color & 0xffffff).toString(16).padStart(6, '0').toUpperCase()}`;

function savedPlayer(player: Player, world: EcsWorld): SavedPlayer {
  return {
    id: player.id,
    isHuman: player.isHuman,
    civ: player.civ,
    color: hexColor(player.color),
    age: player.age,
    resources: { ...player.resources },
    population: computePopulation(world.with('owner'), player.id, houseBonus(player)),
    defeated: player.defeated,
    researched: [...player.researched],
    gatherHandicap: player.gatherHandicap,
    ...(player.personality !== undefined ? { personality: player.personality } : {}),
  };
}

/**
 * The match as a v-current save (CLAUDE.md §5.4): entities in
 * `world.entities` order, the map's terrain and blocked mask and every
 * fog as base64, and each AI's state outside the ECS. Reads the match,
 * never changes it.
 */
export function serializeMatch(state: MatchState, now: Date = new Date()): SaveData {
  const { setup, world, players, mapData } = state;
  const human = players.human();
  if (!human) throw new Error('serializeMatch: the match has no human player');
  const entities = world.entities.map((e) => {
    if (e.id === undefined) throw new Error('serializeMatch: an entity has no id');
    return { id: e.id, components: savedComponents(e) };
  });
  const fogOfWar: Record<string, string> = {};
  for (const [id, fog] of state.fogs) fogOfWar[String(id)] = encodeBytes(fog.raw());
  const ai: SaveData['ai'] = {};
  // AIPlayerState is JSON-safe by construction (src/ai/strategyState.ts).
  for (const a of state.ais) ai[String(a.player.id)] = plain(a.snapshot()) as SaveData['ai'][string];
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: now.toISOString(),
    gameTimeMs: state.gameTimeMs,
    setup: { ...setup },
    meta: {
      humanCiv: human.civ,
      humanAge: human.age,
      template: setup.template,
      mapSize: setup.mapSize,
      difficulty: setup.difficulty,
      aiCount: players.ais().length,
    },
    map: {
      width: mapData.width,
      height: mapData.height,
      seed: setup.seed,
      terrain: encodeBytes(mapData.getRawTiles()),
      blocked: encodeBytes(mapData.getRawBlocked()),
    },
    players: players.all().map((p) => savedPlayer(p, world)),
    entities,
    nextEntityId: peekNextEntityId(),
    fogOfWar,
    ai,
    camera: { ...state.camera },
    lightPhase: state.lightPhase,
    stats: state.stats.snapshot(),
  };
}
