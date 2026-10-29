import { CombatSystem } from '../../ecs/systems/CombatSystem';
import { ConstructionSystem } from '../../ecs/systems/ConstructionSystem';
import { DeathSystem } from '../../ecs/systems/DeathSystem';
import { FarmRegenSystem } from '../../ecs/systems/FarmRegenSystem';
import { GatheringSystem } from '../../ecs/systems/GatheringSystem';
import { MovementSystem } from '../../ecs/systems/MovementSystem';
import { PathfindingSystem } from '../../ecs/systems/PathfindingSystem';
import { PopulationSystem } from '../../ecs/systems/PopulationSystem';
import { ProjectileSystem } from '../../ecs/systems/ProjectileSystem';
import { ResearchSystem } from '../../ecs/systems/ResearchSystem';
import { TowerCombatSystem } from '../../ecs/systems/TowerCombatSystem';
import { TrainingSystem } from '../../ecs/systems/TrainingSystem';
import { WonderSystem } from '../../ecs/systems/WonderSystem';
import { createEcsWorld, type EcsWorld } from '../../ecs/world';
import { createPlayers, type PlayerManager } from '../../game/PlayerManager';
import { generateMap, type MapTemplate } from '../../map/generator';
import { FogOfWarData } from '../../map/FogOfWarData';
import type { MapData } from '../../map/MapData';
import type { StatefulRng } from '../../map/random';
import { PathBudget } from '../../map/pathBudget';
import { spawnPresetWalls, spawnResourceNodes, spawnStartingEntities } from '../../scenes/game/GameBootstrap';
import { resetUiStore } from '../../ui/store';
import type { PersonalityId } from '../../config/aiPersonality';
import {
  defaultSetupConfig,
  MAP_SIZE_IDS,
  MAP_SIZES,
  matchCivs,
  type Difficulty,
  type GameSetupConfig,
} from '../../game/GameSetupConfig';
import { restoreMatch } from '../../save/deserializer';
import type { SaveData } from '../../save/schema';
import { serializeMatch, type MatchState } from '../../save/serializer';
import { MatchStats } from '../../stats/MatchStats';
import type { CivId } from '../../types';
import { AIPlayer, type AIStrategy } from '../AIPlayer';
import { applyDifficulty } from '../createStrategy';
import { buildMatchAIs } from '../matchAIs';

export interface HeadlessMatchOptions {
  readonly seed: number;
  readonly size: number;
  /** Map template (default meadow). */
  readonly template?: MapTemplate;
  readonly aiCount: number;
  /** One strategy per AI player (ids 2..). */
  readonly strategy: (playerId: number) => AIStrategy;
  /** The StatefulRng each AI's strategy draws from (snapshot tests; sims use their own createRng). */
  readonly rng?: (playerId: number) => StatefulRng;
  /** Whom each AI attacks (default: the passive human, player 1). */
  readonly enemyOf?: (playerId: number) => number;
  /** Difficulty handicap per AI player (default: none). */
  readonly difficulty?: (playerId: number) => Difficulty;
  /** Drives the human slot (player 1) with an AI too, attacking `humanEnemy` (default: passive human). */
  readonly humanStrategy?: AIStrategy;
  /** Whom the AI-driven human attacks (default player 2; read every step, so it may change). */
  readonly humanEnemy?: () => number;
  /** Civs of the human and the AIs (default: Hungarian human, seeded mixed AIs as in a real game). */
  readonly civs?: { readonly human: CivId; readonly ais: readonly CivId[] };
  /** The match can be won by a Wonder: WonderSystem runs and the AIs play for Wonders (default false). */
  readonly wonderVictory?: boolean;
  /** Personality per AI player, set on the Player before its strategy is built (default: none). */
  readonly personality?: (playerId: number) => PersonalityId | undefined;
}

