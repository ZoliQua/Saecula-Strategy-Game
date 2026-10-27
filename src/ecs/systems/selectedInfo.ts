import type { With } from 'miniplex';
import type { CivId, UnitType } from '../../types';
import type { SelectedEntityInfo } from '../../ui/store';
import { techsForBuilding } from '../../game/technologies';
import { UNIT_SPECS } from '../archetypes/unit';
import type { Entity } from '../components';

/* HUD snapshot of the primary selection: pure ECS entity → store shape (kept Phaser-free for tests). */

export type SelectableWithPos = With<Entity, 'position' | 'selectable'>;

/**
 * Cheap stable key covering every field the HUD actually renders, so
 * we can detect when a push to the store is worth firing.
 */
export function infoKey(info: SelectedEntityInfo | null): string {
  if (!info) return 'null';
  if (info.kind === 'unit') {
    const c = info.carrying ? `${info.carrying.type}:${info.carrying.amount}` : '-';
    return `u:${info.id}:${info.ownerId}:${info.hp.current}/${info.hp.max}:${info.tile.tx},${info.tile.ty}:${c}`;
  }
  if (info.kind === 'building') {
    const q = (info.queue ?? [])
      .map((e) => `${e.unitType}@${Math.round(e.progress * 100)}`)
      .join(',');
    const tr = (info.trainable ?? []).join(',');
    const cp = info.constructionProgress === undefined ? '-' : Math.round(info.constructionProgress * 100);
    const rs = info.research ? `${info.research.techId}@${Math.round(info.research.progress * 100)}` : '-';
    return `b:${info.id}:${info.ownerId}:${info.hp.current}/${info.hp.max}:${cp}:${tr}:${q}:${rs}`;
  }
  return `r:${info.id}:${info.amount}/${info.maxAmount}`;
}

/** The store's view of a selected entity; units and buildings carry their owner's civ. */
export function toSelectedInfo(entity: SelectableWithPos, civOf: (playerId: number) => CivId): SelectedEntityInfo | null {
  if (entity.id === undefined) return null;
  const r = (entity as Entity).resourceNode;
  if (r && !entity.unit && !entity.building) {
    return {
      kind: 'resource',
      id: entity.id,
      resourceType: r.type,
      amount: Math.floor(r.amount),
      maxAmount: r.maxAmount,
      tile: { tx: entity.position.tx, ty: entity.position.ty },
    };
  }
  if (!entity.health) return null;
  if (entity.unit) {
    return {
      kind: 'unit',
      id: entity.id,
      ownerId: entity.owner?.playerId ?? 0,
      unitType: entity.unit.unitType,
      civ: civOf(entity.owner?.playerId ?? 0),
      hp: { current: entity.health.current, max: entity.health.max },
      tile: { tx: entity.position.tx, ty: entity.position.ty },
      ...(entity.gatherer?.carryingType
        ? {
            carrying: {
              type: entity.gatherer.carryingType,
              amount: Math.floor(entity.gatherer.carrying),
            },
          }
        : {}),
    };
  }
  if (entity.building) {
    const info: SelectedEntityInfo = {
      kind: 'building',
      id: entity.id,
      ownerId: entity.owner?.playerId ?? 0,
      buildingType: entity.building.type,
      civ: civOf(entity.owner?.playerId ?? 0),
      hp: { current: entity.health.current, max: entity.health.max },
      tile: { tx: entity.position.tx, ty: entity.position.ty },
    };
    const textureKey = (entity as Entity).sprite?.texture.key;
    if (textureKey) info.textureKey = textureKey;
    const uc = (entity as Entity).underConstruction;
    if (uc) info.constructionProgress = Math.min(1, uc.elapsed / uc.totalTime);
    if (entity.trainingQueue) {
      const trainable = (Object.keys(UNIT_SPECS) as UnitType[]).filter(
        (u) => UNIT_SPECS[u].trainers.includes(entity.building!.type),
      );
      info.trainable = trainable;
      info.queue = entity.trainingQueue.entries.map((e) => ({
        unitType: e.unitType,
        progress: Math.min(1, e.elapsed / e.totalTime),
      }));
    }
    const researchable = techsForBuilding(entity.building.type);
    if (researchable.length > 0) info.researchable = researchable;
    const rs = (entity as Entity).research;
    if (rs) info.research = { techId: rs.techId, progress: Math.min(1, rs.elapsed / rs.totalTime) };
    return info;
  }
  return null;
}
