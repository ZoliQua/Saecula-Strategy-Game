import type { KingTuning } from '../config/aiModes';
import type { Entity } from '../ecs/components';
import { clearUnitOrders, headingOf } from '../ecs/orders';
import { baseUnitType } from '../game/civUnits';
import { distanceToFootprint, isShootingBuilding, shotOrigin } from '../game/landmarks';
import { livingKings } from '../game/regicide';
import { chebyshev, type TileCoord } from '../iso/coordinates';
import type { AIContext } from './AIPlayer';
import { isKing } from './decisions/combat';
import { kingRefuge, type KingThreat } from './decisions/king';
import { baseAnchor } from './economyBuildings';
import type { WorldView } from './perception';

/** Whether this AI plays Regicide now: the mode, and still in it (once out it plays as after a Conquest defeat). */
export function playsRegicide(ctx: AIContext): boolean {
  return ctx.regicide === true && !ctx.player.defeated;
}

/**
 * Regicide upkeep (M19), every level: attacks on enemy kings out of sight are called off (they are
 * hunted only while seen), and the own king keeps by its town centre, stepping aside from seen
 * threats. Read from the world each time: nothing to save. The king has no attacker, so it is in
 * none of the view's lists that waves, raids, landings, defence and scouting draft from.
 */
export function controlKings(ctx: AIContext, view: WorldView, tune: KingTuning): void {
  if (!playsRegicide(ctx)) return;
  dropUnseenKings(ctx, view);
  const tc = view.townCenter;
  if (!tc?.position || !tc.building) return;
  const home = { position: tc.position, footprint: tc.building.footprint };
  for (const king of livingKings(ctx.world)) {
    if (king.owner.playerId !== ctx.player.id) continue;
    const heading = headingOf(king) ?? null;
    const threats = threatsTo(ctx, view, king.position, tune);
    const refuge = kingRefuge(ctx.mapData, king.position, heading, home, threats, tune);
    if (refuge) {
      walk(ctx, king, refuge);
      continue;
    }
    const strayed = (at: TileCoord) => distanceToFootprint(at, home.position, home.footprint) > tune.homeRadius;
    if (!strayed(king.position) || (heading && !strayed(heading))) continue;
    const anchor = baseAnchor(view);
    if (anchor) walk(ctx, king, anchor);
  }
}

function walk(ctx: AIContext, king: Entity, target: TileCoord): void {
  clearUnitOrders(ctx.world, king);
  ctx.world.addComponent(king, 'moveIntent', { target: { tx: target.tx, ty: target.ty } });
}

/** What the AI sees that can hurt the king: none under the treaty, a villager only at arm's length. */
function threatsTo(ctx: AIContext, view: WorldView, at: TileCoord, tune: KingTuning): KingThreat[] {
  if (ctx.treatyActive === true) return [];
  const threats: KingThreat[] = [];
  for (const e of view.visibleEnemyUnits) {
    if (!e.position || !e.attacker || !e.unit) continue;
    if (baseUnitType(e.unit.unitType) === 'villager' && chebyshev(e.position, at) > tune.villagerRadius) continue;
    threats.push({ position: e.position, range: e.attacker.range });
  }
  for (const b of view.visibleEnemyBuildings) {
    if (!b.position || !b.attacker || !isShootingBuilding(b)) continue;
    threats.push({ position: shotOrigin(b as Entity & { position: TileCoord }), range: b.attacker.range });
  }
  return threats;
}

function dropUnseenKings(ctx: AIContext, view: WorldView): void {
  for (const list of [view.military, view.scouts, view.ships]) {
    for (const u of list) {
      const order = u.attackIntent;
      if (!order) continue;
      const quarry = view.byId.get(order.resumeTargetId ?? order.targetId);
      if (quarry && isKing(quarry) && !view.visibleEnemyUnits.includes(quarry)) clearUnitOrders(ctx.world, u);
    }
  }
}
