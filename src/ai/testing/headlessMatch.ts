import { CombatSystem } from '../../ecs/systems/CombatSystem';
import { ConstructionSystem } from '../../ecs/systems/ConstructionSystem';
import { DeathSystem } from '../../ecs/systems/DeathSystem';
import { GatheringSystem } from '../../ecs/systems/GatheringSystem';
import { MovementSystem } from '../../ecs/systems/MovementSystem';
import { PathfindingSystem } from '../../ecs/systems/PathfindingSystem';
import { PopulationSystem } from '../../ecs/systems/PopulationSystem';
import { ProjectileSystem } from '../../ecs/systems/ProjectileSystem';
import { ResearchSystem } from '../../ecs/systems/ResearchSystem';
import { TowerCombatSystem } from '../../ecs/systems/TowerCombatSystem';
import { TrainingSystem } from '../../ecs/systems/TrainingSystem';
import { createEcsWorld, type EcsWorld } from '../../ecs/world';
import { createPlayers, type PlayerManager } from '../../game/PlayerManager';
import { generateMap } from '../../map/generator';
import type { FogOfWarData } from '../../map/FogOfWarData';
import type { MapData } from '../../map/MapData';
import { spawnResourceNodes, spawnStartingEntities } from '../../scenes/game/GameBootstrap';
import { resetUiStore } from '../../ui/store';
import { AIPlayer, type AIStrategy } from '../AIPlayer';

export interface HeadlessMatchOptions {
  readonly seed: number;
  readonly size: number;
  readonly aiCount: number;
  /** One strategy per AI player (ids 2..). */
  readonly strategy: (playerId: number) => AIStrategy;
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
 * A skirmish without Phaser: the meadow map, starting entities, every
 * gameplay system in SystemRunner order and the AI players. The human
 * (player 1) stays passive. Used by AI simulation tests.
 */
export function createHeadlessMatch(options: HeadlessMatchOptions): HeadlessMatch {
  resetUiStore();
  const generated = generateMap({
    template: 'meadow',
    width: options.size,
    height: options.size,
    seed: options.seed,
    playerCount: options.aiCount + 1,
  });
  const map = generated.map;
  const world = createEcsWorld();
  const players = createPlayers('hungarian', options.aiCount);
  spawnResourceNodes(world, map);
  spawnStartingEntities(world, players, map, generated.playerStarts);
  const ais = players.ais().map((p) => new AIPlayer(p, options.strategy(p.id)));
  const fogFor = (id: number): FogOfWarData | null => ais.find((a) => a.player.id === id)?.fog ?? null;
  const systems = {
    pathfinding: new PathfindingSystem(world, map),
    gathering: new GatheringSystem(world, map, players),
    construction: new ConstructionSystem(world, map),
    training: new TrainingSystem(world, map, players),
    research: new ResearchSystem(world, players),
    towers: new TowerCombatSystem(world, fogFor),
    combat: new CombatSystem(world, map, players),
    projectiles: new ProjectileSystem(world, players),
    movement: new MovementSystem(world, players),
    death: new DeathSystem(world, map),
    population: new PopulationSystem(world, 1, players),
  };
  let now = 0;
  const step = (dt: number) => {
    now += dt;
    systems.pathfinding.update();
    systems.gathering.update(dt);
    systems.construction.update(dt);
    systems.training.update(dt);
    systems.research.update(dt);
    systems.towers.update(dt);
    systems.combat.update(dt);
    systems.projectiles.update(dt);
    systems.movement.update(dt);
    systems.death.update(dt);
    for (const ai of ais) ai.update({ world, mapData: map, enemyPlayerId: 1 }, dt);
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
