import Phaser from 'phaser';
import { DEFAULT_MAP_SIZE } from '../config/constants';
import {
  createDefaultPlayers,
  PlayerManager,
} from '../game/PlayerManager';
import { VictoryChecker } from '../game/VictoryChecker';
import { AIPlayer } from '../ai/AIPlayer';
import { EasyStrategy } from '../ai/strategies/EasyStrategy';
import { BUILDING_SPECS, createBuilding } from '../ecs/archetypes/building';
import {
  createResourceNode,
  TERRAIN_RESOURCE,
} from '../ecs/archetypes/resource';
import { createVillager } from '../ecs/archetypes/villager';
import { queueUnit } from '../ecs/queueUnit';
import { CombatSystem } from '../ecs/systems/CombatSystem';
import { ConstructionSystem } from '../ecs/systems/ConstructionSystem';
import { AmbientFxSystem } from '../ecs/systems/AmbientFxSystem';
import { DeathSystem } from '../ecs/systems/DeathSystem';
import { FogOfWarSystem } from '../ecs/systems/FogOfWarSystem';
import { GatheringSystem } from '../ecs/systems/GatheringSystem';
import { HealthBarSystem } from '../ecs/systems/HealthBarSystem';
import { FogOfWarData } from '../map/FogOfWarData';
import { MovementSystem } from '../ecs/systems/MovementSystem';
import { PopulationSystem } from '../ecs/systems/PopulationSystem';
import { TrainingSystem } from '../ecs/systems/TrainingSystem';
import { onCommand } from '../ui/events';
import { PathfindingSystem } from '../ecs/systems/PathfindingSystem';
import { RenderSystem } from '../ecs/systems/RenderSystem';
import { SelectionSystem } from '../ecs/systems/SelectionSystem';
import { createEcsWorld, type EcsWorld } from '../ecs/world';
import type { TileCoord } from '../iso/coordinates';
import { tileEquals, tileToScreen } from '../iso/coordinates';
import { ART_SCALE, BUILDING_BOTTOM_PAD } from '../iso/art/canvas';
import { pickTile } from '../iso/picking';
import { generateMap } from '../map/generator';
import { TileMap } from '../map/TileMap';
import { resetUiStore, uiStore } from '../ui/store';
import { CameraController } from './systems/CameraController';

export class GameScene extends Phaser.Scene {
  private tileMap!: TileMap;
  private cameraController!: CameraController;
  private world!: EcsWorld;
  private renderSystem!: RenderSystem;
  private selectionSystem!: SelectionSystem;
  private pathfindingSystem!: PathfindingSystem;
  private movementSystem!: MovementSystem;
  private gatheringSystem!: GatheringSystem;
  private constructionSystem!: ConstructionSystem;
  private trainingSystem!: TrainingSystem;
  private populationSystem!: PopulationSystem;
  private combatSystem!: CombatSystem;
  private deathSystem!: DeathSystem;
  private healthBarSystem!: HealthBarSystem;
  private ambientFx!: AmbientFxSystem;
  private fogOfWarSystem!: FogOfWarSystem;
  private fogData!: FogOfWarData;
  private players!: PlayerManager;
  private aiPlayers: AIPlayer[] = [];
  private victoryChecker!: VictoryChecker;
  private gameElapsedMs = 0;
  private gameOverTriggered = false;
  private commandUnsubscribe: (() => void) | null = null;
  private buildGhost: Phaser.GameObjects.Image | null = null;
  private dragStart: { sx: number; sy: number; screenX: number; screenY: number } | null = null;
  private dragRect: Phaser.GameObjects.Rectangle | null = null;
  private readonly DRAG_THRESHOLD_PX = 8;
  private mapData!: import('../map/MapData').MapData;
  private hoverTile: TileCoord | null = null;
  private playerStart: TileCoord = { tx: 10, ty: 10 };
  private aiStart: TileCoord = { tx: 50, ty: 50 };

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#090c12');
    resetUiStore();

