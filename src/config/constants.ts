export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;

export const MAX_PLAYERS = 6;

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2.0;

export const CAMERA_EDGE_MARGIN = 5;
export const CAMERA_SPEED = 600;

/** Performance budget (CLAUDE.md §10): A* searches per 60 Hz frame; the rest wait in queue. */
export const PATHFINDS_PER_FRAME = 5;
/** The frame length PATHFINDS_PER_FRAME refers to (ms). */
export const PATHFIND_FRAME_MS = 1000 / 60;
/** In the game a long frame earns at most this many searches (headless steps are not capped). */
export const PATHFINDS_MAX_PER_TICK = 2 * PATHFINDS_PER_FRAME;

/**
 * Art painted during play instead of behind the loading card (age-2/3
 * wall pieces, scenes/game/artLoadPlan.ts): first job this long after the
 * game starts, at most one job every BACKGROUND_ART_EVERY_FRAMES frames,
 * and only in a frame whose own work so far is under the given ms.
 */
export const BACKGROUND_ART_START_DELAY_MS = 1500;
export const BACKGROUND_ART_EVERY_FRAMES = 2;
export const BACKGROUND_ART_MAX_FRAME_WORK_MS = 5;
/** Paced frames skipped as busy before one runs a job anyway (~1 s at 60 Hz with EVERY_FRAMES 2). */
export const BACKGROUND_ART_FORCE_AFTER_FRAMES = 30;

/** Autosave to the 'auto' slot every this much game time (CLAUDE.md §5.4: 5 minutes). */
export const AUTOSAVE_INTERVAL_MS = 300_000;
/** Manual save slots (save:1 … save:SAVE_SLOTS), besides save:auto. */
export const SAVE_SLOTS = 5;

/** Camera pan keys before any remapping ({ KeyboardEvent.code, keycap label }), in up / down / left / right order. */
export const DEFAULT_PAN_KEYS = {
  panUp: { code: 'KeyW', label: 'W' },
  panDown: { code: 'KeyS', label: 'S' },
  panLeft: { code: 'KeyA', label: 'A' },
  panRight: { code: 'KeyD', label: 'D' },
} as const;
/** The fixed secondary camera pan (always active, never remappable). */
export const ARROW_PAN_CODES = { panUp: 'ArrowUp', panDown: 'ArrowDown', panLeft: 'ArrowLeft', panRight: 'ArrowRight' } as const;
/** Keys no action can be bound to: Esc (pause), the arrows (fixed pan), focus / form keys, modifiers and the dev overlay. */
export const RESERVED_KEY_CODES: readonly string[] = [
  'Escape',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Tab',
  'Enter',
  'Space',
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
  'Backquote',
  'F9',
];
/** Default volume per channel (0..100). */
export const DEFAULT_VOLUMES = { master: 80, music: 60, sfx: 80, notifications: 80 } as const;
