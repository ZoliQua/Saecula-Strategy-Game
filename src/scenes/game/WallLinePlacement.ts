import type Phaser from 'phaser';
import { BUILDING_SPECS } from '../../ecs/archetypes/building';
import { createWall } from '../../ecs/archetypes/wall';
import { evictUnitsFrom } from '../../ecs/evict';
import type { SelectionSystem } from '../../ecs/systems/SelectionSystem';
import type { EcsWorld } from '../../ecs/world';
import { planWallSegments, wallLineTiles, type WallPlan } from '../../game/wallLine';
import { ART_SCALE, BUILDING_BOTTOM_PAD } from '../../iso/art/canvas';
import type { TileCoord } from '../../iso/coordinates';
import { tileToScreen } from '../../iso/coordinates';
import type { MapData } from '../../map/MapData';
import { uiStore } from '../../ui/store';
import { wallNeighbourMaskBy } from '../../game/wallNeighbours';
import { wallPiece } from '../../iso/art/walls/wallPiece';
import { wallTexture } from '../../iso/buildingTextures';
import type { AgeId, CivId } from '../../types';

/**
 * Click-drag wall laying: press on the first tile, drag, release to place a
 * straight or 45 degree line. Each segment is its own construction site;
 * selected villagers are spread along the line and chain from segment to
 * segment (ConstructionSystem). Blocked tiles are skipped and only placed
 * segments are charged.
 */
export class WallLinePlacement {
  private start: TileCoord | null = null;
  private ghosts: Phaser.GameObjects.Image[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly world: EcsWorld,
    private readonly mapData: MapData,
    private readonly selection: SelectionSystem,
    private readonly playerId: number,
    private readonly getAge: () => AgeId,
    private readonly civ: CivId,
  ) {}

  isDragging(): boolean {
    return this.start !== null;
  }

  begin(tile: TileCoord): void {
    this.start = tile;
  }

  cancel(): void {
    this.start = null;
    this.hideGhosts(0);
    this.setPreview(null);
  }

  /** The plan for the current drag (a single tile when not dragging). */
  plan(hover: TileCoord): WallPlan {
    const cost = BUILDING_SPECS.wall.cost.wood;
    const tiles = wallLineTiles(this.start ?? hover, hover);
    return planWallSegments(
      tiles,
      (t) => this.mapData.isBuildable(t.tx, t.ty),
      uiStore.getState().resources.wood,
      cost,
    );
  }

  /** Places the dragged line and clears the drag; returns the segments built. */
  commit(hover: TileCoord | null): number {
    const plan = hover && this.start ? this.plan(hover) : null;
    this.cancel();
    if (!plan || plan.build.length === 0) return 0;
    const cost = BUILDING_SPECS.wall.cost;
    const state = uiStore.getState();
    state.setResources({ wood: state.resources.wood - cost.wood * plan.build.length });
    const siteIds = plan.build.map((tile) => {
      const site = createWall(this.world, { tile, playerId: this.playerId, mapData: this.mapData, underConstruction: true });
      evictUnitsFrom(this.world, this.mapData, tile, { width: 1, height: 1 });
      return site.id ?? -1;
    });
    this.assignBuilders(siteIds);
    return plan.build.length;
  }

  /** Draws one ghost per tile of the line under the cursor. */
  updateGhosts(hover: TileCoord | null): void {
    if (!hover) {
      this.hideGhosts(0);
      this.setPreview(null);
      return;
    }
    const plan = this.plan(hover);
    const buildKeys = new Set(plan.build.map((t) => `${t.tx},${t.ty}`));
    const tiles = wallLineTiles(this.start ?? hover, hover);
    // Ghosts join up along the dragged line in the player's current wall style.
    const onLine = new Set(tiles.map((t) => `${t.tx},${t.ty}`));
    const age = this.getAge();
    tiles.forEach((tile, i) => {
      const g = this.ghostAt(i);
      const isWall = (tx: number, ty: number): boolean => onLine.has(`${tx},${ty}`);
      const piece = wallPiece(wallNeighbourMaskBy(isWall, tile), tile.tx, tile.ty, isWall);
      const key = wallTexture(this.scene, piece, age, this.civ);
      if (g.texture.key !== key) g.setTexture(key);
      const bottom = tileToScreen(tile);
      g.setPosition(bottom.sx, bottom.sy + 16);
      g.setOrigin(0.5, 1 - BUILDING_BOTTOM_PAD / g.height);
      g.setTint(buildKeys.has(`${tile.tx},${tile.ty}`) ? 0xbfffd0 : 0xff6666);
      g.setDepth(tile.tx + tile.ty + 0.25);
      g.setVisible(true);
    });
    this.hideGhosts(tiles.length);
    this.setPreview(
      this.start ? { segments: plan.build.length, wood: plan.build.length * BUILDING_SPECS.wall.cost.wood } : null,
    );
  }

  private assignBuilders(siteIds: readonly number[]): void {
    const builders = this.selection
      .getAllSelected()
      .filter((e) => e.gatherer && e.owner?.playerId === this.playerId);
    builders.forEach((b, i) => {
      const targetId = siteIds[Math.floor((i * siteIds.length) / builders.length)];
      if (targetId === undefined) return;
      if (b.buildCommand) this.world.removeComponent(b, 'buildCommand');
      this.world.addComponent(b, 'buildCommand', { targetId });
    });
  }

  private ghostAt(i: number): Phaser.GameObjects.Image {
    let g = this.ghosts[i];
    if (!g) {
      g = this.scene.add.image(0, 0, wallTexture(this.scene, wallPiece(0, 0, 0), this.getAge(), this.civ));
      g.setAlpha(0.6).setScale(1 / ART_SCALE);
      this.ghosts[i] = g;
    }
    return g;
  }

  private hideGhosts(from: number): void {
    for (let i = from; i < this.ghosts.length; i++) this.ghosts[i]?.setVisible(false);
  }

  private setPreview(preview: { segments: number; wood: number } | null): void {
    const cur = uiStore.getState().wallPreview;
    if (cur === preview) return;
    if (cur && preview && cur.segments === preview.segments && cur.wood === preview.wood) return;
    uiStore.getState().setWallPreview(preview);
  }
}
