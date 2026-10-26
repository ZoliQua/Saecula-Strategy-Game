import { AI_COMMON, AI_MEDIUM, type GatherWeights } from '../../config/balance';
import { BUILDING_SPECS } from '../../ecs/archetypes/building';
import { UNIT_SPECS } from '../../ecs/archetypes/unit';
import { isUnitAvailable } from '../../game/availability';
import { TECH_SPECS } from '../../game/technologies';
import type { BuildingType, Resources, TechId, UnitType } from '../../types';
import type { AIContext } from '../AIPlayer';
import { ArmyControl } from '../ArmyControl';
import { countByType, counterMix, nextUnitToTrain } from '../decisions/army';
import { attackReady } from '../decisions/combat';
import { weightsForGoal } from '../decisions/gathering';
import { pickResearch } from '../decisions/research';
import { needsHouse } from '../decisions/housing';
import { canAfford, NO_RESERVE, populationWithQueued, scaleCost } from '../economy';
import {
  baseAnchor,
  buildCampIfNeeded,
  buildFarmIfNeeded,
  buildHouseIfNeeded,
  farmNeeded,
  type BuildFn,
} from '../economyBuildings';
import type { WorldView } from '../perception';
import { assignIdleVillagers, rebalanceGatherers } from '../workforce';
import { BaseStrategy } from './BaseStrategy';

/** Military buildings keep at most this many units queued (resources stay liquid). */
const MILITARY_QUEUE = 2;

/**
 * Medium AI (PROGRAM_TERV.md §10.2): a preset build order, age-ups as
 * soon as they are affordable, blacksmith and economy techs, a mixed army
 * adjusted to what its scout has seen, one scout exploring all game,
 * attack waves of 12+ units (never before the rolled 5-8 min), and home
 * defence whenever its base is attacked.
 */
export class MediumStrategy extends BaseStrategy {
  readonly name = 'medium';
  protected readonly army: ArmyControl;
  private readonly firstAttackAtMs: number;
  private lastScoutMs = -Infinity;

  constructor(rng: () => number = Math.random) {
    super(rng, AI_MEDIUM.decisionMs);
    this.army = new ArmyControl(this.log, rng);
    this.firstAttackAtMs = this.roll(AI_MEDIUM.firstAttackMs);
  }

  protected upkeep(ctx: AIContext, view: WorldView): void {
    assignIdleVillagers(ctx.world, view, this.gatherWeights(ctx, view));
    this.army.update(ctx, view);
    this.army.scout(ctx, view);
    const waitingForTc = this.tryAgeUp(ctx, view);
    // Houses and farms come before more mouths: an unaffordable one keeps the food for it.
    const saving = this.buildEssentials(ctx, view);
    if (!waitingForTc && !saving) this.trainVillagers(ctx, view);
    if (this.army.underAttack(view)) this.trainDefenders(ctx, view);
  }

  protected decide(ctx: AIContext, view: WorldView): void {
    const moved = rebalanceGatherers(ctx.world, view, this.gatherWeights(ctx, view), AI_MEDIUM.rebalancePerDecision);
    for (const m of moved) this.log.add(ctx.timeMs, 'rebalance', `${m.from}>${m.to}`);
    this.buildEconomy(ctx, view);
    this.buildMilitary(ctx, view);
    this.keepScouting(ctx, view);
    this.trainArmy(ctx, view);
    this.researchTechs(ctx, view);
    if (!this.army.attacking && attackReady({
      armySize: view.military.length,
      wave: AI_MEDIUM.attackWave,
      timeMs: ctx.timeMs,
      notBeforeMs: this.firstAttackAtMs,
    })) {
      this.army.launchWave(ctx, view);
    }
    this.updateThoughts(ctx, view);
  }

  // ------------------------------------------------------------ economy

  /** Age split, leaning toward whatever the next age-up still lacks. */
  protected gatherWeights(ctx: AIContext, view: WorldView): GatherWeights {
    if (view.villagers.length < AI_MEDIUM.openingVillagers) return AI_MEDIUM.gatherOpening;
    const base = AI_MEDIUM.gatherByAge[ctx.player.age] ?? AI_MEDIUM.gatherOpening;
    return weightsForGoal(base, this.savingsGoal(ctx, view), ctx.player.resources, AI_MEDIUM.ageUpGatherShift);
  }

