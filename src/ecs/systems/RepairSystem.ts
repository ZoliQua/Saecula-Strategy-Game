import type { With } from 'miniplex';
import { REPATH_RETRY_MS } from '../../config/balance';
import { NO_TEAMS, type TeamLookup } from '../../game/diplomacy';
import { gameEvents } from '../../game/events';
import type { Player } from '../../game/Player';
import type { PlayerManager } from '../../game/PlayerManager';
import { isRepairableBy, repairCostPerHp, repairHpPerSec, type RepairTarget } from '../../game/repair';
import { hu } from '../../i18n/hu';
import type { MapData } from '../../map/MapData';
import { UNLIMITED_PATHS, type PathAllowance } from '../../map/pathBudget';
import type { Resources } from '../../types';
import type { Entity } from '../components';
import { onFootprintRing } from '../footprint';
import { playerWallet, type Wallet } from '../research';
import type { EcsWorld } from '../world';
import { faceToward } from './facing';
import { carryStep } from './heal';
import { planToFootprintRing } from './walkToRing';

type Repairer = With<Entity, 'position' | 'movable' | 'repairIntent' | 'owner'>;

const RESOURCES = ['food', 'wood', 'gold'] as const;
/** Float slack when turning the owed fraction into whole units (0.6 + 0.9 must owe 1.5, not 1.4999…). */
const EPS = 1e-9;

export interface RepairSystemOptions {
  /** Teams (M16): an ally's building may be repaired. Default: the PlayerManager, else no teams. */
  readonly teams?: TeamLookup;
  /** Whose stockpile pays (the game passes the UI store for the human). Default: every player's own resources. */
  readonly walletOf?: (player: Player) => Wallet;
  /** The human's id: only its dry wallet raises the notice. */
  readonly humanId?: number | undefined;
  /** Shows a HUD notice (the game's toast). */
  readonly notice?: (message: string) => void;
}

/**
 * Building repair (M18). A villager with a `repairIntent` walks to the ring
 * around its target and restores repairHpPerSec whole HP per second there
 * (several villagers stack), paying repairCostPerHp per HP from its own
 * owner's wallet as it goes (fractions carried in the intent). The repair
 * stops (the intent drops; the villager goes idle) when the target is gone,
 * dying, no longer friendly or not damaged, and for every villager of a
 * player whose wallet cannot pay the next whole unit (one notice for the
 * human). The villager that restores the last HP raises `buildingRepaired`
 * and every repairer of that building goes idle.
 */
export class RepairSystem {
  private nowMs = 0;
  private readonly repathAt = new WeakMap<object, number>();
  private readonly teams: TeamLookup;
  private readonly walletOf: (player: Player) => Wallet;

  constructor(
    private readonly world: EcsWorld,
    private readonly mapData: MapData,
    private readonly paths: PathAllowance = UNLIMITED_PATHS,
    private readonly players: PlayerManager | null = null,
    private readonly options: RepairSystemOptions = {},
  ) {
    this.teams = options.teams ?? players ?? NO_TEAMS;
    this.walletOf = options.walletOf ?? playerWallet;
  }

  update(deltaMs: number): void {
    this.nowMs += deltaMs;
    const repairers = [...this.world.with('position', 'movable', 'repairIntent', 'owner')];
    if (repairers.length === 0) return;
    const buildings = new Map<number, Entity>();
    for (const b of this.world.with('building', 'health', 'position', 'owner')) if (b.id !== undefined) buildings.set(b.id, b);
    for (const r of repairers) {
      if (!r.repairIntent) continue; // stopped earlier this tick
      const target = buildings.get(r.repairIntent.targetId);
      if (!isRepairableBy(target, r.owner.playerId, this.teams)) {
        this.stop(r);
        continue;
      }
      // A repairer on blocked ground (a foundation laid over it) steps out first.
      if (!onFootprintRing(r.position, target.position, target.building.footprint) || !this.mapData.isPassable(r.position.tx, r.position.ty)) {
        if (r.movable.path.length === 0) this.walkTo(r, target);
        continue;
      }
      r.movable.path = [];
      r.movable.progress = 0;
      faceToward(r as Entity, target);
      this.work(r, target, deltaMs, repairers);
    }
  }

  private work(r: Repairer, target: RepairTarget, deltaMs: number, repairers: readonly Repairer[]): void {
    const intent = r.repairIntent;
    const owner = this.players?.get(r.owner.playerId);
    const step = carryStep(intent.hpCarry, repairHpPerSec(target, owner), deltaMs);
    intent.hpCarry = step.carry;
    const hp = Math.min(step.whole, target.health.max - target.health.current);
    if (hp <= 0) return;
    if (owner && !this.charge(intent, repairCostPerHp(target), hp, this.walletOf(owner))) {
      // Every villager of this player on this building stops together: one notice, not one per villager or frame.
      for (const o of repairers) {
        if (o.owner.playerId === r.owner.playerId && o.repairIntent?.targetId === intent.targetId) this.stop(o);
      }
      if (r.owner.playerId === this.options.humanId) this.options.notice?.(hu.repair.outOfResources);
      return;
    }
    target.health.current = Math.min(target.health.max, target.health.current + hp);
    if (target.health.current < target.health.max) return;
    gameEvents.emit('buildingRepaired', { world: this.world, playerId: r.owner.playerId, entityId: intent.targetId, buildingType: target.building.type });
    for (const o of repairers) if (o.repairIntent?.targetId === intent.targetId) this.stop(o);
  }

  /** Adds `hp` HP's cost to the carry and charges the whole units due; false (nothing charged) when the wallet lacks them. */
  private charge(intent: Repairer['repairIntent'], perHp: Resources, hp: number, wallet: Wallet): boolean {
    const have = wallet.get();
    const owed: Resources = { food: 0, wood: 0, gold: 0 };
    const due: Resources = { food: 0, wood: 0, gold: 0 };
    for (const k of RESOURCES) {
      owed[k] = intent.costCarry[k] + perHp[k] * hp;
      due[k] = Math.floor(owed[k] + EPS);
      if (due[k] > have[k]) return false;
    }
    if (due.food + due.wood + due.gold > 0) {
      wallet.set({ food: have.food - due.food, wood: have.wood - due.wood, gold: have.gold - due.gold });
    }
    for (const k of RESOURCES) intent.costCarry[k] = Math.max(0, owed[k] - due[k]);
    return true;
  }

  private stop(r: Repairer): void {
    if (r.repairIntent) this.world.removeComponent(r as Entity, 'repairIntent');
  }

  private walkTo(r: Repairer, target: RepairTarget): void {
    if ((this.repathAt.get(r) ?? 0) > this.nowMs) return;
    const plan = planToFootprintRing(this.world, this.mapData, this.paths, r, target.position, target.building.footprint);
    if (plan === 'failed') this.repathAt.set(r, this.nowMs + REPATH_RETRY_MS);
  }
}
