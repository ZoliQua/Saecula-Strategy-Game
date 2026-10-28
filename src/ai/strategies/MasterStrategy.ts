import { AI_MASTER, type MasterTuning } from '../../config/aiBalance';
import type { Entity } from '../../ecs/components';
import type { AIContext } from '../AIPlayer';
import { pickFlankTarget } from '../decisions/combat';
import { chebyshev } from '../decisions/gathering';
import { FlankControl } from '../FlankControl';
import type { WorldView } from '../perception';
import { expectKind, type StrategyState } from '../strategyState';
import { HardStrategy } from './HardStrategy';

/**
 * Mesteri AI: Hard's perceived-stance play on its own, sharper table
 * (AI_MASTER: faster cycle, bigger population, earlier counters, a
 * bigger Wonder crew) plus flanking: a big main wave splits off a flank
 * that goes for an enemy economy building far from the main target.
 *
 * Like Hard it sees only through its own fog (§10.4) and its one edge is
 * the +20% gather-rate handicap (M6 decision 10).
 */
export class MasterStrategy extends HardStrategy {
  override readonly name: string = 'master';
  private readonly flank: FlankControl;

  constructor(
    rng: () => number = Math.random,
    private readonly master: MasterTuning = AI_MASTER,
  ) {
    super(rng, master);
    this.flank = new FlankControl(this.log, master.flank);
  }

  override snapshot(): StrategyState {
    return { kind: 'master', ...this.hardFields(), flank: this.flank.snapshot() };
  }

  override restore(state: StrategyState): void {
    const s = expectKind(state, 'master');
    this.restoreHard(s);
    this.flank.restore(s.flank);
  }

  /** Flanks sent so far. */
  get flanksLaunched(): number {
    return this.flank.flanksLaunched;
  }

  protected override isReserved(u: Entity): boolean {
    return super.isReserved(u) || this.flank.has(u);
  }

  protected override upkeep(ctx: AIContext, view: WorldView): void {
    super.upkeep(ctx, view);
    this.flank.update(ctx, view);
  }

  /**
   * A main wave of at least `flank.minWave` members with an economy
   * target far enough from its own: the `flank.share` of its members
   * nearest that target leave it as a flank. One flank at a time.
   */
  protected override onWaveLaunched(ctx: AIContext, view: WorldView): void {
    const tune = this.master.flank;
    const main = this.army.target;
    const ids = this.army.members();
    if (this.flank.active || !main || ids.size < tune.minWave) return;
    const target = pickFlankTarget(view.knownEnemyBuildings, main, ctx.enemyPlayerId, tune.minSeparation);
    if (!target) return;
    const units = [...ids]
      .map((id) => view.byId.get(id))
      .filter((u): u is Entity => !!u?.position && !u.dying)
      .sort((a, b) => chebyshev(a.position!, target.position) - chebyshev(b.position!, target.position))
      .slice(0, Math.round(tune.share * ids.size));
    if (units.length === 0) return;
    this.army.detach(units.map((u) => u.id!));
    this.flank.launch(ctx, view, units, target);
  }

  protected override updateThoughts(ctx: AIContext, view: WorldView): void {
    super.updateThoughts(ctx, view);
    if (this.flank.active) this.log.plan.unshift('flank');
  }
}
