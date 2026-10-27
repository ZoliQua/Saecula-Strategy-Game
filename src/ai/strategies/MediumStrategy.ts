import { AI_COMMON, AI_MEDIUM, type GatherWeights, type MediumTuning } from '../../config/aiBalance';
import type { Entity } from '../../ecs/components';
import { BUILDING_SPECS } from '../../ecs/archetypes/building';
import { UNIT_SPECS } from '../../ecs/archetypes/unit';
import { isUnitAvailable } from '../../game/availability';
import { TECH_SPECS } from '../../game/technologies';
import type { BuildingType, Resources, TechId, UnitType } from '../../types';
import type { AIContext } from '../AIPlayer';
import { ArmyControl } from '../ArmyControl';
import { countByType, counterMix, nextUnitToTrain, reserveForGoal, savedForUnit } from '../decisions/army';
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
  unstaffedSite,
} from '../economyBuildings';
import type { WorldView } from '../perception';
import { assignIdleVillagers, rebalanceGatherers } from '../workforce';
import { BaseStrategy } from './BaseStrategy';

/**
 * Medium AI (PROGRAM_TERV.md §10.2): a preset build order, age-ups as
 * soon as they are affordable, blacksmith and economy techs, a mixed army
 * adjusted to what its scout has seen, one scout exploring all game,
 * attack waves of 12+ units (never before the rolled 5-8 min), and home
 * defence whenever its base is attacked.
 */
export class MediumStrategy extends BaseStrategy {
  readonly name: string = 'medium';
  protected readonly army: ArmyControl;
  protected readonly firstAttackAtMs: number;
  private lastScoutMs = -Infinity;
  protected pressureSent = false;

  /** `tune` is the strategy's table (AI_MEDIUM; Hard passes its own). */
  constructor(
    rng: () => number = Math.random,
    protected readonly tune: MediumTuning = AI_MEDIUM,
  ) {
    super(rng, tune.decisionMs);
    this.army = new ArmyControl(this.log, rng, (u) => this.isReserved(u));
    this.firstAttackAtMs = this.roll(tune.firstAttackMs);
  }

  /** Units another controller (Hard's raids) owns; the army and pressure squad leave them alone. */
  protected isReserved(_u: Entity): boolean {
    return false;
  }

  /** Army size that launches a main wave (Infinity holds the army at home). */
  protected waveThreshold(_ctx: AIContext, _view: WorldView): number {
    return this.tune.attackWave;
  }

  /** Whether the main army is trained in the current age. */
  protected trainsArmy(ctx: AIContext): boolean {
    return ctx.player.age >= 2;
  }

  protected upkeep(ctx: AIContext, view: WorldView): void {
    assignIdleVillagers(ctx.world, view, this.gatherWeights(ctx, view));
    this.army.update(ctx, view);
    this.army.scout(ctx, view);
    const waitingForTc = this.tryAgeUp(ctx, view);
    const first = this.tune.pressure.beforeFarms;
    // `beforeFarms`: while the raiders are short, their food comes first and new farms wait.
    const raidingFirst = first && this.preparePressure(ctx, view);
    // Houses and farms come before more mouths: an unaffordable one keeps the food for it.
    const saving = this.buildEssentials(ctx, view, raidingFirst);
    // Close to the first-attack time, the raiders come before more villagers.
    const raiding = first ? raidingFirst : this.preparePressure(ctx, view);
    if (!waitingForTc && !saving && !raiding) this.trainVillagers(ctx, view);
    if (this.army.underAttack(view)) this.trainDefenders(ctx, view);
  }

  protected decide(ctx: AIContext, view: WorldView): void {
    this.rebalance(ctx, view);
    this.buildEconomy(ctx, view);
    this.buildMilitary(ctx, view);
    this.keepScouting(ctx, view);
    this.trainArmy(ctx, view);
    this.researchTechs(ctx, view);
    this.pressure(ctx, view);
    if (this.pressureSent && !this.army.attacking && attackReady({
      armySize: view.military.filter((u) => !this.isReserved(u)).length,
      wave: this.waveThreshold(ctx, view),
      timeMs: ctx.timeMs,
      notBeforeMs: this.firstAttackAtMs,
    })) {
      this.army.launchWave(ctx, view);
    }
    this.updateThoughts(ctx, view);
  }

