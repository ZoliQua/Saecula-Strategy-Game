import { MONK, MONK_AI, REPATH_RETRY_MS } from '../../config/balance';
import { canConvert, convertUnit } from '../../game/convert';
import { convertRechargeMultiplier, type Researched } from '../../game/modifiers';
import { chebyshev, type TileCoord } from '../../iso/coordinates';
import type { CivId } from '../../types';
import type { Entity } from '../components';
import type { EcsWorld } from '../world';
import { faceToward } from './facing';
import { findEntityById } from './gathering/gatherQueries';

/**
 * The monk's healing and conversion (CLAUDE.md M11):
 *  - recharge after a conversion counts down;
 *  - with a `convertIntent`, the monk walks toward the target until it
 *    is within MONK.convertRange, then channels for MONK.convertTimeMs
 *    (restarted whenever the target escapes) and converts it
 *    (convertUnit); a recharging monk or an invalid target ends the order;
 *  - otherwise a monk standing still heals the most wounded own unit
 *    within MONK.healRange at MONK.healPerSec (whole HP; fractions carry).
 * `busy` marks a healing / channelling monk for its work animation.
 */
export class MonkSystem {
  /** Where each approaching monk last headed (render-free working state; rebuilt after a load). */
  private readonly goals = new WeakMap<Entity, TileCoord>();
  /** A monk whose path ended short of its target (unreachable) re-plans no earlier than this (system clock, ms). */
  private readonly retryAt = new WeakMap<Entity, number>();
  private nowMs = 0;

  constructor(
    private readonly world: EcsWorld,
    private readonly civOf: (playerId: number) => CivId,
    /** A player's researched technologies (illumination shortens the recharge, M12); absent = none. */
    private readonly researchOf: (playerId: number) => Researched | undefined = () => undefined,
  ) {}

  update(deltaMs: number): void {
    this.nowMs += deltaMs;
    for (const monk of [...this.world.with('converter', 'position', 'owner')]) {
      const c = monk.converter;
      c.rechargeMs = Math.max(0, c.rechargeMs - deltaMs);
      c.busy = false;
      if (monk.dying) continue;
      if (monk.convertIntent) this.convert(monk, deltaMs);
      else this.heal(monk, deltaMs);
    }
  }

  private convert(monk: Entity & Required<Pick<Entity, 'converter' | 'position' | 'owner'>>, deltaMs: number): void {
    const intent = monk.convertIntent!;
    const target = findEntityById(this.world, intent.targetId);
    if (monk.converter.rechargeMs > 0 || !canConvert(target, monk.owner.playerId)) {
      this.world.removeComponent(monk, 'convertIntent');
      this.goals.delete(monk);
      return;
    }
    if (chebyshev(monk.position, target.position) > MONK.convertRange) {
      intent.elapsedMs = 0;
      this.approach(monk, target.position);
      return;
    }
    // In range: stand, face the target and channel.
    if (monk.moveIntent) this.world.removeComponent(monk, 'moveIntent');
    if (monk.movable) {
      monk.movable.path = [];
      monk.movable.progress = 0;
    }
    this.goals.delete(monk);
    faceToward(monk, target);
    monk.converter.busy = true;
    intent.elapsedMs += deltaMs;
    if (intent.elapsedMs < MONK.convertTimeMs) return;
    convertUnit(this.world, target, monk.owner.playerId, this.civOf);
    this.world.removeComponent(monk, 'convertIntent');
    const research = this.researchOf(monk.owner.playerId);
    monk.converter.rechargeMs = MONK.rechargeMs * (research ? convertRechargeMultiplier(research) : 1);
  }

  /** Heads for the target, re-pathing only when it has moved away from the last goal. */
  private approach(monk: Entity, at: TileCoord): void {
    const goal = this.goals.get(monk);
    const moving = !!monk.moveIntent || (monk.movable?.path.length ?? 0) > 0;
    const sameGoal = !!goal && chebyshev(goal, at) < MONK_AI.retargetTiles;
    if (sameGoal && moving) return;
    // Stopped short of the same goal: the target cannot be reached from here; retry later, as combat does.
    if (sameGoal && this.nowMs < (this.retryAt.get(monk) ?? 0)) return;
    this.retryAt.set(monk, this.nowMs + REPATH_RETRY_MS);
    this.goals.set(monk, { tx: at.tx, ty: at.ty });
    if (monk.moveIntent) monk.moveIntent.target = { tx: at.tx, ty: at.ty };
    else this.world.addComponent(monk, 'moveIntent', { target: { tx: at.tx, ty: at.ty } });
  }

  private heal(monk: Entity & Required<Pick<Entity, 'converter' | 'position' | 'owner'>>, deltaMs: number): void {
    if (monk.moveIntent || (monk.movable?.path.length ?? 0) > 0) return;
    let best: Entity | null = null;
    let bestMissing = 0;
    for (const u of this.world.with('unit', 'health', 'owner', 'position')) {
      if (u === monk || u.dying || u.owner.playerId !== monk.owner.playerId) continue;
      const missing = u.health.max - u.health.current;
      if (missing <= 0 || chebyshev(u.position, monk.position) > MONK.healRange) continue;
      if (missing > bestMissing) {
        best = u;
        bestMissing = missing;
      }
    }
    if (!best?.health) {
      monk.converter.healCarry = 0;
      return;
    }
    monk.converter.busy = true;
    faceToward(monk, best);
    const c = monk.converter;
    c.healCarry += (MONK.healPerSec * deltaMs) / 1000;
    const whole = Math.floor(c.healCarry);
    if (whole <= 0) return;
    c.healCarry -= whole;
    best.health.current = Math.min(best.health.max, best.health.current + whole);
  }
}