export interface HeadlessMatch {
  readonly world: EcsWorld;
  readonly map: MapData;
  readonly players: PlayerManager;
  readonly ais: readonly AIPlayer[];
  /** The setup a live game would have had (from the options, or the save it resumed). */
  readonly setup: GameSetupConfig;
  /** The match statistics, counted while the match runs. */
  readonly stats: MatchStats;
  /** Advances every gameplay system (no rendering) by `stepMs`, `totalMs / stepMs` times. */
  run(totalMs: number, stepMs: number, onStep?: (timeMs: number) => boolean | void): void;
  readonly timeMs: () => number;
  /** The match as a save; needs every AI built with an `rng` and no AI-driven human. */
  snapshot(now?: Date): SaveData;
}

/** The setup a headless match stands for: the options over defaultSetupConfig(seed). */
function setupOf(options: HeadlessMatchOptions): GameSetupConfig {
  const mapSize = MAP_SIZE_IDS.find((id) => MAP_SIZES[id].tiles === options.size);
  if (!mapSize) throw new RangeError(`No map size has ${options.size} tiles`);
  return {
    ...defaultSetupConfig(options.seed),
    aiCount: options.aiCount,
    template: options.template ?? 'meadow',
    mapSize,
    difficulty: options.difficulty?.(2) ?? 'medium',
    victory: options.wonderVictory === true ? 'conquest_wonder' : 'conquest',
  };
}

/**
 * A skirmish without Phaser: the template's map (meadow by default), starting entities, every
 * gameplay system in SystemRunner order and the AI players. The human
 * (player 1) stays passive; AIs attack it unless `enemyOf` pits them
 * against each other. Used by AI simulation tests.
 */
export function createHeadlessMatch(options: HeadlessMatchOptions): HeadlessMatch {
  resetUiStore();
  const setup = setupOf(options);
  const generated = generateMap({
    template: setup.template,
    width: options.size,
    height: options.size,
    seed: options.seed,
    playerCount: options.aiCount + 1,
  });
  const map = generated.map;
  const world = createEcsWorld();
  const civs = options.civs ?? matchCivs({ ...defaultSetupConfig(options.seed), aiCount: options.aiCount });
  const players = createPlayers(civs.human, civs.ais);
  spawnResourceNodes(world, map);
  spawnStartingEntities(world, players, map, generated.playerStarts);
  spawnPresetWalls(world, players, map, generated.walls);
  const ais = players.ais().map((p) => {
    if (options.difficulty) applyDifficulty(p, options.difficulty(p.id));
    const personality = options.personality?.(p.id);
    if (personality) p.personality = personality;
    const rng = options.rng?.(p.id);
    return new AIPlayer(p, options.strategy(p.id), rng ? { rng } : {});
  });
  const human = players.human();
  const humanAi = options.humanStrategy && human ? new AIPlayer(human, options.humanStrategy) : null;
  return assemble({
    setup,
    world,
    map,
    players,
    ais,
    humanAi,
    humanEnemy: options.humanEnemy ?? (() => 2),
    enemyOf: options.enemyOf ?? (() => 1),
    startMs: 0,
    camera: { tx: options.size / 2, ty: options.size / 2, zoom: 1 },
    lightPhase: 0,
    stats: new MatchStats(world, players, 0),
  });
}

/**
 * A headless match continued from a save: the saved world, map, fogs and
 * players, and AIs rebuilt and restored by the live game's own
 * buildMatchAIs. AIs attack the human, as in a default headless match.
 */
export function resumeHeadlessMatch(save: SaveData): HeadlessMatch {
  resetUiStore();
  const r = restoreMatch(save);
  const ais = buildMatchAIs(r.players.ais(), {
    seed: r.setup.seed,
    difficulty: r.setup.difficulty,
    fogOf: (id) => r.fogs.get(id) ?? new FogOfWarData(r.mapData.width, r.mapData.height),
    states: r.aiStates,
  });
  return assemble({
    setup: r.setup,
    world: r.world,
    map: r.mapData,
    players: r.players,
    ais,
    humanAi: null,
    humanEnemy: () => 2,
    enemyOf: () => 1,
    startMs: r.gameTimeMs,
    camera: r.camera,
    lightPhase: r.lightPhase,
    stats: r.stats,
  });
}

