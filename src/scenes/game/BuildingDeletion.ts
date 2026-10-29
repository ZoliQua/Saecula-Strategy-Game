import type Phaser from 'phaser';
import { BUILDING_SPECS } from '../../ecs/archetypes/building';
import type { Entity } from '../../ecs/components';
import { uiWallet, type Wallet } from '../../ecs/research';
import type { EcsWorld } from '../../ecs/world';
import { gameEvents } from '../../game/events';
import { killEntity } from '../../game/kill';
import { refundFor, siteProgress } from '../../game/refund';
import type { Resources } from '../../types';
import { requestDeleteSelected } from '../../ui/deleteConfirm';
import { onCommand } from '../../ui/events';

export interface DeleteResult {
  readonly ok: boolean;
  /** What went back into the wallet (zero for a finished building or a site past half built). */
  readonly refund: Resources;
}

const NOTHING: Resources = { food: 0, wood: 0, gold: 0 };

/**
 * Deletes `building` for its owner `playerId`: a site up to half built
 * refunds part of its cost into `wallet` (refundFor), then the building
 * dies through killEntity, the same path as a destroyed one (collapse,
 * population cap, builder release, victory check). It has no attacker,
 * so no one scores a kill; `buildingDeleted` tells listeners it was a
 * deletion. Another player's, or an already dying, building is refused.
 */
export function deleteBuilding(world: EcsWorld, building: Entity, playerId: number, wallet: Wallet): DeleteResult {
  const health = building.health;
  if (!building.building || !health || building.dying || building.owner?.playerId !== playerId) {
    return { ok: false, refund: NOTHING };
  }
  const uc = building.underConstruction;
  const refund = refundFor(BUILDING_SPECS[building.building.type].cost, uc ? siteProgress(uc) : null);
  const have = wallet.get();
  wallet.set({ food: have.food + refund.food, wood: have.wood + refund.wood, gold: have.gold + refund.gold });
  if (building.selectable) building.selectable.selected = false;
  killEntity(world, building as Entity & { health: typeof health });
  if (building.id !== undefined) {
    gameEvents.emit('buildingDeleted', { playerId, entityId: building.id, buildingType: building.building.type });
  }
  return { ok: true, refund };
}

/** The delete command: deletes building `buildingId` if `playerId` owns it. */
export function deleteSelectedBuilding(world: EcsWorld, buildingId: number, playerId: number, wallet: Wallet): DeleteResult {
  const building = world.entities.find((e) => e.id === buildingId);
  return building ? deleteBuilding(world, building, playerId, wallet) : { ok: false, refund: NOTHING };
}

/**
 * Wires deletion for the human: the HUD's delete command (refund into
 * the UI wallet) and the Delete key, which presses the selection
 * panel's delete button (arm, then confirm). Unwired on scene shutdown.
 */
export function wireBuildingDeletion(scene: Phaser.Scene, world: EcsWorld, humanId: number): void {
  const unsub = onCommand((cmd) => {
    if (cmd.type === 'delete-building') deleteSelectedBuilding(world, cmd.buildingId, humanId, uiWallet());
  });
  // Temporary key: Task 3 moves this onto the rebindable `deleteBuilding` key action.
  const onKey = (): void => requestDeleteSelected(humanId);
  scene.input.keyboard?.on('keydown-DELETE', onKey);
  scene.events.once('shutdown', () => {
    unsub();
    scene.input.keyboard?.off('keydown-DELETE', onKey);
  });
}
