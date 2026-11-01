import { AI_COMMON, AI_MEDIUM, type GatherWeights, type MediumTuning } from '../../config/aiBalance';
import type { Entity } from '../../ecs/components';
import { BUILDING_SPECS } from '../../ecs/archetypes/building';
import { UNIT_SPECS } from '../../ecs/archetypes/unit';
import { isUnitAvailable } from '../../game/availability';
import { TECH_SPECS } from '../../game/technologies';
import { baseUnitType, civUnitType } from '../../game/civUnits';
import { BASE_UNIT_TYPES, type BaseUnitType, type BuildingType, type Resources, type TechId } from '../../types';
import type { AIContext } from '../AIPlayer';
import { chebyshev, type TileCoord } from '../../iso/coordinates';
import { ArmyControl } from '../ArmyControl';
import { countByType, counterMix, nextUnitToTrain, reserveForGoal, savedForUnit } from '../decisions/army';
import { attackReady, pickAttackTarget } from '../decisions/combat';
import { landReachable } from '../decisions/naval';
import { LandingControl } from '../LandingControl';
import { NavalPlay } from '../NavalPlay';
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
import { expectKind, loadedTime, savedTime, type MediumFields, type StrategyState } from '../strategyState';
import { PressureControl } from '../PressureControl';
import { MonkPlay } from '../MonkPlay';
import { WonderPlay } from '../WonderPlay';
import { assignIdleVillagers, rebalanceGatherers, workableNodes } from '../workforce';
import { BaseStrategy } from './BaseStrategy';

/** The tile of `tiles` nearest `from` (Chebyshev), or undefined. */
function nearestTile(tiles: readonly TileCoord[], from: TileCoord): TileCoord | undefined {
  return tiles.reduce<TileCoord | undefined>((best, t) => (!best || chebyshev(t, from) < chebyshev(best, from) ? t : best), undefined);
}

