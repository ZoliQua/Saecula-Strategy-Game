import type { AgeId } from '../types';

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
/** Inside a key's repeat interval, a request this many times louder than the voice that set it still plays (a near hit beats a far one). */
export const SFX_INTERVAL_OVERRIDE_RATIO = 2;
/** Each play's repeat interval varies by ± this share, so battle sounds are not evenly spaced. */
export const SFX_INTERVAL_JITTER = 0.2;
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

/*
 * Music (Task 9): generative per-age pieces scheduled live by a lookahead
 * sequencer on two crossfading buses.
 */

/** How far ahead of the audio clock the sequencer schedules notes, in seconds. */
export const MUSIC_LOOKAHEAD_S = 0.1;
/** Most music notes sounding at once (release tails included); the composer stays under it, the sequencer enforces it. */
export const MUSIC_MAX_VOICES = 12;
/** Crossfade between calm pieces, into and out of combat, and to the menu, in ms. */
export const MUSIC_CROSSFADE_MS = 3000;
/** Fade into a victory / defeat stinger, in ms. */
export const MUSIC_STINGER_FADE_MS = 1000;
/** A piece entering after silence (nothing playing, or the last piece ended) comes in this fast, in ms: its downbeat is heard. */
export const MUSIC_FAST_IN_MS = 150;
/** A stinger reaches full level this fast, in ms (the outgoing music still fades over MUSIC_STINGER_FADE_MS). */
export const MUSIC_STINGER_IN_MS = 100;
/** After a stall (a hidden tab), a held drone / string / pad note with at least this long to go is re-entered, in seconds. */
export const MUSIC_REENTER_MIN_S = 1;
/** Combat music returns to calm this long after the last fight near the camera, in ms. */
export const MUSIC_COMBAT_HOLD_MS = 10_000;
/** Seed of the music director: each switch composes a new piece from it. */
export const MUSIC_SEED = 0x4d75_7a61;
/** Seeded timing variation of a note (± ms): played, not quantized. */
export const MUSIC_HUMANIZE_MS = 10;
/** Calm tempo range per age (beats per minute). */
export const MUSIC_CALM_BPM = { 1: [76, 88], 2: [90, 104], 3: [80, 96] } as const satisfies Record<AgeId, readonly [number, number]>;
/** Combat runs at least this many times the age's fastest calm tempo. */
export const MUSIC_COMBAT_BPM_FACTOR = 1.32;
/** The menu's tempo (bpm). */
export const MUSIC_MENU_BPM = 66;
/** Target length of the victory / defeat stingers, in seconds (10–15 s; whole bars). */
export const MUSIC_STINGER_SECONDS = { victory: 11.5, defeat: 11 } as const;
/** Generated reverb (a convolver on a decaying-noise impulse): length, decay curve, return level, damping. */
export const MUSIC_REVERB = { seconds: 2.6, decay: 3.4, wet: 0.4, dampHz: 4200 } as const;
/** Gain of the bus each piece plays on: calm music sits near −23 dBFS RMS at the default volumes (master 80 %, music 60 %), under the SFX. */
export const MUSIC_BUS_LEVEL = 4;

/**
 * The music instruments (VoiceId) by age — Roman: lyre, aulos, frameDrum;
 * medieval: drone, recorder, tabor, bell; early modern: harpsichord,
 * strings, timpani, flute; menu: pad, harp. Per instrument: note level, stereo position, release tail after the
 * note's end (s) and reverb send. Melody voices sit in front, harmony
 * spread left and right, percussion low and dry.
 */
export const MUSIC_VOICES = {
  lyre: { level: 0.26, pan: -0.3, tailS: 0.4, send: 0.5 },
  aulos: { level: 0.15, pan: 0.12, tailS: 0.25, send: 0.55 },
  frameDrum: { level: 0.3, pan: 0.2, tailS: 0.45, send: 0.25 },
  drone: { level: 0.07, pan: 0, tailS: 2, send: 0.6 },
  recorder: { level: 0.12, pan: 0.15, tailS: 0.18, send: 0.6 },
  tabor: { level: 0.2, pan: -0.25, tailS: 0.25, send: 0.25 },
  bell: { level: 0.1, pan: -0.35, tailS: 2.8, send: 0.7 },
  harpsichord: { level: 0.12, pan: -0.25, tailS: 0.15, send: 0.4 },
  strings: { level: 0.055, pan: 0.25, tailS: 0.7, send: 0.65 },
  timpani: { level: 0.3, pan: 0.1, tailS: 1.6, send: 0.35 },
  flute: { level: 0.15, pan: 0.1, tailS: 0.22, send: 0.55 },
  pad: { level: 0.06, pan: 0, tailS: 2.7, send: 0.7 },
  harp: { level: 0.15, pan: -0.15, tailS: 1.1, send: 0.6 },
} as const satisfies Record<string, { level: number; pan: number; tailS: number; send: number }>;
