import Phaser from 'phaser';
import { tileToScreen } from '../../iso/coordinates';
import { footprintDepth, tileDepth } from '../../iso/depth';
import { DEFAULT_CIV } from '../../config/civs';
import type { CivId } from '../../types';
import { uiStore } from '../../ui/store';
import { infoKey, isLastTownCenter, toSelectedInfo, type SelectableWithPos } from './selectedInfo';
import type { Entity } from '../components';
import type { EcsWorld } from '../world';
import { BUILDING_DEPTH_OFFSET, buildingOutlineDepth } from './renderPlacement';

/**
 * Manages a single-entity selection for the human player (M0 scope —
 * multi-select arrives in M1). Selection is stored on the entity via
 * `selectable.selected`; the system renders a circle under the
 * selected unit and keeps it in sync with the entity's tile position.
 */
const SELECT_OWN = 0xffd27a;
const SELECT_ENEMY = 0xff6b5b;

export class SelectionSystem {
  private readonly scene: Phaser.Scene;
  private readonly world: EcsWorld;
  private indicators: Phaser.GameObjects.Graphics[] = [];
  private lastInfoKey: string | null = null;
  /** Depth an occluded unit's ring is raised to, so it shows over what hides the unit (see UnitXRay). */
  private raisedDepth: (entity: Entity) => number | undefined = () => undefined;

  setRaisedDepth(fn: (entity: Entity) => number | undefined): void {
    this.raisedDepth = fn;
  }

  /** Civ of a player (the HUD portrait shows the unit in its owner's look). */
  private civOf: (playerId: number) => CivId = () => DEFAULT_CIV;

  setCivSource(civOf: (playerId: number) => CivId): void {
    this.civOf = civOf;
  }

  constructor(scene: Phaser.Scene, world: EcsWorld) {
    this.scene = scene;
    this.world = world;
  }

  /**
   * Selects a unit on the tile if any; otherwise selects a building
   * whose footprint covers the tile. Clears selection otherwise.
   */
  selectAtTile(tx: number, ty: number): Entity | null {
    this.clearSelection();
    const candidates = this.world.with('position', 'selectable');
    let building: Entity | null = null;
    let resource: Entity | null = null;
    for (const entity of candidates) {
      if (entity.unit && entity.position.tx === tx && entity.position.ty === ty) {
        entity.selectable.selected = true;
        return entity;
      }
      if (entity.building) {
        const fp = entity.building.footprint;
        if (
          tx >= entity.position.tx &&
          tx < entity.position.tx + fp.width &&
          ty >= entity.position.ty &&
          ty < entity.position.ty + fp.height
        ) {
          building = entity;
        }
      }
      if (
        entity.resourceNode &&
        !entity.building &&
        entity.position.tx === tx &&
        entity.position.ty === ty
      ) {
        resource = entity;
      }
    }
    if (building?.selectable) {
      building.selectable.selected = true;
      return building;
    }
    if (resource?.selectable) {
      resource.selectable.selected = true;
      return resource;
    }
    return null;
  }

  /**
   * Selects all own units whose tile lies inside the given world
   * rectangle. Buildings are excluded — drag-selecting town centres
   * together with villagers is almost never what the player wants.
   */
  selectUnitsInWorldRect(
    minSx: number,
    minSy: number,
    maxSx: number,
    maxSy: number,
    playerId: number,
    additive = false,
  ): number {
    if (!additive) this.clearSelection();
    const [x0, x1] = minSx < maxSx ? [minSx, maxSx] : [maxSx, minSx];
    const [y0, y1] = minSy < maxSy ? [minSy, maxSy] : [maxSy, minSy];
    let count = 0;
    const candidates = this.world.with('position', 'selectable', 'unit');
    for (const entity of candidates) {
      if (entity.owner?.playerId !== playerId) continue;
      const sx = (entity.position.tx - entity.position.ty) * 32;
      const sy = (entity.position.tx + entity.position.ty) * 16;
      if (sx < x0 || sx > x1 || sy < y0 || sy > y1) continue;
      entity.selectable.selected = true;
      count++;
    }
    return count;
  }

  getAllSelected(): Entity[] {
    const out: Entity[] = [];
    for (const entity of this.world.with('selectable', 'position')) {
      if (entity.selectable.selected) out.push(entity as Entity);
    }
    return out;
  }