    this.players = createDefaultPlayers();
    const generated = generateMap({
      template: 'meadow',
      width: DEFAULT_MAP_SIZE,
      height: DEFAULT_MAP_SIZE,
      seed: 42,
      playerCount: this.players.all().length,
    });
    this.mapData = generated.map;
    this.tileMap = new TileMap(this, this.mapData);
    this.playerStart = generated.playerStarts[0] ?? { tx: 10, ty: 10 };
    this.aiStart = generated.playerStarts[1] ?? { tx: 50, ty: 50 };

    const bounds = this.tileMap.getWorldBounds();
    const padding = 200;
    this.cameras.main.setBounds(
      bounds.minX - padding,
      bounds.minY - padding,
      bounds.maxX - bounds.minX + padding * 2,
      bounds.maxY - bounds.minY + padding * 2,
    );

    const startScreen = this.playerStartScreen();
    this.cameras.main.setZoom(1.2);
    this.cameras.main.centerOn(startScreen.sx, startScreen.sy);

    this.cameraController = new CameraController(this);

    this.world = createEcsWorld();
    this.renderSystem = new RenderSystem(this, this.world);
    this.selectionSystem = new SelectionSystem(this, this.world);
    this.pathfindingSystem = new PathfindingSystem(this.world, this.mapData);
    this.movementSystem = new MovementSystem(this.world);
    this.gatheringSystem = new GatheringSystem(
      this.world,
      this.mapData,
      this.players,
    );
    this.constructionSystem = new ConstructionSystem(this.world, this.mapData);
    this.trainingSystem = new TrainingSystem(this.world, this.mapData);
    this.populationSystem = new PopulationSystem(this.world, 1);
    this.combatSystem = new CombatSystem(this.world, this.mapData);
    this.deathSystem = new DeathSystem(this.world, this.mapData);
    this.healthBarSystem = new HealthBarSystem(this, this.world);
    this.fogData = new FogOfWarData(this.mapData.width, this.mapData.height);
    this.fogOfWarSystem = new FogOfWarSystem(this.world, this.fogData, 1);
    this.renderSystem.setFogContext(this.fogData, 1);
    this.ambientFx = new AmbientFxSystem(this, this.world);
    this.ambientFx.setFogContext(this.fogData, 1);
    this.applyCameraGrade();

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
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.commandUnsubscribe?.();
      this.commandUnsubscribe = null;
      this.ambientFx.destroy();
      this.tileMap.destroy();
    });

    const resourceNodes = this.world.with('position', 'resourceNode');
    resourceNodes.onEntityRemoved.subscribe((entity) => {
      if (entity.position) {
        this.tileMap.refreshTile(entity.position.tx, entity.position.ty);
      }
    });

    this.spawnResourceNodes();

    for (const player of this.players.all()) {
      const start = player.isHuman ? this.playerStart : this.aiStart;
      const tcOrigin = { tx: start.tx - 1, ty: start.ty - 1 };
      createBuilding(this.world, {
        type: 'town_center',
        origin: tcOrigin,
        playerId: player.id,
        mapData: this.mapData,
      });
      for (const dx of [-1, 0, 1]) {
        createVillager(this.world, {
          tile: { tx: start.tx + dx, ty: start.ty + 3 },
          playerId: player.id,
        });
      }
    }
    this.aiPlayers = this.players
      .ais()
      .map((p) => new AIPlayer(p, new EasyStrategy()));
    this.victoryChecker = new VictoryChecker(this.world, this.players);
    this.gameElapsedMs = 0;
    this.gameOverTriggered = false;

    if (!this.scene.isActive('HUDScene')) {
      this.scene.launch('HUDScene');
    }
    // Wire the minimap once the HUD scene has finished its own create().
    this.time.delayedCall(50, () => {
      const hud = this.scene.get('HUDScene') as import('./HUDScene').HUDScene;
      hud.setupMinimap(this.world, this.mapData, this.fogData, this.cameras.main, (tx, ty) => {
        const { sx, sy } = tileToScreen({ tx, ty });
        this.cameras.main.centerOn(sx, sy);
      });
    });

    this.events.on(Phaser.Scenes.Events.UPDATE, this.onUpdate, this);

    this.input.mouse?.disableContextMenu();
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    this.input.keyboard?.on('keydown-ESC', () => {
      uiStore.getState().setPlacementBuilding(null);
    });

  }

  /** Vignette + gentle saturation lift (WebGL only). */
  private applyCameraGrade(): void {
    if (this.game.renderer.type !== Phaser.WEBGL) return;
    const fx = this.cameras.main.postFX;
    fx.addVignette(0.5, 0.5, 0.92, 0.32);
    fx.addColorMatrix().saturate(0.12);
  }

  private spawnResourceNodes(): void {
    this.mapData.forEachTile(({ tx, ty }, terrain) => {
      const type = TERRAIN_RESOURCE[terrain];
      if (!type) return;
      createResourceNode(this.world, { tile: { tx, ty }, type });
    });
  }

  private playerStartScreen(): { sx: number; sy: number } {
    const { tx, ty } = this.playerStart;
    return {
      sx: (tx - ty) * 32,
      sy: (tx + ty) * 16,
    };
  }

  /** The DOM HUD sits above the canvas; ignore pointer events aimed at it. */
  private isPointerOverHud(pointer: Phaser.Input.Pointer): boolean {
    const target = pointer.event?.target;
    return target !== undefined && target !== null && target !== this.game.canvas;
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    const tile = pickTile(
      pointer.x,
      pointer.y,
      this.cameras.main,
      this.tileMap.width,
      this.tileMap.height,
    );
    if (tile === null && this.hoverTile !== null) {
      this.hoverTile = null;
      this.tileMap.setHoverTile(null);
    } else if (tile && (!this.hoverTile || !tileEquals(tile, this.hoverTile))) {
      this.hoverTile = tile;
      this.tileMap.setHoverTile(tile);
    }

    if (this.dragStart && pointer.leftButtonDown()) {
      const dx = pointer.x - this.dragStart.screenX;
      const dy = pointer.y - this.dragStart.screenY;
      if (Math.abs(dx) + Math.abs(dy) > this.DRAG_THRESHOLD_PX) {
        this.updateDragRect(pointer);
      }
    }
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.isPointerOverHud(pointer)) return;
    const tile = pickTile(
      pointer.x,
      pointer.y,
      this.cameras.main,
      this.tileMap.width,
      this.tileMap.height,
    );
    const placement = uiStore.getState().placementBuilding;
    if (placement) {
      if (pointer.rightButtonDown()) {
        uiStore.getState().setPlacementBuilding(null);
        return;
      }
      if (pointer.leftButtonDown() && tile) {
        this.tryPlaceBuilding(tile, placement);
      }
      return;
    }
    if (pointer.leftButtonDown()) {
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.dragStart = { sx: world.x, sy: world.y, screenX: pointer.x, screenY: pointer.y };
      // Single-click selection fires on pointer UP (so drag-select is
      // possible). We still clear the tile outline here.
      this.tileMap.setSelectedTile(tile);
    } else if (pointer.rightButtonDown() && tile) {
      const selectedAll = this.selectionSystem.getAllSelected();
      if (selectedAll.length === 0) return;
      const first = selectedAll[0]!;
      const enemy = this.findEnemyAt(tile.tx, tile.ty, first);
      const node = enemy ? null : this.findResourceNodeAt(tile.tx, tile.ty);
      for (const entity of selectedAll) {
        if (entity.owner?.playerId !== 1) continue;
        // Any new right-click order overrides whatever the unit was
        // doing — clear gather state + build command so the villager
        // actually listens.
        this.clearUnitOrders(entity);
        if (enemy && entity.attacker) {
          this.world.addComponent(entity, 'attackIntent', {
            targetId: enemy.id ?? 0,
          });
          continue;
        }
        if (node && entity.gatherer) {
          this.world.addComponent(entity, 'gatherIntent', {
            nodeId: node.id ?? 0,
          });
          continue;
        }
        this.world.addComponent(entity, 'moveIntent', { target: tile });
      }
    }
  }

  private clearUnitOrders(
    entity: import('../ecs/components').Entity,
  ): void {
    if (entity.gatherer) {
      entity.gatherer.targetNodeId = undefined;
      entity.gatherer.dropoffId = undefined;
    }
    if (entity.gatherIntent) this.world.removeComponent(entity, 'gatherIntent');
    if (entity.attackIntent) this.world.removeComponent(entity, 'attackIntent');
    if (entity.buildCommand) this.world.removeComponent(entity, 'buildCommand');
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.isPointerOverHud(pointer)) {
      this.dragStart = null;
      if (this.dragRect) {
        this.dragRect.destroy();
        this.dragRect = null;
      }
      return;
    }
    if (!this.dragStart) return;
    const start = this.dragStart;
    this.dragStart = null;

    const dx = pointer.x - start.screenX;
    const dy = pointer.y - start.screenY;
    const didDrag = Math.abs(dx) + Math.abs(dy) > this.DRAG_THRESHOLD_PX;
    if (this.dragRect) {
      this.dragRect.destroy();
      this.dragRect = null;
    }
    if (didDrag) {
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const additive = pointer.event?.shiftKey ?? false;
      this.selectionSystem.selectUnitsInWorldRect(
        start.sx,
        start.sy,
        world.x,
        world.y,
        1,
        additive,
      );
      return;
    }
    // Simple click → select the tile under the cursor.
    const tile = pickTile(
      pointer.x,
      pointer.y,
      this.cameras.main,
      this.tileMap.width,
      this.tileMap.height,
    );
    if (tile) this.selectionSystem.selectAtTile(tile.tx, tile.ty);
    else this.selectionSystem.clearSelection();
  }

  private updateDragRect(pointer: Phaser.Input.Pointer): void {
    if (!this.dragStart) return;
    if (!this.dragRect) {
      this.dragRect = this.add
        .rectangle(0, 0, 1, 1, 0x8bc34a, 0.12)
        .setStrokeStyle(1, 0x8bc34a, 0.9)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(10_000);
    }
    const x0 = Math.min(this.dragStart.screenX, pointer.x);
    const y0 = Math.min(this.dragStart.screenY, pointer.y);
    const x1 = Math.max(this.dragStart.screenX, pointer.x);
    const y1 = Math.max(this.dragStart.screenY, pointer.y);
    this.dragRect.setPosition(x0, y0);
    this.dragRect.setSize(x1 - x0, y1 - y0);
  }

  private findEnemyAt(
    tx: number,
    ty: number,
    actor: import('../ecs/components').Entity,
  ): import('../ecs/components').Entity | null {
    const actorPlayer = actor.owner?.playerId;
    if (actorPlayer === undefined) return null;
    const candidates = this.world.with('position', 'owner', 'health');
    for (const c of candidates) {
      if (c.owner.playerId === actorPlayer) continue;
      const b = (c as import('../ecs/components').Entity).building;
      if (b) {
        if (
          tx >= c.position.tx &&
          tx < c.position.tx + b.footprint.width &&
          ty >= c.position.ty &&
          ty < c.position.ty + b.footprint.height
        ) {
          return c;
        }
        continue;
      }
      if (c.position.tx === tx && c.position.ty === ty) return c;
    }
    return null;
  }

  private tryPlaceBuilding(
    origin: { tx: number; ty: number },
    type: import('../types').BuildingType,
  ): void {
    const spec = BUILDING_SPECS[type];
    if (!this.canPlaceBuilding(origin, spec.width, spec.height)) return;
    const state = uiStore.getState();
    if (
      state.resources.food < spec.cost.food ||
      state.resources.wood < spec.cost.wood ||
      state.resources.gold < spec.cost.gold
    ) {
      return;
    }
    state.setResources({
      food: state.resources.food - spec.cost.food,
      wood: state.resources.wood - spec.cost.wood,
      gold: state.resources.gold - spec.cost.gold,
    });
    const site = createBuilding(this.world, {
      type,
      origin,
      playerId: 1,
      mapData: this.mapData,
      underConstruction: true,
    });
    const selected = this.selectionSystem.getSelected();
    if (selected && selected.gatherer && site.id !== undefined) {
      this.world.addComponent(selected, 'buildCommand', {
        targetId: site.id,
      });
    }
    state.setPlacementBuilding(null);
  }

  private findResourceNodeAt(tx: number, ty: number): import('../ecs/components').Entity | null {
    const nodes = this.world.with('position', 'resourceNode');
    for (const n of nodes) {
      // Multi-tile building nodes (e.g. farms) match any footprint tile.
      const b = (n as import('../ecs/components').Entity).building;
      if (b) {
        if (
          tx >= n.position.tx &&
          tx < n.position.tx + b.footprint.width &&
          ty >= n.position.ty &&
          ty < n.position.ty + b.footprint.height
        ) {
          return n;
        }
        continue;
      }
      if (n.position.tx === tx && n.position.ty === ty) return n;
    }
    return null;
  }

  private onUpdate(time: number, delta: number): void {
    this.cameraController.update(delta);
    this.tileMap.update(time, delta);
    this.pathfindingSystem.update();
    this.gatheringSystem.update(delta);
    this.constructionSystem.update(delta);
    this.trainingSystem.update(delta);
    this.combatSystem.update(delta);
    this.movementSystem.update(delta);
    this.deathSystem.update(delta);
    for (const ai of this.aiPlayers) {
      ai.update({ world: this.world, mapData: this.mapData }, delta);
    }
    this.populationSystem.update();
    this.fogOfWarSystem.update(delta);
    this.tileMap.applyFog(this.fogData);
    this.selectionSystem.update();
    this.renderSystem.update();
    this.healthBarSystem.update();
    this.ambientFx.update(delta);
    this.updateBuildGhost();

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

  private updateBuildGhost(): void {
    const placement = uiStore.getState().placementBuilding;
    if (!placement) {
      this.buildGhost?.setVisible(false);
      return;
    }
    if (!this.hoverTile) {
      this.buildGhost?.setVisible(false);
      return;
    }
    const spec = BUILDING_SPECS[placement];
    if (!this.buildGhost) {
      this.buildGhost = this.add.image(0, 0, spec.textureKey);
      this.buildGhost.setAlpha(0.6).setScale(1 / ART_SCALE);
    }
    if (this.buildGhost.texture.key !== spec.textureKey) {
      this.buildGhost.setTexture(spec.textureKey);
    }
    const bottom = {
      tx: this.hoverTile.tx + spec.width - 1,
      ty: this.hoverTile.ty + spec.height - 1,
    };
    const { sx, sy } = tileToScreen(bottom);
    this.buildGhost.setPosition(sx, sy + 16);
    this.buildGhost.setOrigin(0.5, 1 - BUILDING_BOTTOM_PAD / this.buildGhost.height);
    const valid = this.canPlaceBuilding(this.hoverTile, spec.width, spec.height);
    this.buildGhost.setTint(valid ? 0xbfffd0 : 0xff6666);
    this.buildGhost.setDepth(
      bottom.tx + bottom.ty + 0.25,
    );
    this.buildGhost.setVisible(true);
  }

  private canPlaceBuilding(
    origin: { tx: number; ty: number },
    w: number,
    h: number,
  ): boolean {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const tx = origin.tx + dx;
        const ty = origin.ty + dy;
        if (!this.mapData.isPassable(tx, ty)) return false;
      }
    }
    return true;
  }

}
