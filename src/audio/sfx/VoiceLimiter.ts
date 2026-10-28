import type { SfxKey } from './catalogue';

interface Voice {
  readonly id: number;
  readonly key: SfxKey;
  readonly gain: number;
  readonly startedAt: number;
}

/** Per-key playback rule (SfxSpec's caps). */
export interface VoiceRule {
  readonly maxVoices: number;
  readonly minIntervalMs: number;
}

/**
 * Decides which requested sounds get a voice, so a 200-unit battle stays
 * within the caps (Review Focus 3):
 * - a repeat of a key inside its `minIntervalMs` is dropped;
 * - at the key's cap, a louder request steals that key's oldest voice,
 *   otherwise it is dropped;
 * - at the global cap, a request no louder than every active voice is
 *   dropped; a louder one replaces the quietest voice.
 * A stolen voice is reported through `onEvict` so the player can stop it.
 */
export class VoiceLimiter {
  private readonly voices: Voice[] = [];
  private readonly lastStart = new Map<SfxKey, number>();
  private nextId = 1;

  constructor(
    private readonly globalMax: number,
    private readonly onEvict: (voiceId: number) => void = () => {},
  ) {}

  /** A voice id for the sound, or null when it is dropped. */
  request(key: SfxKey, gain: number, nowMs: number, rule: VoiceRule): number | null {
    const last = this.lastStart.get(key);
    if (last !== undefined && nowMs - last < rule.minIntervalMs) return null;
    const own = this.voices.filter((v) => v.key === key);
    if (own.length >= rule.maxVoices) {
      const oldest = own.reduce((a, b) => (b.startedAt < a.startedAt ? b : a), own[0]!);
      if (!(gain > oldest.gain)) return null;
      this.evict(oldest);
    } else if (this.voices.length >= this.globalMax) {
      const quietest = this.voices.reduce((a, b) => (b.gain < a.gain ? b : a), this.voices[0]!);
      if (!(gain > quietest.gain)) return null;
      this.evict(quietest);
    }
    const id = this.nextId++;
    this.voices.push({ id, key, gain, startedAt: nowMs });
    this.lastStart.set(key, nowMs);
    return id;
  }

  /** The voice finished (or was stopped); unknown ids are ignored. */
  release(voiceId: number): void {
    const i = this.voices.findIndex((v) => v.id === voiceId);
    if (i >= 0) this.voices.splice(i, 1);
  }

  get active(): number {
    return this.voices.length;
  }

  private evict(voice: Voice): void {
    this.release(voice.id);
    this.onEvict(voice.id);
  }
}