  clearSelection(): void {
    const all = this.world.with('selectable');
    for (const entity of all) {
      entity.selectable.selected = false;
    }
  }

  getSelected(): SelectableWithPos | undefined {
    const all = this.world.with('selectable', 'position');
    for (const entity of all) {
      if (entity.selectable.selected) return entity;
    }
    return undefined;
  }

  update(): void {
    const selected = this.getAllSelected();
    this.ensureIndicators(selected.length);
    if (selected.length === 0) {
      if (this.lastInfoKey !== null) {
        uiStore.getState().setSelectedEntity(null, 0);
        this.lastInfoKey = null;
      }
      return;
    }
    selected.forEach((entity, i) => {
      this.drawIndicator(this.indicators[i]!, entity as SelectableWithPos);
    });
    // Primary selection for the HUD. We only push to the store when
    // the data the HUD cares about actually changed — pushing every
    // frame churns Zustand subscribers and triggers a full HUD render.
    const primary = selected[0] as SelectableWithPos;
    const info = toSelectedInfo(primary, this.civOf);
    if (info?.kind === 'building' && isLastTownCenter(this.world, primary)) info.lastTownCenter = true;
    const key = `${infoKey(info)}#${selected.length}`;
    if (key !== this.lastInfoKey) {
      uiStore.getState().setSelectedEntity(info, selected.length);
      this.lastInfoKey = key;
    }
  }

  private ensureIndicators(count: number): void {
    while (this.indicators.length < count) {
      this.indicators.push(this.scene.add.graphics());
    }
    for (let i = count; i < this.indicators.length; i++) {
      this.indicators[i]!.setVisible(false);
    }
  }

  private drawIndicator(
    g: Phaser.GameObjects.Graphics,
    selected: SelectableWithPos,
  ): void {
    g.clear();
    const e = selected as Entity;
    const own = e.owner?.playerId === 1;
    const color = e.owner === undefined ? 0xf2efe9 : own ? SELECT_OWN : SELECT_ENEMY;
    const pulse = 0.75 + 0.25 * Math.sin(this.scene.time.now / 220);
    g.setAlpha(pulse);
    if (e.building) {
      const w = e.building.footprint.width;
      const h = e.building.footprint.height;
      const centerTile = {
        tx: selected.position.tx + (w - 1) / 2,
        ty: selected.position.ty + (h - 1) / 2,
      };
      const { sx, sy } = tileToScreen(centerTile);
      const halfW = ((w + h) * 32) / 2 + 4;
      const halfH = ((w + h) * 16) / 2 + 2;
      const pts = [
        new Phaser.Math.Vector2(sx, sy - halfH),
        new Phaser.Math.Vector2(sx + halfW, sy),
        new Phaser.Math.Vector2(sx, sy + halfH),
        new Phaser.Math.Vector2(sx - halfW, sy),
      ];
      g.fillStyle(color, 0.1);
      g.fillPoints(pts, true);
      g.lineStyle(2, color, 0.95);
      g.strokePoints(pts, true);
      // Under the building as drawn (a building beside raised rock is sunk below the rock).
      g.setDepth(buildingOutlineDepth(e.sprite?.depth ?? footprintDepth(selected.position, w, h) + BUILDING_DEPTH_OFFSET));
    } else if (e.resourceNode && !e.unit) {
      // Resource tile selection outlines a single diamond.
      const { sx, sy } = tileToScreen(selected.position);
      g.lineStyle(2, color, 0.9);
      g.beginPath();
      g.moveTo(sx, sy - 16);
      g.lineTo(sx + 32, sy);
      g.lineTo(sx, sy + 16);
      g.lineTo(sx - 32, sy);
      g.closePath();
      g.strokePath();
      g.setDepth(tileDepth(selected.position) + 0.5);
    } else {
      const pos = e.sprite ? { sx: e.sprite.x, sy: e.sprite.y } : tileToScreen(selected.position);
      g.fillStyle(color, 0.18);
      g.fillEllipse(pos.sx, pos.sy, 30, 15);
      g.lineStyle(1.6, color, 1);
      g.strokeEllipse(pos.sx, pos.sy, 30, 15);
      g.setDepth(Math.max(tileDepth(selected.position) + 0.05, this.raisedDepth(e) ?? -Infinity));
    }
    g.setVisible(true);
  }
}
