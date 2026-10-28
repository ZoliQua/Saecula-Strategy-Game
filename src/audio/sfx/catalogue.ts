import { BATTLE_SFX_LIMITS, SFX_SUB_FLOOR_HZ } from '../../config/audio';
import type { SynthLayer, SynthRecipe } from './synth';

/**
 * The SFX catalogue (PROGRAM_TERV §12.3). Keys are file-shaped, so a CC0
 * OGG can later replace any of them (SfxBank.register) without touching
 * a caller. Each recipe is short, starts softly (≥ 2 ms attack), keeps
 * its noise low-passed, and plays at a modest level so a big fight's
 * overlapping sounds stay clean under the master limiter.
 */

export const SFX_KEYS = [
  'ui_click',
  'ui_panel_open',
  'ui_error',
  'unit_select',
  'unit_move',
  'unit_attack',
  'unit_die',
  'building_start',
  'building_complete',
  'building_damage',
  'building_destroyed',
  'gather_wood',
  'gather_gold',
  'gather_food',
  'resource_deposit',
  'notification_age_up',
  'notification_attacked',
  'notification_research_complete',
  'notification_wonder',
  'sword_hit',
  'arrow_shot',
  'musket_shot',
  'cannon_shot',
  'cannon_impact',
] as const;

export type SfxKey = (typeof SFX_KEYS)[number];
/** Music keys arrive with the music system (Task 9); they share the bank's key space. */
export type { MusicKey } from '../music/composer';
import type { MusicKey } from '../music/composer';
export type SoundKey = SfxKey | MusicKey;

export interface SfxSpec {
  readonly channel: 'sfx' | 'notifications';
  /** Simultaneous voices of this key. */
  readonly maxVoices: number;
  /** A repeat of this key sooner than this is dropped. */
  readonly minIntervalMs: number;
  /** Playback gain, 0..1. */
  readonly gain: number;
  readonly recipe: SynthRecipe;
}

type Shape = Pick<SynthLayer, 'attackMs' | 'decayMs' | 'sustain' | 'releaseMs' | 'durationMs'>;

/** A percussive shape: quick attack, decay to silence. */
const hit = (attackMs: number, decayMs: number, durationMs = decayMs + 20): Shape => ({
  attackMs,
  decayMs,
  sustain: 0,
  releaseMs: Math.min(40, durationMs / 3),
  durationMs,
});

/** A held, horn-like note: swell, settle to `sustain`, smooth release. */
const held = (durationMs: number, attackMs = 25, sustain = 0.7, releaseMs = 120): Shape => ({
  attackMs,
  decayMs: 90,
  sustain,
  releaseMs,
  durationMs,
});

/** A horn voice: a square through a gentle low-pass (warm, never buzzy), with a soft sine an octave below. */
function horn(freq: number, delayMs: number, durationMs: number, cutoff: number, gain: number): SynthLayer[] {
  return [
    { wave: 'square', freq: [freq, freq], ...held(durationMs), filter: { type: 'lowpass', freq: cutoff, q: 0.7 }, gain, delayMs },
    { wave: 'sine', freq: [freq / 2, freq / 2], ...held(durationMs, 40, 0.8), gain: gain * 0.6, delayMs },
  ];
}

/** A small bell: a sine with a 2:1 phase modulation, ringing out. */
function bell(freq: number, delayMs: number, durationMs: number, gain: number): SynthLayer[] {
  return [
    { wave: 'sine', freq: [freq, freq], ...hit(3, durationMs - 60, durationMs), fm: { ratio: 2, depth: 0.6 }, gain, delayMs },
    { wave: 'sine', freq: [freq * 2, freq * 2], ...hit(3, durationMs * 0.4), gain: gain * 0.25, delayMs },
  ];
}

const sfx = (recipe: SynthLayer[], gain: number, maxVoices: number, minIntervalMs: number): SfxSpec => ({
  channel: 'sfx',
  maxVoices,
  minIntervalMs,
  gain,
  recipe: { layers: recipe },
});

/** A battle sound: its caps come from BATTLE_SFX_LIMITS. */
const battle = (recipe: SynthLayer[], gain: number, limits: { maxVoices: number; minIntervalMs: number }): SfxSpec =>
  sfx(recipe, gain, limits.maxVoices, limits.minIntervalMs);

/** Sub-bass guard for noise rumbles: nothing below the floor reaches the limiter. */
const SUB_CUT = { type: 'highpass', freq: SFX_SUB_FLOOR_HZ * 0.9, q: 0.7 } as const;

const notice = (recipe: SynthLayer[], gain: number): SfxSpec => ({
  channel: 'notifications',
  maxVoices: 1,
  minIntervalMs: 800,
  gain,
  recipe: { layers: recipe },
});

