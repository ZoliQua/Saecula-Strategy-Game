import { AI_NAVAL } from '../config/aiBalance';
import { NAVAL } from '../config/balance';
import type { Entity } from '../ecs/components';
import { clearUnitOrders } from '../ecs/orders';
import type { AIContext } from './AIPlayer';
import type { TileCoord } from '../iso/coordinates';
import { ownLiving, type WorldView } from './perception';
import type { LandingState } from './strategyState';
import type { ThoughtLog } from './thoughts';

/**
 * A landing (M14): when the enemy cannot be walked to (another island), a
 * wave boards the AI's transports at home, sails to the shore nearest its
 * target and, once ashore, is handed to the army as a normal attack wave.
 * One landing at a time; its units are reserved (other controllers leave
 * them alone) until they are ashore.
 */
export class LandingControl {
  private readonly members = new Set<number>();
  private readonly transports = new Set<number>();
  private target: TileCoord | null = null;
  private phase: 'boarding' | 'sailing' | null = null;
  private sinceMs = 0;

  constructor(
    private readonly log: ThoughtLog,
    /** Hands the units now ashore to the army as a wave. */
    private readonly launchWave: (ctx: AIContext, view: WorldView, units: readonly Entity[]) => void,
  ) {}

  snapshot(): LandingState {
    return { members: [...this.members], transports: [...this.transports], target: this.target && { ...this.target }, phase: this.phase, sinceMs: this.sinceMs };
  }

  restore(s: LandingState): void {
    this.members.clear();
    for (const id of s.members) this.members.add(id);
    this.transports.clear();
    for (const id of s.transports) this.transports.add(id);
    this.target = s.target && { ...s.target };
    this.phase = s.phase;
    this.sinceMs = s.sinceMs;
  }

  get active(): boolean {
    return this.phase !== null;
  }

  has(u: Entity): boolean {
    return u.id !== undefined && this.members.has(u.id);
  }

  /** Boards `units` (up to the transports' room) onto `transports`, bound for the shore nearest `target`. */
  start(ctx: AIContext, units: readonly Entity[], transports: readonly Entity[], target: TileCoord): number {
    if (this.active || transports.length === 0) return 0;
    const room = transports.length * NAVAL.transportCapacity;
    const going = units.filter((u) => u.id !== undefined).slice(0, room);
    going.forEach((u, i) => {
      const ship = transports[Math.floor(i / NAVAL.transportCapacity)]!;
      clearUnitOrders(ctx.world, u);
      ctx.world.addComponent(u, 'boardIntent', { transportId: ship.id! });
      this.members.add(u.id!);
    });
    for (const t of transports) {
      if (t.id === undefined) continue;
      this.transports.add(t.id);
      clearUnitOrders(ctx.world, t);
    }
    this.target = { tx: target.tx, ty: target.ty };
    this.phase = 'boarding';
    this.sinceMs = ctx.timeMs;
    this.log.add(ctx.timeMs, 'landing', String(going.length));
    return going.length;
  }

  update(ctx: AIContext, view: WorldView): void {
    if (!this.phase) return;
    const ships = [...this.transports].map((id) => ownLiving(view, id)).filter((t): t is Entity => !!t);
    const aboard = new Set(ships.flatMap((t) => t.cargo?.units ?? []).map((u) => u.id));
    for (const id of [...this.members]) if (!aboard.has(id) && !ownLiving(view, id)) this.members.delete(id);
    if (ships.length === 0 || this.members.size === 0) {
      this.end(ctx, view);
      return;
    }
    if (this.phase === 'boarding') {
      // A member whose boarding order was dropped (its transport out of reach) is not waited for.
      const waiting = [...this.members].filter((id) => !aboard.has(id) && ownLiving(view, id)?.boardIntent);
      const timedOut = ctx.timeMs - this.sinceMs > AI_NAVAL.boardTimeoutMs;
      if (waiting.length > 0 && !timedOut) return;
      for (const id of [...this.members]) if (!aboard.has(id) && !ownLiving(view, id)?.boardIntent) this.members.delete(id);
      // Whoever did not make it stays home.
      for (const id of waiting) {
        const u = ownLiving(view, id);
        if (u) clearUnitOrders(ctx.world, u);
        this.members.delete(id);
      }
      const goal = this.target;
      if (!goal || aboard.size === 0) {
        this.end(ctx, view);
        return;
      }
      for (const t of ships) if ((t.cargo?.units.length ?? 0) > 0) ctx.world.addComponent(t, 'unloadIntent', { target: { tx: goal.tx, ty: goal.ty } });
      this.phase = 'sailing';
      return;
    }
    // Sailing. A ship that could not put its cargo ashore there brings it home (those units leave the landing).
    const home = view.townCenter?.position;
    for (const t of ships) {
      if ((t.cargo?.units.length ?? 0) === 0 || t.unloadIntent || !home) continue;
      for (const u of t.cargo!.units) if (u.id !== undefined) this.members.delete(u.id);
      this.transports.delete(t.id!);
      ctx.world.addComponent(t, 'unloadIntent', { target: { tx: home.tx, ty: home.ty } });
    }
    // Done once no landing ship has cargo or an unload order left.
    if ([...this.transports].map((id) => ownLiving(view, id)).some((t) => t && ((t.cargo?.units.length ?? 0) > 0 || t.unloadIntent))) return;
    this.end(ctx, view);
  }

  /** The landing is over: whoever is ashore becomes an attack wave. */
  private end(ctx: AIContext, view: WorldView): void {
    const ashore = [...this.members].map((id) => ownLiving(view, id)).filter((u): u is Entity => !!u);
    this.members.clear();
    this.transports.clear();
    this.target = null;
    this.phase = null;
    if (ashore.length > 0) {
      this.log.add(ctx.timeMs, 'landing', 'ashore');
      this.launchWave(ctx, view, ashore);
    }
  }
}
