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
import type { FogOfWarData } from '../../map/FogOfWarData';
import type { MapData } from '../../map/MapData';
import { PathBudget } from '../../map/pathBudget';
import { spawnPresetWalls, spawnResourceNodes, spawnStartingEntities } from '../../scenes/game/GameBootstrap';
import { resetUiStore } from '../../ui/store';
import { defaultSetupConfig, matchCivs, type Difficulty } from '../../game/GameSetupConfig';
import type { CivId } from '../../types';
import { AIPlayer, type AIStrategy } from '../AIPlayer';
import { applyDifficulty } from '../createStrategy';

export interface HeadlessMatchOptions {
  readonly seed: number;
  readonly size: number;
  /** Map template (default meadow). */
  readonly template?: MapTemplate;
  readonly aiCount: number;
  /** One strategy per AI player (ids 2..). */
  readonly strategy: (playerId: number) => AIStrategy;
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
}

export interface HeadlessMatch {
  readonly world: EcsWorld;
  readonly map: MapData;
  readonly players: PlayerManager;
  readonly ais: readonly AIPlayer[];
  /** Advances every gameplay system (no rendering) by `stepMs`, `totalMs / stepMs` times. */
  run(totalMs: number, stepMs: number, onStep?: (timeMs: number) => boolean | void): void;
  readonly timeMs: () => number;
}

/**
 * A skirmish without Phaser: the template's map (meadow by default), starting entities, every
 * gameplay system in SystemRunner order and the AI players. The human
 * (player 1) stays passive; AIs attack it unless `enemyOf` pits them
 * against each other. Used by AI simulation tests.
 */
export function createHeadlessMatch(options: HeadlessMatchOptions): HeadlessMatch {
  resetUiStore();
  const generated = generateMap({
    template: options.template ?? 'meadow',
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
    return new AIPlayer(p, options.strategy(p.id));
  });
  const human = players.human();
  const humanAi = options.humanStrategy && human ? new AIPlayer(human, options.humanStrategy) : null;
  const humanEnemy = options.humanEnemy ?? (() => 2);
  const enemyOf = options.enemyOf ?? (() => 1);
  const fogFor = (id: number): FogOfWarData | null =>
    (id === human?.id ? humanAi?.fog : ais.find((a) => a.player.id === id)?.fog) ?? null;
  // Same per-frame A* budget as the game (scaled to the step length).
  const paths = new PathBudget();
  const wonderVictory = options.wonderVictory ?? false;
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
    movement: new MovementSystem(world, players),
    death: new DeathSystem(world, map),
    wonders: new WonderSystem(world, wonderVictory),
    population: new PopulationSystem(world, 1, players),
  };
  let now = 0;
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
  };
  return {
    world,
    map,
    players,
    ais,
    timeMs: () => now,
    run(totalMs, stepMs, onStep) {
      const steps = Math.ceil(totalMs / stepMs);
      for (let i = 0; i < steps; i++) {
        step(stepMs);
        if (onStep?.(now) === true) return;
      }
    },
  };
}
