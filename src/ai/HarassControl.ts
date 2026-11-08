import { AI_COMMON, type HardTuning } from '../config/aiBalance';
import type { Entity } from '../ecs/components';
import { clearUnitOrders } from '../ecs/orders';
import { baseUnitType } from '../game/civUnits';
import { chebyshev, type TileCoord } from '../iso/coordinates';
import type { AIContext } from './AIPlayer';
import { groupCentre } from './decisions/combat';
import { nearest } from './decisions/gathering';
import { landReachableFromAny, landReachMask } from './decisions/naval';
import { pickHarassTarget, raidOutnumbered, type HarassTarget } from './decisions/harass';
import { pruneOwnLiving, type WorldView } from './perception';
import { copyTile, loadedTime, savedTime, type HarassState } from './strategyState';
import type { ThoughtLog } from './thoughts';

type HarassTuning = HardTuning['harass'];

/**
 * Villager raids (Hard AI §10.3 "harass"): a few fast units ride to the
 * work spot where the most enemy villagers were last seen, kill the
 * villagers they find there, move on to the next remembered spot, and
 * fall back home once outnumbered or out of targets. At most
 * `maxRaids` raids per game, one at a time, `cooldownMs` apart.
 */
export class HarassControl {
  private readonly raid = new Set<number>();
  private target: HarassTarget | null = null;
  private raidsSent = 0;
  private endedAtMs = -Infinity;
  /** Whether the raid can walk to its current target (M14: not across the sea); not saved, re-checked after a load. */
  private walkable: { readonly target: HarassTarget; readonly ok: boolean } | null = null;

  constructor(
    private readonly log: ThoughtLog,
    private readonly tune: HarassTuning,
  ) {}

  snapshot(): HarassState {
    return {
      raid: [...this.raid],
      target: this.target && { position: copyTile(this.target.position), villagers: this.target.villagers },
      raidsSent: this.raidsSent,
      endedAtMs: savedTime(this.endedAtMs),
    };
  }

  restore(state: HarassState): void {
    this.raid.clear();
    for (const id of state.raid) this.raid.add(id);
    this.target = state.target && { position: copyTile(state.target.position), villagers: state.target.villagers };
    this.raidsSent = state.raidsSent;
    this.endedAtMs = loadedTime(state.endedAtMs);
    this.walkable = null;
  }

  get active(): boolean {
    return this.raid.size > 0;
  }

  get raidsLaunched(): number {
    return this.raidsSent;
  }

  /** True while the unit rides on the raid. */
  has(u: Entity): boolean {
    return u.id !== undefined && this.raid.has(u.id);
  }

  /** A new raid may leave now (none out, raids left, past the earliest time and the cooldown). */
  mayLaunch(timeMs: number): boolean {
    return (
      !this.active &&
      this.raidsSent < this.tune.maxRaids &&
      timeMs >= this.tune.notBeforeMs &&
      timeMs - this.endedAtMs >= this.tune.cooldownMs
    );
  }

  /** The work spot a raid would go for now, or null when no enemy villager is remembered. */
  pickTarget(ctx: AIContext, view: WorldView): HarassTarget | null {
    // Only villagers the raiders can ride to: none across the sea (M14), one flood from home.
    const land = landReachMask(ctx.mapData, home(view));
    const w = ctx.mapData.width;
    const villagers = view.enemyVillagers.filter((v) => land[v.position.ty * w + v.position.tx] === 1);
    return pickHarassTarget(villagers, view.knownEnemyBuildings, {
      enemyId: ctx.enemyPlayerId,
      home: home(view),
      clusterRadius: this.tune.clusterRadius,
      avoidRadius: this.tune.avoidTowerRadius,
    });
  }

  /** Sends `units` on a raid to `target`. */
  launch(ctx: AIContext, units: readonly Entity[], target: HarassTarget): void {
    for (const u of units) if (u.id !== undefined) this.raid.add(u.id);
    this.target = target;
    this.raidsSent++;
    this.log.add(ctx.timeMs, 'harass', `${target.position.tx},${target.position.ty}`);
    for (const u of units) {
      clearUnitOrders(ctx.world, u);
      ctx.world.addComponent(u, 'moveIntent', { target: target.position });
    }
  }

