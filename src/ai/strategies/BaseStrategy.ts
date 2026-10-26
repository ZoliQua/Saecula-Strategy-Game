import { AI_COMMON, type Span } from '../../config/balance';
import { BUILDING_SPECS, createBuilding } from '../../ecs/archetypes/building';
import { UNIT_SPECS } from '../../ecs/archetypes/unit';
import type { Entity } from '../../ecs/components';
import { clearUnitOrders } from '../../ecs/orders';
import { queueUnit } from '../../ecs/queueUnit';
import { playerWallet, startResearch } from '../../ecs/research';
import { isTechAvailable } from '../../game/availability';
import { buildBlocker, countPlayerBuildings } from '../../game/buildRules';
import { isAgeUp, TECH_SPECS } from '../../game/technologies';
import type { TileCoord } from '../../iso/coordinates';
import { FOG_UNEXPLORED } from '../../map/FogOfWarData';
import type { BuildingType, Resources, TechId, UnitType } from '../../types';
import type { AIContext, AIStrategy } from '../AIPlayer';
import { findPlacement, type PlacementOptions } from '../decisions/placement';
import { aiTrainAccount, canAfford, NO_RESERVE } from '../economy';
import { Perception, type WorldView } from '../perception';
import { ThoughtLog, type AIThoughts } from '../thoughts';

/** Where each building type goes relative to the base (min / max ring around the anchor). */
const PLACEMENT: Partial<Record<BuildingType, Pick<PlacementOptions, 'minRadius' | 'maxRadius'>>> = {
  // Farms take the ring right around the TC (short walks); houses go one ring out.
  house: { minRadius: 5, maxRadius: 16 },
  farm: { minRadius: 2, maxRadius: 12 },
  lumber_camp: { minRadius: 1, maxRadius: 6 },
  mining_camp: { minRadius: 1, maxRadius: 6 },
};
const DEFAULT_PLACEMENT = { minRadius: 7, maxRadius: 18 } as const;

/**
 * Shared AI skeleton: a cheap upkeep pass every AI_COMMON.upkeepMs and a
 * full decision every `decisionMs` (rolled per cycle), both on a fresh
 * fog-limited WorldView. Subclasses implement `decide` (and may extend
 * `upkeep`); the protected helpers below are the only ways a strategy
 * acts on the world, and each goes through the same rule checks as the
 * human (queueUnit, startResearch, buildBlocker).
 */
export abstract class BaseStrategy implements AIStrategy {
  abstract readonly name: string;
  protected readonly perception = new Perception();
  protected readonly log = new ThoughtLog();
  private nextUpkeepMs = 0;
  private nextDecisionMs = 0;

  constructor(
    protected readonly rng: () => number,
    private readonly decisionMs: Span,
  ) {}

  update(ctx: AIContext, _deltaMs: number): void {
    const upkeepDue = ctx.timeMs >= this.nextUpkeepMs;
    const decisionDue = ctx.timeMs >= this.nextDecisionMs;
    if (!upkeepDue && !decisionDue) return;
    const view = this.perception.update(ctx);
    if (decisionDue) {
      this.nextDecisionMs = ctx.timeMs + this.roll(this.decisionMs);
      this.decide(ctx, view);
    }
    if (upkeepDue) {
      this.nextUpkeepMs = ctx.timeMs + AI_COMMON.upkeepMs;
      this.upkeep(ctx, view);
    }
  }

  thoughts(): AIThoughts {
    return this.log.snapshot(this.name);
  }

  /** Full decision: build order, training, research, attacks. */
  protected abstract decide(ctx: AIContext, view: WorldView): void;

  /** Cheap pass between decisions (idle villagers, army orders, scouting). */
  protected abstract upkeep(ctx: AIContext, view: WorldView): void;

  /** Uniform value inside a span. */
  protected roll(span: Span): number {
    return span.min + this.rng() * (span.max - span.min);
  }

  // ------------------------------------------------------------ buildings

  protected ownCount(view: WorldView, type: BuildingType, finishedOnly = false): number {
    let n = 0;
    for (const b of view.buildings) {
      if (b.building?.type === type && (!finishedOnly || !b.underConstruction)) n++;
    }
    return n;
  }

  protected sitesInProgress(view: WorldView, type: BuildingType): number {
    return view.buildings.filter((b) => b.building?.type === type && b.underConstruction).length;
  }

  /** Free origin for `type` near `anchor` on explored ground, keeping lanes clear. */
  protected placeFor(ctx: AIContext, view: WorldView, type: BuildingType, anchor: TileCoord): TileCoord | null {
    const spec = BUILDING_SPECS[type];
    const ring = PLACEMENT[type] ?? DEFAULT_PLACEMENT;
    const tc = type === 'farm' ? view.townCenter : undefined;
    return findPlacement(ctx.mapData, anchor, spec.width, spec.height, {
      ...ring,
      clearance: 1,
      tileAllowed: (tx, ty) => ctx.fog.get(tx, ty) !== FOG_UNEXPLORED,
      // Farms hug the town centre (it is their drop-off); the gaps between farms keep it reachable.
      ...(tc ? { mayTouch: (tx: number, ty: number) => insideFootprint(tc, tx, ty) } : {}),
    });
  }

