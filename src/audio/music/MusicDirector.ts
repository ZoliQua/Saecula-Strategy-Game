import {
  MUSIC_COMBAT_HOLD_MS,
  MUSIC_CROSSFADE_MS,
  MUSIC_INTENSITY,
  MUSIC_INTENSITY_FALL_MS,
  MUSIC_INTENSITY_RISE_MS,
  MUSIC_STINGER_FADE_MS,
} from '../../config/audio';
import type { AgeId } from '../../types';
import type { MusicTrack } from './composer';

/** What the director knows each frame. */
export interface DirectorInput {
  readonly scene: 'menu' | 'game' | 'victory' | 'defeat';
  /** The human's age. */
  readonly age: AgeId;
  /** Fighting near the camera this frame. */
  readonly combatNear: boolean;
  /** When the playing piece ends (same clock as `nowMs`), or null (looping / none). */
  readonly pieceEndsAtMs: number | null;
  /** The human's units in motion this frame (0 when unknown). */
  readonly movingUnits?: number;
}

/** The intensity the music heads for: the age's base, the human's units in motion, and a battle; 0..1. */
export function intensityTarget(age: AgeId, movingUnits: number, battle: boolean): number {
  const moving = Math.min(1, Math.max(0, movingUnits) / MUSIC_INTENSITY.movingFull);
  const t = MUSIC_INTENSITY.ageBase[age] + MUSIC_INTENSITY.movingWeight * moving + (battle ? MUSIC_INTENSITY.battle : 0);
  return Math.min(1, Math.max(0, t));
}

/** One smoothing step towards `target` over `dtMs` (faster up than down). */
export function smoothIntensity(current: number, target: number, dtMs: number): number {
  if (!(dtMs > 0)) return current;
  const tau = target > current ? MUSIC_INTENSITY_RISE_MS : MUSIC_INTENSITY_FALL_MS;
  return target + (current - target) * Math.exp(-dtMs / tau);
}

export interface MusicCommand {
  readonly track: MusicTrack;
  readonly age: AgeId;
  readonly crossfadeMs: number;
  /** Seed of the piece to compose (a new one per switch). */
  readonly seed: number;
}

/**
 * Chooses the music (pure; no audio): the menu track in the menu, calm_a
 * at a game start, the other calm piece whenever one ends, combat while
 * fighting is near the camera (until MUSIC_COMBAT_HOLD_MS after the last
 * fight), and a victory / defeat stinger once at the end. The age is read
 * at each switch, so an age-up is heard from the next piece on.
 */
export class MusicDirector {
  private track: MusicTrack | null = null;
  private lastCalm: 'calm_a' | 'calm_b' | null = null;
  private lastCombatMs = Number.NEGATIVE_INFINITY;
  private switches = 0;
  private level = 0;
  private lastMs: number | null = null;

  constructor(private readonly seed: number) {}

  /**
   * The music's intensity, 0..1, smoothed: it drives the layers, the
   * percussion level and the tempo lift (Decision 12). 0 in the menu; it
   * decays after a victory or defeat.
   */
  get intensity(): number {
    return this.level;
  }

  /** The current track (null before the first command). */
  get current(): MusicTrack | null {
    return this.track;
  }

  /** A command when the music should change, otherwise null. */
  update(nowMs: number, input: DirectorInput): MusicCommand | null {
    const cmd = this.choose(nowMs, input);
    this.follow(nowMs, input);
    return cmd;
  }

  /** The intensity follows the game; a match starts from its target (no swell at the first piece). */
  private follow(nowMs: number, input: DirectorInput): void {
    const dt = this.lastMs === null ? 0 : nowMs - this.lastMs;
    this.lastMs = nowMs;
    if (input.scene === 'menu') {
      this.level = 0;
      this.lastMs = null;
      return;
    }
    if (input.scene !== 'game') {
      // After a victory or defeat the intensity settles (no jump to 0 under the stinger).
      this.level = smoothIntensity(this.level, 0, dt);
      return;
    }
    const target = intensityTarget(input.age, input.movingUnits ?? 0, this.track === 'combat');
    this.level = dt === 0 && this.level === 0 ? target : smoothIntensity(this.level, target, dt);
  }

  private choose(nowMs: number, input: DirectorInput): MusicCommand | null {
    const { scene } = input;
    if (scene === 'menu') return this.track === 'menu' ? null : this.to('menu', input.age, MUSIC_CROSSFADE_MS);
    if (scene === 'victory' || scene === 'defeat') {
      // Once at the end; nothing follows until the menu.
      if (this.track === 'victory' || this.track === 'defeat') return null;
      return this.to(scene, input.age, MUSIC_STINGER_FADE_MS);
    }
    if (this.track === 'victory' || this.track === 'defeat') return null;
    if (input.combatNear) this.lastCombatMs = nowMs;
    if (this.track !== 'calm_a' && this.track !== 'calm_b' && this.track !== 'combat') {
      this.lastCalm = null;
      if (!input.combatNear) return this.calm(input.age, 'calm_a');
    }
    if (input.combatNear) return this.track === 'combat' ? null : this.to('combat', input.age, MUSIC_CROSSFADE_MS);
    if (this.track === 'combat') return nowMs - this.lastCombatMs >= MUSIC_COMBAT_HOLD_MS ? this.calm(input.age) : null;
    if (input.pieceEndsAtMs !== null && nowMs >= input.pieceEndsAtMs) return this.calm(input.age);
    return null;
  }

  /** The next calm piece: `track`, or the one after the last calm played. */
  private calm(age: AgeId, track?: 'calm_a' | 'calm_b'): MusicCommand {
    const next = track ?? (this.lastCalm === 'calm_a' ? 'calm_b' : 'calm_a');
    this.lastCalm = next;
    return this.to(next, age, MUSIC_CROSSFADE_MS);
  }

  private to(track: MusicTrack, age: AgeId, crossfadeMs: number): MusicCommand {
    this.track = track;
    this.switches++;
    return { track, age, crossfadeMs, seed: (Math.imul(this.seed ^ 0x5bd1e995, 0x9e3779b1) + Math.imul(this.switches, 0x85ebca6b)) >>> 0 };
  }
}
