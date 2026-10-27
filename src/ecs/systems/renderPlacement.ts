import type Phaser from 'phaser';
import type { With } from 'miniplex';
import { tileToScreen } from '../../iso/coordinates';
import { footprintDepth, tileDepth } from '../../iso/depth';
import type { FogOfWarData } from '../../map/FogOfWarData';
import type { AgeId } from '../../types';
import type { Entity } from '../components';
import { dyingAlpha } from './unitAnim';

/** The age style a building shows: its owner's age, raised to the building's own minimum (preset stone walls). */
export function styleAge(ownerAge: AgeId, minStyleAge: AgeId | undefined): AgeId {
  return minStyleAge !== undefined && minStyleAge > ownerAge ? minStyleAge : ownerAge;
}

/** What RenderSystem draws: entities with a tile position and a renderable. */
export type Renderable = With<Entity, 'position' | 'renderable'>;

/** Where an entity's sprite sits: a building's front footprint corner, a unit between its tile and the next. */
export function renderScreenPos(entity: Renderable): { sx: number; sy: number } {
  const current = entity.position;
  if (entity.building) {
    // Buildings render at the front corner of the footprint so the
    // sprite's bottom edge sits on the ground at the front of the
    // footprint diamond.
    const bottom = {
      tx: current.tx + entity.building.footprint.width - 1,
      ty: current.ty + entity.building.footprint.height - 1,
    };
    const p = tileToScreen(bottom);
    return { sx: p.sx, sy: p.sy + 16 };
  }
  const mv = entity.movable;
  if (!mv || mv.path.length === 0 || mv.progress === 0) {
    return tileToScreen(current);
  }
  const next = mv.path[0]!;
  const t = Math.min(Math.max(mv.progress, 0), 1);
  const from = tileToScreen(current);
  const to = tileToScreen(next);
  return {
    sx: from.sx + (to.sx - from.sx) * t,
    sy: from.sy + (to.sy - from.sy) * t,
  };
}

/** Own entities always; others only on tiles the viewer currently sees. */
export function isVisibleToViewer(entity: Renderable, fog: FogOfWarData | null, viewerPlayerId: number): boolean {
  if (!fog) return true;
  if (entity.owner?.playerId === viewerPlayerId) return true;
  // Enemy / neutral — only render on tiles that are currently visible.
  return fog.isVisible(entity.position.tx, entity.position.ty);
}

/** Units play their death fall (unitAnim), then the corpse fades; buildings collapse (BuildingFxSystem). */
export function applyDying(sprite: Phaser.GameObjects.Sprite, entity: Renderable): void {
  const d = entity.dying;
  if (d && !entity.building) sprite.setAlpha(dyingAlpha(d.ttlMs));
}

/** Buildings draw this far above their front footprint tile (after its decor, before its units). */
export const BUILDING_DEPTH_OFFSET = 0.2;

/** Draw depth: footprint depth for buildings, interpolated along the step for walking units. */
export function renderDepth(entity: Renderable): number {
  if (entity.building) {
    return footprintDepth(
      entity.position,
      entity.building.footprint.width,
      entity.building.footprint.height,
    ) + BUILDING_DEPTH_OFFSET;
  }
  const mv = entity.movable;
  if (!mv || mv.path.length === 0) return tileDepth(entity.position) + 0.3;
  const next = mv.path[0]!;
  const t = Math.min(Math.max(mv.progress, 0), 1);
  return (
    tileDepth(entity.position) +
    (tileDepth(next) - tileDepth(entity.position)) * t +
    0.3
  );
}
