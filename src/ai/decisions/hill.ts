import { AI_COMMON, AI_HILL, type HillTuning } from '../../config/aiBalance';
import { HILL } from '../../config/balance';
import type { Entity } from '../../ecs/components';
import { baseUnitType } from '../../game/civUnits';
import { hillTiles } from '../../game/hill';
import { distanceToFootprint, isShootingBuilding } from '../../game/landmarks';
import { chebyshev, type TileCoord } from '../../iso/coordinates';
import { canStep, NEIGHBOUR_STEPS } from '../../map/gridSteps';
import type { NavGrid } from '../../map/navGrid';
import { attackReady, type AttackReadiness } from './combat';

const ZONE = Math.floor(HILL.size / 2);

export interface HillLaunch extends Omit<AttackReadiness, 'armySize'> {
  /** An enemy team's clock is past AI_HILL.urgentShare. */
  readonly urgent: boolean;
  /** A wave is out, marching or holding. */
  readonly out: boolean;
  /** Units free to go. */
  readonly army: number;
  /** The opening raid has left (a level without one: true). */
  readonly opened: boolean;
  readonly underAttack: boolean;
}

/**
 * Whether free units leave for the hill: a first wave by the usual rule, then reinforcements (a hold
 * never ends by itself, so "no wave out" cannot be the gate), and under urgency whoever is there.
 */
export function hillLaunchReady(r: HillLaunch, tune: HillTuning): boolean {
  if (r.army <= 0) return false;
  if (r.urgent && r.army >= Math.min(tune.urgentArmy, r.out ? tune.reinforce : r.wave)) return true;
  if (r.out) return r.army >= tune.reinforce && !r.underAttack;
  return r.opened && attackReady({ armySize: r.army, wave: r.wave, timeMs: r.timeMs, notBeforeMs: r.notBeforeMs });
}

/** Whether a standing team other than `team` is past half of its clock (the clocks are public). */
export function rivalPastHalf(
  hill: { readonly heldMs: Readonly<Record<number, number>>; readonly standingTeams: ReadonlySet<number> },
  team: number,
): boolean {
  for (const other of hill.standingTeams) {
    if (other !== team && (hill.heldMs[other] ?? 0) > HILL.holdMs * AI_HILL.urgentShare) return true;
  }
  return false;
}

/**
 * The tiles a wave spreads over: up to AI_HILL.spots passable ones, spread over the inner zone (the
 * whole zone when none is there) and joined to the ground round it, so never a sealed pocket and
 * never a blocked centre. A walk of the zone's few dozen tiles only.
 */
export function hillSpots(map: NavGrid, centre: TileCoord): TileCoord[] {
  const box = ZONE + 1;
  const key = (tx: number, ty: number) => ty * map.width + tx;
  const joined = new Set<number>();
  const queue: TileCoord[] = [];
  const add = (tx: number, ty: number) => {
    if (joined.has(key(tx, ty))) return;
    joined.add(key(tx, ty));
    queue.push({ tx, ty });
  };
  for (let dy = -box; dy <= box; dy++) {
    for (let dx = -box; dx <= box; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== box) continue;
      if (map.isPassable(centre.tx + dx, centre.ty + dy)) add(centre.tx + dx, centre.ty + dy);
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const at = queue[head]!;
    for (const [dx, dy] of NEIGHBOUR_STEPS) {
      const next = { tx: at.tx + dx, ty: at.ty + dy };
      if (chebyshev(next, centre) <= box && canStep(map, at.tx, at.ty, dx, dy)) add(next.tx, next.ty);
    }
  }
  const zone = [...hillTiles(centre)].filter((t) => joined.has(key(t.tx, t.ty)));
  const inner = zone.filter((t) => chebyshev(t, centre) < ZONE);
  const from = inner.length > 0 ? inner : zone;
  const count = Math.min(AI_HILL.spots, from.length);
  return Array.from({ length: count }, (_, i) => from[Math.floor((i * from.length) / count)]!);
}

/** A fighting unit: armed and no villager. */
export function isFighter(e: Entity): boolean {
  return e.attacker !== undefined && e.unit !== undefined && baseUnitType(e.unit.unitType) !== 'villager';
}

/** Tiles from `at` to an entity: a unit's tile, or the nearest of a building's footprint. */
export function tilesTo(at: TileCoord, e: Entity): number {
  return e.building ? distanceToFootprint(at, e.position!, e.building.footprint) : chebyshev(at, e.position!);
}

/**
 * How far from the centre an enemy is fought: a fighter or a shooting building from where it
 * threatens the zone, a monk within the guard, anybody else on or beside the zone. Null: never.
 */
function foughtWithin(e: Entity): number | null {
  if (e.building ? isShootingBuilding(e) : isFighter(e)) return Math.max(AI_HILL.guard, (e.attacker?.range ?? 0) + ZONE);
  if (e.building) return null;
  return e.converter ? AI_HILL.guard : ZONE + 1;
}

/**
 * Whether a wave unit takes on the visible enemy `e` (`keeping`: stays on it; a little wider, so
 * nothing flaps at an edge). At the hill: what threatens the zone. Elsewhere only a fighter that
 * bars the way (no further from the hill than the unit) or is within the unit's own reach, so a
 * chase cannot lead away from the hill.
 */
export function worthFighting(unit: Entity, e: Entity, centre: TileCoord, keeping: boolean): boolean {
  if (!unit.position || !e.position) return false;
  const apart = tilesTo(unit.position, e);
  const out = chebyshev(unit.position, centre);
  const foeOut = tilesTo(centre, e);
  const atHill = out <= AI_HILL.guard + AI_HILL.slack;
  const within = foughtWithin(e);
  if (within !== null) {
    if (keeping && foeOut <= within + AI_HILL.slack) return true;
    if (!keeping && foeOut <= within && (atHill || apart <= AI_COMMON.engageRadius)) return true;
  }
  if (!isFighter(e)) return false;
  const give = keeping ? 1 : 0;
  if (apart <= (unit.attacker?.range ?? 0) + give) return true;
  return !atHill && apart <= AI_COMMON.engageRadius + give && foeOut <= out + give;
}