/** How long a walkability answer (M14) holds while the known enemy buildings stay the same. */
const WALKABLE_RECHECK_MS = 60_000;

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
  protected firstAttackAtMs: number;
  private lastScoutMs = -Infinity;
  private readonly pressure: PressureControl;
  private readonly wonder: WonderPlay;
  private readonly monks: MonkPlay;
  private readonly naval: NavalPlay;
  private readonly landing: LandingControl;
  /** Whether the enemy can be walked to (M14), re-checked now and then: [answer, checked at, enemy buildings key]. */
  private walkable: { answer: boolean; atMs: number; key: string } | null = null;

  /** `tune` is the strategy's table (AI_MEDIUM; Hard passes its own). */
  constructor(
    rng: () => number = Math.random,
    protected readonly tune: MediumTuning = AI_MEDIUM,
  ) {
    super(rng, tune.decisionMs);
    this.army = new ArmyControl(this.log, rng, (u) => this.isReserved(u));
    this.firstAttackAtMs = this.roll(tune.firstAttackMs);
    this.wonder = new WonderPlay(tune.wonder, {
      placeFor: (c, v, t, a) => this.placeFor(c, v, t, a),
      startBuilding: (c, v, t, a) => this.startBuilding(c, v, t, a),
      assignBuilders: (c, v, site, n) => this.assignBuilders(c, v, site, n),
    });
    this.monks = new MonkPlay(tune.monks, {
      ownCount: (v, t, f) => this.ownCount(v, t, f),
      militaryReady: (c, v) => (this.tune.militaryBuildings[c.player.age] ?? []).every((t) => this.ownCount(v, t, true) > 0),
      startBuilding: (c, v, t, a) => this.startBuilding(c, v, t, a, this.reserve(c, v)),
      // Monks spend only what the army's savings (a cannon it is short of) leave over.
      train: (c, v, t, n) => this.train(c, v, t, n, this.armySavings(c, v)),
      waveMembers: () => this.army.members(),
    });
    this.landing = new LandingControl(this.log, (c, v, units) => {
      this.army.launchWave(c, v, units);
    });
    this.naval = new NavalPlay(tune.navy, {
      ownCount: (v, t, f) => this.ownCount(v, t, f),
      startBuilding: (c, v, t, a) => this.startBuilding(c, v, t, a, this.reserve(c, v)),
      train: (c, v, t, n) => this.train(c, v, t, n, this.armySavings(c, v)),
      transportsWanted: (c, v) => (this.enemyWalkable(c, v) ? 0 : this.tune.navy.transports),
    });
    this.pressure = new PressureControl(tune, this.army, {
      isReserved: (u) => this.isReserved(u),
      explorers: (v) => this.explorers(v),
      missingExplorers: (v) => this.explorersWanted() - this.explorers(v).length,
      train: (c, v, t, n) => this.train(c, v, t, n),
      trainersFor: (v, t, n) => this.trainersFor(v, t, n),
      firstAttackAtMs: () => this.firstAttackAtMs,
      launched: (c, v) => this.onWaveLaunched(c, v),
    });
  }

  snapshot(): StrategyState {
    return { kind: 'medium', ...this.mediumFields() };
  }

  restore(state: StrategyState): void {
    this.restoreMedium(expectKind(state, 'medium'));
  }

  /** Medium's saved fields; Hard and Mesteri add theirs. */
  protected mediumFields(): MediumFields {
    const monkAvoid = this.monks.snapshot();
    return {
      base: this.baseState(),
      army: this.army.snapshot(),
      wonderSite: this.wonder.snapshot(),
      pressure: this.pressure.snapshot(),
      firstAttackAtMs: this.firstAttackAtMs,
      lastScoutMs: savedTime(this.lastScoutMs),
      ...(this.landing.active ? { landing: this.landing.snapshot() } : {}),
      // Only when there is any: a save without avoided targets stays as before 0.8.1.
      ...(monkAvoid.length > 0 ? { monkAvoid } : {}),
    };
  }

  protected restoreMedium(s: MediumFields): void {
    this.restoreBase(s.base);
    this.army.restore(s.army);
    this.wonder.restore(s.wonderSite);
    this.pressure.restore(s.pressure);
    this.firstAttackAtMs = s.firstAttackAtMs;
    this.lastScoutMs = loadedTime(s.lastScoutMs);
    this.landing.restore(s.landing ?? { members: [], transports: [], target: null, phase: null, sinceMs: 0 });
    this.monks.restore(s.monkAvoid ?? []);
  }

  /** Units another controller (Hard's raids) owns; the army and pressure squad leave them alone. */
  protected isReserved(u: Entity): boolean {
    return this.landing.has(u);
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
    this.monks.control(ctx, view);
    this.naval.control(ctx, view);
    this.landing.update(ctx, view);
    this.army.scout(ctx, view);
    const waitingForTc = this.tryAgeUp(ctx, view);
    const first = this.tune.pressure.beforeFarms;
    // `beforeFarms`: while the raiders are short, their food comes first and new farms wait.
    const raidingFirst = first && this.pressure.prepare(ctx, view);
    // Houses and farms come before more mouths: an unaffordable one keeps the food for it.
    const saving = this.buildEssentials(ctx, view, raidingFirst);
    // Close to the first-attack time, the raiders come before more villagers.
    const raiding = first ? raidingFirst : this.pressure.prepare(ctx, view);
    if (!waitingForTc && !saving && !raiding) this.trainVillagers(ctx, view);
    if (this.army.underAttack(view)) this.trainDefenders(ctx, view);
  }

  protected decide(ctx: AIContext, view: WorldView): void {
    // Before any other spending, so an affordable Wonder is not spent away.
    this.wonder.build(ctx, view, this.army.underAttack(view));
    this.rebalance(ctx, view);
    this.buildEconomy(ctx, view);
    this.buildMilitary(ctx, view);
    this.monks.build(ctx, view);
    this.naval.build(ctx, view);
    this.keepScouting(ctx, view);
    this.trainArmy(ctx, view);
    this.monks.train(ctx, view);
    this.naval.train(ctx, view);
    this.researchTechs(ctx, view);
    this.pressure.launch(ctx, view);
    this.pressure.recall(ctx, view);
    if (this.pressure.sent && !this.army.attacking && attackReady({
      armySize: view.military.filter((u) => !this.isReserved(u)).length,
      wave: this.waveThreshold(ctx, view),
      timeMs: ctx.timeMs,
      notBeforeMs: this.firstAttackAtMs,
    })) {
      // The enemy across the sea (M14): the wave lands from transports instead of marching.
      if (!this.enemyWalkable(ctx, view)) this.tryLanding(ctx, view);
      else {
        this.army.launchWave(ctx, view);
        this.pressure.mainWaveLaunched();
        this.onWaveLaunched(ctx, view);
      }
    }
    // An army out "exploring" its own island while the enemy is across the sea: home, to board.
    if (!this.enemyWalkable(ctx, view) && this.army.attacking) this.army.recall(ctx, view);
    this.updateThoughts(ctx, view);
  }

  /**
   * Whether the enemy's known buildings can be walked to from the base
   * (M14); with none known yet, true (the army explores as before).
   * Re-checked when what is known changes, at most every WALKABLE_RECHECK_MS.
   */
  protected enemyWalkable(ctx: AIContext, view: WorldView): boolean {
    const enemy = this.enemySpots(ctx, view);
    const home = view.townCenter?.position;
    if (enemy.length === 0 || !home) return true;
    const key = enemy.map((p) => `${p.tx},${p.ty}`).join(';');
    const last = this.walkable;
    if (last && last.key === key && ctx.timeMs - last.atMs < WALKABLE_RECHECK_MS) return last.answer;
    const answer = enemy.some((p) => landReachable(ctx.mapData, home, p));
    this.walkable = { answer, atMs: ctx.timeMs, key };
    return answer;
  }

  /** Where the enemy is known to be: its known buildings, else where its villagers were last seen (M14). */
  private enemySpots(ctx: AIContext, view: WorldView): TileCoord[] {
    const ours = (ownerId: number) => ctx.enemyPlayerId === undefined || ownerId === ctx.enemyPlayerId;
    const buildings = view.knownEnemyBuildings.filter((b) => ours(b.ownerId)).map((b) => b.position);
    return buildings.length > 0 ? buildings : view.enemyVillagers.filter((v) => ours(v.ownerId)).map((v) => v.position);
  }

  /** Boards the army at home onto the idle transports, bound for the enemy's nearest known building, or villagers (M14). */
  private tryLanding(ctx: AIContext, view: WorldView): void {
    if (this.landing.active) return;
    const transports = view.ships.filter((s) => s.unit?.unitType === 'transport' && !s.unloadIntent && (s.cargo?.units.length ?? 0) === 0);
    const home = view.townCenter?.position;
    const known = home && pickAttackTarget(view.knownEnemyBuildings, home, ctx.enemyPlayerId);
    const target = known?.position ?? (home && nearestTile(this.enemySpots(ctx, view), home));
    if (transports.length === 0 || !target) return;
    const units = view.military.filter((u) => !this.isReserved(u) && !this.army.inWave(u));
    if (this.landing.start(ctx, units, transports, target) > 0) this.pressure.mainWaveLaunched();
  }

  /** Called after each wave launch (pressure and main waves); Mesteri splits off a flank here. */
  protected onWaveLaunched(_ctx: AIContext, _view: WorldView): void {}

  /**
   * Scouts wanted exploring: one until the pressure raid has left (food
   * goes to the raid first), then `tune.scouts`.
   */
  private explorersWanted(): number {
    return this.pressure.sent ? this.tune.scouts : Math.min(1, this.tune.scouts);
  }

  /** Scouts kept exploring (never wave or reserved units). */
  protected explorers(view: WorldView): Entity[] {
    return view.scouts.filter((s) => !this.army.inWave(s) && !this.isReserved(s)).slice(0, this.explorersWanted());
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
    if (this.wonder.saving(ctx, view)) add(BUILDING_SPECS.wonder.cost);
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

  /** Savings kept for the next age-up (in the last age: for the Wonder) while it is not yet affordable. */
  protected reserve(ctx: AIContext, view: WorldView): Resources {
    const next = this.nextAgeUp(ctx);
    if (next ? this.agingUp(view) : !this.wonder.saving(ctx, view)) return NO_RESERVE;
    if (view.military.length < this.tune.minDefenders && ctx.player.age > 1) return NO_RESERVE;
    return next ? scaleCost(TECH_SPECS[next].cost, this.ageUpReserveShare(ctx)) : BUILDING_SPECS.wonder.cost;
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
    const queued = view.buildings.some((b) => b.trainingQueue?.entries.some((e) => baseUnitType(e.unitType) === 'scout'));
    if (!queued && this.train(ctx, view, 'scout', 1)) this.lastScoutMs = ctx.timeMs;
  }

  /** Mix for the current age, countered against what has been seen, limited to what is unlocked. */
  protected armyMix(ctx: AIContext, view: WorldView): ReturnType<typeof counterMix> {
    const base = this.tune.armyByAge[ctx.player.age] ?? {};
    const allowed = BASE_UNIT_TYPES.filter(
      // Monks are trained apart (MonkPlay), never as part of the army mix.
      (t) => t !== 'villager' && t !== 'scout' && t !== 'monk' && isUnitAvailable(t, ctx.player.age),
    );
    return counterMix(base, view.enemySightings, allowed, this.tune.counters);
  }

  /** Age 2+: every free military building trains the unit furthest below its share. */
  private trainArmy(ctx: AIContext, view: WorldView): void {
    if (!this.trainsArmy(ctx)) return;
    const mix = this.armyMix(ctx, view);
    const reserve = this.reserve(ctx, view);
    const counts = countByType(view.military);
    const trainable = (t: BaseUnitType) => this.trainersFor(view, t, this.tune.militaryQueue).length > 0;
    for (let i = 0; i < this.tune.trainPerDecision; i++) {
      // A cannon the army is short of is saved for (while gold can still come in): the other units only spend what lies above its cost.
      // Gold nodes it would mine (not inside a known enemy base): with none, saving for a cannon never ends.
      const goal = savedForUnit(mix, counts, trainable, AI_COMMON.savesForUnits, workableNodes(view, 'gold').length);
      const cost = (t: BaseUnitType) => UNIT_SPECS[civUnitType(ctx.player.civ, t)].cost;
      const saving = goal ? reserveForGoal(goal, ctx.player.resources, cost(goal), reserve, AI_COMMON.savesForUnits) : reserve;
      const type = nextUnitToTrain(mix, counts, (t) => trainable(t)
        && canAfford(ctx.player.resources, cost(t), t === goal ? reserve : saving));
      if (!type || !this.train(ctx, view, type, this.tune.militaryQueue, type === goal ? reserve : saving)) return;
      counts[type] = (counts[type] ?? 0) + 1;
    }
  }

  /** What the army keeps back now: the reserve, raised to the cost of a unit it saves for (as trainArmy does). */
  protected armySavings(ctx: AIContext, view: WorldView): Resources {
    const reserve = this.reserve(ctx, view);
    if (!this.trainsArmy(ctx)) return reserve;
    const mix = this.armyMix(ctx, view);
    const counts = countByType(view.military);
    const trainable = (t: BaseUnitType) => this.trainersFor(view, t, this.tune.militaryQueue).length > 0;
    const goal = savedForUnit(mix, counts, trainable, AI_COMMON.savesForUnits, workableNodes(view, 'gold').length);
    if (!goal) return reserve;
    const cost = UNIT_SPECS[civUnitType(ctx.player.civ, goal)].cost;
    return reserveForGoal(goal, ctx.player.resources, cost, reserve, AI_COMMON.savesForUnits);
  }

  /** Base under attack and outnumbered: cheapest available infantry, no savings kept. */
  private trainDefenders(ctx: AIContext, view: WorldView): void {
    if (view.military.length >= Math.min(view.threats.length, this.tune.minDefenders * 2)) return;
    const type: BaseUnitType = isUnitAvailable('pikeman', ctx.player.age) ? 'pikeman' : 'swordsman';
    this.train(ctx, view, type, this.tune.militaryQueue);
  }

  private researchTechs(ctx: AIContext, view: WorldView): void {
    const reserve = this.reserve(ctx, view);
    const ready = (id: TechId) =>
      this.researchable(ctx, view, id) && canAfford(ctx.player.resources, TECH_SPECS[id].cost, reserve);
    const tech = pickResearch(this.tune.techPriority, ready);
    if (tech) {
      this.research(ctx, view, tech, reserve);
      return;
    }
    const savings = this.armySavings(ctx, view);
    const extra = pickResearch(this.tune.extraTechPriority, (id) =>
      this.researchable(ctx, view, id) && canAfford(ctx.player.resources, TECH_SPECS[id].cost, savings));
    if (extra) this.research(ctx, view, extra, savings);
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
