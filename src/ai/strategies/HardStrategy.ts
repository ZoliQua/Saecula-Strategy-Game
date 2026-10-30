import { AI_HARD, type HardTuning } from '../../config/aiBalance';
import type { Entity } from '../../ecs/components';
import { isUnitAvailable } from '../../game/availability';
import type { TileCoord } from '../../iso/coordinates';
import { baseUnitType } from '../../game/civUnits';
import type { BaseUnitType } from '../../types';
import type { AIContext } from '../AIPlayer';
import { groupCentre } from '../decisions/combat';
import { chebyshev } from '../decisions/gathering';
import { pointToward, wallLineAcross } from '../decisions/fortify';
import {
  decayedPeak,
  enemyAgeSeen,
  enemyArmySeen,
  nextStance,
  type Stance,
  type StanceState,
} from '../decisions/stance';
import { baseAnchor } from '../economyBuildings';
import { HarassControl } from '../HarassControl';
import type { WorldView } from '../perception';
import { copyTile, expectKind, loadedTime, savedTime, type HardFields, type StrategyState } from '../strategyState';
import { MediumStrategy } from './MediumStrategy';

/**
 * Hard AI (PROGRAM_TERV.md §10.3): the Medium build-up on a fast 3-5 s
 * cycle with age-ups as soon as affordable, early scout pressure at a
 * rolled 3-5 min, two scouts exploring all game, stronger counter units
 * from what they saw, villagers at 65% of the population (50% in the war
 * phase), one or two villager raids, and a stance that follows what it has
 * perceived of its enemy: turtle (towers, walls) against an aggressive
 * enemy, rush against a passive one, tech against one that techs.
 *
 * It sees only through its own fog (§10.4); its one edge is the +20%
 * gather-rate handicap, applied by the gather modifiers (createStrategy's
 * applyDifficulty), never through extra resources or vision.
 */
export class HardStrategy extends MediumStrategy {
  override readonly name: string = 'hard';
  private readonly hard: HardTuning;
  private readonly harass: HarassControl;
  private stance: StanceState = { stance: 'balanced', sinceMs: 0 };
  private aggression = 0;
  private sensedAtMs = 0;
  /** Where the latest attack on the base came from. */
  private threatFrom: TileCoord | null = null;
  private wallLinesLaid = 0;
  private rebalancedAtMs = -Infinity;

  constructor(rng: () => number = Math.random, tune: HardTuning = AI_HARD) {
    super(rng, tune);
    this.hard = tune;
    this.harass = new HarassControl(this.log, tune.harass);
  }

  override snapshot(): StrategyState {
    return { kind: 'hard', ...this.hardFields() };
  }

  override restore(state: StrategyState): void {
    this.restoreHard(expectKind(state, 'hard'));
  }

  /** Hard's saved fields on top of Medium's; Mesteri adds its flank. */
  protected hardFields(): HardFields {
    return {
      ...this.mediumFields(),
      stance: { ...this.stance },
      aggression: this.aggression,
      sensedAtMs: this.sensedAtMs,
      threatFrom: this.threatFrom && copyTile(this.threatFrom),
      wallLinesLaid: this.wallLinesLaid,
      rebalancedAtMs: savedTime(this.rebalancedAtMs),
      harass: this.harass.snapshot(),
    };
  }

  protected restoreHard(s: HardFields): void {
    this.restoreMedium(s);
    this.stance = { ...s.stance };
    this.aggression = s.aggression;
    this.sensedAtMs = s.sensedAtMs;
    this.threatFrom = s.threatFrom && copyTile(s.threatFrom);
    this.wallLinesLaid = s.wallLinesLaid;
    this.rebalancedAtMs = loadedTime(s.rebalancedAtMs);
    this.harass.restore(s.harass);
  }

  /** Current stance (for tests and the overlay). */
  get currentStance(): Stance {
    return this.stance.stance;
  }

