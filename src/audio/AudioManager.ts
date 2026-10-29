import type Phaser from 'phaser';
import type { StoreApi } from 'zustand/vanilla';
import {
  GAIN_SMOOTHING_S,
  MASTER_BUS_TRIM,
  MASTER_LIMITER,
  MUSIC_DUCK_FACTOR,
  SFX_GAIN_VARIATION,
  SFX_GLOBAL_VOICES,
  SFX_PITCH_VARIATION,
  SFX_RENDER_BUDGET_MS,
  STEAL_FADE_S,
  UI_CUE_CLICK_SUPPRESS_MS,
} from '../config/audio';
import { gameEvents } from '../game/events';
import type { TileCoord } from '../iso/coordinates';
import type { AgeId } from '../types';
import { settingsStore, VOLUME_CHANNELS, type Settings, type SettingsStore, type VolumeChannel } from '../ui/settings';
import { channelGain, positionalGain, stereoPan, tileDistance } from './mix';
import type { MusicTrack } from './music/composer';
import type { DirectorInput } from './music/MusicDirector';
import { MusicPlayer, type MusicStats } from './music/MusicPlayer';
import { NO_AUDIO, phaserHost } from './phaserHost';
import { SFX_CATALOGUE, type SfxKey, type SoundKey } from './sfx/catalogue';
import { SfxBank } from './sfx/SfxBank';
import { VoiceLimiter } from './sfx/VoiceLimiter';

/** Where the manager gets its AudioContext and learns about the gesture unlock (Phaser's WebAudioSoundManager). */
export interface AudioHost {
  readonly context: BaseAudioContext | null;
  locked(): boolean;
  onUnlocked(cb: () => void): void;
}

/** Anything that can play a sound effect (the manager; a recorder in tests). */
export interface AudioSink {
  playSFX(key: SfxKey, volume?: number, position?: TileCoord): void;
}

export interface AudioStats {
  /** The context state ('suspended', 'running', 'closed'), or 'none' without WebAudio. */
  readonly state: string;
  readonly unlocked: boolean;
  readonly active: number;
  readonly played: Readonly<Partial<Record<SfxKey, number>>>;
  readonly dropped: Readonly<Partial<Record<SfxKey, number>>>;
  readonly bankBytes: number;
  readonly bankReady: number;
  /**
   * Current linear gain per channel (settings, mute, duck). `master` is the
   * master slider's own value; it is folded into the other three channels'
   * nodes (channelGain), while the master bus node runs at MASTER_BUS_TRIM.
   */
  readonly gains: Readonly<Record<VolumeChannel, number>>;
  readonly ducked: boolean;
  /** The music (null without WebAudio). */
  readonly music: MusicStats | null;
}

export interface AudioManagerOptions {
  readonly settings?: StoreApi<SettingsStore>;
  /** Real-time clock in ms (voice throttles). */
  readonly now?: () => number;
}

interface Graph {
  readonly ctx: BaseAudioContext;
  readonly channels: Readonly<Record<VolumeChannel, GainNode>>;
  readonly bank: SfxBank;
  readonly limiter: VoiceLimiter;
  readonly music: MusicPlayer;
}

interface Playing {
  readonly source: AudioBufferSourceNode;
  readonly amp: GainNode;
  readonly panner: StereoPannerNode | null;
  readonly endsAt: number;
}

/** UI cues that already answer a click: the generic click tick is skipped right after one. */
const UI_CUES: ReadonlySet<SfxKey> = new Set<SfxKey>(['ui_error', 'ui_panel_open']);

/**
 * The game's audio (PROGRAM_TERV §12.4) on Phaser's AudioContext
 * (Decision 7): master → music / sfx / notifications gains, a soft
 * limiter, capped and positional SFX. Without WebAudio every call is a
 * silent no-op; before the gesture unlock (or while the context is
 * suspended) sounds are dropped, never queued, so no burst follows the
 * first click. Gains follow the settings store.
 */
