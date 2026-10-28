import { MUSIC_BUS_LEVEL, MUSIC_FAST_IN_MS, MUSIC_REVERB, MUSIC_SEED, MUSIC_STINGER_IN_MS } from '../../config/audio';
import type { AgeId } from '../../types';
import { composePiece, type MusicKey, type MusicTrack } from './composer';
import { MusicDirector, type DirectorInput } from './MusicDirector';
import { Sequencer, VoicePool } from './Sequencer';

/** Where registered music buffers come from (the SFX bank: the OGG swap-in). */
export interface MusicBuffers {
  get(key: MusicKey): AudioBuffer | undefined;
}

export interface MusicStats {
  readonly track: MusicTrack | null;
  readonly age: AgeId | null;
  readonly scene: DirectorInput['scene'] | null;
  /** Music notes sounding now (both buses, a stolen note's 0.15 s fade included). */
  readonly voices: number;
  /** Notes in the shared voice budget (≤ MUSIC_MAX_VOICES). */
  readonly budget: number;
  readonly played: number;
  readonly stolen: number;
  /** Seed of the piece playing (game pieces mix in the match seed; the menu's is fixed). */
  readonly seed: number | null;
  /** Main-thread time of the music per update (director, composing, scheduling), in ms. */
  readonly schedMs: { readonly frames: number; readonly avg: number; readonly max: number };
}

interface Bus {
  readonly dry: GainNode;
  readonly wet: GainNode;
  seq: Sequencer | null;
  /** A registered buffer playing, with its own gain (so it can be cut without a click); `endsAt` null when looping. */
  source: { readonly node: AudioBufferSourceNode; readonly gain: GainNode; readonly endsAt: number | null } | null;
}

/** Tracks a registered buffer loops for (calm pieces and stingers play once). */
const LOOPING: ReadonlySet<MusicTrack> = new Set<MusicTrack>(['menu', 'combat']);

/**
 * How long the incoming piece takes to reach full level: fast after
 * silence (the outgoing piece already ended, or nothing played), so its
 * downbeat is heard, and fast for a stinger; otherwise the crossfade.
 */
export function incomingFadeMs(outgoingSilent: boolean, track: MusicTrack, fadeMs: number): number {
  if (track === 'victory' || track === 'defeat') return MUSIC_STINGER_IN_MS;
  return outgoingSilent ? Math.min(fadeMs, MUSIC_FAST_IN_MS) : fadeMs;
}

/** Steps of the equal-power crossfade (linear segments: cancellable, click-free). */
const FADE_STEPS = 16;
/** Notes start this long after a switch (scheduling headroom). */
const START_DELAY_S = 0.05;

/**
 * The music: two buses that crossfade (equal power) when the director
 * switches track (a fast fade-in after silence), each playing a composed
 * piece through a Sequencer, or a buffer registered under `music_<track>`
 * (looped for the menu and combat). A shared generated
 * reverb gives every instrument a room.
 */