  /** Villager raids sent so far. */
  get raidsLaunched(): number {
    return this.harass.raidsLaunched;
  }

  protected override isReserved(u: Entity): boolean {
    return this.harass.has(u);
  }

  protected override upkeep(ctx: AIContext, view: WorldView): void {
    this.senseAggression(ctx, view);
    super.upkeep(ctx, view);
    this.harass.update(ctx, view);
  }

  protected override decide(ctx: AIContext, view: WorldView): void {
    this.updateStance(ctx, view);
    super.decide(ctx, view);
    const proactive = this.hard.turtle.proactive === true && ctx.player.age >= 2;
    if (this.stance.stance === 'turtle' || proactive) this.fortify(ctx, view);
    this.planHarass(ctx, view);
  }

  /** The fast cycle would churn gatherers between resources; they are moved at Medium's pace. */
  protected override rebalance(ctx: AIContext, view: WorldView): void {
    if (ctx.timeMs - this.rebalancedAtMs < this.hard.rebalanceMs) return;
    this.rebalancedAtMs = ctx.timeMs;
    super.rebalance(ctx, view);
  }

  // ------------------------------------------------------------ stance

  /** Peak-held, decaying count of armed enemies at the base, and the side they came from. */
  private senseAggression(ctx: AIContext, view: WorldView): void {
    this.aggression = decayedPeak(
      this.aggression,
      view.threats.length,
      ctx.timeMs - this.sensedAtMs,
      this.hard.aggressionDecayPerMin,
    );
    this.sensedAtMs = ctx.timeMs;
    if (view.threats.length > 0) this.threatFrom = groupCentre(view.threats);
  }

  private updateStance(ctx: AIContext, view: WorldView): void {
    const enemyBuildings = view.knownEnemyBuildings.filter(
      (b) => ctx.enemyPlayerId === undefined || b.ownerId === ctx.enemyPlayerId,
    );
    const next = nextStance(
      this.stance,
      {
        timeMs: ctx.timeMs,
        aggression: this.aggression,
        enemyArmySeen: enemyArmySeen(view.enemySightings),
        enemyAgeSeen: enemyAgeSeen(view.enemySightings, enemyBuildings, this.hard.enemyAgeMinSighting),
        ownAge: ctx.player.age,
      },
      this.hard.stance,
    );
    if (next !== this.stance) this.log.add(ctx.timeMs, 'stance', next.stance);
    this.stance = next;
  }

  /** War phase: rushing, turtling, under attack, or a main wave out after the opening. */
  private warPhase(ctx: AIContext, view: WorldView): boolean {
    const s = this.stance.stance;
    return s === 'rush' || s === 'turtle' || this.army.underAttack(view) || (ctx.player.age >= 2 && this.army.attacking);
  }

  protected override villagerTarget(ctx: AIContext, view: WorldView): number {
    const share = this.warPhase(ctx, view) ? this.hard.villagerShare.war : this.hard.villagerShare.peace;
    return Math.round(share * (this.hard.populationTarget[ctx.player.age] ?? 0));
  }

  protected override waveThreshold(ctx: AIContext, view: WorldView): number {
    switch (this.stance.stance) {
      case 'turtle':
        return this.hard.turtle.wave;
      case 'rush':
        return this.hard.rush.wave;
      case 'tech':
        return this.hard.tech.wave;
      case 'balanced':
        return super.waveThreshold(ctx, view);
    }
  }

  /** Rushing trains the Roman-age army too; otherwise from age 2 like Medium. */
  protected override trainsArmy(ctx: AIContext): boolean {
    return super.trainsArmy(ctx) || this.stance.stance === 'rush';
  }

  protected override ageUpReserveShare(ctx: AIContext): number {
    if (this.stance.stance === 'tech') return this.hard.tech.ageUpReserve[ctx.player.age] ?? 0;
    return super.ageUpReserveShare(ctx);
  }