export class AudioManager implements AudioSink {
  private readonly graph: Graph | null;
  private readonly settings: StoreApi<SettingsStore>;
  private readonly now: () => number;
  private readonly unsubscribe: () => void;
  private readonly playing = new Map<number, Playing>();
  private readonly played: Partial<Record<SfxKey, number>> = {};
  private readonly dropped: Partial<Record<SfxKey, number>> = {};
  private gains: Record<VolumeChannel, number> = { master: 0, music: 0, sfx: 0, notifications: 0 };
  private listener: { center: TileCoord; audible: (tx: number, ty: number) => boolean } | null = null;
  private unlocked = false;
  private ducked = false;
  /** Cheap per-play variation (an LCG; renders stay deterministic). */
  private jitter = 0x2545f491;
  /** When a UI cue (error, panel) last played: a click right after it stays silent (no double sound). */
  private lastUiCueAt = Number.NEGATIVE_INFINITY;
  private readonly disposers: Array<() => void> = [];

  constructor(
    private readonly host: AudioHost,
    options: AudioManagerOptions = {},
  ) {
    this.settings = options.settings ?? settingsStore;
    this.now = options.now ?? (() => performance.now());
    const ctx = host.context;
    this.graph = ctx ? this.buildGraph(ctx) : null;
    this.applyGains(this.settings.getState());
    this.unsubscribe = this.settings.subscribe((s) => this.applyGains(s));
    if (this.graph) host.onUnlocked(() => (this.unlocked = true));
  }

  playSFX(key: SfxKey, volume = 1, position?: TileCoord): void {
    const g = this.graph;
    if (!g || !this.ready()) return;
    const spec = SFX_CATALOGUE[key];
    if (key === 'ui_click' && this.now() - this.lastUiCueAt < UI_CUE_CLICK_SUPPRESS_MS) return this.drop(key);
    // A cue answers the click even when it is itself dropped (its repeat interval).
    if (UI_CUES.has(key)) this.lastUiCueAt = this.now();
    let gain = spec.gain * volume;
    let pan = 0;
    if (position) {
      const l = this.listener;
      // No fog leak: a sound on a tile the player cannot see is not played.
      if (!l || !l.audible(Math.round(position.tx), Math.round(position.ty))) return;
      gain *= positionalGain(tileDistance(position, l.center));
      if (gain <= 0) return this.drop(key);
      pan = stereoPan(position, l.center);
    }
    const buffer = g.bank.get(key);
    if (!buffer || gain <= 0) return this.drop(key);
    const id = g.limiter.request(key, gain, this.now(), spec);
    if (id === null) return this.drop(key);
    const rate = 1 + this.vary(SFX_PITCH_VARIATION);
    const source = g.ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const amp = g.ctx.createGain();
    amp.gain.value = gain * (1 + this.vary(SFX_GAIN_VARIATION));
    source.connect(amp);
    let panner: StereoPannerNode | null = null;
    if (pan !== 0 && typeof g.ctx.createStereoPanner === 'function') {
      panner = g.ctx.createStereoPanner();
      panner.pan.value = pan;
      amp.connect(panner).connect(g.channels[spec.channel]);
    } else {
      amp.connect(g.channels[spec.channel]);
    }
    const voice: Playing = { source, amp, panner, endsAt: g.ctx.currentTime + buffer.duration / rate + 0.05 };
    source.onended = () => this.finish(id);
    source.start();
    this.playing.set(id, voice);
    this.played[key] = (this.played[key] ?? 0) + 1;
  }

  setMasterVolume(v: number): void {
    this.setVolume('master', v);
  }

  setMusicVolume(v: number): void {
    this.setVolume('music', v);
  }

  setSFXVolume(v: number): void {
    this.setVolume('sfx', v);
  }

  setNotificationVolume(v: number): void {
    this.setVolume('notifications', v);
  }

  muteAll(): void {
    this.settings.getState().setMuted(true);
  }

  unmuteAll(): void {
    this.settings.getState().setMuted(false);
  }