  /**
   * §10.2 first attack at the rolled 5-8 min: a small pressure wave of
   * Roman-age infantry. Below the minimum size it waits for the next
   * decision (a few more units) instead of sending a token force.
   */
  private pressure(ctx: AIContext, view: WorldView): void {
    if (this.pressureSent) return;
    const squad = this.pressureSquad(view);
    if (ctx.timeMs < this.firstAttackAtMs || squad.length < this.tune.pressure.minArmy || this.army.attacking) return;
    this.army.launchWave(ctx, view, squad);
    this.pressureSent = true;
  }

  /**
   * Scouts wanted exploring: one until the pressure raid has left (food
   * goes to the raid first), then `tune.scouts`.
   */
  private explorersWanted(): number {
    return this.pressureSent ? this.tune.scouts : Math.min(1, this.tune.scouts);
  }

  /** Scouts kept exploring (never wave or reserved units). */
  protected explorers(view: WorldView): Entity[] {
    return view.scouts.filter((s) => !this.army.inWave(s) && !this.isReserved(s)).slice(0, this.explorersWanted());
  }

  /** Pressure units besides the exploring scouts. */
  private pressureSquad(view: WorldView): Entity[] {
    const explorers = new Set(this.explorers(view));
    return [...view.military, ...view.scouts].filter(
      (u) => !explorers.has(u) && !this.isReserved(u) && u.unit?.unitType === this.tune.pressure.unit,
    );
  }

  /**
   * From `leadMs` before the first-attack time until the raid leaves,
   * trains the pressure squad (queued units counted). True while the squad
   * is still short, `holdsVillagers` is set and holding may pay off
   * (`mayHoldForPressure`): the caller then holds back villager training
   * (and, with `beforeFarms`, new farms).
   */
  private preparePressure(ctx: AIContext, view: WorldView): boolean {
    const { unit, minArmy, leadMs } = this.tune.pressure;
    if (this.pressureSent || ctx.timeMs < this.firstAttackAtMs - leadMs) return false;
    const queued = view.buildings.reduce(
      (n, b) => n + (b.trainingQueue?.entries.filter((e) => e.unitType === unit).length ?? 0),
      0,
    );
    // Missing explorers: the next scouts trained go exploring first.
    const wanted = minArmy + (unit === 'scout' ? this.explorersWanted() - this.explorers(view).length : 0);
    const have = this.pressureSquad(view).length + queued;
    if (have >= wanted) return false;
    this.train(ctx, view, unit, this.tune.militaryQueue);
    return this.tune.pressure.holdsVillagers && this.mayHoldForPressure(ctx, view);
  }

  /**
   * Whether waiting for the raiders is worth it. Never without a finished
   * trainer; never when starved (food below the raider's cost and no
   * finished farm: holding farms and villagers would stall for good); and
   * never past `AI_COMMON.pressureHoldCapMs` after the first-attack time
   * (e.g. capped by population, or scouts keep dying).
   */
  private mayHoldForPressure(ctx: AIContext, view: WorldView): boolean {
    const unit = this.tune.pressure.unit;
    if (this.trainersFor(view, unit, Infinity).length === 0) return false;
    if (ctx.timeMs > this.firstAttackAtMs + AI_COMMON.pressureHoldCapMs) return false;
    const farm = view.buildings.some((b) => b.building?.type === 'farm' && !b.underConstruction);
    return farm || ctx.player.resources.food >= UNIT_SPECS[unit].cost.food;
  }

  // ------------------------------------------------------------ economy

  /** Moves gatherers when the split drifts from the wanted one. */
  protected rebalance(ctx: AIContext, view: WorldView): void {
    const moved = rebalanceGatherers(ctx.world, view, this.gatherWeights(ctx, view), this.tune.rebalancePerDecision);
    for (const m of moved) this.log.add(ctx.timeMs, 'rebalance', `${m.from}>${m.to}`);
  }