  /** Upkeep: fight villagers in sight, ride on, or fall back. */
  update(ctx: AIContext, view: WorldView): void {
    if (!this.active) return;
    const members = pruneOwnLiving(this.raid, view).filter((u) => !!u.position);
    if (members.length === 0) return this.end(ctx, view, members, '');
    const centre = groupCentre(members)!;
    const enemies = view.visibleEnemyUnits.filter((e) => ctx.enemyPlayerId === undefined || e.owner?.playerId === ctx.enemyPlayerId);
    const near = (e: Entity) => !!e.position && chebyshev(e.position, centre) <= AI_COMMON.engageRadius;
    const armed = enemies.filter((e) => near(e) && e.attacker && !!e.unit && baseUnitType(e.unit.unitType) !== 'villager').length;
    const towerInRange = view.visibleEnemyBuildings.some((b) => b.building?.type === 'tower' && near(b));
    if (towerInRange || raidOutnumbered(members.length, armed, this.tune.retreatRatio)) {
      return this.end(ctx, view, members, 'retreat');
    }
    const villagers = enemies.filter((e) => near(e) && !!e.unit && baseUnitType(e.unit.unitType) === 'villager' && !e.dying);
    if (villagers.length > 0) {
      for (const u of members) {
        const current = u.attackIntent ? view.byId.get(u.attackIntent.targetId) : undefined;
        if (current && !current.dying && current.unit && baseUnitType(current.unit.unitType) === 'villager') continue;
        const prey = nearest(villagers, u.position!);
        if (prey?.id === undefined) continue;
        clearUnitOrders(ctx.world, u);
        ctx.world.addComponent(u, 'attackIntent', { targetId: prey.id });
      }
      return;
    }
    // A spot the raid cannot walk to (across the sea, M14): home.
    if (this.target && !this.canWalkTo(ctx, members, this.target)) return this.end(ctx, view, members, 'retreat');
    if (this.target && chebyshev(centre, this.target.position) > AI_COMMON.exploreArrivedWithin) {
      for (const u of members) {
        if (u.moveIntent || (u.movable?.path.length ?? 0) > 0) continue;
        clearUnitOrders(ctx.world, u);
        ctx.world.addComponent(u, 'moveIntent', { target: this.target.position });
      }
      return;
    }
    // Arrived and nobody here (perception forgot the empty spot): next spot, or home.
    const next = this.pickTarget(ctx, view);
    if (!next) return this.end(ctx, view, members, 'retreat');
    this.target = next;
    this.log.add(ctx.timeMs, 'harass', `${next.position.tx},${next.position.ty}`);
    for (const u of members) {
      clearUnitOrders(ctx.world, u);
      ctx.world.addComponent(u, 'moveIntent', { target: next.position });
    }
  }

  /** Whether any raider can walk to `target` (one flood per target). */
  private canWalkTo(ctx: AIContext, members: readonly Entity[], target: HarassTarget): boolean {
    if (this.walkable?.target !== target) {
      const from = members.map((u) => u.position!);
      this.walkable = { target, ok: landReachableFromAny(ctx.mapData, from, target.position) };
    }
    return this.walkable.ok;
  }

  private end(ctx: AIContext, view: WorldView, members: readonly Entity[], why: 'retreat' | ''): void {
    const at = home(view);
    for (const u of members) {
      clearUnitOrders(ctx.world, u);
      ctx.world.addComponent(u, 'moveIntent', { target: at });
    }
    this.raid.clear();
    this.target = null;
    this.walkable = null;
    this.endedAtMs = ctx.timeMs;
    if (why) this.log.add(ctx.timeMs, why, 'harass');
  }
}

function home(view: WorldView): TileCoord {
  const tc = view.townCenter ?? view.buildings[0];
  return tc?.position ?? { tx: 0, ty: 0 };
}
