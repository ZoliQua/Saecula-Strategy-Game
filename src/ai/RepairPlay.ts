import { AI_COMMON } from '../config/aiBalance';
import { BUILDING_BALANCE } from '../config/balance';
import type { RepairTuning } from '../config/aiMedium';
import type { Entity } from '../ecs/components';
import { clearUnitOrders } from '../ecs/orders';
import { canRepair, startRepair } from '../game/repair';
import { chebyshev, type TileCoord } from '../iso/coordinates';
import type { Resources } from '../types';
import type { AIContext } from './AIPlayer';
import { villagerTask } from './economy';
import type { WorldView } from './perception';
import { isIdleVillager } from './workforce';

const RESOURCES = ['food', 'wood', 'gold'] as const;

/** Chebyshev distance from `p` to the nearest tile of the building's footprint. */
function distanceToFootprint(p: TileCoord, b: Entity): number {
  const o = b.position!;
  const w = b.building?.footprint.width ?? 1;
  const h = b.building?.footprint.height ?? 1;
  const dx = Math.max(o.tx - p.tx, 0, p.tx - (o.tx + w - 1));
  const dy = Math.max(o.ty - p.ty, 0, p.ty - (o.ty + h - 1));
  return Math.max(dx, dy);
}

/** Whether `have` holds at least one unit of each resource `cost` spends. */
function canPayOneUnit(have: Resources, cost: Resources): boolean {
  return RESOURCES.every((r) => cost[r] <= 0 || have[r] >= 1);
}

/**
 * Building repair of the Medium strategy family (CLAUDE.md M18 "AI
 * javít"). Stateless: who repairs what is read from the villagers'
 * `repairIntent` (so nothing is saved), the check cadence from the game
 * time. On every upkeep a repair near which a seen enemy unit stands is
 * called off (the villager goes idle and the economy's idle assignment
 * takes it back); once per `everyMs` window, an own finished building
 * below `belowHpFraction` with no enemy seen within `safeRadius` gets
 * villagers until `maxVillagers` repair (the town centre first, then the
 * lowest HP share; idle villagers first, then the gatherers nearest it),
 * only while the AI can pay one unit of each resource the building costs.
 * RepairSystem stops a repair at full HP or when the wallet runs dry.
 * Enemies are known only through perception (no cheating).
 */
export class RepairPlay {
  constructor(private readonly tune: RepairTuning) {}

  update(ctx: AIContext, view: WorldView): void {
    const repairers = view.villagers.filter((v) => v.repairIntent);
    let active = repairers.length;
    for (const v of repairers) {
      const target = view.byId.get(v.repairIntent!.targetId);
      if (target?.position && this.enemyNear(view, target)) {
        clearUnitOrders(ctx.world, v);
        active--;
      }
    }
    if (active >= this.tune.maxVillagers || !this.checkDue(ctx.timeMs)) return;
    const target = this.pickTarget(ctx, view);
    if (!target) return;
    const at = target.position!;
    const candidates = view.villagers.filter((v) => v.position && !v.repairIntent && !v.attackIntent && !v.buildCommand && canRepair(ctx.world, v, target, ctx.teams));
    const idle = candidates.filter((v) => isIdleVillager(v, view));
    const gatherers = candidates
      .filter((v) => !idle.includes(v) && villagerTask(v, view.byId) !== 'build')
      .sort((a, b) => chebyshev(a.position!, at) - chebyshev(b.position!, at));
    const nearestIdle = idle.sort((a, b) => chebyshev(a.position!, at) - chebyshev(b.position!, at));
    for (const v of [...nearestIdle, ...gatherers].slice(0, this.tune.maxVillagers - active)) startRepair(ctx.world, v, target);
  }

  /**
   * The first upkeep in each `everyMs` window of game time (upkeeps come
   * AI_COMMON.upkeepMs apart, so a window is rarely skipped). Read from the
   * clock alone: a loaded game keeps the same cadence with nothing saved.
   */
  private checkDue(timeMs: number): boolean {
    const every = this.tune.everyMs;
    return Math.floor(timeMs / every) !== Math.floor((timeMs - AI_COMMON.upkeepMs) / every);
  }

  /** The building to repair now: the town centre first, then the lowest HP share; only safe and affordable ones. */
  private pickTarget(ctx: AIContext, view: WorldView): Entity | undefined {
    const share = (b: Entity) => b.health!.current / b.health!.max;
    const damaged = view.buildings.filter(
      (b) =>
        b.building &&
        b.health &&
        b.position &&
        !b.underConstruction &&
        !b.dying &&
        b.health.current > 0 &&
        share(b) < this.tune.belowHpFraction &&
        canPayOneUnit(ctx.player.resources, BUILDING_BALANCE[b.building.type].cost) &&
        !this.enemyNear(view, b),
    );
    const tcFirst = (b: Entity) => (b.building!.type === 'town_center' ? 0 : 1);
    return damaged.sort((a, b) => tcFirst(a) - tcFirst(b) || share(a) - share(b))[0];
  }

  /** A seen enemy unit within `safeRadius` tiles of the building. */
  private enemyNear(view: WorldView, b: Entity): boolean {
    return view.visibleEnemyUnits.some((u) => u.position && distanceToFootprint(u.position, b) <= this.tune.safeRadius);
  }
}
