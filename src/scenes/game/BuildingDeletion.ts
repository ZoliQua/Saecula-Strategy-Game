import type Phaser from 'phaser';
import { BUILDING_SPECS } from '../../ecs/archetypes/building';
import type { Entity } from '../../ecs/components';
import { cancelQueuedUnit } from '../../ecs/queueUnit';
import { cancelResearch, uiWallet, type Wallet } from '../../ecs/research';
import type { EcsWorld } from '../../ecs/world';
import { gameEvents } from '../../game/events';
import { killEntity } from '../../game/kill';
import { refundAtPercent, refundPercent, siteProgress } from '../../game/refund';
import type { Resources } from '../../types';
import { requestDeleteSelected } from '../../ui/deleteConfirm';
import { onCommand, type GameCommand } from '../../ui/events';
import { uiStore } from '../../ui/store';
import { onKeyAction } from './KeyActions';

export interface DeleteResult {
  readonly ok: boolean;
  /** What went back into the wallet (zero for a finished building or a site past half built). */
  readonly refund: Resources;
}

const NOTHING: Resources = { food: 0, wood: 0, gold: 0 };

/**
 * Deletes `building` for its owner `playerId`: a site up to half built
 * refunds part of its cost into `wallet` (refundPercent of its live
 * progress, or `refundPct` when given: the percentage locked when the
 * delete was armed; a finished building refunds nothing), then the building
 * dies through killEntity, the same path as a destroyed one (collapse,
 * population cap, builder release, victory check). It has no attacker,
 * so no one scores a kill; `buildingDeleted` tells listeners it was a
 * deletion. Research in progress and queued units are refunded in full
 * first. Another player's, or an already dying, building is refused.
 */
export function deleteBuilding(world: EcsWorld, building: Entity, playerId: number, wallet: Wallet, refundPct?: number): DeleteResult {
  const health = building.health;
  if (!building.building || !health || building.dying || building.owner?.playerId !== playerId) {
    return { ok: false, refund: NOTHING };
  }
  const cost = BUILDING_SPECS[building.building.type].cost;
  const refund = building.underConstruction ? refundAtPercent(cost, refundPct ?? liveRefundPercent(building)) : NOTHING;
  const have = wallet.get();
  wallet.set({ food: have.food + refund.food, wood: have.wood + refund.wood, gold: have.gold + refund.gold });
  // A deliberate delete gives back what the building still holds: the research
  // in progress and every queued unit at full cost (destruction by an enemy does not).
  if (building.research) {
    cancelResearch(building, wallet);
    world.removeComponent(building, 'research');
  }
  while ((building.trainingQueue?.entries.length ?? 0) > 0) cancelQueuedUnit(building, 0, wallet);
  if (building.selectable) building.selectable.selected = false;
  killEntity(world, building as Entity & { health: typeof health });
  if (building.id !== undefined) {
    gameEvents.emit('buildingDeleted', { playerId, entityId: building.id, buildingType: building.building.type });
  }
  return { ok: true, refund };
}

/** The refund percentage the rule allows for `building` now (0 for a finished one). */
function liveRefundPercent(building: Entity): number {
  const uc = building.underConstruction;
  return refundPercent(uc ? siteProgress(uc) : null);
}

/** The delete command: deletes building `buildingId` if `playerId` owns it (`refundPct`: deleteBuilding). */
export function deleteSelectedBuilding(world: EcsWorld, buildingId: number, playerId: number, wallet: Wallet, refundPct?: number): DeleteResult {
  const building = world.entities.find((e) => e.id === buildingId);
  return building ? deleteBuilding(world, building, playerId, wallet, refundPct) : { ok: false, refund: NOTHING };
}

/**
 * The human's arm / delete commands. Arming locks the refund the button
 * showed, lowered to what the live rule allows at that moment (the HUD's
 * progress lags the world), and puts the lock back in the store so the
 * armed button shows it. The confirm pays the lock even if the site has
 * built on since; it never pays more than its arm allowed, and a delete
 * without an arm never more than the rule allows now.
 */
export function deleteCommandHandler(world: EcsWorld, humanId: number, wallet: () => Wallet): (cmd: GameCommand) => void {
  let armed: { id: number; pct: number } | null = null;
  const live = (id: number): number => {
    const b = world.entities.find((e) => e.id === id);
    return b ? liveRefundPercent(b) : 0;
  };
  return (cmd) => {
    if (cmd.type === 'arm-delete') {
      const pct = Math.min(cmd.refundPct, live(cmd.buildingId));
      armed = { id: cmd.buildingId, pct };
      const ui = uiStore.getState();
      if (ui.deleteArmedId === cmd.buildingId && ui.deleteArmedPct !== pct) ui.setDeleteArmed(cmd.buildingId, pct);
    } else if (cmd.type === 'delete-building') {
      const cap = armed?.id === cmd.buildingId ? armed.pct : live(cmd.buildingId);
      armed = null;
      deleteSelectedBuilding(world, cmd.buildingId, humanId, wallet(), Math.min(cmd.refundPct, cap));
    }
  };
}

/**
 * The `deleteBuilding` key's handler. Auto-repeat is ignored: holding
 * the key would otherwise arm and confirm in one press.
 */
export function deleteKeyHandler(humanId: number): (event?: { repeat?: boolean }) => void {
  return (event) => {
    if (event?.repeat === true) return;
    requestDeleteSelected(humanId);
  };
}

/**
 * Wires deletion for the human: the HUD's delete command (refund into
 * the UI wallet) and the rebindable `deleteBuilding` key, which presses
 * the selection panel's delete button (arm, then confirm). Unwired on
 * scene shutdown.
 */
export function wireBuildingDeletion(scene: Phaser.Scene, world: EcsWorld, humanId: number): void {
  const unsub = onCommand(deleteCommandHandler(world, humanId, uiWallet));
  onKeyAction(scene, 'deleteBuilding', deleteKeyHandler(humanId));
  scene.events.once('shutdown', unsub);
}
