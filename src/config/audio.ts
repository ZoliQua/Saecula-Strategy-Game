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
/** Main-thread time per frame the SFX bank may spend rendering, in ms (at least one chunk per frame). */
export const SFX_RENDER_BUDGET_MS = 3;
/** Samples a resumable SFX render advances per step (≈ 0.1 ms each at 48 kHz in a browser). */
export const SFX_RENDER_CHUNK_SAMPLES = 2048;

/**
 * Battle sound density: per-key voice caps and repeat intervals for the
 * sounds a big fight requests every frame (≈ 10 starts per second each
 * at most), so a battle reads as a fight, not a clatter.
 */
export const BATTLE_SFX_LIMITS = {
  sword_hit: { maxVoices: 4, minIntervalMs: 90 },
  arrow_shot: { maxVoices: 3, minIntervalMs: 100 },
  musket_shot: { maxVoices: 3, minIntervalMs: 90 },
  cannon_shot: { maxVoices: 2, minIntervalMs: 150 },
  cannon_impact: { maxVoices: 2, minIntervalMs: 150 },
  unit_die: { maxVoices: 3, minIntervalMs: 90 },
} as const;
/** Lowest pitch of a sound's sine body, in Hz: lower is inaudible on laptops and only pumps the limiter. */
export const SFX_SUB_FLOOR_HZ = 50;

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
/** A button click this soon after a UI cue (error, panel open) of the same click plays no extra tick, in ms. */
export const UI_CUE_CLICK_SUPPRESS_MS = 60;
/** Fade of a voice stolen at a cap, in seconds. */
export const STEAL_FADE_S = 0.03;
/** Fixed trim on the master bus before the limiter (headroom for big fights). */
export const MASTER_BUS_TRIM = 0.8;
/** Soft limiter on the master bus (DynamicsCompressorNode). */
export const MASTER_LIMITER = { thresholdDb: -12, kneeDb: 10, ratio: 6, attackS: 0.003, releaseS: 0.25 } as const;
