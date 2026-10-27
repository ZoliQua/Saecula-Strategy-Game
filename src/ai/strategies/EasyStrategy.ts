import { AI_EASY, AI_EASY_AGE_UP_CHANCE, AI_EASY_AGE_UP_DELAY_MS } from '../../config/aiBalance';
import { TECH_SPECS } from '../../game/technologies';
import type { AIContext } from '../AIPlayer';
import { ArmyControl } from '../ArmyControl';
import { attackReady } from '../decisions/combat';
import { canAfford, snapshotEconomy } from '../economy';
import { baseAnchor } from '../economyBuildings';
import type { WorldView } from '../perception';
import { assignIdleVillagers } from '../workforce';
import { BaseStrategy } from './BaseStrategy';

/**
 * Easy AI (PROGRAM_TERV.md §10.1): a slow decision every 20-30 s that
 * follows a short decision tree 80% of the time (and builds something
 * random otherwise), about half villagers and half swordsmen, no scout,
 * one age-up attempt with a 50% chance after a long delay, and attack
 * waves of 8+ swordsmen from a random 8-15 min onwards. It defends its
 * base like every AI.
 */
export class EasyStrategy extends BaseStrategy {
  readonly name = 'easy';
  private readonly army: ArmyControl;
  /** Game time from which age-ups are attempted; Infinity when this game never ages up. */
  private readonly ageUpFromMs: number;
  private readonly firstAttackAtMs: number;

  /** `rng` returns [0, 1); injectable so tests are deterministic. */
  constructor(rng: () => number = Math.random) {
    super(rng, AI_EASY.decisionMs);
    const ages = rng() < AI_EASY_AGE_UP_CHANCE;
    const delay = this.roll(AI_EASY_AGE_UP_DELAY_MS);
    this.ageUpFromMs = ages ? delay : Infinity;
    this.firstAttackAtMs = this.roll(AI_EASY.firstAttackMs);
    this.army = new ArmyControl(this.log, rng);
  }

  protected upkeep(ctx: AIContext, view: WorldView): void {
    assignIdleVillagers(ctx.world, view, AI_EASY.gather);
    this.army.update(ctx, view);
    this.maybeAgeUp(ctx, view);
  }

  protected decide(ctx: AIContext, view: WorldView): void {
    if (this.rng() < AI_EASY.buildOrderAdherence) this.followTree(ctx, view);
    else this.randomBuild(ctx, view);
    const swords = view.military.length;
    if (!this.army.attacking && attackReady({
      armySize: swords,
      wave: AI_EASY.attackWave,
      timeMs: ctx.timeMs,
      notBeforeMs: this.firstAttackAtMs,
    })) {
      this.army.launchWave(ctx, view);
    }
    this.log.phase = this.army.underAttack(view) ? 'defending' : this.army.attacking ? 'attacking' : 'buildUp';
  }

  /** §10.1 decision tree: one step per decision. */
  private followTree(ctx: AIContext, view: WorldView): void {
    const econ = snapshotEconomy(ctx.world, ctx.player, view);
    const anchor = baseAnchor(view);
    const houses = this.ownCount(view, 'house');
    const militaryTarget = Math.max(AI_EASY.minMilitary, view.villagers.length * AI_EASY.militaryPerVillager);
    this.log.plan = ['villager', 'house', 'barracks', 'swordsman'];
    if (view.villagers.length < AI_EASY.villagerTarget) {
      this.train(ctx, view, 'villager', 1);
    } else if (anchor && houses < econ.population.current / 5 + 2) {
      this.startBuilding(ctx, view, 'house', anchor);
    } else if (anchor && this.ownCount(view, 'barracks') === 0) {
      this.startBuilding(ctx, view, 'barracks', anchor);
    } else if (view.military.length < militaryTarget) {
      this.train(ctx, view, 'swordsman', 2);
    }
  }

  private randomBuild(ctx: AIContext, view: WorldView): void {
    const anchor = baseAnchor(view);
    const type = AI_EASY.randomBuilds[Math.floor(this.rng() * AI_EASY.randomBuilds.length)];
    if (anchor && type) this.startBuilding(ctx, view, type, anchor);
  }

  /** Once the (rolled) delay has passed, research the next age-up as soon as it is affordable. */
  private maybeAgeUp(ctx: AIContext, view: WorldView): void {
    // Each further age waits another full delay, so the AI does not rush to age 3.
    if (ctx.timeMs < this.ageUpFromMs * ctx.player.age) return;
    const next = this.nextAgeUp(ctx);
    if (next && !this.agingUp(view) && canAfford(ctx.player.resources, TECH_SPECS[next].cost)) {
      this.research(ctx, view, next);
    }
  }
}
