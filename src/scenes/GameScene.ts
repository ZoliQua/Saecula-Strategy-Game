import Phaser from 'phaser';
import { DEFAULT_CIV } from '../config/civs';
import { defaultSetupConfig, matchCivs, withSetup, type GameSetupConfig } from '../game/GameSetupConfig';
import { createPlayers, type PlayerManager } from '../game/PlayerManager';
import { VictoryChecker } from '../game/VictoryChecker';
import { queueUnit } from '../ecs/queueUnit';
import { cancelResearch, startResearch, uiWallet } from '../ecs/research';
import { gameEvents } from '../game/events';
import { createEcsWorld, type EcsWorld } from '../ecs/world';
import { UNIQUE_BUILDINGS } from '../config/balance';
import { countPlayerBuildings } from '../game/buildRules';
import { DAY_START_PHASE } from '../config/visual';
import { LightManager } from '../iso/art/lighting/LightManager';
import { tileToScreen } from '../iso/coordinates';
import type { MapData } from '../map/MapData';
import { TerrainBake } from '../map/TerrainBake';
import { TileMap } from '../map/TileMap';
import { buildingTexture, rebaseCivArt, setBuildingBaseOwners, wallTexture } from '../iso/buildingTextures';
import { unitArt } from '../iso/art/units/UnitArt';
import { Loading } from '../ui/screens/Loading';
import { onCommand } from '../ui/events';
import { resetUiStore, uiStore } from '../ui/store';
import { ageUpArtJobs, BackgroundArt, civBaseOwners, planArtLoad, type ArtPainters } from './game/artLoadPlan';
import { BuildPlacement } from './game/BuildPlacement';
import {
  type GeneratedGame,
  spawnPresetWalls,
  spawnResourceNodes,
  spawnStartingEntities,
  tryGenerateGameMap,
} from './game/GameBootstrap';
import { hu } from '../i18n/hu';
import type { SetupReturn } from './GameSetupScene';
import type { AgeId, CivId } from '../types';
import { OrderIssuer } from './game/OrderIssuer';
import { PointerInput } from './game/PointerInput';
import { SystemRunner } from './game/SystemRunner';
import { CameraController } from './systems/CameraController';

/** Main-thread time per frame spent baking terrain while the loading card shows. */
const BAKE_SLICE_MS = 24;
/** Share of the loading bar taken by the terrain bake (the rest: civ art, artLoadPlan). */
const LOAD_SHARE_TERRAIN = 0.9;

