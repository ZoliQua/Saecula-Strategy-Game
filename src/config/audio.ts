/**
 * Audio constants (M6 Global Constraint 4): mixing, positional falloff,
 * voice caps, sound throttles and the SFX buffer budget. Presentation
 * only: nothing here changes a gameplay outcome.
 */

/** Simultaneous SFX voices across every key (Global Constraint 8). */
export const SFX_GLOBAL_VOICES = 24;
/** Total bytes of rendered SFX buffers (Float32, mono). */
export const SFX_MAX_BYTES = 8 * 1024 * 1024;
/** Longest rendered SFX, in seconds. */
export const SFX_MAX_SECONDS = 1.5;
/** Sample peak a rendered SFX never exceeds (renderSfx scales a louder render down). */
export const SFX_PEAK = 0.98;
/** Shortest attack / edge fade of a rendered layer, in ms (no clicks). */
export const SFX_MIN_EDGE_MS = 2;
/** Seed of the SFX bank renders (renderSfx is deterministic per seed). */
export const SFX_RENDER_SEED = 0x5f3759df;
/** Main-thread time per frame the SFX bank may spend rendering, in ms (at least one sound per frame). */
export const SFX_RENDER_BUDGET_MS = 3;

/** Positional SFX: full gain within this many tiles of the camera-centre tile (Decision 8). */
export const SFX_FULL_GAIN_TILES = 2;
/** Positional SFX: silent at and beyond this many tiles (linear falloff in between). */
export const SFX_SILENT_TILES = 10;
/** Stereo pan per tile of horizontal screen offset (iso: tx - ty), clamped to ±SFX_MAX_PAN. */
export const SFX_PAN_PER_TILE = 0.06;
export const SFX_MAX_PAN = 0.6;
/** Per-play variation so repeated sounds do not feel robotic: ± this share of pitch and gain. */
export const SFX_PITCH_VARIATION = 0.04;
export const SFX_GAIN_VARIATION = 0.05;

/** Hp loss within this many tiles of the camera centre counts as combat near the camera (combat music). */
export const COMBAT_MUSIC_RADIUS = 8;
/** A human unit or building hit farther than this from the camera raises the "under attack" notice. */
export const ATTACK_NOTICE_DISTANCE_TILES = 10;
/** At most one "under attack" notice per this many ms (real time). */
export const ATTACK_NOTICE_INTERVAL_MS = 20_000;
/** At most one damage sound per building per this many ms. */
export const BUILDING_DAMAGE_INTERVAL_MS = 2000;
/** At most one gather sound per gatherer per this many ms. */
export const GATHER_SOUND_INTERVAL_MS = 1500;

/** Music gain while the pause menu is open. */
export const MUSIC_DUCK_FACTOR = 0.5;
/** Time constant of gain changes (settings, duck), in seconds: smooth, no zipper noise. */
export const GAIN_SMOOTHING_S = 0.03;
/** Fade of a voice stolen at a cap, in seconds. */
export const STEAL_FADE_S = 0.03;
/** Fixed trim on the master bus before the limiter (headroom for big fights). */
export const MASTER_BUS_TRIM = 0.8;
/** Soft limiter on the master bus (DynamicsCompressorNode). */
export const MASTER_LIMITER = { thresholdDb: -12, kneeDb: 10, ratio: 6, attackS: 0.003, releaseS: 0.25 } as const;
