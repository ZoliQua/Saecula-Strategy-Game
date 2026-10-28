import Phaser from 'phaser';
import { DEFAULT_CIV } from '../config/civs';
import type { Difficulty, GameSetupConfig } from '../game/GameSetupConfig';
import { decidedWinner, gameOverRows } from '../game/gameOverStats';
import type { PlayerManager } from '../game/PlayerManager';
import { browserSaveStore } from '../save/browserStore';
import type { MatchState } from '../save/serializer';
import { SaveStorage, type SlotId } from '../save/storage';
import type { CivId } from '../types';
import type { AgeSpan } from './game/artLoadPlan';
import { VictoryChecker } from '../game/VictoryChecker';
import { queueUnit } from '../ecs/queueUnit';
import { cancelResearch, startResearch, uiWallet } from '../ecs/research';
import { gameEvents } from '../game/events';
import { createEcsWorld, type EcsWorld } from '../ecs/world';
import { WONDER_HOLD_MS } from '../config/balance';
import { DAY_START_PHASE } from '../config/visual';
import { LightManager } from '../iso/art/lighting/LightManager';
import { tileToScreen } from '../iso/coordinates';
import type { MapData } from '../map/MapData';
import { TerrainBake } from '../map/TerrainBake';
import { TileMap } from '../map/TileMap';
import { Loading } from '../ui/screens/Loading';
import { onCommand } from '../ui/events';
import { resetUiStore, uiStore } from '../ui/store';
import { BuildPlacement } from './game/BuildPlacement';
import { MatchArt } from './game/MatchArt';
import { spawnPresetWalls, spawnResourceNodes, spawnStartingEntities } from './game/GameBootstrap';
import { hu } from '../i18n/hu';
import { OrderIssuer } from './game/OrderIssuer';
import { PointerInput } from './game/PointerInput';
import { SystemRunner } from './game/SystemRunner';
import { HudSync } from './game/HudSync';
import { liveMatchState, MatchSave } from './game/MatchSave';
import { applyRestoredView, cameraView, type LoadRequest } from './game/MatchRestore';
import { prepareMatch, runnerFor, startFromSlot, type MatchStart, type MenuReturn } from './game/MatchStart';
import type { GameOverData } from './GameOverScene';
import { CameraController } from './systems/CameraController';

/** Main-thread time per frame spent baking terrain while the loading card shows. */
const BAKE_SLICE_MS = 24;
/** Share of the loading bar taken by the terrain bake (the rest: civ art, artLoadPlan). */
const LOAD_SHARE_TERRAIN = 0.9;

export type { LoadRequest };

