import { CliffBuildingSort } from '../../ecs/systems/occlusion/CliffBuildingSort';
import { DEFAULT_CIV } from '../../config/civs';
import { UnitXRay } from '../../ecs/systems/occlusion/UnitXRay';
import type Phaser from 'phaser';
import { AIPlayer } from '../../ai/AIPlayer';
import { audio } from '../../audio/AudioManager';
import { AudioWatch } from '../../audio/AudioWatch';
import { aiRngSeed, applyDifficulty, createStrategy, hasPersonality } from '../../ai/createStrategy';
import { pickPersonality } from '../../ai/personality';
import type { AIPlayerState } from '../../ai/strategyState';
import type { AIThoughts } from '../../ai/thoughts';
import { AgeUpFxSystem } from '../../ecs/systems/AgeUpFxSystem';
import { AmbientFxSystem } from '../../ecs/systems/AmbientFxSystem';
import { BuildingFxSystem } from '../../ecs/systems/BuildingFxSystem';
import { CombatFxSystem } from '../../ecs/systems/CombatFxSystem';
import { CombatSystem } from '../../ecs/systems/CombatSystem';
import { ConstructionSystem } from '../../ecs/systems/ConstructionSystem';
import { DeathSystem } from '../../ecs/systems/DeathSystem';
import { FarmRegenSystem } from '../../ecs/systems/FarmRegenSystem';
import { FogOfWarSystem } from '../../ecs/systems/FogOfWarSystem';
import { GatheringSystem } from '../../ecs/systems/GatheringSystem';
import { HealthBarSystem } from '../../ecs/systems/HealthBarSystem';
import { MovementSystem } from '../../ecs/systems/MovementSystem';
import { PathfindingSystem } from '../../ecs/systems/PathfindingSystem';
import { PopulationSystem } from '../../ecs/systems/PopulationSystem';
import { ProjectileRenderSystem } from '../../ecs/systems/ProjectileRenderSystem';
import { ProjectileSystem } from '../../ecs/systems/ProjectileSystem';
import { ResearchSystem } from '../../ecs/systems/ResearchSystem';
import { RenderSystem } from '../../ecs/systems/RenderSystem';
import { SelectionSystem } from '../../ecs/systems/SelectionSystem';
import { TowerCombatSystem } from '../../ecs/systems/TowerCombatSystem';
import { TrainingSystem } from '../../ecs/systems/TrainingSystem';
import { WonderSystem } from '../../ecs/systems/WonderSystem';
import type { EcsWorld } from '../../ecs/world';
import { AI_COMMON } from '../../config/aiBalance';
import { AGE_UP_FX, ART_EVICT_INTERVAL_MS } from '../../config/visual';
import { gameEvents } from '../../game/events';
import type { Difficulty } from '../../game/GameSetupConfig';
import type { PlayerManager } from '../../game/PlayerManager';
import { FogOfWarData } from '../../map/FogOfWarData';
import { PathBudget } from '../../map/pathBudget';
import { createStatefulRng } from '../../map/random';
import { PATHFINDS_MAX_PER_TICK, PATHFINDS_PER_FRAME } from '../../config/constants';
import { keepWallKeys } from '../../iso/art/walls/commonWallPieces';
import { screenToTile, type TileCoord } from '../../iso/coordinates';
import type { MapData } from '../../map/MapData';
import type { TileMap } from '../../map/TileMap';
import type { AgeId, CivId } from '../../types';
import type { CameraController } from '../systems/CameraController';

export interface SystemRunnerOptions {
  readonly difficulty: Difficulty;
  /** The match can be won by holding a Wonder: WonderSystem runs and the AIs play for Wonders. */
  readonly wonderVictory: boolean;
  /** The match seed (config.seed). */
  readonly seed: number;
  /**
   * A loaded save: every player's saved fog by id and each AI's saved state.
   * The players' difficulty handicap and personality come from the save too.
   */
  readonly restore?: { readonly fogs: ReadonlyMap<number, FogOfWarData>; readonly ais: ReadonlyMap<number, AIPlayerState> };
}

