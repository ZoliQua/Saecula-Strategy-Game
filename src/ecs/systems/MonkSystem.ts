import { MONK } from '../../config/balance';
import { canConvert, convertUnit, markConvertGivenUp } from '../../game/convert';
import { convertRechargeMultiplier, type Researched } from '../../game/modifiers';
import { chebyshev, type TileCoord } from '../../iso/coordinates';
import type { MapData } from '../../map/MapData';
import { escapeSteps } from '../../map/escape';
import { UNLIMITED_PATHS, type PathAllowance } from '../../map/pathBudget';
import { findPathToAny } from '../../map/pathfinding';
import { escapeRulesAt } from '../escapeRules';
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
 *    (convertUnit); a recharging monk or an invalid target ends the order,
 *    and a target no walkable tile within convertRange leads to is given
 *    up at once (the monk stops; markConvertGivenUp tells the AI);
 *  - otherwise a monk standing still heals the most wounded own unit
 *    within MONK.healRange at MONK.healPerSec (whole HP; fractions carry).
 * `busy` marks a healing / channelling monk for its work animation.
 */
export class MonkSystem {
  /** Where each approaching monk last headed (render-free working state; rebuilt after a load). */
  private readonly goals = new WeakMap<Entity, TileCoord>();
  /** The conversion order the approach state above belongs to (a new order starts afresh). */
  private readonly orderOf = new WeakMap<Entity, object>();

  constructor(
    private readonly world: EcsWorld,
    private readonly map: MapData,
    private readonly civOf: (playerId: number) => CivId,
    /** A player's researched technologies (illumination shortens the recharge, M12); absent = none. */
    private readonly researchOf: (playerId: number) => Researched | undefined = () => undefined,
    /** The shared per-tick path-search budget (CLAUDE.md §10). */
    private readonly paths: PathAllowance = UNLIMITED_PATHS,
  ) {}

  update(deltaMs: number): void {
    for (const monk of [...this.world.with('converter', 'position', 'owner')]) {
      const c = monk.converter;
      c.rechargeMs = Math.max(0, c.rechargeMs - deltaMs);
      c.busy = false;
      if (monk.dying) continue;
      if (this.orderOf.get(monk) !== monk.convertIntent) this.forgetApproach(monk);
      if (monk.convertIntent) {
        this.orderOf.set(monk, monk.convertIntent);
        this.convert(monk, deltaMs);
      } else this.heal(monk, deltaMs);
    }
  }

  private convert(monk: Entity & Required<Pick<Entity, 'converter' | 'position' | 'owner'>>, deltaMs: number): void {
    const intent = monk.convertIntent!;
    const target = findEntityById(this.world, intent.targetId);
    if (monk.converter.rechargeMs > 0 || !canConvert(target, monk.owner.playerId)) {
      this.world.removeComponent(monk, 'convertIntent');
      this.forgetApproach(monk);
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
    this.forgetApproach(monk);
    faceToward(monk, target);
    monk.converter.busy = true;
    intent.elapsedMs += deltaMs;
    if (intent.elapsedMs < MONK.convertTimeMs) return;
    convertUnit(this.world, target, monk.owner.playerId, this.civOf);
    this.world.removeComponent(monk, 'convertIntent');
    const research = this.researchOf(monk.owner.playerId);
    monk.converter.rechargeMs = MONK.rechargeMs * (research ? convertRechargeMultiplier(research) : 1);
  }

  /**
   * Heads for the target, re-planning only when it has moved away from the
   * last goal or the walk ended out of range. One budgeted search (as
   * combat's: the monk's escape rules, stepping off blocked ground toward
   * the target; the path written straight to the monk) finds the nearest
   * tile, in steps, it can reach within convertRange. With none, the target
   * is out of reach (an island, a walled-off pen): the order is given up,
   * and a monk on blocked ground still steps off it (M7: never left stuck).
   */
  private approach(monk: Entity, at: TileCoord): void {
    const goal = this.goals.get(monk);
    const walking = !!monk.moveIntent || (monk.movable?.path.length ?? 0) > 0;
    if (goal && walking && chebyshev(goal, at) < MONK.retargetTiles) return;
    if (!monk.movable) {
      // It cannot walk: the order ends; the target is not judged.
      this.drop(monk);
      return;
    }
    if (!this.paths.take()) return;
    const from = monk.position!;
    const escape = escapeRulesAt(this.world, from, this.map, monk.owner?.playerId ?? 0);
    // Inline Chebyshev: called for every tile the search visits, with no allocation.
    const inRange = (tx: number, ty: number) => Math.max(Math.abs(tx - at.tx), Math.abs(ty - at.ty)) <= MONK.convertRange;
    const path = findPathToAny(this.map, from, inRange, escape, at);
    if (!path) {
      this.giveUp(monk);
      if (!this.map.isPassable(from.tx, from.ty)) monk.movable.path = escapeSteps(this.map, from, escape, at)?.slice(1) ?? [];
      return;
    }
    if (monk.moveIntent) this.world.removeComponent(monk, 'moveIntent');
    monk.movable.path = path.slice(1);
    monk.movable.progress = 0;
    this.goals.set(monk, { tx: at.tx, ty: at.ty });
  }

  /** The target cannot be reached: the order ends (marked as given up) and the monk stops where it is. */
  private giveUp(monk: Entity): void {
    if (monk.convertIntent) markConvertGivenUp(monk, monk.convertIntent.targetId);
    this.drop(monk);
  }

  /** The order ends and the monk stops where it is. */
  private drop(monk: Entity): void {
    this.world.removeComponent(monk, 'convertIntent');
    if (monk.moveIntent) this.world.removeComponent(monk, 'moveIntent');
    if (monk.movable) {
      monk.movable.path = [];
      monk.movable.progress = 0;
    }
    this.forgetApproach(monk);
  }

  private forgetApproach(monk: Entity): void {
    this.goals.delete(monk);
    this.orderOf.delete(monk);
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