export class MusicPlayer {
  private readonly buses: [Bus, Bus];
  private readonly reverbIn: GainNode;
  private reverb: ConvolverNode | null = null;
  private active: 0 | 1 = 0;
  private track: MusicTrack | null = null;
  private age: AgeId | null = null;
  private readonly director = new MusicDirector(MUSIC_SEED);
  /** One voice budget for both buses (a crossfade stays within the cap). */
  private readonly pool = new VoicePool();
  /** The match seed game pieces are composed from (with the director's per-switch seed). */
  private matchSeed = 0;
  private seed: number | null = null;
  /** Stopped sequencers whose last notes are still releasing. */
  private retiring: Sequencer[] = [];
  private scene: DirectorInput['scene'] | null = null;
  private playerAge: AgeId = 1;
  /** Fighting near the camera since the last update (latched: the game feeds it after the step that reads it). */
  private combat = false;
  private played = 0;
  private frames = 0;
  private totalMs = 0;
  private maxMs = 0;

  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly out: AudioNode,
    private readonly buffers: MusicBuffers,
  ) {
    this.reverbIn = ctx.createGain();
    const bus = (): Bus => {
      const dry = ctx.createGain();
      const wet = ctx.createGain();
      dry.gain.value = 0;
      wet.gain.value = 0;
      dry.connect(out);
      wet.connect(this.reverbIn);
      return { dry, wet, seq: null, source: null };
    };
    this.buses = [bus(), bus()];
    // Built at boot (≈ 10 ms, mostly the convolver's own set-up), not on the frame of the first gesture.
    this.ensureReverb();
  }

  /** Where the player is; a match passes its seed, so each match has its own pieces. */
  setScene(scene: DirectorInput['scene'], matchSeed?: number): void {
    this.scene = scene;
    if (matchSeed !== undefined) this.matchSeed = matchSeed >>> 0;
  }

  /** Per game frame: the human's age, and whether fighting is near the camera. */
  feed(age: AgeId, combatNear: boolean): void {
    this.playerAge = age;
    if (combatNear) this.combat = true;
  }

  /** Crossfades to `track` (the director calls this; the dev console may too). */
  play(track: MusicTrack, fadeMs: number, age: AgeId = this.playerAge, seed: number = MUSIC_SEED): void {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const fade = Math.max(0.01, fadeMs / 1000);
    const old = this.buses[this.active];
    const nextIndex: 0 | 1 = this.active === 0 ? 1 : 0;
    const next = this.buses[nextIndex];
    const fadeIn = incomingFadeMs(this.silent(old, now), track, fadeMs) / 1000;
    // A bus still fading out from an earlier switch lets its notes go (fast release) before it is reused.
    this.silence(next, now);
    this.fadeTo(old, 0, now, fade);
    old.seq?.stop(now + fade);
    stopSource(old.source, now + fade);
    const buffer = this.buffers.get(`music_${track}`);
    const at = now + START_DELAY_S;
    if (buffer) {
      const node = ctx.createBufferSource();
      node.buffer = buffer;
      node.loop = LOOPING.has(track);
      const gain = ctx.createGain();
      node.connect(gain).connect(next.dry);
      node.onended = () => {
        node.disconnect();
        gain.disconnect();
      };
      node.start(at);
      next.source = { node, gain, endsAt: node.loop ? null : at + buffer.duration };
    } else {
      const seq = new Sequencer(ctx, next.dry, next.wet, this.pool);
      seq.play(composePiece(track, age, seed), at);
      next.seq = seq;
    }
    this.fadeTo(next, MUSIC_BUS_LEVEL, now, Math.max(0.01, fadeIn));
    this.active = nextIndex;
    this.track = track;
    this.age = track === 'menu' ? null : age;
    this.seed = seed;
  }

  /** Per real frame (after the audio unlock): the director's choice, then the lookahead scheduling. */
  update(nowMs: number): void {
    const t0 = performance.now();
    if (this.scene !== null) {
      const bus = this.buses[this.active];
      const end = bus.seq ? bus.seq.endTime() : (bus.source?.endsAt ?? null);
      const cmd = this.director.update(nowMs, {
        scene: this.scene,
        age: this.playerAge,
        combatNear: this.combat,
        pieceEndsAtMs: end === null ? null : nowMs + (end - this.ctx.currentTime) * 1000,
      });
      // The menu theme is the same every visit; game pieces differ per match.
      if (cmd) this.play(cmd.track, cmd.crossfadeMs, cmd.age, cmd.track === 'menu' ? MUSIC_SEED : (Math.imul(cmd.seed ^ this.matchSeed, 0x9e3779b1) ^ this.matchSeed) >>> 0);
    }
    this.combat = false;
    for (const bus of this.buses) {
      bus.seq?.update();
      if (bus !== this.buses[this.active] && bus.seq?.finished()) this.retire(bus);
    }
    if (this.retiring.length > 0) {
      this.retiring = this.retiring.filter((seq) => {
        if (!seq.finished()) return true;
        this.dispose(seq);
        return false;
      });
    }
    const ms = performance.now() - t0;
    this.frames++;
    this.totalMs += ms;
    this.maxMs = Math.max(this.maxMs, ms);
  }

  stats(): MusicStats {
    let voices = 0;
    let played = this.played;
    for (const seq of [...this.buses.map((b) => b.seq), ...this.retiring]) {
      voices += seq?.sounding ?? 0;
      played += seq?.played ?? 0;
    }
    return {
      track: this.track,
      age: this.age,
      scene: this.scene,
      voices,
      budget: this.pool.size,
      played,
      stolen: this.pool.stolen,
      seed: this.seed,
      schedMs: { frames: this.frames, avg: this.frames ? this.totalMs / this.frames : 0, max: this.maxMs },
    };
  }

  /** Starts a fresh timing window for `stats().schedMs` (dev measurements). */
  resetTiming(): void {
    this.frames = 0;
    this.totalMs = 0;
    this.maxMs = 0;
  }

  /** Equal-power ramp of a bus (dry and reverb send) from its current level to `to`. */
  private fadeTo(bus: Bus, to: number, now: number, seconds: number): void {
    for (const node of [bus.dry, bus.wet]) {
      const g = node.gain;
      const from = g.value;
      g.cancelScheduledValues(now);
      g.setValueAtTime(from, now);
      for (let i = 1; i <= FADE_STEPS; i++) {
        const p = i / FADE_STEPS;
        const v = to > from ? from + (to - from) * Math.sin((p * Math.PI) / 2) : to + (from - to) * Math.cos((p * Math.PI) / 2);
        g.linearRampToValueAtTime(v, now + p * seconds);
      }
    }
  }

  /** Releases what a bus plays now (fast fades); its sequencer is disposed once its notes have stopped. */
  private silence(bus: Bus, now: number): void {
    stopSource(bus.source, now);
    bus.source = null;
    if (!bus.seq) return;
    bus.seq.stop(now);
    this.retiring.push(bus.seq);
    bus.seq = null;
  }

  /** A bus whose piece has faded out and stopped sounding. */
  private retire(bus: Bus): void {
    if (bus.seq) this.dispose(bus.seq);
    bus.seq = null;
    bus.source = null;
  }

  private dispose(seq: Sequencer): void {
    this.played += seq.played;
    seq.dispose();
  }

  /** Nothing audible on the bus now: nothing played, or its piece has ended. */
  private silent(bus: Bus, now: number): boolean {
    if (bus.source) return bus.source.endsAt !== null && now >= bus.source.endsAt;
    if (!bus.seq) return true;
    const end = bus.seq.endTime();
    return bus.seq.finished() || (end !== null && now >= end);
  }

  /** A generated room (decaying, darkening stereo noise). */
  private ensureReverb(): void {
    if (this.reverb) return;
    const ctx = this.ctx;
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * MUSIC_REVERB.seconds);
    const ir = ctx.createBuffer(2, len, rate);
    let seed = 0x2468ace;
    const pre = Math.floor(rate * 0.012);
    for (let ch = 0; ch < 2; ch++) {
      const data = ir.getChannelData(ch);
      let lp = 0;
      let energy = 0;
      for (let block = pre; block < len; block += 256) {
        const p0 = block / len;
        // The tail darkens as it decays (a one-pole low-pass closing towards MUSIC_REVERB.dampHz).
        const k = Math.min(1, (2 * Math.PI * MUSIC_REVERB.dampHz * (1 - 0.8 * p0)) / rate);
        const end = Math.min(len, block + 256);
        // The decay envelope, exact at block edges and linear in between.
        const e0 = (1 - p0) ** MUSIC_REVERB.decay;
        const de = ((1 - end / len) ** MUSIC_REVERB.decay - e0) / (end - block);
        for (let i = block; i < end; i++) {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          lp += k * (seed / 2147483648 - 1 - lp);
          const x = lp * (e0 + de * (i - block));
          data[i] = x;
          energy += x * x;
        }
      }
      // Unit energy per channel: the return level is MUSIC_REVERB.wet (the built-in normalization is far quieter).
      const scale = energy > 0 ? 1 / Math.sqrt(energy) : 0;
      for (let i = pre; i < len; i++) data[i] = (data[i] as number) * scale;
    }
    const conv = ctx.createConvolver();
    conv.normalize = false;
    conv.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = MUSIC_REVERB.wet;
    this.reverbIn.connect(conv).connect(wet).connect(this.out);
    this.reverb = conv;
  }
}

/** Fades a registered buffer out from `at` (50 ms) and stops it. */
function stopSource(source: Bus['source'], at: number): void {
  if (!source) return;
  const g = source.gain.gain;
  g.cancelScheduledValues(at);
  g.setValueAtTime(g.value, at);
  g.linearRampToValueAtTime(0, at + 0.05);
  try {
    source.node.stop(at + 0.06);
  } catch {
    // Already stopped.
  }
}
