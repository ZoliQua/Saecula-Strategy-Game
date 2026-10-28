import { AI_COMMON } from '../config/aiBalance';
import type { Entity } from '../ecs/components';
import { clearUnitOrders } from '../ecs/orders';
import type { TileCoord } from '../iso/coordinates';
import type { AIContext } from './AIPlayer';
import { groupCentre, pickAttackTarget, pickEngageTarget, type WonderTargeting } from './decisions/combat';
import { chebyshev, nearest } from './decisions/gathering';
import { nextExploreTarget } from './decisions/scouting';
import type { KnownBuilding, WorldView } from './perception';
import type { ThoughtLog } from './thoughts';

const isBusy = (u: Entity) => u.attackIntent !== undefined || u.moveIntent !== undefined || (u.movable?.path.length ?? 0) > 0;

/**
 * Army orders shared by every strategy: defending the base, attack waves
 * (sent at the remembered enemy, or exploring until it is found),
 * engaging what the units can see, falling back when a wave is spent, and
 * the scout's endless exploration. Stateful: remembers the current wave.
 * Units `isReserved` reports (another controller's, e.g. a raid) are
 * never drafted into the wave or into home defence.
 */
export class ArmyControl {
  private readonly wave = new Set<number>();
  private waveTarget: KnownBuilding | null = null;
  private exploreGoal: TileCoord | null = null;

  constructor(
    private readonly log: ThoughtLog,
    private readonly rng: () => number,
    private readonly isReserved: (u: Entity) => boolean = () => false,
  ) {}

  get attacking(): boolean {
    return this.wave.size > 0;
  }

  get waveSize(): number {
    return this.wave.size;
  }

  /** True while the unit belongs to the attack wave. */
  inWave(u: Entity): boolean {
    return u.id !== undefined && this.wave.has(u.id);
  }

  /**
   * Sends `units` (default: every military unit) out as the wave,
   * together with any wave already out. Returns the wave size.
   */
  launchWave(ctx: AIContext, view: WorldView, units: readonly Entity[] = view.military): number {
    for (const u of units) if (u.id !== undefined && !this.isReserved(u)) this.wave.add(u.id);
    this.waveTarget = pickAttackTarget(view.knownEnemyBuildings, home(view), ctx.enemyPlayerId, wonderTargeting(ctx));
    this.log.add(ctx.timeMs, 'attack', String(this.wave.size));
    this.steerWave(ctx, view);
    return this.wave.size;
  }

  /**
   * Upkeep: home defenders answer threats near the base; the wave fights
   * what it sees, otherwise marches on the target (or explores); a spent
   * wave falls back home.
   */
  update(ctx: AIContext, view: WorldView): void {
    for (const id of [...this.wave]) if (!view.byId.get(id) || view.byId.get(id)!.dying) this.wave.delete(id);
    if (this.attacking && this.wave.size < AI_COMMON.retreatBelow) this.retreat(ctx, view);
    this.defend(ctx, view);
    if (this.attacking) this.steerWave(ctx, view);
  }

  /** True when hostile units are near the base. */
  underAttack(view: WorldView): boolean {
    return view.threats.length > 0;
  }

  /** Units not on the wave answer the nearest threat to the base. */
  private defend(ctx: AIContext, view: WorldView): void {
    if (view.threats.length === 0) return;
    let logged = false;
    for (const u of view.military) {
      if (u.id === undefined || this.wave.has(u.id) || u.attackIntent || !u.position || this.isReserved(u)) continue;
      const threat = nearest(view.threats, u.position);
      if (threat?.id === undefined) continue;
      clearUnitOrders(ctx.world, u);
      ctx.world.addComponent(u, 'attackIntent', { targetId: threat.id });
      if (!logged) this.log.add(ctx.timeMs, 'defend', String(view.threats.length));
      logged = true;
    }
  }

