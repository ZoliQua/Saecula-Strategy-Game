import Phaser from 'phaser';
import type { SelectionSystem } from '../../ecs/systems/SelectionSystem';
import type { EcsWorld } from '../../ecs/world';
import type { TileCoord } from '../../iso/coordinates';
import type { MapData } from '../../map/MapData';
import { cursorFor, type CursorContext, type CursorKind } from '../../ui/cursor';
import { cursorCss } from '../../ui/cursors';
import { uiStore } from '../../ui/store';
import { resolveOrderTarget } from './OrderIssuer';

/** Re-checks the cursor this often while the pointer rests (targets walk under it, the selection changes). */
const CURSOR_REFRESH_MS = 150;

/** The cursor context for `tile` with the human's current selection (OrderIssuer's targeting rule). */
export function cursorContext(world: EcsWorld, map: MapData, selection: SelectionSystem, tile: TileCoord | null, humanId: number): CursorContext {
  const units = selection.getAllSelected().filter((e) => e.unit !== undefined && e.owner?.playerId === humanId && !e.dying);
  const placing = uiStore.getState().placementBuilding !== null;
  const actor = units[0];
  const target = tile && actor ? resolveOrderTarget(world, tile, actor) : null;
  const resource = target?.entity?.resourceNode?.type;
  return {
    placing,
    units: units.map((e) => ({ attacks: e.attacker !== undefined, gathers: e.gatherer !== undefined })),
    target: resource ? { kind: target?.kind ?? 'none', resource } : { kind: target?.kind ?? 'none' },
    passable: tile ? map.isPassable(tile.tx, tile.ty) : null,
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
): void {
  const canvas = scene.game.canvas;
  let shown: CursorKind = 'default';
  const refresh = (): void => {
    const kind = cursorFor(cursorContext(world, map, selection, hoverTile(), humanId));
    if (kind === shown) return;
    shown = kind;
    canvas.style.cursor = cursorCss(kind);
  };
  // After PointerInput's own move handler (registered first), so the hover tile is current.
  scene.input.on(Phaser.Input.Events.POINTER_MOVE, refresh);
  const timer = scene.time.addEvent({ delay: CURSOR_REFRESH_MS, loop: true, callback: refresh });
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.input.off(Phaser.Input.Events.POINTER_MOVE, refresh);
    timer.remove();
    canvas.style.cursor = '';
  });
}
