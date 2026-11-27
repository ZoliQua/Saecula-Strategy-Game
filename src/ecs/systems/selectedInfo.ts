import type { With } from 'miniplex';
import type { BuildingType, CivId } from '../../types';
import { tradePostType } from '../../game/trade';
import type { SelectedEntityInfo } from '../../ui/store';
import { civUnitTypes } from '../../game/civUnits';
import { techsForBuilding } from '../../game/technologies';
import { UNIT_SPECS } from '../archetypes/unit';
import type { Entity } from '../components';
import type { EcsWorld } from '../world';

/* HUD snapshot of the primary selection: pure ECS entity → store shape (kept Phaser-free for tests). */

export type SelectableWithPos = With<Entity, 'position' | 'selectable'>;

const SELECT_OWN = 0xffd27a;
const SELECT_ENEMY = 0xff6b5b;
/** An ally's unit or building (M16): a cool blue, apart from own gold and enemy red. */
const SELECT_ALLY = 0x7ac4ff;
const SELECT_NEUTRAL = 0xf2efe9;

/** The selection ring's colour: own gold, ally blue (M16), anyone else's (Gaia included) red, ownerless neutral. */
export function selectionRingColor(ownerId: number | undefined, isAlly: (playerId: number) => boolean): number {
  if (ownerId === undefined) return SELECT_NEUTRAL;
  if (ownerId === 1) return SELECT_OWN;
  return isAlly(ownerId) ? SELECT_ALLY : SELECT_ENEMY;
}

/**
 * Cheap stable key covering every field the HUD actually renders, so
 * we can detect when a push to the store is worth firing.
 */
export function infoKey(info: SelectedEntityInfo | null): string {
  if (!info) return 'null';
  if (info.kind === 'unit') {
    const c = info.carrying ? `${info.carrying.type}:${info.carrying.amount}` : '-';
    const rt = info.route ? `${info.route.home}>${info.route.target}:${info.route.gold}${info.route.ally ? 'a' : ''}` : '-';
    return `u:${info.id}:${info.ownerId}:${info.hp.current}/${info.hp.max}:${info.tile.tx},${info.tile.ty}:${c}:${info.cargo ?? '-'}:${rt}${info.ally ? ':A' : ''}`;
  }
  if (info.kind === 'building') {
    const q = (info.queue ?? [])
      .map((e) => `${e.unitType}@${Math.round(e.progress * 100)}`)
      .join(',');
    const tr = (info.trainable ?? []).join(',');
    const cp = info.constructionProgress === undefined ? '-' : Math.round(info.constructionProgress * 100);
    const rs = info.research ? `${info.research.techId}@${Math.round(info.research.progress * 100)}` : '-';
    const last = info.lastTownCenter ? 'L' : '-';
    return `b:${info.id}:${info.ownerId}:${info.civ}:${info.textureKey ?? '-'}:${info.hp.current}/${info.hp.max}:${cp}:${tr}:${q}:${rs}:${last}${info.ally ? ':A' : ''}`;
  }
  return `r:${info.id}:${info.amount}/${info.maxAmount}`;
}

/** The store's view of a selected entity; units and buildings carry their owner's civ, and `ally` when the human's ally owns them (M16). */
/** A trader's route as the panel shows it (M17), or undefined without one. */
export type RouteSource = (entity: Entity) => { home: BuildingType; target: BuildingType; ally: boolean; gold: number } | undefined;

export function toSelectedInfo(
  entity: SelectableWithPos,
  civOf: (playerId: number) => CivId,
  isAlly: (playerId: number) => boolean = () => false,
  routeOf: RouteSource = () => undefined,
): SelectedEntityInfo | null {
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
  const ally = isAlly(entity.owner?.playerId ?? 0) ? { ally: true as const } : {};
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
      ...(entity.unit.unitType === 'transport' ? { cargo: entity.cargo?.units.length ?? 0 } : {}),
      ...traderInfo(entity, routeOf),
      ...ally,
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
      ...ally,
    };
    const textureKey = (entity as Entity).sprite?.texture.key;
    if (textureKey) info.textureKey = textureKey;
    const uc = (entity as Entity).underConstruction;
    if (uc) info.constructionProgress = Math.min(1, uc.elapsed / uc.totalTime);
    if (entity.trainingQueue) {
      const trainable = civUnitTypes(info.civ).filter(
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

function traderInfo(entity: Entity, routeOf: RouteSource): { trader?: true; route?: ReturnType<RouteSource> & object } {
  if (!entity.unit || !tradePostType(entity.unit.unitType)) return {};
  const route = entity.tradeRoute ? routeOf(entity) : undefined;
  return route ? { trader: true, route } : { trader: true };
}

/**
 * True when `building` is a town centre and its owner has no other
 * standing (non-dying, finished or not) town centre: losing it is a
 * conquest defeat (VictoryChecker).
 */
export function isLastTownCenter(world: EcsWorld, building: Entity): boolean {
  if (building.building?.type !== 'town_center' || building.dying) return false;
  const owner = building.owner?.playerId;
  for (const e of world.with('building', 'owner')) {
    if (e !== building && e.building.type === 'town_center' && e.owner.playerId === owner && !e.dying) return false;
  }
  return true;
}
