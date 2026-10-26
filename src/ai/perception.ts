import { AI_COMMON } from '../config/aiBalance';
import type { Entity } from '../ecs/components';
import type { TileCoord } from '../iso/coordinates';
import { FOG_UNEXPLORED, type FogOfWarData } from '../map/FogOfWarData';
import type { BuildingType, ResourceType, UnitType } from '../types';
import type { AIContext } from './AIPlayer';

/** An enemy building the AI has seen; kept until it sees the spot again without it. */
export interface KnownBuilding {
  readonly id: number;
  readonly type: BuildingType;
  readonly ownerId: number;
  readonly position: TileCoord;
  readonly footprint: { readonly width: number; readonly height: number };
}

/** Everything one AI knows this tick. Own entities are always known; the rest only through its fog. */
export interface WorldView {
  readonly playerId: number;
  readonly byId: ReadonlyMap<number, Entity>;
  readonly townCenter: Entity | undefined;
  /** Own standing buildings (sites included). */
  readonly buildings: readonly Entity[];
  readonly villagers: readonly Entity[];
  /** Own fighting units, scouts excluded. */
  readonly military: readonly Entity[];
  readonly scouts: readonly Entity[];
  /** Hostile (other non-Gaia players') units the AI can see right now. */
  readonly visibleEnemyUnits: readonly Entity[];
  /** Hostile buildings the AI can see right now. */
  readonly visibleEnemyBuildings: readonly Entity[];
  /** Hostile buildings seen (remembered while their spot stays out of sight). */
  readonly knownEnemyBuildings: readonly KnownBuilding[];
  /** Resource nodes on tiles the AI has explored (own farms included, foreign farms not). */
  readonly resources: Readonly<Record<ResourceType, readonly Entity[]>>;
  /** Hostile fighting units (not scouts or villagers passing by) seen near the base right now. */
  readonly threats: readonly Entity[];
  /** Decaying memory of enemy unit sightings by type. */
  readonly enemySightings: Readonly<Partial<Record<UnitType, number>>>;
}

/** Any tile of the entity's footprint is currently visible. */
export function isEntityVisible(fog: FogOfWarData, e: Entity & { position: TileCoord }): boolean {
  const w = e.building?.footprint.width ?? 1;
  const h = e.building?.footprint.height ?? 1;
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      if (fog.isVisible(e.position.tx + dx, e.position.ty + dy)) return true;
    }
  }
  return false;
}

/** Any tile of a remembered building's footprint is in sight right now. */
export function isKnownInSight(fog: FogOfWarData, known: KnownBuilding): boolean {
  for (let dy = 0; dy < known.footprint.height; dy++) {
    for (let dx = 0; dx < known.footprint.width; dx++) {
      if (fog.isVisible(known.position.tx + dx, known.position.ty + dy)) return true;
    }
  }
  return false;
}

const isHostile = (ownerId: number, me: number) => ownerId !== me && ownerId !== 0;

/**
 * Fog-limited perception (§10.4): the AI only learns about foreign
 * entities through its own fog of war — no cheating at any difficulty.
 * Enemy buildings are remembered once seen; enemy unit sightings decay.
 */
export class Perception {
  private readonly memory = new Map<number, KnownBuilding>();
  private readonly sightings: Partial<Record<UnitType, number>> = {};
  private lastMs: number | null = null;

