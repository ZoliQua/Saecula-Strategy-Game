import { clearUnitOrders } from '../ecs/orders';
import { buildingHpMultiplier } from '../game/modifiers';
import Phaser from 'phaser';
import { DEFAULT_CIV } from '../config/civs';
import { CAMERA_BOUNDS_PADDING } from '../config/constants';
import { hasWonderVictory, startResourcesFor, type Difficulty, type GameSetupConfig } from '../game/GameSetupConfig';
import { timeRuleFor } from '../game/timeVictory';
import { decidedWinner, gameOverRows } from '../game/gameOverStats';
import type { PlayerManager } from '../game/PlayerManager';
import { browserSaveStore } from '../save/browserStore';
import type { MatchState } from '../save/serializer';
import { SaveStorage, type SlotId } from '../save/storage';
import { VictoryChecker } from '../game/VictoryChecker';
import { cancelQueuedUnit, queueUnit } from '../ecs/queueUnit';
import { cancelResearch, startResearch, uiWallet } from '../ecs/research';
import { gameEvents } from '../game/events';
import { isFriendly } from '../game/diplomacy';
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
import type { BuildPlacement } from './game/BuildPlacement';
import { MatchArt, type LoadArt } from './game/MatchArt';
import { spawnPresetWalls, spawnResourceNodes, spawnStartingEntities } from './game/GameBootstrap';
import { hu } from '../i18n/hu';
import { wirePlayerInput } from './game/PlayerInputWiring';
import { wirePause } from './game/PauseWiring';
import { SystemRunner } from './game/SystemRunner';
import { HudSync } from './game/HudSync';
import { wireHudControls } from './game/HudControls';
import { CampaignRunner } from './game/CampaignRunner';
import type { SaveData } from '../save/schema';
import { liveMatchState, MatchSave, type SaveOutcome } from './game/MatchSave';
import { MatchRecorder } from './game/MatchRecorder';
import { gameDelta } from './game/gameClock';
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
  /** The campaign mission of this match (M13), or null. */
  private campaign: CampaignRunner | null = null;
  private victoryChecker!: VictoryChecker;
  private hudSync!: HudSync;
  private setup!: GameSetupConfig;
  private matchId = '';
  private matchSave: MatchSave | null = null;
  private recorder: MatchRecorder | null = null;
  private readonly storage = new SaveStorage(browserSaveStore());
  private lighting!: LightManager;
  private gameElapsedMs = 0;
  /** Dev builds only (window.__timeScale): game time runs this much faster than real time. */
  private timeScale = 1;
  private gameOverTriggered = false;
  /** The WebGL context was lost (emergencySave): the match never runs again in this page. */
  private contextLost = false;
  /** The save this scene is loading (a LoadRequest), kept until the match runs: a lost context during the bake stores it again. */
  private loadingSave: SaveData | null = null;
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
    this.contextLost = false;
    this.loadingSave = data && 'load' in data ? data.load : null;
    const prepared = prepareMatch(data);
    if (!prepared.ok) return this.backToMenu(prepared.back);
    const { start, art } = prepared.match;
    ({ setup: this.setup, matchId: this.matchId } = prepared.match);
    this.players = prepared.match.players;
    // The human's stock lives in the UI store during play: a new match starts it from the setup's preset (a save restores it).
    if (start.kind === 'new') uiStore.getState().setResources(startResourcesFor(this.setup));
    uiStore.getState().setCiv(this.players.human()?.civ ?? DEFAULT_CIV);
    // Only once the match will run (the menu keeps player 1's colour): each civ's bases in its base owner's colour.
    const matchArt = new MatchArt(this, this.players.all(), () => this.runner.evictUnusedArt());
    this.matchArt = matchArt;
    this.mapData = start.kind === 'new' ? start.generated.mapData : start.restored.mapData;
    // Lighting first: the map and render proxies register lit sprites and shadows with it.
    this.lighting = new LightManager(this, { phase: DAY_START_PHASE });
    // The terrain bake (seconds on cliff maps) runs a slice per frame behind a loading card.
    const terrain = new TerrainBake(this, this.mapData);
    this.bake = { terrain, steps: this.loadSteps(terrain, art), loading: new Loading(), frames: 0, start };
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
  private *loadSteps(terrain: TerrainBake, art?: LoadArt): Generator<number, void> {
    for (const p of terrain.steps()) yield p * LOAD_SHARE_TERRAIN;
    const critical = this.matchArt?.criticalJobs(this.players.human()?.civ ?? DEFAULT_CIV, art) ?? [];
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
        this.loadingSave = null;
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
    const padding = CAMERA_BOUNDS_PADDING;
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

    const wonderHoldMs = hasWonderVictory(config.victory) ? WONDER_HOLD_MS : null;
    this.gameElapsedMs = restored?.gameTimeMs ?? 0;
    const time = timeRuleFor(config.victory, this.runner.stats, () => this.gameElapsedMs);
    this.campaign = config.mission ? new CampaignRunner(this.world, this.players, config.mission, restored?.campaign?.done) : null;
    if (this.campaign && !restored) CampaignRunner.publishStart(this.players);
    this.victoryChecker = new VictoryChecker(this.world, this.players, wonderHoldMs, time, this.campaign);
    const treatyLeft = config.treatyMin > 0 ? () => this.runner.treatyLeftMs() : null;
    this.hudSync = new HudSync(this.world, this.players, wonderHoldMs, this.runner.stats, time, treatyLeft);
    this.gameOverTriggered = false;
    if (restored) applyRestoredView(this, restored, this.lighting);
    this.matchSave = new MatchSave(() => this.captureMatch(), this.storage, this.gameElapsedMs);
    this.recorder = MatchRecorder.forMatch({ matchId: this.matchId, setup: this.setup, world: this.world, players: this.players, stats: this.runner.stats, startMs: this.gameElapsedMs, now: () => this.gameElapsedMs });

    this.launchHud();
    this.campaign?.secondTick(this.gameElapsedMs);

    const human = this.players.human();
    const openPause = wirePause(this, (slot) => this.saveTo(slot, { quiet: true }), this.storage, () => this.recorder?.abandon());
    this.placement = wirePlayerInput(this, {
      world: this.world,
      mapData,
      tileMap: this.tileMap,
      selection: this.runner.selection,
      fog: this.runner.fogData,
      humanId: human?.id ?? 1,
      teams: this.players,
      treaty: this.runner.treaty,
      civ: human?.civ ?? DEFAULT_CIV,
      age: () => this.players.human()?.age ?? 1,
      buildingHp: () => {
        const p = this.players.human();
        return p ? buildingHpMultiplier(p) : 1;
      },
      onIdleEscape: openPause,
    });
    wireHudControls(this, { world: this.world, selection: this.runner.selection, camera: cameraController, humanId: human?.id ?? 1 });
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
          queueUnit(trainer, cmd.unitType, human);
        }
      } else if (cmd.type === 'unload-transport') {
        // Unload here: the cargo goes ashore on the land beside the transport (M14).
        const ship = find(cmd.unitId);
        if (ship?.position && ship.cargo && ship.cargo.units.length > 0 && ship.owner?.playerId === human?.id) {
          clearUnitOrders(this.world, ship);
          if (ship.movable) {
            ship.movable.path = [];
            ship.movable.progress = 0;
          }
          this.world.addComponent(ship, 'unloadIntent', { target: { tx: ship.position.tx, ty: ship.position.ty } });
        }
      } else if (cmd.type === 'cancel-queue') {
        const trainer = find(cmd.trainerId);
        if (trainer && trainer.owner?.playerId === human?.id) cancelQueuedUnit(trainer, cmd.index, uiWallet());
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
        (ownerId) => isFriendly(this.players, ownerId, this.players.human()?.id ?? 1),
      );
    });
  }

  private onUpdate(time: number, realDelta: number): void {
    // After a lost context nothing may advance the saved match (a resumed pause menu included).
    if (this.contextLost) return;
    const frameStart = performance.now();
    const delta = gameDelta(realDelta, this.setup.speed, this.timeScale);
    this.runner.update(time, delta, realDelta);
    this.lighting.update(delta);
    this.placement.updateGhost();

    const prevSecond = Math.floor(this.gameElapsedMs / 1000);
    this.gameElapsedMs += delta;
    if (Math.floor(this.gameElapsedMs / 1000) !== prevSecond) {
      uiStore.getState().setGameTime(this.gameElapsedMs);
      this.hudSync.secondTick();
      this.campaign?.secondTick(this.gameElapsedMs);
    }
    this.checkVictory();
    this.matchSave?.update(delta, this.gameOverTriggered);
    this.matchArt?.update(realDelta, frameStart);
  }

  /** The live match for a save (serializeMatch). */
  private captureMatch(): MatchState {
    return liveMatchState({
      matchId: this.matchId,
      setup: this.setup,
      world: this.world,
      players: this.players,
      mapData: this.mapData,
      fogs: this.runner.fogs(),
      ais: this.runner.ais(),
      gameTimeMs: this.gameElapsedMs,
      camera: cameraView(this.cameras.main),
      lightPhase: this.lighting.getPhase(),
      stats: this.runner.stats,
      ...(this.campaign ? { campaign: this.campaign.state() } : {}),
    });
  }

  /** Saves the running match to `slot` (the HUD shows the outcome unless `quiet`: the pause card shows it). */
  saveTo(slot: SlotId, options?: { quiet?: boolean }): ReturnType<MatchSave['saveTo']> {
    return this.matchSave?.saveTo(slot, options) ?? Promise.resolve({ ok: false, reason: 'failed' });
  }

  /**
   * The WebGL context was lost (contextGuard): stops the match and saves it
   * to the autosave slot. Null without an undecided match (nothing to save).
   */
  emergencySave(): Promise<SaveOutcome> | null {
    if (this.contextLost || this.gameOverTriggered) return null;
    // A saved match still loading (terrain bake): its save goes to the autosave slot as it is.
    if (this.loadingSave) {
      this.contextLost = true;
      // The bake would end in startGame on the dead context: no further slices.
      this.scene.pause();
      return this.storage.write('auto', this.loadingSave);
    }
    if (!this.matchSave) return null;
    this.contextLost = true;
    this.scene.pause();
    return this.matchSave.saveTo('auto', { quiet: true });
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
    const winnerId = decidedWinner(state, this.players.all());
    this.recorder?.gameOver(MatchRecorder.endOf(state, winnerId));
    const data: GameOverData = {
      victory: state.kind === 'victory',
      durationMs: this.gameElapsedMs,
      cause: state.cause,
      players: gameOverRows(this.players.all(), winnerId, this.difficulty),
      teams: this.players.hasTeams(),
      ...(this.campaign ? { missionText: this.campaign.finish(state.kind === 'victory') } : {}),
    };
    this.scene.launch('GameOverScene', data);
    this.scene.bringToTop('GameOverScene');
    this.scene.pause();
  }
}