  /** The camera-centre tile, and which tiles the player can hear (currently sees). */
  setListener(center: TileCoord, audible: (tx: number, ty: number) => boolean): void {
    this.listener = { center, audible };
  }

  /** No listener (the match ended): positional sounds are dropped and the old fog is released. */
  clearListener(): void {
    this.listener = null;
  }

  /**
   * Crossfades the music to `track` (at `age`, composed from `seed`). A
   * buffer registered under `music_<track>` plays instead (looped for the
   * menu and combat, once otherwise). The director calls this; dropped before the unlock.
   */
  playMusic(track: MusicTrack, fadeInMs: number, age?: AgeId, seed?: number): void {
    if (this.ready()) this.graph?.music.play(track, fadeInMs, age, seed);
  }

  /** Where the player is (the music director picks the track from it); a match passes its seed. */
  setMusicScene(scene: DirectorInput['scene'], matchSeed?: number): void {
    this.graph?.music.setScene(scene, matchSeed);
  }

  /** Per game frame: the human's age, whether fighting is near the camera, and the human's units in motion (the music's intensity). */
  feedMusic(age: AgeId, combatNear: boolean, movingUnits = 0): void {
    this.graph?.music.feed(age, combatNear, movingUnits);
  }

  /** Puts a decoded buffer under a key (a CC0 OGG replacing a generated sound or music track). */
  registerSound(key: SoundKey, buffer: AudioBuffer): void {
    this.graph?.bank.register(key, buffer);
  }

  /** Music at ×MUSIC_DUCK_FACTOR (the pause menu). */
  setDucked(on: boolean): void {
    if (this.ducked === on) return;
    this.ducked = on;
    this.applyGains(this.settings.getState());
  }

  /** Per real frame: renders the bank (after unlock), runs the music and frees voices whose sound has ended. */
  update(realDeltaMs: number): void {
    void realDeltaMs;
    const g = this.graph;
    if (!g || !this.ready()) return;
    g.bank.update(SFX_RENDER_BUDGET_MS);
    g.music.update(this.now());
    const t = g.ctx.currentTime;
    for (const [id, p] of this.playing) if (t >= p.endsAt) this.finish(id);
  }

  stats(): AudioStats {
    const g = this.graph;
    return {
      state: g ? g.ctx.state : 'none',
      unlocked: this.unlocked,
      active: g ? g.limiter.active : 0,
      played: { ...this.played },
      dropped: { ...this.dropped },
      bankBytes: g ? g.bank.bytes : 0,
      bankReady: g ? g.bank.size : 0,
      gains: { ...this.gains },
      ducked: this.ducked,
      music: g ? g.music.stats() : null,
    };
  }

  /** Whether a live WebAudio context backs this manager (a closed one, e.g. after a dev HMR, does not count). */
  hasContext(): boolean {
    return this.graph !== null && this.graph.ctx.state !== 'closed';
  }

  /** Runs `dispose` when the manager is destroyed (the game hooks initAudio adds). */
  addDisposer(dispose: () => void): void {
    this.disposers.push(dispose);
  }

  /** Stops following the settings store and the game (the manager is replaced). */
  destroy(): void {
    this.unsubscribe();
    for (const dispose of this.disposers.splice(0)) dispose();
  }

  private ready(): boolean {
    return this.unlocked && !this.host.locked() && this.graph?.ctx.state === 'running';
  }

  private buildGraph(ctx: BaseAudioContext): Graph {
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = MASTER_LIMITER.thresholdDb;
    limiter.knee.value = MASTER_LIMITER.kneeDb;
    limiter.ratio.value = MASTER_LIMITER.ratio;
    limiter.attack.value = MASTER_LIMITER.attackS;
    limiter.release.value = MASTER_LIMITER.releaseS;
    limiter.connect(ctx.destination);
    // The master slider is folded into each channel's gain (channelGain); this bus is a fixed trim.
    const bus = ctx.createGain();
    bus.gain.value = MASTER_BUS_TRIM;
    bus.connect(limiter);
    const channel = (): GainNode => {
      const node = ctx.createGain();
      node.gain.value = 0;
      node.connect(bus);
      return node;
    };
    const channels = { master: bus, music: channel(), sfx: channel(), notifications: channel() };
    const bank = new SfxBank(ctx);
    return {
      ctx,
      channels,
      bank,
      limiter: new VoiceLimiter(SFX_GLOBAL_VOICES, (id) => this.stop(id)),
      music: new MusicPlayer(ctx, channels.music, bank),
    };
  }