interface MatchParts {
  readonly setup: GameSetupConfig;
  readonly world: EcsWorld;
  readonly map: MapData;
  readonly players: PlayerManager;
  readonly ais: readonly AIPlayer[];
  readonly humanAi: AIPlayer | null;
  readonly humanEnemy: () => number;
  readonly enemyOf: (playerId: number) => number;
  readonly startMs: number;
  readonly camera: MatchState['camera'];
  readonly lightPhase: number;
  readonly stats: MatchStats;
}

/** The systems and the step loop over a built (or restored) match. */
function assemble(parts: MatchParts): HeadlessMatch {
  const { setup, world, map, players, ais, humanAi, humanEnemy, enemyOf, stats } = parts;
  const human = players.human();
  const fogFor = (id: number): FogOfWarData | null =>
    (id === human?.id ? humanAi?.fog : ais.find((a) => a.player.id === id)?.fog) ?? null;
  // Same per-frame A* budget as the game (scaled to the step length).
  const paths = new PathBudget();
  const wonderVictory = setup.victory === 'conquest_wonder';
  const isDefeated = (id: number) => players.get(id)?.defeated ?? false;
  const systems = {
    pathfinding: new PathfindingSystem(world, map, paths),
    gathering: new GatheringSystem(world, map, players, paths),
    farms: new FarmRegenSystem(world),
    construction: new ConstructionSystem(world, map, paths),
    training: new TrainingSystem(world, map, players),
    research: new ResearchSystem(world, players),
    towers: new TowerCombatSystem(world, fogFor),
    combat: new CombatSystem(world, map, players, paths),
    projectiles: new ProjectileSystem(world, players),
    movement: new MovementSystem(world, players, map),
    death: new DeathSystem(world, map),
    wonders: new WonderSystem(world, wonderVictory),
    population: new PopulationSystem(world, 1, players),
  };
  let now = parts.startMs;
  const step = (dt: number) => {
    now += dt;
    paths.reset(dt);
    systems.pathfinding.update();
    systems.gathering.update(dt);
    systems.farms.update(dt);
    systems.construction.update(dt);
    systems.training.update(dt);
    systems.research.update(dt);
    systems.towers.update(dt);
    systems.combat.update(dt);
    systems.projectiles.update(dt);
    systems.movement.update(dt);
    systems.death.update(dt);
    systems.wonders.update(dt);
    for (const ai of ais) ai.update({ world, mapData: map, wonderVictory, isDefeated, enemyPlayerId: enemyOf(ai.player.id) }, dt);
    humanAi?.update({ world, mapData: map, wonderVictory, isDefeated, enemyPlayerId: humanEnemy() }, dt);
    systems.population.update();
    stats.update(dt);
  };
  return {
    world,
    map,
    players,
    ais,
    setup,
    stats,
    timeMs: () => now,
    snapshot(date) {
      if (humanAi) throw new Error('A headless match with an AI-driven human cannot be saved');
      const fogs = new Map<number, FogOfWarData>();
      for (const ai of ais) if (ai.fog) fogs.set(ai.player.id, ai.fog);
      const state: MatchState = { setup, world, players, mapData: map, fogs, ais, gameTimeMs: now, camera: parts.camera, lightPhase: parts.lightPhase, stats };
      return serializeMatch(state, date);
    },
    run(totalMs, stepMs, onStep) {
      // The stats listen only while the match steps: a headless match is never torn down,
      // so a permanent listener would outlive it (sims build many matches per process).
      const detach = stats.attach();
      try {
        const steps = Math.ceil(totalMs / stepMs);
        for (let i = 0; i < steps; i++) {
          step(stepMs);
          if (onStep?.(now) === true) return;
        }
      } finally {
        detach();
      }
    },
  };
}
