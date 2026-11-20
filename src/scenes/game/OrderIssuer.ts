import { audio, type AudioSink } from '../../audio/AudioManager';
import { canConvert, readyToConvert } from '../../game/convert';
import type { Entity } from '../../ecs/components';
import { insideFootprint } from '../../ecs/footprint';
import { clearUnitOrders } from '../../ecs/orders';
import { canWorkNode, isBuilder } from '../../ecs/workers';
import { isWorkableBy } from '../../ecs/systems/gathering/gatherQueries';
import type { SelectionSystem } from '../../ecs/systems/SelectionSystem';
import type { EcsWorld } from '../../ecs/world';
import { HUMAN_PLAYER_ID } from '../../config/constants';
import { canViewerSee } from '../../ecs/systems/renderPlacement';
import type { TileCoord } from '../../iso/coordinates';
import type { FogOfWarData } from '../../map/FogOfWarData';
import type { MapData } from '../../map/MapData';
import { canAttackTarget, moveLayerOf } from '../../ecs/navLayer';
import { isFriendly, NO_TEAMS, type TeamLookup } from '../../game/diplomacy';
import { NO_TREATY, truceBetween, type TreatyGate } from '../../game/treaty';
import { hu } from '../../i18n/hu';
import { showHudNotice } from '../../ui/HUD';

/** What a command on a tile is aimed at, from `actor`'s side. */
export interface OrderTarget {
  readonly kind: 'enemy' | 'ownSite' | 'ownTransport' | 'resource' | 'none';
  readonly entity: Entity | null;
  /** True when another team's player is on the tile but the treaty holds (M16): no target, the units just move. */
  readonly truce?: true;
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
 * enemy unit or building the player can see (`canSee`, default all; any
 * other player's with health but `actor`'s allies (M16), so Gaia's too)
 * first, then one of `actor`'s own buildings under construction (not
 * dying), then a resource node; otherwise nothing. While the treaty holds
 * (M16), another team's player is no target (`truce` marks it; Gaia still is).
 */
export function resolveOrderTarget(
  world: EcsWorld,
  tile: TileCoord,
  actor: Entity,
  canSee: CanSee = () => true,
  teams: TeamLookup = NO_TEAMS,
  treaty: TreatyGate = NO_TREATY,
): OrderTarget {
  const found = findEnemyAt(world, tile, actor, canSee, teams, treaty);
  if (found.enemy) return { kind: 'enemy', entity: found.enemy };
  const truce = found.truce ? ({ truce: true } as const) : {};
  const site = findOwnSiteAt(world, tile, actor);
  if (site) return { kind: 'ownSite', entity: site, ...truce };
  const transport = findOwnTransportAt(world, tile, actor);
  if (transport) return { kind: 'ownTransport', entity: transport, ...truce };
  const node = findResourceNodeAt(world, tile, actor);
  if (node) return { kind: 'resource', entity: node, ...truce };
  return { kind: 'none', entity: null, ...truce };
}

export interface OrderIssuerOptions {
  readonly humanId?: number;
  /** The human's fog (fogCanSee): a fogged enemy is no target, the units just move there. */
  readonly canSee?: CanSee;
  /** The map (M14): a loaded transport sent onto land unloads there. Absent: transports just sail. */
  readonly map?: MapData;
  /** Teams (M16): an ally is no target (its units are just walked to). Absent: no teams. */
  readonly teams?: TeamLookup;
  /** The treaty (M16): while it holds an attack on another team becomes a move, with a notice. Absent: none. */
  readonly treaty?: TreatyGate;
  /** Shows a HUD notice (default: the in-game toast). */
  readonly notice?: (message: string) => void;
}

/** Translates a command (right-click or the gesture) on a tile into move / attack / gather / help-build orders. */
export class OrderIssuer {
  private readonly humanId: number;
  private readonly canSee: CanSee;
  private readonly map: MapData | undefined;
  private readonly teams: TeamLookup;
  private readonly treaty: TreatyGate;
  private readonly notice: (message: string) => void;

  constructor(
    private readonly world: EcsWorld,
    private readonly selection: SelectionSystem,
    private readonly sounds: AudioSink = audio(),
    options: OrderIssuerOptions = {},
  ) {
    this.humanId = options.humanId ?? HUMAN_PLAYER_ID;
    this.canSee = options.canSee ?? (() => true);
    this.map = options.map;
    this.teams = options.teams ?? NO_TEAMS;
    this.treaty = options.treaty ?? NO_TREATY;
    this.notice = options.notice ?? ((m) => showHudNotice(m));
  }

