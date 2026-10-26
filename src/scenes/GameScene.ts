import Phaser from 'phaser';
import { defaultSetupConfig, withSetup, type GameSetupConfig } from '../game/GameSetupConfig';
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
import { TileMap } from '../map/TileMap';
import { onCommand } from '../ui/events';
import { resetUiStore, uiStore } from '../ui/store';
import { BuildPlacement } from './game/BuildPlacement';
import {
  generateGameMap,
  spawnResourceNodes,
  spawnStartingEntities,
} from './game/GameBootstrap';
import { OrderIssuer } from './game/OrderIssuer';
import { PointerInput } from './game/PointerInput';
import { SystemRunner } from './game/SystemRunner';
import { CameraController } from './systems/CameraController';

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
  private gameOverTriggered = false;
  private commandUnsubscribe: (() => void) | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(data?: Partial<GameSetupConfig>): void {
    this.cameras.main.setBackgroundColor('#090c12');
    resetUiStore();

    const config = withSetup(defaultSetupConfig(), data ?? {});
    this.players = createPlayers(config.civ, config.aiCount);
    const { mapData, starts } = generateGameMap(config);
    const playerStart = starts[0] ?? { tx: 10, ty: 10 };
    this.mapData = mapData;
    // Lighting first: the map and render proxies register lit sprites and shadows with it.
    this.lighting = new LightManager(this, { phase: DAY_START_PHASE });
    this.tileMap = new TileMap(this, mapData);

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
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.commandUnsubscribe?.();
      this.commandUnsubscribe = null;
      this.runner.destroy();
      this.tileMap.destroy();
      this.lighting.destroy();
    });

    const resourceNodes = this.world.with('position', 'resourceNode');
    resourceNodes.onEntityRemoved.subscribe((entity) => {
      if (entity.position) {
        this.tileMap.refreshTile(entity.position.tx, entity.position.ty);
      }
    });
    spawnResourceNodes(this.world, mapData);
    spawnStartingEntities(this.world, this.players, mapData, starts);

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
    );
    pointer = new PointerInput(
      this,
      this.tileMap,
      this.runner.selection,
      this.placement,
      orders,
    );
    pointer.register();

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
        if (trainer) queueUnit(trainer, cmd.unitType, human?.age);
      } else if (cmd.type === 'cancel-queue') {
        const trainer = find(cmd.trainerId);
        if (trainer?.trainingQueue) {
          trainer.trainingQueue.entries.splice(cmd.index, 1);
        }
      } else if (cmd.type === 'research') {
        const building = find(cmd.buildingId);
        if (building && human && building.owner?.playerId === human.id) {
          startResearch(this.world, building, cmd.techId, human, uiWallet());
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

  private onUpdate(time: number, delta: number): void {
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