  private steerWave(ctx: AIContext, view: WorldView): void {
    const members = [...this.wave].map((id) => view.byId.get(id)).filter((u): u is Entity => !!u && !u.dying);
    if (this.waveTarget && !view.knownEnemyBuildings.some((b) => b.id === this.waveTarget!.id)) this.waveTarget = null;
    this.waveTarget ??= pickAttackTarget(view.knownEnemyBuildings, home(view), ctx.enemyPlayerId, wonderTargeting(ctx));
    const enemyUnits = view.visibleEnemyUnits.filter((e) => targetsEnemy(e, ctx));
    const enemyBuildings = view.visibleEnemyBuildings.filter((e) => targetsEnemy(e, ctx));
    const idle: Entity[] = [];
    for (const u of members) {
      if (!u.position) continue;
      if (u.attackIntent && !this.shouldSwitch(u, view, enemyUnits)) continue;
      const engage = pickEngageTarget(u.position, enemyUnits, enemyBuildings, AI_COMMON.engageRadius);
      if (engage?.id !== undefined) {
        clearUnitOrders(ctx.world, u);
        ctx.world.addComponent(u, 'attackIntent', { targetId: engage.id });
        continue;
      }
      if (this.waveTarget) {
        // Any visible building: a Wonder target may belong to another opponent than the chosen enemy.
        this.marchOn(ctx, u, this.waveTarget, view.visibleEnemyBuildings);
        continue;
      }
      if (!isBusy(u)) idle.push(u);
    }
    if (idle.length > 0) this.explore(ctx, idle);
  }

  /**
   * Attack the wave target once it is in sight; until then only walk to
   * where it was seen. (An attack order on a remembered building that has
   * since vanished would be dropped at once and freeze the wave; walking
   * there instead lets the AI see the empty spot and forget it.)
   */
  private marchOn(ctx: AIContext, u: Entity, target: KnownBuilding, inSight: readonly Entity[]): void {
    if (inSight.some((b) => b.id === target.id)) {
      if (u.attackIntent?.targetId === target.id) return;
      clearUnitOrders(ctx.world, u);
      ctx.world.addComponent(u, 'attackIntent', { targetId: target.id });
      return;
    }
    if (isBusy(u) && !u.attackIntent) return;
    clearUnitOrders(ctx.world, u);
    ctx.world.addComponent(u, 'moveIntent', { target: target.position });
  }

  /** A unit marching on a building turns to fight armed enemies that come close. */
  private shouldSwitch(u: Entity, view: WorldView, enemyUnits: readonly Entity[]): boolean {
    const current = view.byId.get(u.attackIntent!.targetId);
    if (current && !current.building) return false;
    return enemyUnits.some((e) => e.attacker && e.position && chebyshev(e.position, u.position!) <= AI_COMMON.engageRadius);
  }

  /** No enemy known yet: the wave walks together to the next unexplored area. */
  private explore(ctx: AIContext, idle: readonly Entity[]): void {
    const centre = groupCentre(idle);
    if (!centre) return;
    if (!this.exploreGoal || chebyshev(centre, this.exploreGoal) <= AI_COMMON.exploreArrivedWithin) {
      this.exploreGoal = nextExploreTarget(ctx.fog, ctx.mapData, centre, this.rng);
      if (this.exploreGoal) this.log.add(ctx.timeMs, 'explore', `${this.exploreGoal.tx},${this.exploreGoal.ty}`);
    }
    if (!this.exploreGoal) return;
    for (const u of idle) ctx.world.addComponent(u, 'moveIntent', { target: this.exploreGoal });
  }

  private retreat(ctx: AIContext, view: WorldView): void {
    const at = home(view);
    for (const id of this.wave) {
      const u = view.byId.get(id);
      if (!u) continue;
      clearUnitOrders(ctx.world, u);
      ctx.world.addComponent(u, 'moveIntent', { target: at });
    }
    this.wave.clear();
    this.waveTarget = null;
    this.log.add(ctx.timeMs, 'retreat', '');
  }

  /** Keeps every idle scout exploring. */
  scout(ctx: AIContext, view: WorldView): void {
    for (const s of view.scouts) {
      if (!s.position || isBusy(s) || this.inWave(s) || this.isReserved(s)) continue;
      const goal = nextExploreTarget(ctx.fog, ctx.mapData, s.position, this.rng);
      if (!goal) continue;
      ctx.world.addComponent(s, 'moveIntent', { target: goal });
      this.log.add(ctx.timeMs, 'scout', `${goal.tx},${goal.ty}`);
    }
  }
}

/** Waves only go after the AI's chosen enemy (the human); FFA between AIs is not modelled. */
function targetsEnemy(e: Entity, ctx: AIContext): boolean {
  return ctx.enemyPlayerId === undefined || e.owner?.playerId === ctx.enemyPlayerId;
}

/** Wonders come first in a match a Wonder can win, except those of defeated owners (they can no longer win). */
function wonderTargeting(ctx: AIContext): WonderTargeting | undefined {
  if (ctx.wonderVictory !== true) return undefined;
  return { canWin: (ownerId) => !(ctx.isDefeated?.(ownerId) ?? false) };
}

function home(view: WorldView): TileCoord {
  const tc = view.townCenter ?? view.buildings[0];
  return tc?.position ?? { tx: 0, ty: 0 };
}
