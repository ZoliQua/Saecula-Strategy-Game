export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;

export const MAX_PLAYERS = 6;
export const DEFAULT_MAP_SIZE = 64;

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