  /** What the AI is saving for: the next age-up plus this age's military buildings still missing. */
  private savingsGoal(ctx: AIContext, view: WorldView): Resources {
    const goal = { food: 0, wood: 0, gold: 0 };
    const add = (c: Resources) => {
      goal.food += c.food;
      goal.wood += c.wood;
      goal.gold += c.gold;
    };
    const next = this.nextAgeUp(ctx);
    if (next && !this.agingUp(view)) add(TECH_SPECS[next].cost);
    for (const t of AI_MEDIUM.militaryBuildings[ctx.player.age] ?? []) {
      if (this.ownCount(view, t) === 0) add(BUILDING_SPECS[t].cost);
    }
    return goal;
  }

  private villagerTarget(ctx: AIContext): number {
    return AI_MEDIUM.villagerTarget[ctx.player.age] ?? 0;
  }

  private trainVillagers(ctx: AIContext, view: WorldView): void {
    const queued = view.townCenter?.trainingQueue?.entries.length ?? 0;
    if (view.villagers.length + queued >= this.villagerTarget(ctx)) return;
    // Under attack with too few defenders, food goes to soldiers first.
    if (this.army.underAttack(view) && view.military.length < AI_MEDIUM.minDefenders) return;
    this.train(ctx, view, 'villager', 1);
  }

  /** Starts the next age-up as soon as it is affordable; true while waiting for the TC queue to empty. */
  private tryAgeUp(ctx: AIContext, view: WorldView): boolean {
    const next = this.nextAgeUp(ctx);
    if (!next || this.agingUp(view)) return false;
    if (!canAfford(ctx.player.resources, TECH_SPECS[next].cost)) return false;
    if (this.research(ctx, view, next)) return false;
    return (view.townCenter?.trainingQueue?.entries.length ?? 0) > 0;
  }

  /** Savings kept for the next age-up while it is not yet affordable. */
  protected reserve(ctx: AIContext, view: WorldView): Resources {
    const next = this.nextAgeUp(ctx);
    if (!next || this.agingUp(view)) return NO_RESERVE;
    if (view.military.length < AI_MEDIUM.minDefenders && ctx.player.age > 1) return NO_RESERVE;
    return scaleCost(TECH_SPECS[next].cost, AI_MEDIUM.ageUpReserve[ctx.player.age] ?? 0);
  }

  private wantedFood(ctx: AIContext, view: WorldView): number {
    return Math.round(this.gatherWeights(ctx, view).food * view.villagers.length);
  }

  /**
   * House when the population nears the cap, farm when food spots run
   * short. True when one is needed but not affordable yet (save for it).
   */
  private buildEssentials(ctx: AIContext, view: WorldView): boolean {
    const build = this.builder(ctx, view);
    const pop = populationWithQueued(ctx.world, ctx.player);
    const short = (type: BuildingType) => !canAfford(ctx.player.resources, BUILDING_SPECS[type].cost);
    let saving = false;
    if (needsHouse(pop, this.sitesInProgress(view, 'house'), AI_COMMON.houseMargin)) {
      saving = !buildHouseIfNeeded(view, pop, build) && short('house');
    }
    const wantedFood = this.wantedFood(ctx, view);
    if (farmNeeded(view, wantedFood)) saving = (!buildFarmIfNeeded(view, wantedFood, build) && short('farm')) || saving;
    return saving;
  }

  private buildEconomy(ctx: AIContext, view: WorldView): void {
    const build = this.builder(ctx, view);
    buildCampIfNeeded(view, 'wood', build);
    buildCampIfNeeded(view, 'gold', build);
  }

  /** The age's military buildings in build order, one site at a time. */
  private buildMilitary(ctx: AIContext, view: WorldView): void {
    if (ctx.player.age === 1 && view.villagers.length < AI_MEDIUM.barracksAtVillagers) return;
    const wanted = AI_MEDIUM.militaryBuildings[ctx.player.age] ?? [];
    const missing = wanted.find((t) => this.ownCount(view, t) === 0);
    if (!missing || wanted.some((t) => this.sitesInProgress(view, t) > 0)) return;
    const reserve = ctx.player.age > 1 ? this.reserve(ctx, view) : NO_RESERVE;
    const anchor = baseAnchor(view);
    if (anchor) this.startBuilding(ctx, view, missing, anchor, reserve);
  }

