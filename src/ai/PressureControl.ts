import { AI_COMMON, type MediumTuning } from '../config/aiBalance';
import type { Entity } from '../ecs/components';
import { UNIT_SPECS } from '../ecs/archetypes/unit';
import type { UnitType } from '../types';
import type { AIContext } from './AIPlayer';
import type { ArmyControl } from './ArmyControl';
import type { WorldView } from './perception';
import type { PressureState } from './strategyState';

/** The strategy helpers the pressure raid acts through (MediumStrategy's). */
export interface PressureActions {
  /** Units another controller owns (Hard's raids, Mesteri's flank). */
  isReserved(u: Entity): boolean;
  /** Scouts kept exploring (never part of the raid). */
  explorers(view: WorldView): Entity[];
  /** Exploring scouts still wanted beyond those out now. */
  missingExplorers(view: WorldView): number;
  train(ctx: AIContext, view: WorldView, type: UnitType, maxQueued: number): boolean;
  trainersFor(view: WorldView, type: UnitType, maxQueued: number): Entity[];
  /** The rolled first-attack time (restored with the strategy). */
  firstAttackAtMs(): number;
  /** Called after the raid launched (Mesteri may split off a flank). */
  launched(ctx: AIContext, view: WorldView): void;
}

/**
 * §10.2 first attack (Medium strategy family): a small pressure raid of
 * `tune.pressure.unit` at the rolled first-attack time, trained from
 * `leadMs` before it, and (with `recallMs`, Mesteri) called home again
 * when no main wave followed in time.
 */
export class PressureControl {
  private sentFlag = false;
  /** When the pressure raid left, until the main wave first goes (then null). */
  private raidOutSinceMs: number | null = null;

  constructor(
    private readonly tune: MediumTuning,
    private readonly army: ArmyControl,
    private readonly act: PressureActions,
  ) {}

  snapshot(): PressureState {
    return { sent: this.sentFlag, raidOutSinceMs: this.raidOutSinceMs };
  }

  restore(state: PressureState): void {
    this.sentFlag = state.sent;
    this.raidOutSinceMs = state.raidOutSinceMs;
  }

  /** True once the pressure raid has left. */
  get sent(): boolean {
    return this.sentFlag;
  }

  /** A main wave left: the raid is part of it now and is no longer recalled. */
  mainWaveLaunched(): void {
    this.raidOutSinceMs = null;
  }

  /**
   * At the first-attack time, sends the raid. Below the minimum size it
   * waits for the next decision (a few more units) instead of sending a
   * token force.
   */
  launch(ctx: AIContext, view: WorldView): void {
    if (this.sentFlag) return;
    const squad = this.squad(view);
    if (ctx.timeMs < this.act.firstAttackAtMs() || squad.length < this.tune.pressure.minArmy || this.army.attacking) return;
    this.army.launchWave(ctx, view, squad);
    this.sentFlag = true;
    this.raidOutSinceMs = ctx.timeMs;
    this.act.launched(ctx, view);
  }

  /** `tune.pressure.recallMs` after the raid left (and before any main wave), it is called home. */
  recall(ctx: AIContext, view: WorldView): void {
    const after = this.tune.pressure.recallMs;
    if (after === undefined || this.raidOutSinceMs === null || ctx.timeMs - this.raidOutSinceMs < after) return;
    this.raidOutSinceMs = null;
    this.army.recall(ctx, view);
  }

  /**
   * From `leadMs` before the first-attack time until the raid leaves,
   * trains the pressure squad (queued units counted). True while the squad
   * is still short, `holdsVillagers` is set and holding may pay off
   * (`mayHold`): the caller then holds back villager training (and, with
   * `beforeFarms`, new farms).
   */
  prepare(ctx: AIContext, view: WorldView): boolean {
    const { unit, minArmy, leadMs } = this.tune.pressure;
    if (this.sentFlag || ctx.timeMs < this.act.firstAttackAtMs() - leadMs) return false;
    const queued = view.buildings.reduce(
      (n, b) => n + (b.trainingQueue?.entries.filter((e) => e.unitType === unit).length ?? 0),
      0,
    );
    // Missing explorers: the next scouts trained go exploring first.
    const wanted = minArmy + (unit === 'scout' ? this.act.missingExplorers(view) : 0);
    const have = this.squad(view).length + queued;
    if (have >= wanted) return false;
    this.act.train(ctx, view, unit, this.tune.militaryQueue);
    return this.tune.pressure.holdsVillagers && this.mayHold(ctx, view);
  }

  /** Pressure units besides the exploring scouts. */
  private squad(view: WorldView): Entity[] {
    const explorers = new Set(this.act.explorers(view));
    return [...view.military, ...view.scouts].filter(
      (u) => !explorers.has(u) && !this.act.isReserved(u) && u.unit?.unitType === this.tune.pressure.unit,
    );
  }

  /**
   * Whether waiting for the raiders is worth it. Never without a finished
   * trainer; never when starved (food below the raider's cost and no
   * finished farm: holding farms and villagers would stall for good); and
   * never past `AI_COMMON.pressureHoldCapMs` after the first-attack time
   * (e.g. capped by population, or scouts keep dying).
   */
  private mayHold(ctx: AIContext, view: WorldView): boolean {
    const unit = this.tune.pressure.unit;
    if (this.act.trainersFor(view, unit, Infinity).length === 0) return false;
    if (ctx.timeMs > this.act.firstAttackAtMs() + AI_COMMON.pressureHoldCapMs) return false;
    const farm = view.buildings.some((b) => b.building?.type === 'farm' && !b.underConstruction);
    return farm || ctx.player.resources.food >= UNIT_SPECS[unit].cost.food;
  }
}