// Note frequencies (Hz).
const C4 = 261.63;
const D4 = 293.66;
const E4 = 329.63;
const G4 = 392.0;
const A3 = 220.0;
const B4 = 493.88;
const C5 = 523.25;
const E5 = 659.25;
const GS4 = 415.3;
const B5 = 987.77;

export const SFX_CATALOGUE: Readonly<Record<SfxKey, SfxSpec>> = {
  // A 20 ms soft tick.
  ui_click: sfx(
    [
      { wave: 'triangle', freq: [1700, 1150], ...hit(2, 14, 20), gain: 0.55 },
      { wave: 'noise', freq: [9000, 5000], ...hit(2, 8, 12), filter: { type: 'highpass', freq: 2500, q: 0.7 }, gain: 0.12 },
    ],
    0.35,
    2,
    30,
  ),
  // An airy rising swish with a soft fifth under it.
  ui_panel_open: sfx(
    [
      { wave: 'noise', freq: [900, 5000], attackMs: 60, decayMs: 120, sustain: 0, releaseMs: 50, durationMs: 230, filter: { type: 'bandpass', freq: 1800, q: 0.8 }, gain: 0.5 },
      { wave: 'sine', freq: [440, 660], attackMs: 12, decayMs: 170, sustain: 0, releaseMs: 40, durationMs: 230, gain: 0.22 },
      { wave: 'sine', freq: [880, 990], ...hit(12, 140, 200), gain: 0.08 },
    ],
    0.4,
    1,
    100,
  ),
  // Two low, muffled "bonks" falling a step: clearly "no", never shrill.
  ui_error: sfx(
    [
      { wave: 'square', freq: [233, 226], ...held(110, 4, 0.35, 45), filter: { type: 'lowpass', freq: 1100, q: 0.7 }, gain: 0.32 },
      { wave: 'square', freq: [196, 190], ...held(150, 4, 0.35, 70), filter: { type: 'lowpass', freq: 1000, q: 0.7 }, gain: 0.32, delayMs: 125 },
      { wave: 'sine', freq: [116, 110], ...hit(4, 120, 140), gain: 0.25 },
      { wave: 'sine', freq: [98, 95], ...hit(4, 150, 170), gain: 0.25, delayMs: 125 },
    ],
    0.45,
    1,
    150,
  ),
  // A short bright "pip" rising a fifth.
  unit_select: sfx(
    [
      { wave: 'sine', freq: [880, 1320], ...hit(3, 60, 80), gain: 0.45 },
      { wave: 'triangle', freq: [1760, 1760], ...hit(3, 35, 50), gain: 0.08 },
    ],
    0.4,
    1,
    60,
  ),
  // A soft wooden "tock" with a quick answer: an order taken.
  unit_move: sfx(
    [
      { wave: 'triangle', freq: [620, 560], ...hit(2, 70, 90), gain: 0.45 },
      { wave: 'noise', freq: [2200, 1500], ...hit(2, 25, 35), filter: { type: 'bandpass', freq: 1200, q: 2 }, gain: 0.35 },
      { wave: 'triangle', freq: [830, 780], ...hit(2, 70, 90), gain: 0.3, delayMs: 70 },
    ],
    0.4,
    1,
    80,
  ),
  // A gruffer double strike falling: "charge".
  unit_attack: sfx(
    [
      { wave: 'saw', freq: [330, 250], ...hit(3, 110, 130), filter: { type: 'lowpass', freq: 1300, q: 0.8 }, gain: 0.4 },
      { wave: 'noise', freq: [4000, 1800], ...hit(2, 50, 70), filter: { type: 'bandpass', freq: 2200, q: 1 }, gain: 0.3 },
      { wave: 'saw', freq: [440, 330], ...hit(3, 120, 140), filter: { type: 'lowpass', freq: 1500, q: 0.8 }, gain: 0.35, delayMs: 65 },
    ],
    0.45,
    1,
    80,
  ),
  // A dull body fall: a low thud and a muffled dust burst.
  unit_die: battle(
    [
      { wave: 'noise', freq: [700, 180], ...hit(3, 240, 300), gain: 0.55 },
      { wave: 'sine', freq: [150, 55], ...hit(3, 260, 320), gain: 0.55 },
      { wave: 'triangle', freq: [240, 120], ...hit(5, 150, 180), filter: { type: 'lowpass', freq: 600, q: 0.7 }, gain: 0.2 },
    ],
    0.45,
    BATTLE_SFX_LIMITS.unit_die,
  ),
  // Two mallet knocks on timber.
  building_start: sfx(
    [
      { wave: 'noise', freq: [3000, 1500], ...hit(2, 50, 65), filter: { type: 'bandpass', freq: 900, q: 2.5 }, gain: 0.7 },
      { wave: 'sine', freq: [190, 120], ...hit(2, 70, 90), gain: 0.45 },
      { wave: 'noise', freq: [3000, 1500], ...hit(2, 50, 65), filter: { type: 'bandpass', freq: 820, q: 2.5 }, gain: 0.6, delayMs: 190 },
      { wave: 'sine', freq: [175, 110], ...hit(2, 70, 90), gain: 0.4, delayMs: 190 },
    ],
    0.5,
    2,
    100,
  ),
  // A rising two-note chime (E5 → B5).
  building_complete: sfx([...bell(E5, 0, 650, 0.32), ...bell(B5, 150, 800, 0.28)], 0.5, 2, 200),
  // A crunchy timber-and-stone knock.
  building_damage: sfx(
    [
      { wave: 'noise', freq: [3200, 700], ...hit(2, 150, 180), filter: { type: 'lowpass', freq: 2600, q: 0.7 }, gain: 0.6 },
      { wave: 'sine', freq: [120, 70], ...hit(2, 140, 170), gain: 0.4 },
      { wave: 'noise', freq: [1800, 1200], ...hit(2, 40, 55), filter: { type: 'bandpass', freq: 650, q: 3 }, gain: 0.45 },
    ],
    0.4,
    3,
    120,
  ),
  // A collapse: a long low rumble with falling debris.
  building_destroyed: sfx(
    [
      { wave: 'noise', freq: [2400, 250], attackMs: 6, decayMs: 750, sustain: 0, releaseMs: 200, durationMs: 1050, filter: SUB_CUT, gain: 0.7 },
      { wave: 'sine', freq: [85, SFX_SUB_FLOOR_HZ], ...hit(5, 850, 950), gain: 0.4 },
      { wave: 'noise', freq: [2600, 900], ...hit(4, 300, 380), filter: { type: 'bandpass', freq: 1100, q: 1.2 }, gain: 0.35, delayMs: 90 },
      { wave: 'noise', freq: [2000, 800], ...hit(4, 220, 280), filter: { type: 'bandpass', freq: 800, q: 1.5 }, gain: 0.3, delayMs: 330 },
    ],
    0.65,
    2,
    200,
  ),
  // An axe in wood: a resonant hollow knock.
  gather_wood: sfx(
    [
      { wave: 'noise', freq: [2500, 1200], ...hit(2, 45, 60), filter: { type: 'bandpass', freq: 1050, q: 3.5 }, gain: 0.8 },
      { wave: 'sine', freq: [440, 380], ...hit(2, 60, 80), gain: 0.35 },
      { wave: 'triangle', freq: [760, 720], ...hit(2, 28, 40), gain: 0.12 },
    ],
    0.3,
    3,
    90,
  ),
  // A pick on ore: a short metallic clink.
  gather_gold: sfx(
    [
      { wave: 'sine', freq: [1500, 1470], ...hit(2, 150, 190), fm: { ratio: 1.41, depth: 0.9 }, filter: { type: 'lowpass', freq: 3800, q: 0.7 }, gain: 0.3 },
      { wave: 'sine', freq: [2250, 2250], ...hit(2, 70, 90), gain: 0.08 },
      { wave: 'noise', freq: [5000, 3500], ...hit(2, 14, 22), filter: { type: 'bandpass', freq: 2600, q: 1 }, gain: 0.2 },
    ],
    0.35,
    3,
    90,
  ),
  // A soft rustle of leaves and stalks.
  gather_food: sfx(
    [
      { wave: 'noise', freq: [6000, 3000], attackMs: 18, decayMs: 120, sustain: 0, releaseMs: 30, durationMs: 170, filter: { type: 'bandpass', freq: 3000, q: 0.7 }, gain: 0.55 },
      { wave: 'noise', freq: [5000, 2500], attackMs: 15, decayMs: 90, sustain: 0, releaseMs: 30, durationMs: 130, filter: { type: 'bandpass', freq: 2400, q: 0.8 }, gain: 0.4, delayMs: 80 },
    ],
    0.3,
    3,
    90,
  ),
  // A load set down, with a small bright "reward" note.
  resource_deposit: sfx(
    [
      { wave: 'sine', freq: [300, 200], ...hit(3, 110, 130), gain: 0.4 },
      { wave: 'noise', freq: [1600, 900], ...hit(3, 70, 90), gain: 0.3 },
      { wave: 'triangle', freq: [1046.5, 1046.5], ...hit(3, 140, 170), gain: 0.12, delayMs: 45 },
    ],
    0.3,
    2,
    120,
  ),
  // A rising fanfare: C4 → G4 → C5.
  notification_age_up: notice([...horn(C4, 0, 260, 1400, 0.22), ...horn(G4, 210, 260, 1500, 0.22), ...horn(C5, 420, 620, 1600, 0.24)], 0.6),
  // A low warning call: D4, D4, A3 (repeated note, then a fall).
  notification_attacked: notice([...horn(D4, 0, 150, 1100, 0.24), ...horn(D4, 175, 150, 1100, 0.24), ...horn(A3, 350, 480, 1000, 0.26)], 0.65),
  // A light rising major triad: E4 → G#4 → B4.
  notification_research_complete: notice([...horn(E4, 0, 170, 1800, 0.2), ...horn(GS4, 110, 170, 1800, 0.2), ...horn(B4, 220, 460, 1900, 0.21)], 0.5),
  // A grand two-chord swell: C4+G4, then C5+E5.
  notification_wonder: notice(
    [
      ...horn(C4, 0, 520, 1200, 0.16),
      ...horn(G4, 0, 520, 1200, 0.14),
      ...horn(C5, 430, 900, 1400, 0.16),
      ...horn(E5, 430, 900, 1500, 0.13),
    ],
    0.65,
  ),
  // A short metallic FM ping on a noise burst, with a little body thump.
  sword_hit: battle(
    [
      { wave: 'sine', freq: [1850, 1750], ...hit(2, 95, 140), fm: { ratio: 2.76, depth: 1.4 }, filter: { type: 'lowpass', freq: 5500, q: 0.7 }, gain: 0.26 },
      { wave: 'noise', freq: [6000, 2500], ...hit(2, 40, 60), filter: { type: 'bandpass', freq: 3000, q: 0.8 }, gain: 0.5 },
      { wave: 'sine', freq: [170, 95], ...hit(2, 50, 65), gain: 0.3 },
    ],
    0.45,
    BATTLE_SFX_LIMITS.sword_hit,
  ),
  // A band-passed whoosh with a soft string twang.
  arrow_shot: battle(
    [
      { wave: 'noise', freq: [3200, 1200], attackMs: 14, decayMs: 150, sustain: 0, releaseMs: 30, durationMs: 200, filter: { type: 'bandpass', freq: 1800, q: 1.2 }, gain: 0.85 },
      { wave: 'triangle', freq: [190, 160], ...hit(2, 70, 90), filter: { type: 'lowpass', freq: 1200, q: 0.7 }, gain: 0.2 },
    ],
    0.35,
    BATTLE_SFX_LIMITS.arrow_shot,
  ),
  // A powder crack on a low thump, with a short muffled tail.
  musket_shot: battle(
    [
      { wave: 'noise', freq: [8000, 1500], ...hit(2, 90, 140), filter: { type: 'lowpass', freq: 5000, q: 0.7 }, gain: 0.75 },
      { wave: 'sine', freq: [130, 60], ...hit(2, 180, 240), gain: 0.5 },
      { wave: 'noise', freq: [900, 300], ...hit(10, 280, 360), gain: 0.3, delayMs: 20 },
    ],
    0.45,
    BATTLE_SFX_LIMITS.musket_shot,
  ),
  // The cannon: a deeper crack and a longer, rolling boom.
  cannon_shot: battle(
    [
      { wave: 'noise', freq: [4500, 400], ...hit(3, 480, 560), filter: { type: 'lowpass', freq: 4000, q: 0.7 }, gain: 0.7 },
      { wave: 'sine', freq: [90, SFX_SUB_FLOOR_HZ], ...hit(3, 620, 720), gain: 0.5 },
      { wave: 'noise', freq: [350, 150], ...hit(30, 700, 900), filter: SUB_CUT, gain: 0.45, delayMs: 60 },
    ],
    0.6,
    BATTLE_SFX_LIMITS.cannon_shot,
  ),
  // A cannonball landing: a blast with scattering debris.
  cannon_impact: battle(
    [
      { wave: 'noise', freq: [3200, 250], ...hit(3, 600, 700), filter: { type: 'lowpass', freq: 3500, q: 0.7 }, gain: 0.75 },
      { wave: 'sine', freq: [100, SFX_SUB_FLOOR_HZ], ...hit(3, 520, 620), gain: 0.45 },
      { wave: 'noise', freq: [2600, 1000], ...hit(4, 260, 330), filter: { type: 'bandpass', freq: 1500, q: 1 }, gain: 0.3, delayMs: 50 },
    ],
    0.6,
    BATTLE_SFX_LIMITS.cannon_impact,
  ),
};