  issueOrders(tile: TileCoord): void {
    const selectedAll = this.selection.getAllSelected();
    const actor = orderActor(selectedAll, this.humanId);
    // Only the human's units take orders (a selected building or enemy does not).
    if (!actor) return;
    const target = resolveOrderTarget(this.world, tile, actor, this.canSee, this.teams, this.treaty);
    let ordered: 'unit_move' | 'unit_attack' | 'unit_convert' | null = null;
    const boarders: Entity[] = [];
    let truceMove = false;
    for (const entity of selectedAll) {
      if (entity.owner?.playerId !== this.humanId || entity.unit === undefined) continue;
      // Any new right-click order overrides whatever the unit was
      // doing — clear gather state + build command so the villager
      // actually listens.
      clearUnitOrders(this.world, entity);
      const targetId = target.entity?.id ?? 0;
      // A ready monk converts an enemy unit (M11); a recharging one, or one facing what it cannot convert, walks there.
      if (target.kind === 'enemy' && readyToConvert(entity) && canConvert(target.entity ?? undefined, this.humanId, this.teams, this.treaty)) {
        this.world.addComponent(entity, 'convertIntent', { targetId, elapsedMs: 0 });
        ordered ??= 'unit_convert';
        continue;
      }
      // A unit that cannot hurt the target (a melee unit, a ship: M14) walks there instead.
      if (target.kind === 'enemy' && entity.attacker && target.entity && canAttackTarget(entity, target.entity)) {
        this.world.addComponent(entity, 'attackIntent', { targetId });
        ordered = 'unit_attack';
        continue;
      }
      if (target.kind === 'ownSite' && isBuilder(entity)) {
        this.world.addComponent(entity, 'buildCommand', { targetId });
        ordered ??= 'unit_move';
        continue;
      }
      // Land units board an own transport (M14); the transport itself, and other ships, just move.
      if (target.kind === 'ownTransport' && target.entity && target.entity !== entity && moveLayerOf(entity) === 'land') {
        this.world.addComponent(entity, 'boardIntent', { transportId: targetId });
        boarders.push(entity);
        ordered ??= 'unit_move';
        continue;
      }
      // A loaded transport sent onto land unloads there (M14).
      if (entity.cargo && entity.cargo.units.length > 0 && this.map?.isPassable(tile.tx, tile.ty)) {
        this.world.addComponent(entity, 'unloadIntent', { target: { tx: tile.tx, ty: tile.ty } });
        ordered ??= 'unit_move';
        continue;
      }
      if (target.kind === 'resource' && target.entity && canWorkNode(entity, target.entity)) {
        this.world.addComponent(entity, 'gatherIntent', { nodeId: targetId });
        ordered ??= 'unit_move';
        continue;
      }
      this.world.addComponent(entity, 'moveIntent', { target: tile });
      ordered ??= 'unit_move';
      // The treaty (M16): this unit walks there instead of attacking.
      if (target.truce) truceMove = true;
    }
    if (truceMove) this.notice(hu.treaty.blocked);
    // The transport comes to meet the units it takes aboard (unless it was given its own order).
    const ship = target.kind === 'ownTransport' ? target.entity : null;
    const centre = boarders[0]?.position;
    if (ship && centre && boarders.length > 0 && !selectedAll.includes(ship)) {
      clearUnitOrders(this.world, ship);
      this.world.addComponent(ship, 'moveIntent', { target: { tx: centre.tx, ty: centre.ty } });
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

/**
 * Anything with health of a player not friendly to `actor` (Gaia included; M16: never an ally) on the tile, if seen.
 * While the treaty holds (M16) another team's player is skipped, and `truce` says one was there.
 */
function findEnemyAt(
  world: EcsWorld,
  tile: TileCoord,
  actor: Entity,
  canSee: CanSee,
  teams: TeamLookup,
  treaty: TreatyGate,
): { enemy: Entity | null; truce: boolean } {
  const actorPlayer = actor.owner?.playerId;
  let truce = false;
  if (actorPlayer === undefined) return { enemy: null, truce };
  for (const c of world.with('position', 'owner', 'health')) {
    if (isFriendly(teams, c.owner.playerId, actorPlayer) || !covers(c, tile) || !canSee(c)) continue;
    if (truceBetween(treaty, teams, c.owner.playerId, actorPlayer)) {
      truce = true;
      continue;
    }
    return { enemy: c, truce };
  }
  return { enemy: null, truce };
}

/** An own, living transport on the tile (M14): a boarding target. */
function findOwnTransportAt(world: EcsWorld, tile: TileCoord, actor: Entity): Entity | null {
  const actorPlayer = actor.owner?.playerId;
  for (const t of world.with('position', 'owner', 'unit')) {
    if (t.unit.unitType === 'transport' && t.owner.playerId === actorPlayer && !t.dying && covers(t, tile)) return t;
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

/** A resource node on the tile that `actor` may work: ownerless / Gaia, or its own (M16: never an ally's farm). */
function findResourceNodeAt(world: EcsWorld, tile: TileCoord, actor: Entity): Entity | null {
  const actorPlayer = actor.owner?.playerId;
  // Multi-tile building nodes (e.g. farms) match any footprint tile.
  for (const n of world.with('position', 'resourceNode')) {
    if (!isWorkableBy(n, actorPlayer)) continue;
    if (covers(n, tile)) return n;
  }
  return null;
}
