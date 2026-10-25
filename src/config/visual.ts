/**
 * Visual (non-gameplay) tuning: lighting, day cycle, cast shadows.
 * Gameplay stats live in balance.ts; nothing here affects game state.
 */

/**
 * Dev toggle. false = every world sprite keeps the default pipeline and
 * the original baked shading (the pre-lighting look); no normal maps,
 * shadows or window glows are generated.
 */
export const LIGHTING_ENABLED = true;

/** Phaser renderer light budget (point lights per frame, nearest first). */
export const MAX_LIGHTS = 12;

/** Real-time length of a full day cycle. */
export const DAY_CYCLE_MS = 12 * 60_000;
/** Where a new game starts in the cycle (0..1, see SKY_KEYS). */
export const DAY_START_PHASE = 0.16;
/** Fixed phase for the main-menu diorama (warm late afternoon). */
export const MENU_PHASE = 0.5;

/** Ground brightness never drops below this (readability at night). */
export const MIN_BRIGHTNESS = 0.55;

/** Sky keyframe: sun placement and light colours at one cycle phase. */
export interface SkyKey {
  /** Cycle phase 0..1. */
  readonly at: number;
  /** Sun height above the horizon, degrees. */
  readonly elevation: number;
  /**
   * Sun direction in the ground plane, degrees, screen-based:
   * 0 = from screen right, 90 = from the viewer (screen bottom),
   * 180 = from screen left, 270 = from behind (screen top).
   */
  readonly azimuth: number;
  /** Sun colour × intensity (linear multipliers, ~0..1). */
  readonly sun: readonly [number, number, number];
  /** Ambient colour (linear multipliers). */
  readonly ambient: readonly [number, number, number];
  /** Emissive window glow 0..1. */
  readonly glow: number;
}

/**
 * Dawn → day → golden hour → dusk → night → dawn. The sun rises on
 * the screen left and sets on the right, passing in front of the
 * camera so the visible walls catch light and shadows fall behind
 * buildings. At night a dim cool "moon" keeps the world readable.
 */
export const SKY_KEYS: readonly SkyKey[] = [
  { at: 0.0, elevation: 8, azimuth: 168, sun: [0.62, 0.42, 0.36], ambient: [0.5, 0.5, 0.62], glow: 0.55 },
  { at: 0.1, elevation: 22, azimuth: 150, sun: [0.66, 0.54, 0.42], ambient: [0.58, 0.57, 0.62], glow: 0.1 },
  { at: 0.25, elevation: 48, azimuth: 125, sun: [0.6, 0.58, 0.52], ambient: [0.62, 0.63, 0.66], glow: 0 },
  { at: 0.4, elevation: 56, azimuth: 95, sun: [0.6, 0.59, 0.54], ambient: [0.63, 0.64, 0.66], glow: 0 },
  { at: 0.55, elevation: 30, azimuth: 55, sun: [0.7, 0.55, 0.36], ambient: [0.6, 0.56, 0.54], glow: 0.05 },
  { at: 0.65, elevation: 12, azimuth: 30, sun: [0.74, 0.44, 0.26], ambient: [0.55, 0.48, 0.52], glow: 0.45 },
  { at: 0.73, elevation: 5, azimuth: 18, sun: [0.5, 0.3, 0.34], ambient: [0.48, 0.46, 0.6], glow: 0.9 },
  { at: 0.82, elevation: 34, azimuth: 120, sun: [0.16, 0.2, 0.32], ambient: [0.46, 0.5, 0.66], glow: 1 },
  { at: 0.92, elevation: 30, azimuth: 150, sun: [0.16, 0.2, 0.32], ambient: [0.46, 0.5, 0.66], glow: 1 },
];

/** Cast-shadow look. */
export const SHADOW = {
  /** Max shadow alpha (full sun). */
  alpha: 0.34,
  /** Shadow length per unit of screen height is capped here. */
  maxLength: 2.6,
  /** Silhouette blur in art px (pre-blurred into shadow textures). */
  blur: 3,
} as const;

/**
 * Painted (baked) face shading kept when lighting is on: 1 = full
 * baked contrast, 0 = flat albedo. Lighting supplies the rest.
 */
export const BAKED_SHADE_KEEP = 0.45;

/** Point lights: assumed height of a light above its ground point (world px). */
export const POINT_LIGHT_HEIGHT = 28;
/** Max simultaneous flash lights (muzzle flashes, explosions). */
export const FLASH_POOL_SIZE = 6;
/** Persistent lights scale between day and full night by this range. */
export const NIGHT_LIGHT_GAIN = { day: 0.3, night: 1 } as const;