/** Scene lifecycle and wiring; logic lives in the helpers under ./game. */
export class GameScene extends Phaser.Scene {
  private tileMap!: TileMap;
  private mapData!: MapData;
  private world!: EcsWorld;
  private players!: PlayerManager;
  private runner!: SystemRunner;
  private placement!: BuildPlacement;
  private victoryChecker!: VictoryChecker;
  private lighting!: LightManager;
  private gameElapsedMs = 0;
  /** Dev builds only (window.__timeScale): game time runs this much faster than real time. */
  private timeScale = 1;
  private gameOverTriggered = false;
  private commandUnsubscribe: (() => void) | null = null;
  /** Civ art left for play (age-2 wall pieces, then each civ's age-up art), painted in spare frame time. */
  private backgroundArt: BackgroundArt | null = null;
  /** Each civ's base owner (civBaseOwners): its building bases are painted in that player's colour. */
  private baseOwners: ReadonlyMap<CivId, number> = new Map();
  /** (civ, age) pairs whose age-up art is already queued. */
  private readonly ageArtQueued = new Set<string>();
  /** Terrain bake in progress (null once the game runs). */
  private bake: {
    terrain: TerrainBake;
    steps: Generator<number, void>;
    loading: Loading;
    frames: number;
    config: GameSetupConfig;
    generated: GeneratedGame;
  } | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(data?: Partial<GameSetupConfig>): void {
    this.cameras.main.setBackgroundColor('#090c12');
    resetUiStore();

    const config = withSetup(defaultSetupConfig(), data ?? {});
    const civs = matchCivs(config);
    this.players = createPlayers(civs.human, civs.ais);
    this.baseOwners = civBaseOwners(this.players.all());
    setBuildingBaseOwners(this.baseOwners);
    // Menu / previous-match bases painted for another player go now (nothing of this match shows yet).
    rebaseCivArt(this, this.baseOwners, new Set());
    this.ageArtQueued.clear();
    uiStore.getState().setCiv(civs.human);
    const generated = tryGenerateGameMap(config);
    if (!generated) {
      // No valid map for this seed: back to the setup card, with the choices kept and a message.
      const back: SetupReturn = { config, notice: hu.setup.mapFailed };
      this.scene.start('MainMenuScene', back);
      return;
    }
    this.mapData = generated.mapData;
    // Lighting first: the map and render proxies register lit sprites and shadows with it.
    this.lighting = new LightManager(this, { phase: DAY_START_PHASE });
    // The terrain bake (seconds on cliff maps) runs a slice per frame behind a loading card.
    const terrain = new TerrainBake(this, this.mapData);
    this.bake = { terrain, steps: this.loadSteps(terrain), loading: new Loading(), frames: 0, config, generated };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.bake) {
        this.bake.loading.destroy();
        this.bake.terrain.destroy();
        this.bake = null;
        this.events.off(Phaser.Scenes.Events.UPDATE, this.onBakeUpdate, this);
      }
      this.lighting.destroy();
      setBuildingBaseOwners(new Map());
    });
    this.events.on(Phaser.Scenes.Events.UPDATE, this.onBakeUpdate, this);
  }

  /**
   * Loading work in slices, with progress 0..1: the terrain bake, then the
   * civ art the first game frames can show (artLoadPlan; the rest is
   * painted during play). Civs not in the match are never painted here.
   */
  private *loadSteps(terrain: TerrainBake): Generator<number, void> {
    for (const p of terrain.steps()) yield p * LOAD_SHARE_TERRAIN;
    const plan = planArtLoad(this.players.human()?.civ ?? DEFAULT_CIV, this.baseOwners, this.artPainters());
    this.backgroundArt = new BackgroundArt(plan.background);
    let done = 0;
    for (const job of plan.critical) {
      job();
      yield LOAD_SHARE_TERRAIN + (1 - LOAD_SHARE_TERRAIN) * (++done / plan.critical.length);
    }
  }

  private artPainters(): ArtPainters {
    return {
      building: (type, civ, owner) => buildingTexture(this, type, 1, owner, civ),
      wall: (piece, age, civ) => wallTexture(this, piece, age, civ),
      unit: (type, civ) => unitArt(this, type, civ, true),
    };
  }

  /** The first age-up of a civ to `age` queues that age's unit sheets and the next age's wall pieces (once per civ and age). */
  private queueAgeUpArt(civ: CivId, age: AgeId): void {
    const id = `${civ}:${age}`;
    if (this.ageArtQueued.has(id)) return;
    this.ageArtQueued.add(id);
    this.backgroundArt?.enqueue(ageUpArtJobs(civ, age, this.artPainters()));
  }

  /** Runs loading slices for up to BAKE_SLICE_MS per frame, then starts the game. */
  private onBakeUpdate(): void {
    const b = this.bake;
    if (!b) return;
    // Let the loading card paint before the first heavy slice.
    if (b.frames++ === 0) return;
    const until = performance.now() + BAKE_SLICE_MS;
    for (;;) {
      const step = b.steps.next();
      if (step.done) {
        this.events.off(Phaser.Scenes.Events.UPDATE, this.onBakeUpdate, this);
        this.bake = null;
        b.loading.destroy();
        this.startGame(b.terrain, b.config, b.generated);
        return;
      }
      b.loading.set(step.value);
      if (performance.now() >= until) return;
    }
  }

  private startGame(terrain: TerrainBake, config: GameSetupConfig, generated: GeneratedGame): void {
    const { mapData, starts, walls } = generated;
    const playerStart = starts[0] ?? { tx: 10, ty: 10 };
    this.tileMap = new TileMap(this, mapData, terrain);
    this.lighting.shadows?.setRock(this.tileMap.rockFootprints());

    const bounds = this.tileMap.getWorldBounds();
    const padding = 200;
    this.cameras.main.setBounds(
      bounds.minX - padding,
      bounds.minY - padding,
      bounds.maxX - bounds.minX + padding * 2,
      bounds.maxY - bounds.minY + padding * 2,
    );
    const startScreen = tileToScreen(playerStart);
    this.cameras.main.setZoom(1.2);
    this.cameras.main.centerOn(startScreen.sx, startScreen.sy);

    const cameraController = new CameraController(this);
    this.world = createEcsWorld();
    this.runner = new SystemRunner(
      this,
      this.world,
      mapData,
      this.tileMap,
      cameraController,
      this.players,
      config.difficulty,
    );
    this.applyCameraGrade();
    this.wireCommands();
    let disposeDev = () => {};
    if (import.meta.env.DEV) {
      // Dev-only tools (AI thoughts overlay, time scale); this import is dropped from production builds.
      let closed = false;
      void import('./game/devTools').then(({ mountDevTools }) => {
        if (closed) return;
        disposeDev = mountDevTools(
          () => this.runner.aiThoughtSources(),
          (scale) => {
            this.timeScale = scale;
          },
        );
      });
      disposeDev = () => {
        closed = true;
      };
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      // Scene events outlive a restart: drop the frame hook, or the next game would run a stale one.
      this.events.off(Phaser.Scenes.Events.UPDATE, this.onUpdate, this);
      disposeDev();
      this.backgroundArt = null;
      this.commandUnsubscribe?.();
      this.commandUnsubscribe = null;
      this.runner.destroy();
      this.tileMap.destroy();
    });

    const resourceNodes = this.world.with('position', 'resourceNode');
    resourceNodes.onEntityRemoved.subscribe((entity) => {
      if (entity.position) {
        this.tileMap.refreshTile(entity.position.tx, entity.position.ty);
      }
    });
    spawnResourceNodes(this.world, mapData);
    spawnStartingEntities(this.world, this.players, mapData, starts);
    spawnPresetWalls(this.world, this.players, mapData, walls);

    this.victoryChecker = new VictoryChecker(this.world, this.players);
    this.gameElapsedMs = 0;
    this.gameOverTriggered = false;

    this.launchHud();

    const orders = new OrderIssuer(this.world, this.runner.selection);
    // The placement ghost reads the hover tile from the pointer handler.
    let pointer: PointerInput | null = null;
    this.placement = new BuildPlacement(
      this,
      this.world,
      mapData,
      this.runner.selection,
      () => pointer?.getHoverTile() ?? null,
      () => this.players.human()?.age ?? 1,
      this.players.human()?.id ?? 1,
      this.players.human()?.civ ?? DEFAULT_CIV,
    );
    pointer = new PointerInput(
      this,
      this.tileMap,
      this.runner.selection,
      this.placement,
      orders,
    );
    pointer.register();
    const input = pointer;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => input.unregister());

    this.events.on(Phaser.Scenes.Events.UPDATE, this.onUpdate, this);
  }

  /** Vignette + gentle saturation lift (WebGL only). */
  private applyCameraGrade(): void {
    if (this.game.renderer.type !== Phaser.WEBGL) return;
    const fx = this.cameras.main.postFX;
    fx.addVignette(0.5, 0.5, 0.92, 0.32);
    fx.addColorMatrix().saturate(0.12);
  }

  private wireCommands(): void {
    const human = this.players.human();
    const find = (id: number) => this.world.entities.find((e) => e.id === id);
    const unsubCommands = onCommand((cmd) => {
      if (cmd.type === 'queue-unit') {
        const trainer = find(cmd.trainerId);
        if (trainer && human && trainer.owner?.playerId === human.id) {
          queueUnit(trainer, cmd.unitType, human.age);
        }
      } else if (cmd.type === 'cancel-queue') {
        const trainer = find(cmd.trainerId);
        if (trainer?.trainingQueue) {
          trainer.trainingQueue.entries.splice(cmd.index, 1);
        }
      } else if (cmd.type === 'research') {
        const building = find(cmd.buildingId);
        if (building && human && building.owner?.playerId === human.id) {
          const result = startResearch(this.world, building, cmd.techId, human, uiWallet());
          if (result.reason === 'already-in-progress') {
            gameEvents.emit('researchRejected', { playerId: human.id, reason: result.reason });
          }
        }
      } else if (cmd.type === 'cancel-research') {
        const building = find(cmd.buildingId);
        if (building?.research && building.owner?.playerId === human?.id) {
          cancelResearch(building, uiWallet());
          this.world.removeComponent(building, 'research');
        }
      }
    });
    // Mirror the human's progress into the UI store (the store is display state only).
    const unsubAge = gameEvents.on('ageChanged', ({ playerId, age }) => {
      if (playerId === human?.id) uiStore.getState().setAge(age);
      const civ = this.players.get(playerId)?.civ;
      if (civ) this.queueAgeUpArt(civ, age);
    });
    const unsubTech = gameEvents.on('techResearched', ({ playerId }) => {
      if (human && playerId === human.id) {
        uiStore.getState().setResearchedTechs([...human.researched]);
      }
    });
    this.commandUnsubscribe = () => {
      unsubCommands();
      unsubAge();
      unsubTech();
    };
  }

  private launchHud(): void {
    if (!this.scene.isActive('HUDScene')) {
      this.scene.launch('HUDScene');
    }
    // Wire the minimap once the HUD scene has finished its own create().
    this.time.delayedCall(50, () => {
      const hud = this.scene.get('HUDScene') as import('./HUDScene').HUDScene;
      hud.setupMinimap(
        this.world,
        this.mapData,
        this.runner.fogData,
        this.cameras.main,
        (tx, ty) => {
          const { sx, sy } = tileToScreen({ tx, ty });
          this.cameras.main.centerOn(sx, sy);
        },
      );
    });
  }

  private onUpdate(time: number, realDelta: number): void {
    const frameStart = performance.now();
    const delta = realDelta * this.timeScale;
    this.runner.update(time, delta);
    this.lighting.update(delta);
    this.placement.updateGhost();

    const prevSecond = Math.floor(this.gameElapsedMs / 1000);
    this.gameElapsedMs += delta;
    if (Math.floor(this.gameElapsedMs / 1000) !== prevSecond) {
      uiStore.getState().setGameTime(this.gameElapsedMs);
      this.syncUniqueBuildings();
    }
    this.checkVictory();
    this.backgroundArt?.update(realDelta, frameStart);
  }

  /** Publishes which limited buildings (wonder) the human already has, for the build menu. */
  private syncUniqueBuildings(): void {
    const human = this.players.human();
    if (!human) return;
    const owned = [...UNIQUE_BUILDINGS].filter(
      (t) => countPlayerBuildings(this.world.entities, human.id, t) > 0,
    );
    const prev = uiStore.getState().uniqueBuilt;
    if (owned.length !== prev.length || owned.some((t, i) => t !== prev[i])) {
      uiStore.getState().setUniqueBuilt(owned);
    }
  }

  private checkVictory(): void {
    if (this.gameOverTriggered) return;
    const state = this.victoryChecker.check();
    if (state.kind === 'playing') return;
    this.gameOverTriggered = true;
    const data = {
      victory: state.kind === 'victory',
      durationMs: this.gameElapsedMs,
    };
    this.scene.launch('GameOverScene', data);
    this.scene.bringToTop('GameOverScene');
    this.scene.pause();
  }
}