  private applyGains(s: Settings): void {
    const next = {} as Record<VolumeChannel, number>;
    for (const ch of VOLUME_CHANNELS) next[ch] = channelGain(s, ch) * (ch === 'music' && this.ducked ? MUSIC_DUCK_FACTOR : 1);
    this.gains = next;
    const g = this.graph;
    if (!g) return;
    for (const ch of VOLUME_CHANNELS) {
      if (ch === 'master') continue;
      g.channels[ch].gain.setTargetAtTime(next[ch], g.ctx.currentTime, GAIN_SMOOTHING_S);
    }
  }

  private setVolume(ch: VolumeChannel, v: number): void {
    if (Number.isFinite(v)) this.settings.getState().setVolume(ch, v * 100);
  }

  private drop(key: SfxKey): void {
    this.dropped[key] = (this.dropped[key] ?? 0) + 1;
  }

  /** ±share, uniform. */
  private vary(share: number): number {
    this.jitter = (Math.imul(this.jitter, 1664525) + 1013904223) >>> 0;
    return (this.jitter / 4294967296 - 0.5) * 2 * share;
  }

  /** The voice ended: free it and unwire its nodes. */
  private finish(id: number): void {
    const p = this.playing.get(id);
    if (!p) return;
    this.playing.delete(id);
    this.graph?.limiter.release(id);
    disconnect(p);
  }

  /** A voice the limiter stole: a linear fade to silence, then stop and unwire (no click). */
  private stop(id: number): void {
    const p = this.playing.get(id);
    this.playing.delete(id);
    const ctx = this.graph?.ctx;
    if (!p || !ctx) return;
    p.source.onended = () => disconnect(p);
    const t = ctx.currentTime;
    const gain = p.amp.gain;
    gain.cancelScheduledValues(t);
    gain.setValueAtTime(gain.value, t);
    gain.linearRampToValueAtTime(0, t + STEAL_FADE_S);
    try {
      p.source.stop(t + STEAL_FADE_S + 0.005);
    } catch {
      // Already stopped.
      disconnect(p);
    }
  }
}

function disconnect(p: Playing): void {
  p.source.onended = null;
  p.source.disconnect();
  p.amp.disconnect();
  p.panner?.disconnect();
}

/** Pinned on globalThis like the stores, so Vite HMR re-evaluations share one manager. */
const AUDIO_KEY = '__saecula_audio__';
interface AudioHolder {
  [AUDIO_KEY]?: AudioManager;
}
const holder = globalThis as unknown as AudioHolder;

/** The game's audio manager; a silent one until `initAudio` ran. */
export function audio(): AudioManager {
  return (holder[AUDIO_KEY] ??= new AudioManager(NO_AUDIO));
}

/**
 * Creates the game's audio manager on Phaser's AudioContext (once): it
 * renders and frees voices every game step, and ducks the music while the
 * pause menu is open.
 */
export function initAudio(game: Phaser.Game): AudioManager {
  const existing = holder[AUDIO_KEY];
  if (existing?.hasContext()) return existing;
  existing?.destroy();
  const manager = new AudioManager(phaserHost(game.sound));
  holder[AUDIO_KEY] = manager;
  const step = (_time: number, delta: number): void => manager.update(delta);
  game.events.on('step', step);
  manager.addDisposer(() => game.events.off('step', step));
  manager.addDisposer(gameEvents.on('pauseChanged', ({ paused }) => manager.setDucked(paused)));
  return manager;
}
