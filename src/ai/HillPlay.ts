import { AI_COMMON, AI_HILL, type HillTuning } from '../config/aiBalance';
import type { Entity } from '../ecs/components';
import { canAttackTarget } from '../ecs/navLayer';
import { clearUnitOrders, headingOf } from '../ecs/orders';
import { inHillZone } from '../game/hill';
import { chebyshev, type TileCoord } from '../iso/coordinates';
import { canStep } from '../map/gridSteps';
import type { AIContext } from './AIPlayer';
import { nearest } from './decisions/gathering';
import { hillLaunchReady, hillSpots, isFighter, rivalPastHalf, tilesTo, worthFighting, type HillLaunch } from './decisions/hill';
import type { AIHill } from './modeContext';
import type { WorldView } from './perception';

/*
 * King of the Hill (M19), every level: the waves go to the hill and stay to hold it. All of it is
 * read from the world, the public hill and the clock; the wave itself is ArmyControl's, saved there.
 */

/** The hill this AI plays for, or none (another mode, or out: then it plays as after a Conquest defeat). */
export function hillGoal(ctx: AIContext): AIHill | undefined {
  return ctx.player.defeated ? undefined : ctx.hill;
}

/** Whether free units leave for `hill` now (the caller rules out the treaty first). */
export function hillWaveDue(ctx: AIContext, hill: AIHill, launch: Omit<HillLaunch, 'urgent' | 'timeMs'>, tune: HillTuning): boolean {
  return hillLaunchReady({ ...launch, timeMs: ctx.timeMs, urgent: rivalPastHalf(hill, ctx.player.team) }, tune);
}

/** A spent wave falls back only when more fighters than it has are seen at the hill: a lone holder stays. */
export function holdLost(hill: AIHill, view: WorldView, waveSize: number): boolean {
  let foes = 0;
  for (const e of view.visibleEnemyUnits) {
    if (isFighter(e) && chebyshev(e.position!, hill.centre) <= AI_HILL.guard) foes++;
  }
  return foes > waveSize;
}

/**
 * The wave's orders: fight what is seen at the hill (any enemy team, never an ally) or bars the
 * way, let go of what leads away, else get onto the zone and stay. `launched`: every idle unit off
 * the zone is sent at once, instead of on its next retry.
 */
export function holdHill(ctx: AIContext, view: WorldView, hill: AIHill, members: readonly Entity[], launched: boolean): void {
  const { centre } = hill;
  let spots: TileCoord[] | null = null;
  const toZone = (u: Entity): void => {
    spots ??= hillSpots(ctx.mapData, centre);
    if (spots.length === 0) return;
    // The spot turns with the clock, so a tile that cannot be reached is not tried for ever.
    const spot = spots[(u.id! + Math.floor(ctx.timeMs / AI_HILL.retryMs)) % spots.length]!;
    clearUnitOrders(ctx.world, u);
    ctx.world.addComponent(u, 'moveIntent', { target: { tx: spot.tx, ty: spot.ty } });
  };

  for (const u of members) {
    if (!u.position || u.id === undefined) continue;
    const order = u.attackIntent;
    const current = order && keptTarget(view, u, order, centre);
    if (current && isFighter(current)) continue;
    const foe = pickFoe(view, u, centre);
    if (foe?.id !== undefined && (!current || isFighter(foe))) {
      if (order && (order.targetId === foe.id || order.resumeTargetId === foe.id)) continue;
      clearUnitOrders(ctx.world, u);
      ctx.world.addComponent(u, 'attackIntent', { targetId: foe.id });
      continue;
    }
    if (current) continue;

    const onZone = inHillZone(centre, u.position);
    if (order) {
      if (onZone) halt(ctx, u);
      else toZone(u);
      continue;
    }
    const heading = headingOf(u);
    if (heading) {
      if (inHillZone(centre, heading)) continue;
      if (onZone) halt(ctx, u);
      // A walk that ends near the hill or nearer to it (the nearest tile to a blocked spot) is let finish.
      else if (leadsAway(u.position, heading, centre)) toZone(u);
      continue;
    }
    if (onZone) {
      // Contested and nobody in sight: the other side of the zone is beyond some units' sight.
      if (hill.contested && retryDue(ctx.timeMs, u.id)) toZone(u);
      continue;
    }
    const bar = barInTheWay(ctx, view, u, centre);
    if (bar?.id !== undefined) ctx.world.addComponent(u, 'attackIntent', { targetId: bar.id });
    else if (launched || retryDue(ctx.timeMs, u.id)) toZone(u);
  }
}

function leadsAway(from: TileCoord, to: TileCoord, centre: TileCoord): boolean {
  const end = chebyshev(to, centre);
  return end > AI_HILL.guard + AI_HILL.slack && end >= chebyshev(from, centre);
}

/** The first upkeep in each of the unit's retry windows (read from the clock: nothing to save). */
function retryDue(timeMs: number, id: number): boolean {
  const at = timeMs + id * AI_COMMON.upkeepMs;
  return Math.floor(at / AI_HILL.retryMs) !== Math.floor((at - AI_COMMON.upkeepMs) / AI_HILL.retryMs);
}

function halt(ctx: AIContext, u: Entity): void {
  clearUnitOrders(ctx.world, u);
  if (u.movable) {
    u.movable.path = [];
    u.movable.progress = 0;
  }
}

/** The target the unit stays on (a breach counts as the target behind it), or undefined to let go. */
function keptTarget(view: WorldView, u: Entity, order: NonNullable<Entity['attackIntent']>, centre: TileCoord): Entity | undefined {
  const target = view.byId.get(order.resumeTargetId ?? order.targetId);
  if (!target?.position) return undefined;
  const seen = target.building ? view.visibleEnemyBuildings : view.visibleEnemyUnits;
  if (!seen.includes(target)) return undefined;
  if (worthFighting(u, target, centre, true)) return target;
  // A wall it is breaking through toward the hill (barInTheWay).
  const reach = Math.max(1, u.attacker?.range ?? 0);
  const bars = target.building && tilesTo(u.position!, target) <= reach && tilesTo(centre, target) < chebyshev(u.position!, centre);
  return bars && !inHillZone(centre, u.position!) ? target : undefined;
}

/** The nearest fighter worth it, else the nearest other unit, else the nearest shooting building. */
function pickFoe(view: WorldView, u: Entity, centre: TileCoord): Entity | undefined {
  const at = u.position!;
  const worth = (e: Entity) => canAttackTarget(u, e) && worthFighting(u, e, centre, false);
  return (
    nearest(view.visibleEnemyUnits, at, (e) => isFighter(e) && worth(e)) ??
    nearest(view.visibleEnemyUnits, at, worth) ??
    nearest(view.visibleEnemyBuildings, at, worth)
  );
}

/** A unit that got as near as it can: the enemy building beside it that blocks its step to the hill. */
function barInTheWay(ctx: AIContext, view: WorldView, u: Entity, centre: TileCoord): Entity | undefined {
  const at = u.position!;
  if (canStep(ctx.mapData, at.tx, at.ty, Math.sign(centre.tx - at.tx), Math.sign(centre.ty - at.ty))) return undefined;
  const out = chebyshev(at, centre);
  return nearest(view.visibleEnemyBuildings, at, (b) => tilesTo(at, b) <= 1 && tilesTo(centre, b) < out);
}