  // ------------------------------------------------------------ turtle

  /**
   * Turtle: towers (age 2+) and wall lines across the side the attacks
   * came from (the remembered enemy TC when none came yet; a proactive
   * turtle with neither faces the map centre, where enemies come from,
   * unless its base sits at the centre: then it waits for a side).
   */
  private fortify(ctx: AIContext, view: WorldView): void {
    const home = baseAnchor(view);
    const centre = { tx: Math.floor(ctx.mapData.width / 2), ty: Math.floor(ctx.mapData.height / 2) };
    const threat = this.threatFrom
      ?? view.knownEnemyBuildings.find((b) => b.type === 'town_center')?.position
      ?? (this.hard.turtle.proactive === true && !!home && chebyshev(home, centre) >= this.hard.turtle.wallDistance ? centre : null);
    if (!home || !threat) return;
    const t = this.hard.turtle;
    const towerSpot = pointToward(home, threat, t.towerDistance);
    if (towerSpot && this.ownCount(view, 'tower') < t.towers && this.sitesInProgress(view, 'tower') === 0) {
      this.startBuilding(ctx, view, 'tower', towerSpot, this.reserve(ctx, view));
    }
    if (this.wallLinesLaid < t.wallLines) {
      // A proactive turtle whose line is blocked (trees, buildings) tries the next ring out instead.
      const tries = t.proactive === true ? t.wallLines - this.wallLinesLaid : 1;
      for (let k = 0; k < tries; k++) {
        const distance = t.wallDistance + (this.wallLinesLaid + k) * t.wallLineSpacing;
        const tiles = wallLineAcross(home, threat, distance, t.wallHalfLength);
        if (this.startWallLine(ctx, view, tiles, t.wallBuilders, this.reserve(ctx, view)) > 0) {
          this.wallLinesLaid++;
          break;
        }
      }
    }
  }

  // ------------------------------------------------------------ harass

  /** Fast units free for a raid (not exploring, not on the wave), best raiders first. */
  private raiders(view: WorldView): Entity[] {
    const explorers = new Set(this.explorers(view));
    const prefer = this.hard.harass.units;
    return [...view.military, ...view.scouts]
      .filter((u) => !explorers.has(u) && !this.army.inWave(u) && !this.isReserved(u) && !u.attackIntent)
      .filter((u) => u.unit && prefer.includes(baseUnitType(u.unit.unitType)))
      .sort((a, b) => prefer.indexOf(baseUnitType(a.unit!.unitType)) - prefer.indexOf(baseUnitType(b.unit!.unitType)))
      .slice(0, this.hard.harass.size);
  }

  /** When a raid may go and villagers were seen: launch it, or train raiders until enough exist. */
  private planHarass(ctx: AIContext, view: WorldView): void {
    if (!this.harass.mayLaunch(ctx.timeMs) || this.army.underAttack(view)) return;
    const target = this.harass.pickTarget(ctx, view);
    if (!target) return;
    const squad = this.raiders(view);
    if (squad.length >= this.hard.harass.minSize) {
      this.harass.launch(ctx, squad, target);
      return;
    }
    const unit = this.raiderToTrain(ctx, view);
    if (unit) this.train(ctx, view, unit, this.tune.militaryQueue, this.reserve(ctx, view));
  }

  private raiderToTrain(ctx: AIContext, view: WorldView): BaseUnitType | null {
    return this.hard.harass.units.find(
      (t) => isUnitAvailable(t, ctx.player.age) && this.trainersFor(view, t, this.tune.militaryQueue).length > 0,
    ) ?? null;
  }

  // ------------------------------------------------------------ overlay

  protected override updateThoughts(ctx: AIContext, view: WorldView): void {
    super.updateThoughts(ctx, view);
    this.log.stance = this.stance.stance;
    if (this.harass.active) this.log.plan.unshift('harass');
  }
}