/** Owns every per-frame system and ticks them in a fixed, deterministic order. */
export class SystemRunner {
  readonly fogData: FogOfWarData;
  readonly selection: SelectionSystem;
  private readonly render: RenderSystem;
  private readonly pathfinding: PathfindingSystem;
  private readonly movement: MovementSystem;
  private readonly gathering: GatheringSystem;
  private readonly farms: FarmRegenSystem;
  private readonly construction: ConstructionSystem;
  private readonly training: TrainingSystem;
  private readonly research: ResearchSystem;
  private readonly population: PopulationSystem;
  private readonly combat: CombatSystem;
  private readonly towers: TowerCombatSystem;
  private readonly projectiles: ProjectileSystem;
  private readonly projectileRender: ProjectileRenderSystem;
  private readonly death: DeathSystem;
  private readonly wonders: WonderSystem;
  private readonly wonderVictory: boolean;
  private readonly isDefeated: (playerId: number) => boolean;
  private readonly healthBars: HealthBarSystem;
  private readonly fogOfWar: FogOfWarSystem;
  private readonly ambientFx: AmbientFxSystem;
  private readonly combatFx: CombatFxSystem;
  private readonly ageUpFx: AgeUpFxSystem;
  private readonly buildingFx: BuildingFxSystem;
  private readonly cliffSort: CliffBuildingSort;
  private readonly xray: UnitXRay;
  /** Game sounds from the ECS; `combatNear()` feeds the combat music. */
  readonly audioWatch: AudioWatch;
  private readonly camera: Phaser.Cameras.Scene2D.Camera;
  private aiPlayers: AIPlayer[] = [];
  /** Every player's fog by id: the human's (1) and each AI's. */
  private readonly fogById: Map<number, FogOfWarData>;
  private readonly humanId: number | undefined;
  private readonly unsubscribeAge: () => void;
  private readonly evictTimer: Phaser.Time.TimerEvent;
  /** Common wall pieces of the ages each civ's owners can show (keepWallKeys): eviction keeps them. */
  private keepWalls: Set<string>;
  /** A* searches shared by every system, refilled each frame. */
  private readonly paths = new PathBudget(PATHFINDS_PER_FRAME, PATHFINDS_MAX_PER_TICK);

  constructor(
    scene: Phaser.Scene,
    private readonly world: EcsWorld,
    private readonly mapData: MapData,
    private readonly tileMap: TileMap,
    private readonly cameraController: CameraController,
    players: PlayerManager,
    options: SystemRunnerOptions,
  ) {
    const { difficulty } = options;
    this.wonderVictory = options.wonderVictory;
    this.isDefeated = (id) => players.get(id)?.defeated ?? false;
    this.humanId = players.human()?.id;
    this.render = new RenderSystem(scene, world);
    this.render.setAgeSource((id) => players.get(id)?.age ?? 1);
    this.render.setCivSource((id) => players.get(id)?.civ ?? DEFAULT_CIV);
    this.keepWalls = keepWallKeys(civAges(players));
    this.selection = new SelectionSystem(scene, world);
    this.selection.setCivSource((id) => players.get(id)?.civ ?? DEFAULT_CIV);
    this.pathfinding = new PathfindingSystem(world, mapData, this.paths);
    this.movement = new MovementSystem(world, players);
    this.gathering = new GatheringSystem(world, mapData, players, this.paths);
    this.farms = new FarmRegenSystem(world);
    this.construction = new ConstructionSystem(world, mapData, this.paths);
    this.training = new TrainingSystem(world, mapData, players);
    this.research = new ResearchSystem(world, players);
    this.population = new PopulationSystem(world, 1, players);
    this.combat = new CombatSystem(world, mapData, players, this.paths);
    this.projectiles = new ProjectileSystem(world, players);
    this.projectileRender = new ProjectileRenderSystem(scene, world);
    this.death = new DeathSystem(world, mapData);
    this.wonders = new WonderSystem(world, options.wonderVictory);
    this.healthBars = new HealthBarSystem(scene, world);
    const { restore } = options;
    const savedFog = (id: number) => restore?.fogs.get(id) ?? new FogOfWarData(mapData.width, mapData.height);
    this.fogData = savedFog(1);
    // Each AI sees through its own fog (perception, towers); scans are staggered across frames.
    const fogs = (this.fogById = new Map<number, FogOfWarData>([[1, this.fogData]]));
    this.aiPlayers = players.ais().map((p, i, all) => {
      const fog = savedFog(p.id);
      fogs.set(p.id, fog);
      if (!restore) {
        applyDifficulty(p, difficulty);
        if (hasPersonality(difficulty)) p.personality = pickPersonality(options.seed, p.id);
      }
      // Seeded per AI (M6 decision 2): a seed replays its AIs and the RNG state can be saved.
      const rng = createStatefulRng(aiRngSeed(options.seed, p.id));
      const strategy = createStrategy(difficulty, rng.next, p.personality);
      const ai = new AIPlayer(p, strategy, { fog, fogPhaseMs: (AI_COMMON.fogScanMs * i) / all.length, rng });
      // Throws on a state of another strategy kind; the caller treats that as a failed load.
      const state = restore?.ais.get(p.id);
      if (state) ai.restore(state);
      return ai;
    });
    this.towers = new TowerCombatSystem(world, (id) => fogs.get(id) ?? null);
    this.fogOfWar = new FogOfWarSystem(world, this.fogData, 1);
    this.render.setFogContext(this.fogData, 1);
    this.ambientFx = new AmbientFxSystem(scene, world);
    this.ambientFx.setFogContext(this.fogData, 1);
    this.projectileRender.setFogContext(this.fogData);
    this.combatFx = new CombatFxSystem(scene, world, this.render);
    this.combatFx.setFogContext(this.fogData);
    this.ageUpFx = new AgeUpFxSystem(scene, world, this.render);
    this.buildingFx = new BuildingFxSystem(scene, world);
    this.cliffSort = new CliffBuildingSort(world, tileMap);
    this.render.setBuildingDepth((e, depth) => this.cliffSort.depthOf(e, depth));
    this.xray = new UnitXRay(scene, world, tileMap.coverSources());
    this.selection.setRaisedDepth((e) => this.xray.raisedDepth(e));
    this.buildingFx.setFogContext(this.fogData);
    this.evictTimer = scene.time.addEvent({
      delay: ART_EVICT_INTERVAL_MS,
      loop: true,
      callback: () => {
        this.render.releaseUnusedArt(this.keepWalls);
        this.render.releaseAbsentCivs(activeCivs(players));
      },
    });
    // Once the age-up wave has played out, drop age styles nobody shows any more (per civ).
    this.unsubscribeAge = gameEvents.on('ageChanged', () => {
      this.keepWalls = keepWallKeys(civAges(players));
      scene.time.delayedCall(AGE_UP_FX.maxSpreadMs + AGE_UP_FX.swapMs + 1500, () => {
        const active = players.all().filter((p) => !p.defeated);
        if (active.length === 0) return;
        this.render.releaseStaleAgeArt(
          (id) => active.find((p) => p.id === id)?.age,
          (civ) => minAge(active.filter((p) => p.civ === civ).map((p) => p.age)),
        );
      });
    });
    this.camera = scene.cameras.main;
    this.audioWatch = new AudioWatch(world, audio(), this.humanId, () => this.cameraTile());
    this.updateListener();
    // Game start: the menu / preload art of civs not in this match goes now (design decision 7).
    this.render.releaseAbsentCivs(activeCivs(players));
  }