/** Scene lifecycle and wiring; logic lives in the helpers under ./game. */
export class GameScene extends Phaser.Scene {
  private tileMap!: TileMap;
  private mapData!: MapData;
  private world!: EcsWorld;
  private players!: PlayerManager;
  private runner!: SystemRunner;
  private placement!: BuildPlacement;
  private victoryChecker!: VictoryChecker;
  private hudSync!: HudSync;
  private setup!: GameSetupConfig;
  private matchSave: MatchSave | null = null;
  private readonly storage = new SaveStorage(browserSaveStore());
  private lighting!: LightManager;
  private gameElapsedMs = 0;
  /** Dev builds only (window.__timeScale): game time runs this much faster than real time. */
  private timeScale = 1;
  private gameOverTriggered = false;
  private difficulty: Difficulty = 'easy';
  private commandUnsubscribe: (() => void) | null = null;
  /** This match's civ art: base owners, loading-card art and the background queue (age-2 walls, age-up art). */
  private matchArt: MatchArt | null = null;
  /** Terrain bake in progress (null once the game runs). */
  private bake: {
    terrain: TerrainBake;
    steps: Generator<number, void>;
    loading: Loading;
    frames: number;
    start: MatchStart;
  } | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(data?: Partial<GameSetupConfig> | LoadRequest): void {
    this.cameras.main.setBackgroundColor('#090c12');
    resetUiStore();
    const prepared = prepareMatch(data);
    if (!prepared.ok) return this.backToMenu(prepared.back);
    const { start, spans } = prepared.match;
    this.setup = prepared.match.setup;
    this.players = prepared.match.players;
    uiStore.getState().setCiv(this.players.human()?.civ ?? DEFAULT_CIV);
    // Only once the match will run (the menu keeps player 1's colour): each civ's bases in its base owner's colour.
    const matchArt = new MatchArt(this, this.players.all());
    this.matchArt = matchArt;
    this.mapData = start.kind === 'new' ? start.generated.mapData : start.restored.mapData;
    // Lighting first: the map and render proxies register lit sprites and shadows with it.
    this.lighting = new LightManager(this, { phase: DAY_START_PHASE });
    // The terrain bake (seconds on cliff maps) runs a slice per frame behind a loading card.
    const terrain = new TerrainBake(this, this.mapData);
    this.bake = { terrain, steps: this.loadSteps(terrain, spans), loading: new Loading(), frames: 0, start };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.bake) {
        this.bake.loading.destroy();
        this.bake.terrain.destroy();
        this.bake = null;
        this.events.off(Phaser.Scenes.Events.UPDATE, this.onBakeUpdate, this);
      }
      this.lighting.destroy();
      matchArt.destroy();
      this.matchArt = null;
    });
    this.events.on(Phaser.Scenes.Events.UPDATE, this.onBakeUpdate, this);
  }

  /**
   * Loading work in slices, with progress 0..1: the terrain bake, then the
   * civ art the first game frames can show (artLoadPlan; the rest is
   * painted during play). Civs not in the match are never painted here.
   */
  private *loadSteps(terrain: TerrainBake, spans?: ReadonlyMap<CivId, AgeSpan>): Generator<number, void> {
    for (const p of terrain.steps()) yield p * LOAD_SHARE_TERRAIN;
    const critical = this.matchArt?.criticalJobs(this.players.human()?.civ ?? DEFAULT_CIV, spans) ?? [];
    let done = 0;
    for (const job of critical) {
      job();
      yield LOAD_SHARE_TERRAIN + (1 - LOAD_SHARE_TERRAIN) * (++done / critical.length);
    }
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
        this.startGame(b.terrain, this.setup, b.start);
        return;
      }
      b.loading.set(step.value);
      if (performance.now() >= until) return;
    }
  }

  private startGame(terrain: TerrainBake, config: GameSetupConfig, start: MatchStart): void {
    const mapData = this.mapData;
    const playerStart = (start.kind === 'new' ? start.generated.starts[0] : undefined) ?? { tx: 10, ty: 10 };
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
    const restored = start.kind === 'load' ? start.restored : null;
    this.world = restored?.world ?? createEcsWorld();
    this.difficulty = config.difficulty;
    // Depleted nodes revert their tile; subscribed before anything (runner, spawns) can remove one.
    this.world.with('position', 'resourceNode').onEntityRemoved.subscribe((entity) => {
      if (entity.position) this.tileMap.refreshTile(entity.position.tx, entity.position.ty);
    });
    const runner = runnerFor(start, config, (o) => new SystemRunner(this, this.world, mapData, this.tileMap, cameraController, this.players, o));
    if (!runner) {
      this.tileMap.destroy();
      return this.backToMenu({ notice: hu.save.errors.loadFailed });
    }
    this.runner = runner;
    this.applyCameraGrade();
    this.wireCommands();
    let disposeDev = () => {};
    if (import.meta.env.DEV) {
      // Dev-only tools (AI thoughts overlay, time scale, saves); this import is dropped from production builds.
      let closed = false;
      void import('./game/devTools').then(({ mountDevTools }) => {
        if (closed) return;
        disposeDev = mountDevTools(
          () => this.runner.aiThoughtSources(),
          (scale) => {
            this.timeScale = scale;
          },
          this.players,
          { saveNow: (slot) => this.saveTo(slot), loadSlot: (slot) => this.loadSlot(slot) },
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
      this.commandUnsubscribe?.();
      this.commandUnsubscribe = null;
      this.runner.destroy();
      this.tileMap.destroy();
      this.matchSave = null;
    });

    if (start.kind === 'new') {
      spawnResourceNodes(this.world, mapData);
      spawnStartingEntities(this.world, this.players, mapData, start.generated.starts);
      spawnPresetWalls(this.world, this.players, mapData, start.generated.walls);
    }

    const wonderHoldMs = config.victory === 'conquest_wonder' ? WONDER_HOLD_MS : null;
    this.victoryChecker = new VictoryChecker(this.world, this.players, wonderHoldMs);
    this.hudSync = new HudSync(this.world, this.players, wonderHoldMs);
    this.gameElapsedMs = restored?.gameTimeMs ?? 0;
    this.gameOverTriggered = false;
    if (restored) applyRestoredView(this, restored, this.lighting);
    this.matchSave = new MatchSave(() => this.captureMatch(), this.storage, this.gameElapsedMs);

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

  /** A match that cannot start: to the menu (a load from a running game leaves its HUD up; it goes too). */
  private backToMenu(data: MenuReturn): void {
    this.scene.stop('HUDScene');
    this.scene.start('MainMenuScene', data);
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
      if (civ) this.matchArt?.onAgeChanged(civ, age);
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
    this.matchSave?.update(delta);

    const prevSecond = Math.floor(this.gameElapsedMs / 1000);
    this.gameElapsedMs += delta;
    if (Math.floor(this.gameElapsedMs / 1000) !== prevSecond) {
      uiStore.getState().setGameTime(this.gameElapsedMs);
      this.hudSync.secondTick();
    }
    this.checkVictory();
    this.matchArt?.update(realDelta, frameStart);
  }

  /** The live match for a save (serializeMatch). */
  private captureMatch(): MatchState {
    return liveMatchState({
      setup: this.setup,
      world: this.world,
      players: this.players,
      mapData: this.mapData,
      fogs: this.runner.fogs(),
      ais: this.runner.ais(),
      gameTimeMs: this.gameElapsedMs,
      camera: cameraView(this.cameras.main),
      lightPhase: this.lighting.getPhase(),
    });
  }

  /** Saves the running match to `slot` (the HUD shows the outcome). */
  saveTo(slot: SlotId): ReturnType<MatchSave['saveTo']> {
    return this.matchSave?.saveTo(slot) ?? Promise.resolve({ ok: false, reason: 'failed' });
  }

  /** Replaces the running match with the save in `slot` (startFromSlot). */
  loadSlot(slot: SlotId): Promise<boolean> {
    return startFromSlot(this, this.storage, slot);
  }

  private checkVictory(): void {
    if (this.gameOverTriggered) return;
    const state = this.victoryChecker.check();
    if (state.kind === 'playing') return;
    this.gameOverTriggered = true;
    const data: GameOverData = {
      victory: state.kind === 'victory',
      durationMs: this.gameElapsedMs,
      cause: state.cause,
      players: gameOverRows(this.players.all(), decidedWinner(state, this.players.all()), this.difficulty),
    };
    this.scene.launch('GameOverScene', data);
    this.scene.bringToTop('GameOverScene');
    this.scene.pause();
  }
}