  /**
   * Places a construction site (rule checks, cost paid from the AI's own
   * stockpile) and sends the nearest villagers to build it.
   */
  protected startBuilding(
    ctx: AIContext,
    view: WorldView,
    type: BuildingType,
    anchor: TileCoord,
    reserve: Resources = NO_RESERVE,
  ): Entity | null {
    const existing = countPlayerBuildings(ctx.world.entities, ctx.player.id, type);
    if (buildBlocker(type, ctx.player.age, existing) !== null) return null;
    const cost = BUILDING_SPECS[type].cost;
    if (!canAfford(ctx.player.resources, cost, reserve)) return null;
    const origin = this.placeFor(ctx, view, type, anchor);
    if (!origin) return null;
    const r = ctx.player.resources;
    ctx.player.resources = { food: r.food - cost.food, wood: r.wood - cost.wood, gold: r.gold - cost.gold };
    const site = createBuilding(ctx.world, {
      type,
      origin,
      playerId: ctx.player.id,
      mapData: ctx.mapData,
      underConstruction: true,
    });
    this.assignBuilders(ctx, view, site, AI_COMMON.buildersPerSite);
    this.log.add(ctx.timeMs, 'build', type);
    return site;
  }

  /** Sends the `count` nearest villagers that are not already building to `site`. */
  protected assignBuilders(ctx: AIContext, view: WorldView, site: Entity, count: number): void {
    if (site.id === undefined || !site.position) return;
    const at = site.position;
    const free = view.villagers
      .filter((v) => !v.buildCommand && v.position)
      .sort((a, b) => dist(a.position!, at) - dist(b.position!, at))
      .slice(0, count);
    for (const v of free) {
      clearUnitOrders(ctx.world, v);
      ctx.world.addComponent(v, 'buildCommand', { targetId: site.id });
    }
  }

  // ------------------------------------------------------------ training

  /** Own finished trainers for `type` with room in the queue (shortest queue first). */
  protected trainersFor(view: WorldView, type: UnitType, maxQueued: number): Entity[] {
    const kinds = UNIT_SPECS[type].trainers;
    return view.buildings
      .filter((b) => b.building && kinds.includes(b.building.type) && b.trainingQueue && !b.underConstruction && !b.research)
      .filter((b) => b.trainingQueue!.entries.length < maxQueued)
      .sort((a, b) => a.trainingQueue!.entries.length - b.trainingQueue!.entries.length);
  }

  /** Queues one `type` at the least busy trainer through queueUnit (age, trainer, cost, pop checks). */
  protected train(
    ctx: AIContext,
    view: WorldView,
    type: UnitType,
    maxQueued = 1,
    reserve: Resources = NO_RESERVE,
  ): boolean {
    if (!canAfford(ctx.player.resources, UNIT_SPECS[type].cost, reserve)) return false;
    const trainer = this.trainersFor(view, type, maxQueued)[0];
    if (!trainer) return false;
    const result = queueUnit(trainer, type, ctx.player.age, aiTrainAccount(ctx.world, ctx.player));
    if (result.ok) this.log.add(ctx.timeMs, 'train', type);
    return result.ok;
  }

  // ------------------------------------------------------------ research

  /** A free, finished own building where `techId` can start now. */
  protected researchSite(view: WorldView, techId: TechId): Entity | undefined {
    const at = TECH_SPECS[techId].building;
    return view.buildings.find(
      (b) =>
        b.building?.type === at &&
        !b.underConstruction &&
        !b.research &&
        (b.trainingQueue?.entries.length ?? 0) === 0,
    );
  }

  /** True when `techId` could be started right now (ignoring cost). */
  protected researchable(ctx: AIContext, view: WorldView, techId: TechId): boolean {
    if (!isTechAvailable(techId, ctx.player)) return false;
    if (view.buildings.some((b) => b.research?.techId === techId)) return false;
    return this.researchSite(view, techId) !== undefined;
  }

  protected research(ctx: AIContext, view: WorldView, techId: TechId, reserve: Resources = NO_RESERVE): boolean {
    if (!canAfford(ctx.player.resources, TECH_SPECS[techId].cost, reserve)) return false;
    const site = this.researchSite(view, techId);
    if (!site) return false;
    const result = startResearch(ctx.world, site, techId, ctx.player, playerWallet(ctx.player));
    if (result.ok) this.log.add(ctx.timeMs, isAgeUp(techId) ? 'ageUp' : 'research', techId);
    return result.ok;
  }

  /** The next age-up technology the player may research, or null at the last age. */
  protected nextAgeUp(ctx: AIContext): TechId | null {
    return (Object.keys(TECH_SPECS) as TechId[]).find((id) => isAgeUp(id) && isTechAvailable(id, ctx.player)) ?? null;
  }

  /** True while an age-up is being researched. */
  protected agingUp(view: WorldView): boolean {
    return view.buildings.some((b) => b.research !== undefined && isAgeUp(b.research.techId));
  }
}

function insideFootprint(b: Entity, tx: number, ty: number): boolean {
  if (!b.position || !b.building) return false;
  const { width, height } = b.building.footprint;
  return tx >= b.position.tx && ty >= b.position.ty && tx < b.position.tx + width && ty < b.position.ty + height;
}

function dist(a: TileCoord, b: TileCoord): number {
  return Math.max(Math.abs(a.tx - b.tx), Math.abs(a.ty - b.ty));
}