  update(ctx: AIContext): WorldView {
    const me = ctx.player.id;
    const fog = ctx.fog;
    const byId = new Map<number, Entity>();
    const buildings: Entity[] = [];
    const villagers: Entity[] = [];
    const military: Entity[] = [];
    const scouts: Entity[] = [];
    const visibleEnemyUnits: Entity[] = [];
    const visibleEnemyBuildings: Entity[] = [];
    const resources: Record<ResourceType, Entity[]> = { food: [], wood: [], gold: [] };
    let townCenter: Entity | undefined;

    for (const e of ctx.world.entities) {
      if (e.id !== undefined) byId.set(e.id, e);
      if (!e.position) continue;
      const placed = e as Entity & { position: TileCoord };
      // Farms count even while empty: they regrow.
      if (e.resourceNode && (e.resourceNode.amount > 0 || e.building)) {
        const foreign = e.owner !== undefined && e.owner.playerId !== me;
        if (!foreign && fog.get(e.position.tx, e.position.ty) !== FOG_UNEXPLORED) {
          resources[e.resourceNode.type].push(e);
        }
      }
      if (!e.owner || e.dying) continue;
      if (e.owner.playerId === me) {
        if (e.building) {
          buildings.push(e);
          if (e.building.type === 'town_center' && !e.underConstruction) townCenter ??= e;
        } else if (e.unit?.unitType === 'villager') villagers.push(e);
        else if (e.unit?.unitType === 'scout') scouts.push(e);
        else if (e.unit && e.attacker) military.push(e);
        continue;
      }
      if (!isHostile(e.owner.playerId, me) || !isEntityVisible(fog, placed)) continue;
      if (e.unit) visibleEnemyUnits.push(e);
      else if (e.building && e.id !== undefined) {
        visibleEnemyBuildings.push(e);
        this.memory.set(e.id, {
          id: e.id,
          type: e.building.type,
          ownerId: e.owner.playerId,
          position: { ...e.position },
          footprint: { ...e.building.footprint },
        });
      }
    }
    this.forgetGone(fog, byId);
    this.recordSightings(ctx.timeMs, visibleEnemyUnits);
    const home = [...buildings];
    return {
      playerId: me,
      byId,
      townCenter,
      buildings,
      villagers,
      military,
      scouts,
      visibleEnemyUnits,
      visibleEnemyBuildings,
      knownEnemyBuildings: [...this.memory.values()],
      resources,
      threats: visibleEnemyUnits.filter((u) => isArmed(u) && nearAny(u.position!, home, AI_COMMON.defendRadius)),
      enemySightings: { ...this.sightings },
    };
  }

  /** A remembered building whose spot is in sight again but which is gone (or collapsing) is forgotten. */
  private forgetGone(fog: FogOfWarData, byId: ReadonlyMap<number, Entity>): void {
    for (const [id, known] of this.memory) {
      const e = byId.get(id);
      if (e && !e.dying) continue;
      if (isKnownInSight(fog, known)) this.memory.delete(id);
    }
  }

  private recordSightings(timeMs: number, visible: readonly Entity[]): void {
    const minutes = this.lastMs === null ? 0 : (timeMs - this.lastMs) / 60_000;
    this.lastMs = timeMs;
    const decay = Math.pow(AI_COMMON.sightingDecayPerMin, minutes);
    const now: Partial<Record<UnitType, number>> = {};
    for (const u of visible) {
      const t = u.unit!.unitType;
      now[t] = (now[t] ?? 0) + 1;
    }
    const types = new Set([...Object.keys(this.sightings), ...Object.keys(now)] as UnitType[]);
    for (const t of types) {
      this.sightings[t] = Math.max(now[t] ?? 0, (this.sightings[t] ?? 0) * decay);
    }
  }
}

/** A unit that counts as an attack on the base: armed, and neither a villager nor a scout. */
function isArmed(u: Entity): boolean {
  const type = u.unit?.unitType;
  return u.attacker !== undefined && type !== 'villager' && type !== 'scout';
}

function nearAny(p: TileCoord, buildings: readonly Entity[], radius: number): boolean {
  for (const b of buildings) {
    if (!b.position) continue;
    const w = b.building?.footprint.width ?? 1;
    const h = b.building?.footprint.height ?? 1;
    const dx = Math.max(b.position.tx - p.tx, 0, p.tx - (b.position.tx + w - 1));
    const dy = Math.max(b.position.ty - p.ty, 0, p.ty - (b.position.ty + h - 1));
    if (Math.max(dx, dy) <= radius) return true;
  }
  return false;
}
