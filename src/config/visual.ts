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
  { at: 0.25, elevation: 40, azimuth: 125, sun: [0.62, 0.6, 0.53], ambient: [0.6, 0.61, 0.64], glow: 0 },
  { at: 0.4, elevation: 46, azimuth: 95, sun: [0.62, 0.61, 0.55], ambient: [0.6, 0.61, 0.63], glow: 0 },
  { at: 0.55, elevation: 30, azimuth: 55, sun: [0.66, 0.52, 0.34], ambient: [0.55, 0.52, 0.5], glow: 0.05 },
  { at: 0.65, elevation: 12, azimuth: 30, sun: [0.74, 0.44, 0.26], ambient: [0.55, 0.48, 0.52], glow: 0.45 },
  { at: 0.73, elevation: 5, azimuth: 18, sun: [0.5, 0.3, 0.34], ambient: [0.48, 0.46, 0.6], glow: 0.9 },
  { at: 0.82, elevation: 34, azimuth: 120, sun: [0.16, 0.2, 0.32], ambient: [0.46, 0.5, 0.66], glow: 1 },
  { at: 0.92, elevation: 30, azimuth: 150, sun: [0.16, 0.2, 0.32], ambient: [0.46, 0.5, 0.66], glow: 1 },
];

/** Cast-shadow look. */
export const SHADOW = {
  /** Max shadow alpha (full sun). */
  alpha: 0.42,
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

/** Per projectile kind: drawn look in flight (world px; see ProjectileRenderSystem). */
export interface ShotLook {
  /** Release height at the shooter / landing height at the target, px above ground. */
  readonly liftFrom: number;
  readonly liftTo: number;
  /** Trail streak behind the shot (0 length = none). */
  readonly trailLength: number;
  readonly trailColor: number;
  readonly trailAlpha: number;
  /** Ground shadow width px and opacity at ground level. */
  readonly shadowWidth: number;
  readonly shadowAlpha: number;
}

export const SHOT_LOOK = {
  arrow: { liftFrom: 19, liftTo: 9, trailLength: 22, trailColor: 0xfff4dc, trailAlpha: 0.32, shadowWidth: 16, shadowAlpha: 0.55 },
  bolt: { liftFrom: 15, liftTo: 9, trailLength: 26, trailColor: 0xfff4dc, trailAlpha: 0.36, shadowWidth: 12, shadowAlpha: 0.55 },
  bullet: { liftFrom: 18, liftTo: 11, trailLength: 0, trailColor: 0xffffff, trailAlpha: 0, shadowWidth: 0, shadowAlpha: 0 },
  cannonball: { liftFrom: 11, liftTo: 4, trailLength: 34, trailColor: 0xcfc8bd, trailAlpha: 0.5, shadowWidth: 13, shadowAlpha: 0.55 },
} as const satisfies Record<'arrow' | 'bolt' | 'bullet' | 'cannonball', ShotLook>;

/** Combat VFX tuning (CombatFxSystem). Times in ms, sizes in world px. */
export const COMBAT_FX = {
  /** Muzzle point: px along the aim beyond the shot's release point (SHOT_LOOK.liftFrom). */
  muzzle: { bullet: 9, cannonball: 18 },
  muzzleFlashMs: { bullet: 70, cannonball: 110 },
  /** Light flashes: colour, radius px, duration, intensity. */
  light: {
    musket: { color: 0xffc070, radius: 90, ms: 110, intensity: 1.5 },
    cannon: { color: 0xffb060, radius: 170, ms: 180, intensity: 2.2 },
    blast: { color: 0xff9a40, radius: 230, ms: 420, intensity: 2.6 },
  },
  explosionFrameMs: 72,
  scorchLifeMs: 20_000,
  /** Fraction of the scorch's life before it starts to fade. */
  scorchHold: 0.35,
  stuckArrowMs: 2_400,
  hitFlashMs: 80,
  /** Camera shake for an on-screen cannon impact. */
  shake: { ms: 170, max: 0.0045, edgeKeep: 0.3 },
  /** When the falling body hits the ground in the death animation. */
  deathDustDelayMs: 380,
} as const;

/** Age-up transformation of a player's buildings (AgeUpFxSystem). Times in ms, sizes in world px. */
export const AGE_UP_FX = {
  /** Delay between consecutive buildings, rippling out from the town centre … */
  staggerMs: 280,
  /** … compressed so the last one starts within this time. */
  maxSpreadMs: 3600,
  /** Scaffolding + dust before the new style appears. */
  swapMs: 520,
  scaffoldInMs: 260,
  scaffoldOutMs: 650,
  /** Warm light flash at the swap: colour, radius per footprint tile, duration, intensity. */
  flash: { color: 0xffd9a0, radiusPerTile: 52, ms: 900, intensity: 2.2 },
  /** Particles per footprint tile (dust burst / rising sparks). */
  dustPerTile: 7,
  sparksPerTile: 5,
} as const;

/**
 * Tower archer platforms per age style (art px above the ground, painted
 * at ART_SCALE): the tower art stands its archer there and tower arrows
 * are released from that height (towerLaunchHeight).
 */
export const TOWER_PLATFORM_Z = { 1: 124, 2: 132, 3: 140 } as const;

/** Building damage, fire, collapse and construction effects (BuildingFxSystem). Times in ms, sizes in world px. */
export const BUILDING_FX = {
  /** HP fraction below which a finished building smokes and cracks … */
  smokeBelow: 0.66,
  /** … and below which it burns. */
  fireBelow: 0.33,
  /** Flames per footprint size (index = tiles across); wall segments burn on every other tile. */
  flamesBySize: [1, 1, 2, 3, 4],
  /** Most burning buildings / wall segments drawn with flames at once (nearest the view centre). */
  maxBurning: 14,
  maxBurningWalls: 10,
  /** Fire point lights at once (shared with torches; flashes keep their reserved slots). */
  maxFireLights: 4,
  fireLight: { color: 0xff8a3a, radius: 200, intensity: 2.3, flicker: 0.45 },
  flameFrameMs: 70,
  /** Emission intervals per source. */
  lightSmokeMs: 520,
  heavySmokeMs: 230,
  emberMs: 320,
  /** Collapse: dust and debris per footprint tile across, emitted over the collapse. */
  collapseDustPerTile: 22,
  collapseDebrisPerTile: 14,
  /** Rubble decal: total life after the building went down, and the fraction held at full opacity. */
  rubbleLifeMs: 30_000,
  rubbleHold: 0.4,
  /** Camera shake when a building of 3+ tiles across comes down on screen (strength per tile). */
  collapseShake: { ms: 320, perTile: 0.0012, edgeKeep: 0.3 },
  /** Hammer dust per strike of a builder's tool. */
  hammerDust: 4,
} as const;

/** Terrain relief and animated surfaces (Task 18). Sizes in world px unless noted. */
export const TERRAIN_LOOK = {
  /** Screen height of a cliff plateau above the ground (its vertical faces are this tall). */
  cliffHeight: 36,
  /** Grid points per tile of the cliff relief and water fields (the surface shader's mask). */
  surfaceRes: 8,
  /** Shore distance (tiles) at which water reaches its deepest tint. */
  waterDeepTiles: 3.5,
  /** Forest: scale of trees on the forest edge vs. inside it (before per-tree jitter). */
  edgeTreeScale: 1.18,
  interiorTreeScale: 0.95,
  /** Zoom below which trees stop swaying (saves vertex work when the whole map is in view). */
  swayMinZoom: 0.7,
} as const;
