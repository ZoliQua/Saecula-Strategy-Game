import { UNIT_BALANCE } from '../../config/balance';
import { createUnit } from '../../ecs/archetypes/createUnit';
import type { Entity } from '../../ecs/components';
import { CombatSystem } from '../../ecs/systems/CombatSystem';
import { DeathSystem } from '../../ecs/systems/DeathSystem';
import { MovementSystem } from '../../ecs/systems/MovementSystem';
import { PathfindingSystem } from '../../ecs/systems/PathfindingSystem';
import { ProjectileSystem } from '../../ecs/systems/ProjectileSystem';
import { createEcsWorld } from '../../ecs/world';
import type { PlayerManager } from '../../game/PlayerManager';
import { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';
import type { UnitType } from '../../types';

/** Resource budget each side spends on units in a duel (a test constant, not a stat; 0.9.1). */
export const DUEL_BUDGET = 1500;

const ARENA_TILES = 40;
const STEP_MS = 100;
const CAP_MS = 240_000;
const BLOCK_WIDTH = 3;

/** Food + wood + gold of one unit's training cost. */
export function unitValue(type: UnitType): number {
  const { food, wood, gold } = UNIT_BALANCE[type].cost;
  return food + wood + gold;
}

function nearestEnemy(self: Entity, enemies: readonly Entity[]): Entity | null {
  const p = self.position;
  if (!p) return null;
  let best: Entity | null = null;
  let bestD = Infinity;
  for (const e of enemies) {
    if (!e.position || !e.health || e.health.current <= 0 || e.dying) continue;
    const d = (e.position.tx - p.tx) ** 2 + (e.position.ty - p.ty) ** 2;
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

/**
 * Equal-cost duel of two unit types in an empty 40x40 grass arena: `floor(budget / value)`
 * units per side, no civ bonus, no upgrades. Returns the signed survivor value: positive when
 * `a` wins (sum of survivors' hp/maxHp x unitValue), negative when `b` wins, 0 for mutual
 * wipe-out or when the 240 s cap runs out.
 *
 * The systems get no player manager by default, so no civ bonus applies (a default
 * `createPlayer` is Hungarian, whose +10 % cavalry speed would leak into every duel);
 * `players` exists for the test that pins this.
 *
 * Limit of the arena: units only charge the nearest enemy, there is no kiting, so ranged
 * units lose open charges to melee units that close the distance.
 */
export function duel(a: UnitType, b: UnitType, budget = DUEL_BUDGET, players: PlayerManager | null = null): number {
  const map = new MapData(ARENA_TILES, ARENA_TILES, TERRAIN.grass);
  const world = createEcsWorld();
  const spawn = (type: UnitType, playerId: number, tx0: number): Entity[] => {
    const count = Math.floor(budget / unitValue(type));
    const out: Entity[] = [];
    for (let i = 0; i < count; i++) {
      const tile = { tx: tx0 + (i % BLOCK_WIDTH), ty: 10 + Math.floor(i / BLOCK_WIDTH) };
      out.push(createUnit(world, { type, tile, playerId }));
    }
    return out;
  };
  const sideA = spawn(a, 1, 6);
  const sideB = spawn(b, 2, 30);

  const pathfinding = new PathfindingSystem(world, map);
  const combat = new CombatSystem(world, map, players);
  const projectiles = new ProjectileSystem(world, players);
  const movement = new MovementSystem(world, players, map);
  const death = new DeathSystem(world, map);

  const alive = (side: readonly Entity[]) => side.filter((e) => (e.health?.current ?? 0) > 0 && !e.dying);
  const target = (side: readonly Entity[], foes: readonly Entity[]) => {
    for (const e of side) {
      if (e.attackIntent || !e.health || e.health.current <= 0 || e.dying) continue;
      const foe = nearestEnemy(e, foes);
      if (foe?.id !== undefined) world.addComponent(e, 'attackIntent', { targetId: foe.id });
    }
  };

  for (let t = 0; t < CAP_MS; t += STEP_MS) {
    if (alive(sideA).length === 0 || alive(sideB).length === 0) break;
    target(sideA, sideB);
    target(sideB, sideA);
    pathfinding.update();
    combat.update(STEP_MS);
    projectiles.update(STEP_MS);
    movement.update(STEP_MS);
    death.update(STEP_MS);
  }

  const value = (side: readonly Entity[], type: UnitType) =>
    alive(side).reduce((sum, e) => sum + ((e.health?.current ?? 0) / (e.health?.max ?? 1)) * unitValue(type), 0);
  const va = value(sideA, a);
  const vb = value(sideB, b);
  if (va > 0 && vb > 0) return 0;
  return va - vb;
}

/**
 * The duel scored from both sides: `(duel(a, b) - duel(b, a)) / 2`. The arena's starting blocks
 * are not symmetric (a mirror match can lean up to ~15 % of the budget to one side), so the
 * balance rules use this average, which is exactly antisymmetric: a mirror match scores 0.
 */
export function fairDuel(a: UnitType, b: UnitType, budget = DUEL_BUDGET): number {
  return (duel(a, b, budget) - duel(b, a, budget)) / 2;
}