  /** Age split, leaning toward whatever the next age-up still lacks. */
  protected gatherWeights(ctx: AIContext, view: WorldView): GatherWeights {
    if (view.villagers.length < this.tune.openingVillagers) return this.tune.gatherOpening;
    const base = this.tune.gatherByAge[ctx.player.age] ?? this.tune.gatherOpening;
    return weightsForGoal(base, this.savingsGoal(ctx, view), ctx.player.resources, this.tune.ageUpGatherShift);
  }

  /** What the AI is saving for: the next age-up, this age's missing military buildings and a wood buffer. */
  private savingsGoal(ctx: AIContext, view: WorldView): Resources {
    const goal = { food: 0, wood: this.tune.woodBuffer, gold: 0 };
    const add = (c: Resources) => {
      goal.food += c.food;
      goal.wood += c.wood;
      goal.gold += c.gold;
    };
    const next = this.nextAgeUp(ctx);
    if (next && !this.agingUp(view)) add(TECH_SPECS[next].cost);
    for (const t of this.tune.militaryBuildings[ctx.player.age] ?? []) {
      if (this.ownCount(view, t) === 0) add(BUILDING_SPECS[t].cost);
    }
    return goal;
  }

  protected villagerTarget(ctx: AIContext, _view: WorldView): number {
    return this.tune.villagerTarget[ctx.player.age] ?? 0;
  }

  private trainVillagers(ctx: AIContext, view: WorldView): void {
    const queued = view.townCenter?.trainingQueue?.entries.length ?? 0;
    if (view.villagers.length + queued >= this.villagerTarget(ctx, view)) return;
    // Under attack with too few defenders, food goes to soldiers first.
    if (this.army.underAttack(view) && view.military.length < this.tune.minDefenders) return;
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
    if (view.military.length < this.tune.minDefenders && ctx.player.age > 1) return NO_RESERVE;
    return scaleCost(TECH_SPECS[next].cost, this.ageUpReserveShare(ctx));
  }

  /** Share of the next age-up's cost kept saved while spending (see `tune.ageUpReserve`). */
  protected ageUpReserveShare(ctx: AIContext): number {
    return this.tune.ageUpReserve[ctx.player.age] ?? 0;
  }

  private wantedFood(ctx: AIContext, view: WorldView): number {
    return Math.round(this.gatherWeights(ctx, view).food * view.villagers.length);
  }

  /**
   * House when the population nears the cap, farm when food spots run
   * short (unless `farmsWait`). True when one is needed but not affordable yet (save for it).
   */
  private buildEssentials(ctx: AIContext, view: WorldView, farmsWait = false): boolean {
    const build = this.builder(ctx, view);
    const pop = populationWithQueued(ctx.world, ctx.player);
    const short = (type: BuildingType) => !canAfford(ctx.player.resources, BUILDING_SPECS[type].cost);
    let saving = false;
    if (needsHouse(pop, this.sitesInProgress(view, 'house'), AI_COMMON.houseMargin)) {
      saving = !buildHouseIfNeeded(view, pop, build) && short('house');
    }
    const wantedFood = this.wantedFood(ctx, view);
    if (!farmsWait && farmNeeded(view, wantedFood)) saving = (!buildFarmIfNeeded(view, wantedFood, build) && short('farm')) || saving;
    return saving;
  }

  private buildEconomy(ctx: AIContext, view: WorldView): void {
    const build = this.builder(ctx, view);
    buildCampIfNeeded(view, 'wood', build);
    buildCampIfNeeded(view, 'gold', build);
    // A site whose builders were killed or taken gets new ones (not into a fight at home).
    const site = this.army.underAttack(view) ? undefined : unstaffedSite(view);
    if (site) this.assignBuilders(ctx, view, site, AI_COMMON.buildersPerSite);
  }

  /** The age's military buildings in build order, one site at a time. */
  private buildMilitary(ctx: AIContext, view: WorldView): void {
    if (ctx.player.age === 1 && view.villagers.length < this.tune.barracksAtVillagers) return;
    const wanted = this.tune.militaryBuildings[ctx.player.age] ?? [];
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
    if (this.explorers(view).length >= this.explorersWanted()) return;
    if (ctx.timeMs - this.lastScoutMs < this.tune.scoutRetrainMs) return;
    const queued = view.buildings.some((b) => b.trainingQueue?.entries.some((e) => e.unitType === 'scout'));
    if (!queued && this.train(ctx, view, 'scout', 1)) this.lastScoutMs = ctx.timeMs;
  }

