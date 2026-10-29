import { audio, type AudioSink } from '../../audio/AudioManager';
import type { Entity } from '../../ecs/components';
import { insideFootprint } from '../../ecs/footprint';
import { clearUnitOrders } from '../../ecs/orders';
import type { SelectionSystem } from '../../ecs/systems/SelectionSystem';
import type { EcsWorld } from '../../ecs/world';
import { HUMAN_PLAYER_ID } from '../../config/constants';
import { canViewerSee } from '../../ecs/systems/renderPlacement';
import type { TileCoord } from '../../iso/coordinates';
import type { FogOfWarData } from '../../map/FogOfWarData';

/** What a command on a tile is aimed at, from `actor`'s side. */
export interface OrderTarget {
  readonly kind: 'enemy' | 'ownSite' | 'resource' | 'none';
  readonly entity: Entity | null;
}

/** Whether the commanding player can see an enemy (never-seen enemies are no target). */
export type CanSee = (target: Entity) => boolean;

/** The human's fog as a CanSee: exactly what the renderer shows (canViewerSee). */
export function fogCanSee(fog: FogOfWarData, viewerId: number): CanSee {
  return (e) => canViewerSee(e, fog, viewerId);
}

/** Whose side a command is resolved from: the first selected own unit (the cursor uses the same), else null. */
export function orderActor(selected: readonly Entity[], humanId: number): Entity | null {
  return selected.find((e) => e.unit !== undefined && e.owner?.playerId === humanId && !e.dying) ?? null;
}

/**
 * The targeting rule of a command on `tile` (shared with the cursor): an
 * enemy unit or building the player can see (`canSee`, default all)
 * first, then one of `actor`'s own buildings under construction (not
 * dying), then a resource node; otherwise nothing.
 */
export function resolveOrderTarget(world: EcsWorld, tile: TileCoord, actor: Entity, canSee: CanSee = () => true): OrderTarget {
  const enemy = findEnemyAt(world, tile, actor, canSee);
  if (enemy) return { kind: 'enemy', entity: enemy };
  const site = findOwnSiteAt(world, tile, actor);
  if (site) return { kind: 'ownSite', entity: site };
  const node = findResourceNodeAt(world, tile);
  if (node) return { kind: 'resource', entity: node };
  return { kind: 'none', entity: null };
}

export interface OrderIssuerOptions {
  readonly humanId?: number;
  /** The human's fog (fogCanSee): a fogged enemy is no target, the units just move there. */
  readonly canSee?: CanSee;
}

/** Translates a command (right-click or the gesture) on a tile into move / attack / gather / help-build orders. */
export class OrderIssuer {
  private readonly humanId: number;
  private readonly canSee: CanSee;

  constructor(
    private readonly world: EcsWorld,
    private readonly selection: SelectionSystem,
    private readonly sounds: AudioSink = audio(),
    options: OrderIssuerOptions = {},
  ) {
    this.humanId = options.humanId ?? HUMAN_PLAYER_ID;
    this.canSee = options.canSee ?? (() => true);
  }

  issueOrders(tile: TileCoord): void {
    const selectedAll = this.selection.getAllSelected();
    const actor = orderActor(selectedAll, this.humanId);
    // Only the human's units take orders (a selected building or enemy does not).
    if (!actor) return;
    const target = resolveOrderTarget(this.world, tile, actor, this.canSee);
    let ordered: 'unit_move' | 'unit_attack' | null = null;
    for (const entity of selectedAll) {
      if (entity.owner?.playerId !== this.humanId || entity.unit === undefined) continue;
      // Any new right-click order overrides whatever the unit was
      // doing — clear gather state + build command so the villager
      // actually listens.
      clearUnitOrders(this.world, entity);
      const targetId = target.entity?.id ?? 0;
      if (target.kind === 'enemy' && entity.attacker) {
        this.world.addComponent(entity, 'attackIntent', { targetId });
        ordered = 'unit_attack';
        continue;
      }
      if (target.kind === 'ownSite' && entity.gatherer) {
        this.world.addComponent(entity, 'buildCommand', { targetId });
        ordered ??= 'unit_move';
        continue;
      }
      if (target.kind === 'resource' && entity.gatherer) {
        this.world.addComponent(entity, 'gatherIntent', { nodeId: targetId });
        ordered ??= 'unit_move';
        continue;
      }
      this.world.addComponent(entity, 'moveIntent', { target: tile });
      ordered ??= 'unit_move';
    }
    // The order's acknowledgement (UI feedback: not positional).
    if (ordered) this.sounds.playSFX(ordered);
  }
}

/** A unit on the tile, or a building whose footprint covers it. */
function covers(e: Entity, tile: TileCoord): boolean {
  if (!e.position) return false;
  const b = e.building;
  if (b) return insideFootprint(tile, e.position, b.footprint);
  return e.position.tx === tile.tx && e.position.ty === tile.ty;
}

function findEnemyAt(world: EcsWorld, tile: TileCoord, actor: Entity, canSee: CanSee): Entity | null {
  const actorPlayer = actor.owner?.playerId;
  if (actorPlayer === undefined) return null;
  for (const c of world.with('position', 'owner', 'health')) {
    if (c.owner.playerId !== actorPlayer && covers(c, tile) && canSee(c)) return c;
  }
  return null;
}

function findOwnSiteAt(world: EcsWorld, tile: TileCoord, actor: Entity): Entity | null {
  const actorPlayer = actor.owner?.playerId;
  if (actorPlayer === undefined) return null;
  for (const s of world.with('position', 'owner', 'building', 'underConstruction')) {
    if (s.owner.playerId === actorPlayer && !s.dying && covers(s, tile)) return s;
  }
  return null;
}

function findResourceNodeAt(world: EcsWorld, tile: TileCoord): Entity | null {
  // Multi-tile building nodes (e.g. farms) match any footprint tile.
  for (const n of world.with('position', 'resourceNode')) if (covers(n, tile)) return n;
  return null;
}
