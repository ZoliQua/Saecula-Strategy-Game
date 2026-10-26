import type Phaser from 'phaser';
import { AIPlayer } from '../../ai/AIPlayer';
import { createStrategy } from '../../ai/createStrategy';
import { AmbientFxSystem } from '../../ecs/systems/AmbientFxSystem';
import { CombatFxSystem } from '../../ecs/systems/CombatFxSystem';
import { CombatSystem } from '../../ecs/systems/CombatSystem';
import { ConstructionSystem } from '../../ecs/systems/ConstructionSystem';
import { DeathSystem } from '../../ecs/systems/DeathSystem';
import { FogOfWarSystem } from '../../ecs/systems/FogOfWarSystem';
import { GatheringSystem } from '../../ecs/systems/GatheringSystem';
import { HealthBarSystem } from '../../ecs/systems/HealthBarSystem';
import { MovementSystem } from '../../ecs/systems/MovementSystem';
import { PathfindingSystem } from '../../ecs/systems/PathfindingSystem';
import { PopulationSystem } from '../../ecs/systems/PopulationSystem';
import { ProjectileRenderSystem } from '../../ecs/systems/ProjectileRenderSystem';
import { ProjectileSystem } from '../../ecs/systems/ProjectileSystem';
import { RenderSystem } from '../../ecs/systems/RenderSystem';
import { SelectionSystem } from '../../ecs/systems/SelectionSystem';
import { TrainingSystem } from '../../ecs/systems/TrainingSystem';
import type { EcsWorld } from '../../ecs/world';
import type { Difficulty } from '../../game/GameSetupConfig';
import type { PlayerManager } from '../../game/PlayerManager';
import { FogOfWarData } from '../../map/FogOfWarData';
import type { MapData } from '../../map/MapData';
import type { TileMap } from '../../map/TileMap';
import type { CameraController } from '../systems/CameraController';

/** Owns every per-frame system and ticks them in a fixed, deterministic order. */
export class SystemRunner {
  readonly fogData: FogOfWarData;
  readonly selection: SelectionSystem;
  private readonly render: RenderSystem;
  private readonly pathfinding: PathfindingSystem;
  private readonly movement: MovementSystem;
  private readonly gathering: GatheringSystem;
  private readonly construction: ConstructionSystem;
  private readonly training: TrainingSystem;
  private readonly population: PopulationSystem;
  private readonly combat: CombatSystem;
  private readonly projectiles: ProjectileSystem;
  private readonly projectileRender: ProjectileRenderSystem;
  private readonly death: DeathSystem;
  private readonly healthBars: HealthBarSystem;
  private readonly fogOfWar: FogOfWarSystem;
  private readonly ambientFx: AmbientFxSystem;
  private readonly combatFx: CombatFxSystem;
  private aiPlayers: AIPlayer[] = [];
  private readonly humanId: number | undefined;

  constructor(
    scene: Phaser.Scene,
    private readonly world: EcsWorld,
    private readonly mapData: MapData,
    private readonly tileMap: TileMap,
    private readonly cameraController: CameraController,
    players: PlayerManager,
    difficulty: Difficulty,
  ) {
    this.humanId = players.human()?.id;
    this.render = new RenderSystem(scene, world);
    this.selection = new SelectionSystem(scene, world);
    this.pathfinding = new PathfindingSystem(world, mapData);
    this.movement = new MovementSystem(world);
    this.gathering = new GatheringSystem(world, mapData, players);
    this.construction = new ConstructionSystem(world, mapData);
    this.training = new TrainingSystem(world, mapData);
    this.population = new PopulationSystem(world, 1);
    this.combat = new CombatSystem(world, mapData);
    this.projectiles = new ProjectileSystem(world);
    this.projectileRender = new ProjectileRenderSystem(scene, world);
    this.death = new DeathSystem(world, mapData);
    this.healthBars = new HealthBarSystem(scene, world);
    this.fogData = new FogOfWarData(mapData.width, mapData.height);
    this.fogOfWar = new FogOfWarSystem(world, this.fogData, 1);
    this.render.setFogContext(this.fogData, 1);
    this.ambientFx = new AmbientFxSystem(scene, world);
    this.ambientFx.setFogContext(this.fogData, 1);
    this.projectileRender.setFogContext(this.fogData);
    this.combatFx = new CombatFxSystem(scene, world, this.render);
    this.combatFx.setFogContext(this.fogData);
    this.aiPlayers = players
      .ais()
      .map((p) => new AIPlayer(p, createStrategy(difficulty)));
  }

  update(time: number, delta: number): void {
    this.cameraController.update(delta);
    this.tileMap.update(time, delta);
    this.pathfinding.update();
    this.gathering.update(delta);
    this.construction.update(delta);
    this.training.update(delta);
    this.combat.update(delta);
    this.projectiles.update(delta);
    this.movement.update(delta);
    this.death.update(delta);
    for (const ai of this.aiPlayers) {
      ai.update(
        this.humanId === undefined
          ? { world: this.world, mapData: this.mapData }
          : { world: this.world, mapData: this.mapData, enemyPlayerId: this.humanId },
        delta,
      );
    }
    this.population.update();
    this.fogOfWar.update(delta);
    this.tileMap.applyFog(this.fogData);
    this.selection.update();
    this.render.update();
    this.projectileRender.update();
    this.healthBars.update();
    this.ambientFx.update(delta);
    this.combatFx.update();
  }

  destroy(): void {
    this.ambientFx.destroy();
    this.combatFx.destroy();
    this.projectileRender.destroy();
  }
}
