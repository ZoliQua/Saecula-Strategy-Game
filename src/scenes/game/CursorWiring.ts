import type Phaser from 'phaser';
import type { SelectionSystem } from '../../ecs/systems/SelectionSystem';
import type { EcsWorld } from '../../ecs/world';
import type { TileCoord } from '../../iso/coordinates';
import type { MapData } from '../../map/MapData';
import { cursorFor, type CursorContext, type CursorKind } from '../../ui/cursor';
import { cursorCss } from '../../ui/cursors';
import { uiStore } from '../../ui/store';
import { canConvert, readyToConvert } from '../../game/convert';
import { checkTradeRoute, isTrader } from '../../game/trade';
import { orderActor, resolveOrderTarget, type CanSee } from './OrderIssuer';
import { canWorkNode, isBuilder } from '../../ecs/workers';
import { canAttackTarget, moveLayerOf, navGridFor } from '../../ecs/navLayer';
import { NO_TEAMS, type TeamLookup } from '../../game/diplomacy';
import { NO_TREATY, type TreatyGate } from '../../game/treaty';

/** Re-checks the cursor this often while the pointer rests (targets walk under it, the selection changes). */
const CURSOR_REFRESH_MS = 150;

/**
 * The cursor context for `tile` with the human's current selection: the
 * same actor (orderActor) and targeting rule, fog included (`canSee`), as
 * OrderIssuer, so the cursor shows exactly what the command would do.
 */
export function cursorContext(
  world: EcsWorld,
  map: MapData,
  selection: SelectionSystem,
  tile: TileCoord | null,
  humanId: number,
  canSee?: CanSee,
  teams: TeamLookup = NO_TEAMS,
  /** The treaty (M16): while it holds, another team is no target, so no sword over it. */
  treaty: TreatyGate = NO_TREATY,
): CursorContext {
  const selected = selection.getAllSelected();
  const units = selected.filter((e) => e.unit !== undefined && e.owner?.playerId === humanId && !e.dying);
  const placing = uiStore.getState().placementBuilding !== null;
  const actor = orderActor(selected, humanId);
  const target = tile && actor ? resolveOrderTarget(world, tile, actor, canSee, teams, treaty) : null;
  const resource = target?.entity?.resourceNode?.type;
  return {
    placing,
    units: units.map((e) => ({
      attacks: e.attacker !== undefined && (!target?.entity || target.kind !== 'enemy' || canAttackTarget(e, target.entity)),
      gathers: target?.entity?.resourceNode ? canWorkNode(e, target.entity) : e.gatherer !== undefined,
      builds: isBuilder(e),
      converts: readyToConvert(e),
      boards: moveLayerOf(e) === 'land',
      unloads: (e.cargo?.units.length ?? 0) > 0,
      trades: isTrader(e),
    })),
    land: tile ? map.isPassable(tile.tx, tile.ty) : false,
    target: resource
      ? { kind: target?.kind ?? 'none', resource }
      : target?.kind === 'tradePost' && target.entity && actor
        ? { kind: 'tradePost', tradeValid: checkTradeRoute(world, actor, target.entity, teams, map).ok }
        : { kind: target?.kind ?? 'none', convertible: target?.kind === 'enemy' && canConvert(target.entity ?? undefined, humanId, teams, treaty) },
    // A move is allowed where any selected unit can go: a ship on water, a land unit on land (M14).
    passable: tile ? units.some((e) => navGridFor(map, e).isPassable(tile.tx, tile.ty)) || (units.length === 0 && map.isPassable(tile.tx, tile.ty)) : null,
  };
}

/**
 * The contextual cursor on the game canvas: what a command on the hovered
 * tile would do (cursorFor). Recomputed on pointer moves and every
 * CURSOR_REFRESH_MS; the canvas style changes only when the kind does.
 * Unwired (and the cursor reset) on scene shutdown.
 */
export function wireCursor(
  scene: Phaser.Scene,
  world: EcsWorld,
  map: MapData,
  selection: SelectionSystem,
  hoverTile: () => TileCoord | null,
  humanId: number,
  canSee?: CanSee,
  teams: TeamLookup = NO_TEAMS,
  treaty: TreatyGate = NO_TREATY,
): void {
  const canvas = scene.game.canvas;
  let shown: CursorKind = 'default';
  const refresh = (): void => {
    const kind = cursorFor(cursorContext(world, map, selection, hoverTile(), humanId, canSee, teams, treaty));
    if (kind === shown) return;
    shown = kind;
    canvas.style.cursor = cursorCss(kind);
  };
  // After PointerInput's own move handler (registered first), so the hover tile is current.
  // (Event names as strings: this module stays free of the Phaser runtime, for its tests.)
  scene.input.on('pointermove', refresh);
  const timer = scene.time.addEvent({ delay: CURSOR_REFRESH_MS, loop: true, callback: refresh });
  scene.events.once('shutdown', () => {
    scene.input.off('pointermove', refresh);
    timer.remove();
    canvas.style.cursor = '';
  });
}