  /** Mix for the current age, countered against what has been seen, limited to what is unlocked. */
  protected armyMix(ctx: AIContext, view: WorldView): ReturnType<typeof counterMix> {
    const base = this.tune.armyByAge[ctx.player.age] ?? {};
    const allowed = (Object.keys(UNIT_SPECS) as UnitType[]).filter(
      (t) => t !== 'villager' && t !== 'scout' && isUnitAvailable(t, ctx.player.age),
    );
    return counterMix(base, view.enemySightings, allowed, this.tune.counters);
  }

  /** Age 2+: every free military building trains the unit furthest below its share. */
  private trainArmy(ctx: AIContext, view: WorldView): void {
    if (!this.trainsArmy(ctx)) return;
    const mix = this.armyMix(ctx, view);
    const reserve = this.reserve(ctx, view);
    const counts = countByType(view.military);
    const trainable = (t: UnitType) => this.trainersFor(view, t, this.tune.militaryQueue).length > 0;
    for (let i = 0; i < this.tune.trainPerDecision; i++) {
      // A cannon the army is short of is saved for: the other units only spend what lies above its cost.
      const goal = savedForUnit(mix, counts, trainable, AI_COMMON.savesForUnits);
      const saving = goal ? reserveForGoal(goal, ctx.player.resources, UNIT_SPECS[goal].cost, reserve, AI_COMMON.savesForUnits) : reserve;
      const type = nextUnitToTrain(mix, counts, (t) => trainable(t)
        && canAfford(ctx.player.resources, UNIT_SPECS[t].cost, t === goal ? reserve : saving));
      if (!type || !this.train(ctx, view, type, this.tune.militaryQueue, type === goal ? reserve : saving)) return;
      counts[type] = (counts[type] ?? 0) + 1;
    }
  }

  /** Base under attack and outnumbered: cheapest available infantry, no savings kept. */
  private trainDefenders(ctx: AIContext, view: WorldView): void {
    if (view.military.length >= Math.min(view.threats.length, this.tune.minDefenders * 2)) return;
    const type: UnitType = isUnitAvailable('pikeman', ctx.player.age) ? 'pikeman' : 'swordsman';
    this.train(ctx, view, type, this.tune.militaryQueue);
  }

  private researchTechs(ctx: AIContext, view: WorldView): void {
    const reserve = this.reserve(ctx, view);
    const ready = (id: TechId) =>
      this.researchable(ctx, view, id) && canAfford(ctx.player.resources, TECH_SPECS[id].cost, reserve);
    const tech = pickResearch(this.tune.techPriority, ready);
    if (tech) this.research(ctx, view, tech, reserve);
  }

  // ------------------------------------------------------------ overlay

  protected updateThoughts(ctx: AIContext, view: WorldView): void {
    this.log.phase = this.army.underAttack(view)
      ? 'defending'
      : this.army.attacking
        ? 'attacking'
        : this.nextAgeUp(ctx) && (this.agingUp(view) || view.villagers.length >= this.villagerTarget(ctx, view))
          ? 'ageUp'
          : ctx.player.age === 1
            ? 'opening'
            : 'buildUp';
    const plan: string[] = [];
    const missing = (this.tune.militaryBuildings[ctx.player.age] ?? []).filter((t) => this.ownCount(view, t) === 0);
    plan.push(...missing);
    const next = this.nextAgeUp(ctx);
    if (next && !this.agingUp(view)) plan.push(next);
    const unit = nextUnitToTrain(this.armyMix(ctx, view), countByType(view.military), () => true);
    if (unit && this.trainsArmy(ctx)) plan.push(unit);
    const tech = pickResearch(this.tune.techPriority, (id) => this.researchable(ctx, view, id));
    if (tech) plan.push(tech);
    this.log.plan = plan;
  }
}
