import Phaser from 'phaser';
import { createDefaultPlayers, type PlayerManager } from '../game/PlayerManager';
import { VictoryChecker } from '../game/VictoryChecker';
import { queueUnit } from '../ecs/queueUnit';
import { createEcsWorld, type EcsWorld } from '../ecs/world';
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

  create(): void {
    this.cameras.main.setBackgroundColor('#090c12');
    resetUiStore();

    this.players = createDefaultPlayers();
    const { mapData, playerStart, aiStart } = generateGameMap(this.players);
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
    spawnStartingEntities(this.world, this.players, mapData, playerStart, aiStart);

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
    this.commandUnsubscribe = onCommand((cmd) => {
      if (cmd.type === 'queue-unit') {
        const trainer = this.world.entities.find((e) => e.id === cmd.trainerId);
        if (trainer) queueUnit(trainer, cmd.unitType);
      } else if (cmd.type === 'cancel-queue') {
        const trainer = this.world.entities.find((e) => e.id === cmd.trainerId);
        if (trainer?.trainingQueue) {
          trainer.trainingQueue.entries.splice(cmd.index, 1);
        }
      }
    });
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
    }
    this.checkVictory();
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