  /** The AI players, in tick order (saved games snapshot and restore them). */
  ais(): readonly AIPlayer[] {
    return this.aiPlayers;
  }

  /** Every player's fog of war by player id (saved games). */
  fogs(): ReadonlyMap<number, FogOfWarData> {
    return this.fogById;
  }

  /** What each AI is thinking, for the dev-only overlay. */
  aiThoughtSources(): { playerId: number; color: number; age: number; thoughts: AIThoughts | undefined }[] {
    return this.aiPlayers.map((ai) => ({
      playerId: ai.player.id,
      color: ai.player.color,
      age: ai.player.age,
      thoughts: ai.strategy.thoughts?.(),
    }));
  }

  update(time: number, delta: number): void {
    this.cameraController.update(delta);
    this.tileMap.update(time, delta);
    this.paths.reset(delta);
    this.pathfinding.update();
    this.gathering.update(delta);
    this.farms.update(delta);
    this.construction.update(delta);
    this.training.update(delta);
    this.research.update(delta);
    this.towers.update(delta);
    this.combat.update(delta);
    this.projectiles.update(delta);
    this.movement.update(delta);
    this.death.update(delta);
    this.wonders.update(delta);
    const base = { world: this.world, mapData: this.mapData, wonderVictory: this.wonderVictory, isDefeated: this.isDefeated };
    for (const ai of this.aiPlayers) {
      ai.update(this.humanId === undefined ? base : { ...base, enemyPlayerId: this.humanId }, delta);
    }
    this.population.update();
    this.fogOfWar.update(delta);
    this.tileMap.applyFog(this.fogData);
    this.render.update();
    this.xray.update();
    // After the X-ray: selection rings follow this frame's raised depths (xray.raisedDepth).
    this.selection.update();
    this.buildingFx.update(delta);
    this.projectileRender.update();
    this.healthBars.update();
    this.ambientFx.update(delta);
    this.combatFx.update();
    this.updateListener();
    this.audioWatch.update(time);
  }

  /** The tile under the camera centre (the audio listener). */
  private cameraTile(): TileCoord {
    const cam = this.camera;
    return screenToTile({ sx: cam.scrollX + cam.width * cam.originX, sy: cam.scrollY + cam.height * cam.originY });
  }

  /** The audio listener: the camera centre, hearing only what the human currently sees (no fog leak). */
  private updateListener(): void {
    const fog = this.fogData;
    audio().setListener(this.cameraTile(), (tx, ty) => fog.isVisible(tx, ty));
  }

  destroy(): void {
    this.audioWatch.destroy();
    this.unsubscribeAge();
    this.evictTimer.remove();
    this.cliffSort.destroy();
    this.xray.destroy();
    this.ageUpFx.destroy();
    this.buildingFx.destroy();
    this.ambientFx.destroy();
    this.combatFx.destroy();
    this.projectileRender.destroy();
  }
}

/** Civs of the players still in the game. */
function activeCivs(players: PlayerManager): Set<CivId> {
  return new Set(players.all().filter((p) => !p.defeated).map((p) => p.civ));
}

/** Ages each civ's active players are in. */
function civAges(players: PlayerManager): Map<CivId, Set<AgeId>> {
  const out = new Map<CivId, Set<AgeId>>();
  for (const p of players.all()) {
    if (p.defeated) continue;
    out.set(p.civ, (out.get(p.civ) ?? new Set<AgeId>()).add(p.age));
  }
  return out;
}

/** Lowest of `ages`, or undefined when empty. */
function minAge(ages: readonly AgeId[]): AgeId | undefined {
  return ages.length === 0 ? undefined : (Math.min(...ages) as AgeId);
}
