import type { AIPlayerState } from '../ai/strategyState';
import type { Entity } from '../ecs/components';
import { createEcsWorld, setNextEntityId, type EcsWorld } from '../ecs/world';
import type { GameSetupConfig } from '../game/GameSetupConfig';
import { createPlayer, type Player } from '../game/Player';
import { PlayerManager } from '../game/PlayerManager';
import { FogOfWarData } from '../map/FogOfWarData';
import { MapData } from '../map/MapData';
import { MatchStats } from '../stats/MatchStats';
import { decodeBytes } from './base64';
import type { EntityComponents, SaveData, SavedPlayer } from './schema';
import type { MatchState } from './serializer';

/** A save turned back into live match state; the caller builds the systems and AIs on it. */
export interface RestoredMatch {
  /** The saved match's id (the match log keeps one record per id). */
  matchId: string;
  setup: GameSetupConfig;
  players: PlayerManager;
  world: EcsWorld;
  mapData: MapData;
  /** Fog per player id, as saved. */
  fogs: Map<number, FogOfWarData>;
  /** Each AI's saved state, by player id (AIPlayer.restore). */
  aiStates: ReadonlyMap<number, AIPlayerState>;
  gameTimeMs: number;
  camera: MatchState['camera'];
  lightPhase: number;
  /** The saved statistics on the restored world and players (attach it to count on). */
  stats: MatchStats;
}

/** A live entity from saved components (deep-copied, so the save is never aliased). */
function restoredEntity(id: number, components: EntityComponents): Entity {
  const c = structuredClone(components);
  // JSON drops the gatherer's undefined ids; the live component always carries both keys.
  const gatherer = c.gatherer && { ...c.gatherer, targetNodeId: c.gatherer.targetNodeId, dropoffId: c.gatherer.dropoffId };
  if (c.selectable) c.selectable.selected = false;
  // The schema covers exactly Entity minus id / sprite (EntityComponentsSchemaCheck).
  return { ...c, ...(gatherer ? { gatherer } : {}), id } as Entity;
}

function restoredPlayer(p: SavedPlayer): Player {
  return createPlayer({
    id: p.id,
    isHuman: p.isHuman,
    civ: p.civ,
    color: Number.parseInt(p.color.slice(1), 16),
    resources: { ...p.resources },
    age: p.age,
    researched: new Set(p.researched),
    defeated: p.defeated,
    gatherHandicap: p.gatherHandicap,
    ...(p.personality !== undefined ? { personality: p.personality } : {}),
  });
}

/**
 * Rebuilds a match from a (parsed) save: a fresh world with the saved
 * entities added in saved order with their ids, entity ids continuing
 * from `nextEntityId`, the players (population is recomputed by the
 * game, not read), the map, fogs and match statistics. Throws RangeError when a byte array
 * does not fit the map; parseSave rules that out.
 */
export function restoreMatch(save: SaveData): RestoredMatch {
  const { width, height } = save.map;
  const size = width * height;
  const world = createEcsWorld();
  for (const e of save.entities) world.add(restoredEntity(e.id, e.components));
  setNextEntityId(save.nextEntityId);
  const fogs = new Map<number, FogOfWarData>();
  for (const [id, text] of Object.entries(save.fogOfWar)) {
    const fog = new FogOfWarData(width, height);
    fog.load(decodeBytes(text, size));
    fogs.set(Number(id), fog);
  }
  const aiStates = new Map<number, AIPlayerState>();
  for (const [id, state] of Object.entries(save.ai)) aiStates.set(Number(id), structuredClone(state));
  const players = new PlayerManager(save.players.map(restoredPlayer));
  const stats = new MatchStats(world, players, save.gameTimeMs);
  stats.restore(save.stats);
  return {
    matchId: save.matchId,
    setup: { ...save.setup },
    players,
    world,
    mapData: MapData.fromRaw(width, height, decodeBytes(save.map.terrain, size), decodeBytes(save.map.blocked, size)),
    fogs,
    aiStates,
    gameTimeMs: save.gameTimeMs,
    camera: { ...save.camera },
    lightPhase: save.lightPhase,
    stats,
  };
}