  private builder(ctx: AIContext, view: WorldView): BuildFn {
    return (type: BuildingType, anchor) => this.startBuilding(ctx, view, type, anchor);
  }

  // ------------------------------------------------------------ army

  private keepScouting(ctx: AIContext, view: WorldView): void {
    if (view.scouts.length > 0) return;
    if (ctx.timeMs - this.lastScoutMs < AI_MEDIUM.scoutRetrainMs) return;
    const queued = view.buildings.some((b) => b.trainingQueue?.entries.some((e) => e.unitType === 'scout'));
    if (!queued && this.train(ctx, view, 'scout', 1)) this.lastScoutMs = ctx.timeMs;
  }

  /** Mix for the current age, countered against what has been seen, limited to what is unlocked. */
  protected armyMix(ctx: AIContext, view: WorldView): ReturnType<typeof counterMix> {
    const base = AI_MEDIUM.armyByAge[ctx.player.age] ?? {};
    const allowed = (Object.keys(UNIT_SPECS) as UnitType[]).filter(
      (t) => t !== 'villager' && t !== 'scout' && isUnitAvailable(t, ctx.player.age),
    );
    return counterMix(base, view.enemySightings, allowed);
  }

  /** Age 2+: every free military building trains the unit furthest below its share. */
  private trainArmy(ctx: AIContext, view: WorldView): void {
    if (ctx.player.age < 2) return;
    const mix = this.armyMix(ctx, view);
    const reserve = this.reserve(ctx, view);
    const counts = countByType(view.military);
    for (let i = 0; i < 4; i++) {
      const type = nextUnitToTrain(mix, counts, (t) => this.trainersFor(view, t, MILITARY_QUEUE).length > 0
        && canAfford(ctx.player.resources, UNIT_SPECS[t].cost, reserve));
      if (!type || !this.train(ctx, view, type, MILITARY_QUEUE, reserve)) return;
      counts[type] = (counts[type] ?? 0) + 1;
    }
  }

  /** Base under attack and short of defenders: cheapest available infantry, no savings kept. */
  private trainDefenders(ctx: AIContext, view: WorldView): void {
    if (view.military.length >= AI_MEDIUM.minDefenders * 2) return;
    const type: UnitType = isUnitAvailable('pikeman', ctx.player.age) ? 'pikeman' : 'swordsman';
    this.train(ctx, view, type, MILITARY_QUEUE);
  }

  private researchTechs(ctx: AIContext, view: WorldView): void {
    const reserve = this.reserve(ctx, view);
    const ready = (id: TechId) =>
      this.researchable(ctx, view, id) && canAfford(ctx.player.resources, TECH_SPECS[id].cost, reserve);
    const tech = pickResearch(AI_MEDIUM.techPriority, ready);
    if (tech) this.research(ctx, view, tech, reserve);
  }

  // ------------------------------------------------------------ overlay

  private updateThoughts(ctx: AIContext, view: WorldView): void {
    this.log.phase = this.army.underAttack(view)
      ? 'defending'
      : this.army.attacking
        ? 'attacking'
        : this.nextAgeUp(ctx) && (this.agingUp(view) || view.villagers.length >= this.villagerTarget(ctx))
          ? 'ageUp'
          : ctx.player.age === 1
            ? 'opening'
            : 'buildUp';
    const plan: string[] = [];
    const missing = (AI_MEDIUM.militaryBuildings[ctx.player.age] ?? []).filter((t) => this.ownCount(view, t) === 0);
    plan.push(...missing);
    const next = this.nextAgeUp(ctx);
    if (next && !this.agingUp(view)) plan.push(next);
    const unit = nextUnitToTrain(this.armyMix(ctx, view), countByType(view.military), () => true);
    if (unit && ctx.player.age > 1) plan.push(unit);
    const tech = pickResearch(AI_MEDIUM.techPriority, (id) => this.researchable(ctx, view, id));
    if (tech) plan.push(tech);
    this.log.plan = plan;
  }
}
