import { audio, type AudioSink } from '../../audio/AudioManager';
import type { Entity } from '../../ecs/components';
import { insideFootprint } from '../../ecs/footprint';
import { clearUnitOrders } from '../../ecs/orders';
import type { SelectionSystem } from '../../ecs/systems/SelectionSystem';
import type { EcsWorld } from '../../ecs/world';
import type { TileCoord } from '../../iso/coordinates';

/** What a command on a tile is aimed at, from `actor`'s side. */
export interface OrderTarget {
  readonly kind: 'enemy' | 'ownSite' | 'resource' | 'none';
  readonly entity: Entity | null;
}

/**
 * The targeting rule of a command on `tile` (shared with the cursor): an
 * enemy unit or building first, then one of `actor`'s own buildings under
 * construction (not dying), then a resource node; otherwise nothing.
 */
export function resolveOrderTarget(world: EcsWorld, tile: TileCoord, actor: Entity): OrderTarget {
  const enemy = findEnemyAt(world, tile, actor);
  if (enemy) return { kind: 'enemy', entity: enemy };
  const site = findOwnSiteAt(world, tile, actor);
  if (site) return { kind: 'ownSite', entity: site };
  const node = findResourceNodeAt(world, tile);
  if (node) return { kind: 'resource', entity: node };
  return { kind: 'none', entity: null };
}

/** Translates a right-click on a tile into move / attack / gather / help-build orders. */
export class OrderIssuer {
  constructor(
    private readonly world: EcsWorld,
    private readonly selection: SelectionSystem,
    private readonly sounds: AudioSink = audio(),
  ) {}

  issueOrders(tile: TileCoord): void {
    const selectedAll = this.selection.getAllSelected();
    if (selectedAll.length === 0) return;
    const first = selectedAll[0]!;
    const target = resolveOrderTarget(this.world, tile, first);
    let ordered: 'unit_move' | 'unit_attack' | null = null;
    for (const entity of selectedAll) {
      if (entity.owner?.playerId !== 1) continue;
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

function findEnemyAt(world: EcsWorld, tile: TileCoord, actor: Entity): Entity | null {
  const actorPlayer = actor.owner?.playerId;
  if (actorPlayer === undefined) return null;
  for (const c of world.with('position', 'owner', 'health')) {
    if (c.owner.playerId !== actorPlayer && covers(c, tile)) return c;
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
