import type { KingTuning } from '../config/aiModes';
import type { Entity } from '../ecs/components';
import { clearUnitOrders, headingOf } from '../ecs/orders';
import { isNavalType } from '../config/balance';
import { baseUnitType } from '../game/civUnits';
import { distanceToFootprint, isShootingBuilding, shotOrigin } from '../game/landmarks';
import { livingKings } from '../game/regicide';
import { chebyshev, type TileCoord } from '../iso/coordinates';
import type { MapData } from '../map/MapData';
import type { AIContext } from './AIPlayer';
import { isKing } from './decisions/combat';
import { kingRefuge, type KingThreat } from './decisions/king';
import { landReachMask } from './decisions/naval';
import { baseAnchor } from './economyBuildings';
import type { WorldView } from './perception';

/** Whether this AI plays Regicide now: the mode, and still in it (once out it plays as after a Conquest defeat). */
export function playsRegicide(ctx: AIContext): boolean {
  return ctx.regicide === true && !ctx.player.defeated;
}

/**
 * Regicide upkeep (M19), every level: attacks on enemy kings out of sight are called off (they are
 * hunted only while seen), the own king keeps by its town centre, stepping aside from seen threats
 * toward its defenders, and villagers turn on the attackers near it while the home army is short
 * (back to work once they are gone). Returns the seen enemy units near the own king, for the home
 * army to fight (scouts too: in Regicide a scout can kill). Read from the world each time: nothing
 * to save. The king has no attacker, so it is in none of the view's lists that waves, raids,
 * landings, defence and scouting draft from.
 */
export function controlKings(ctx: AIContext, view: WorldView, tune: KingTuning): Entity[] {
  if (!playsRegicide(ctx)) return [];
  dropUnseenKings(ctx, view);
  const kings = [...livingKings(ctx.world)].filter((k) => k.owner.playerId === ctx.player.id);
  const foes = foesNear(ctx, view, kings, tune);
  guardWithVillagers(ctx, view, kings, foes, tune);
  const tc = view.townCenter;
  if (!tc?.position || !tc.building) return foes;
  const home = { position: tc.position, footprint: tc.building.footprint };
  for (const king of kings) {
    const heading = headingOf(king) ?? null;
    const threats = threatsTo(ctx, view, king.position, tune);
    const rally = defendersOf(view, king.position, tune).map((d) => d.position!);
    const refuge = kingRefuge(ctx.mapData, king.position, heading, home, threats, tune, rally);
    if (refuge) {
      walk(ctx, king, refuge);
      continue;
    }
    const strayed = (at: TileCoord) => distanceToFootprint(at, home.position, home.footprint) > tune.homeRadius;
    if (!strayed(king.position) || (heading && !strayed(heading))) continue;
    const last = homeOrders.get(king);
    if (last !== undefined && ctx.timeMs >= last && ctx.timeMs - last < tune.homeRetryMs) continue;
    const anchor = baseAnchor(view);
    if (!anchor) continue;
    homeOrders.set(king, ctx.timeMs);
    walk(ctx, king, anchor);
  }
  return foes;
}

/** When each king was last ordered back to its anchor (a retry window; AI-side only, nothing to save). */
const homeOrders = new WeakMap<Entity, number>();

/** Per map, the tiles that can be walked to from a foe's tile (terrain only), so a foe is flooded once, not every upkeep. */
const reachCache = new WeakMap<MapData, Map<number, Uint8Array>>();

/** Whether `from` can walk to `to` over the terrain (walls and buildings can be breached, so they do not count). */
function canWalk(ctx: AIContext, from: TileCoord, to: TileCoord): boolean {
  const map = ctx.mapData;
  let masks = reachCache.get(map);
  if (!masks) reachCache.set(map, (masks = new Map()));
  const key = to.ty * map.width + to.tx;
  let mask = masks.get(key);
  if (!mask) {
    if (masks.size >= 32) masks.clear();
    masks.set(key, (mask = landReachMask(map, to)));
  }
  if (from.tx < 0 || from.ty < 0 || from.tx >= map.width || from.ty >= map.height) return false;
  return mask[from.ty * map.width + from.tx] === 1;
}

/** Seen armed enemy units within `guardRadius` of an own king (a villager only at arm's length); none under the treaty. */
function foesNear(ctx: AIContext, view: WorldView, kings: readonly Entity[], tune: KingTuning): Entity[] {
  if (ctx.treatyActive === true || kings.length === 0) return [];
  return view.visibleEnemyUnits.filter((e) => {
    if (!e.position || !e.attacker || !e.unit || isNavalType(e.unit.unitType)) return false;
    const reach = baseUnitType(e.unit.unitType) === 'villager' ? tune.villagerRadius : tune.guardRadius;
    return kings.some((k) => chebyshev(k.position!, e.position!) <= reach);
  });
}

/** Own soldiers, scouts and defending villagers near the king. */
function defendersOf(view: WorldView, at: TileCoord, tune: KingTuning): Entity[] {
  const near = (u: Entity) => u.position !== undefined && chebyshev(u.position, at) <= tune.guardRadius;
  return [...view.military, ...view.scouts, ...view.villagers.filter((v) => v.attackIntent)].filter(near);
}

/**
 * Villagers defend the king: `guardsPerFoe` for each attacker near it beyond the own soldiers there,
 * at most `maxGuards`, the nearest first, all on the attacker nearest the king. A villager whose
 * attacker is gone (dead, or off beyond `guardRadius`) or who is no longer needed is let go: idle, so
 * the economy takes it back. An AI villager attacks nothing else, so every villager's attack order
 * is this guard's.
 */
function guardWithVillagers(ctx: AIContext, view: WorldView, kings: readonly Entity[], foes: readonly Entity[], tune: KingTuning): void {
  const king = kings[0];
  const ids = new Set(foes.map((f) => f.id));
  const guards = view.villagers.filter((v) => v.attackIntent);
  const soldiers = king ? [...view.military, ...view.scouts].filter((u) => u.position && chebyshev(u.position, king.position!) <= tune.guardRadius).length : 0;
  const want = king ? Math.min(tune.maxGuards, tune.guardsPerFoe * Math.max(0, foes.length - soldiers)) : 0;
  const byDistance = (a: Entity, b: Entity) => chebyshev(a.position!, king!.position!) - chebyshev(b.position!, king!.position!);
  // A guard on a breach toward its foe keeps going (the order's target is then the wall); one whose foe can't be walked to is let go.
  const foeOf = (v: Entity) => view.byId.get(v.attackIntent!.resumeTargetId ?? v.attackIntent!.targetId);
  const keep = king
    ? guards
        .filter((v) => {
          const foe = foeOf(v);
          return v.position && foe?.position && ids.has(foe.id!) && canWalk(ctx, v.position, foe.position);
        })
        .sort(byDistance)
        .slice(0, want)
    : [];
  for (const v of guards) if (!keep.includes(v)) clearUnitOrders(ctx.world, v);
  if (!king || keep.length >= want) return;
  const quarry = [...foes].sort(byDistance).find((f) => f.position && canWalk(ctx, king.position!, f.position));
  if (!quarry) return;
  const fresh = view.villagers.filter((v) => v.position && !v.attackIntent && !v.buildCommand && !v.repairIntent).sort(byDistance).slice(0, want - keep.length);
  for (const v of fresh) {
    clearUnitOrders(ctx.world, v);
    ctx.world.addComponent(v, 'attackIntent', { targetId: quarry.id! });
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
