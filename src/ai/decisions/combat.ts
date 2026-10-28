import type { Entity } from '../../ecs/components';
import type { TileCoord } from '../../iso/coordinates';
import type { KnownBuilding } from '../perception';
import { chebyshev } from './gathering';

export interface AttackReadiness {
  readonly armySize: number;
  readonly wave: number;
  readonly timeMs: number;
  readonly notBeforeMs: number;
}

/** A wave goes out once the army is big enough and the earliest attack time has passed. */
export function attackReady(r: AttackReadiness): boolean {
  return r.timeMs >= r.notBeforeMs && r.armySize >= r.wave;
}

/**
 * Where to send a wave. With `wondersFirst` (the match can be won by a
 * Wonder), any opponent's remembered Wonder nearest to `home` comes first,
 * whoever `enemyId` is. Then the remembered enemy (of `enemyId`, any when
 * undefined) town centre nearest to `home`, else the nearest remembered
 * enemy building. Null when the AI has not found the enemy yet.
 */
export function pickAttackTarget(
  known: readonly KnownBuilding[],
  home: TileCoord,
  enemyId: number | undefined,
  wondersFirst = false,
): KnownBuilding | null {
  const byDistance = (a: KnownBuilding, b: KnownBuilding) => chebyshev(a.position, home) - chebyshev(b.position, home);
  if (wondersFirst) {
    const wonder = known.filter((b) => b.type === 'wonder').sort(byDistance)[0];
    if (wonder) return wonder;
  }
  const mine = known.filter((b) => enemyId === undefined || b.ownerId === enemyId);
  const tcs = mine.filter((b) => b.type === 'town_center').sort(byDistance);
  if (tcs[0]) return tcs[0];
  return [...mine].sort(byDistance)[0] ?? null;
}

/**
 * The visible enemy a unit should engage: the nearest within `radius`,
 * armed units first, then other units, then buildings (walls last).
 */
export function pickEngageTarget(
  from: TileCoord,
  enemyUnits: readonly Entity[],
  enemyBuildings: readonly Entity[],
  radius: number,
): Entity | null {
  const within = (list: readonly Entity[]) =>
    list.filter((e) => e.position && !e.dying && chebyshev(e.position, from) <= radius)
      .sort((a, b) => chebyshev(a.position!, from) - chebyshev(b.position!, from));
  const units = within(enemyUnits);
  const armed = units.find((u) => u.attacker);
  if (armed) return armed;
  if (units[0]) return units[0];
  const buildings = within(enemyBuildings);
  return buildings.find((b) => b.building?.type !== 'wall') ?? buildings[0] ?? null;
}

/** Centre of a group of positioned entities (rounded), or null for an empty group. */
export function groupCentre(units: readonly Entity[]): TileCoord | null {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const u of units) {
    if (!u.position) continue;
    sx += u.position.tx;
    sy += u.position.ty;
    n++;
  }
  return n === 0 ? null : { tx: Math.round(sx / n), ty: Math.round(sy / n) };
}
