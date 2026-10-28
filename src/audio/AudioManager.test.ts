import { describe, expect, it } from 'vitest';
import { createSettingsStore } from '../ui/settings';
import { AudioManager, type AudioHost } from './AudioManager';
import { channelGain } from './mix';
import { SFX_CATALOGUE, SFX_KEYS } from './sfx/catalogue';

interface FakeParam {
  value: number;
  /** The last scheduled ramp: [target, time]. */
  ramp: [number, number] | null;
  setTargetAtTime(v: number): void;
  cancelScheduledValues(): void;
  setValueAtTime(v: number): void;
  linearRampToValueAtTime(v: number, t: number): void;
}
const param = (value: number): FakeParam => ({
  value,
  ramp: null,
  setTargetAtTime(v: number) {
    this.value = v;
  },
  cancelScheduledValues() {},
  setValueAtTime(v: number) {
    this.value = v;
  },
  linearRampToValueAtTime(v: number, t: number) {
    this.ramp = [v, t];
  },
});
let disconnects = 0;
const node = <T extends object>(extra: T) =>
  Object.assign(extra, {
    connect: <N>(n: N) => n,
    disconnect: () => {
      disconnects++;
    },
  });

/** A context that records every node it creates; enough of BaseAudioContext for the manager. */
function fakeContext() {
  const sources: { started: number; stoppedAt: number | null; buffer: unknown; onended: (() => void) | null }[] = [];
  const gains: FakeParam[] = [];
  const oscillators = { count: 0 };
  const ctx = {
    state: 'suspended' as AudioContextState,
    sampleRate: 8000,
    currentTime: 0,
    destination: node({}),
    createGain: () => {
      const g = param(1);
      gains.push(g);
      return node({ gain: g });
    },
    createDynamicsCompressor: () =>
      node({ threshold: param(0), knee: param(0), ratio: param(1), attack: param(0), release: param(0) }),
    createStereoPanner: () => node({ pan: param(0) }),
    createBuffer: (channels: number, length: number, sampleRate: number) => {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      return {
        numberOfChannels: channels,
        length,
        sampleRate,
        duration: length / sampleRate,
        copyToChannel: () => {},
        getChannelData: (ch: number) => data[ch],
      };
    },
    createConvolver: () => node({ normalize: true, buffer: null as unknown }),
    createBiquadFilter: () => node({ type: 'lowpass', frequency: param(350), Q: param(1) }),
    createOscillator: () => {
      oscillators.count++;
      return node({ type: 'sine', frequency: param(440), detune: param(0), onended: null, start() {}, stop() {} });
    },
    createBufferSource: () => {
      const s = {
        started: 0,
        stoppedAt: null as number | null,
        buffer: null as unknown,
        onended: null as (() => void) | null,
        playbackRate: param(1),
        loop: false,
        start() {
          s.started++;
        },
        stop(at: number) {
          s.stoppedAt = at;
        },
      };
      sources.push(s);
      return node(s);
    },
  };
  return { ctx, sources, gains, oscillators };
}

function fakeHost(locked: boolean) {
  const fake = fakeContext();
  if (!locked) fake.ctx.state = 'running';
  const callbacks: (() => void)[] = [];
  let isLocked = locked;
  const host: AudioHost = {
    context: fake.ctx as unknown as BaseAudioContext,
    locked: () => isLocked,
    onUnlocked: (cb) => {
      if (!isLocked) cb();
      else callbacks.push(cb);
    },
  };
  const unlock = () => {
    isLocked = false;
    fake.ctx.state = 'running';
    for (const cb of callbacks.splice(0)) cb();
  };
  return { host, unlock, ...fake };
}

let clock = 0;
const now = () => clock;

function readyManager(h: ReturnType<typeof fakeHost>, store = createSettingsStore(null)): AudioManager {
  const m = new AudioManager(h.host, { settings: store, now });
  for (let i = 0; i < 500 && m.stats().bankReady < SFX_KEYS.length; i++) m.update(16);
  return m;
}

describe('AudioManager', () => {
  it('locked host: playSFX creates no source and nothing plays after unlock', () => {
    const h = fakeHost(true);
    const m = new AudioManager(h.host, { settings: createSettingsStore(null), now });
    for (let i = 0; i < 50; i++) {
      m.playSFX('ui_click');
      m.playSFX('sword_hit', 1, { tx: 1, ty: 1 });
      m.update(16);
    }
    expect(h.sources).toHaveLength(0);
    expect(m.stats().bankReady).toBe(0);
    h.unlock();
    for (let i = 0; i < 500 && m.stats().bankReady < SFX_KEYS.length; i++) m.update(16);
    expect(m.stats().bankReady).toBe(SFX_KEYS.length);
    // No burst of stored-up sounds.
    expect(h.sources).toHaveLength(0);
    expect(Object.keys(m.stats().played)).toHaveLength(0);
    clock += 1000;
    m.playSFX('ui_click');
    expect(h.sources).toHaveLength(1);
    expect(h.sources[0]!.started).toBe(1);
  });

  it('a suspended context (tab hidden) drops sounds instead of queueing them', () => {
    const h = fakeHost(false);
    const m = readyManager(h);
    h.ctx.state = 'suspended';
    m.playSFX('ui_click');
    expect(h.sources).toHaveLength(0);
  });

  it('null context: every method is a no-op without throwing', () => {
    const host: AudioHost = { context: null, locked: () => false, onUnlocked: (cb) => cb() };
    const m = new AudioManager(host, { settings: createSettingsStore(null), now });
    expect(() => {
      m.setListener({ tx: 0, ty: 0 }, () => true);
      m.playSFX('ui_click');
      m.playSFX('cannon_shot', 1, { tx: 0, ty: 0 });
      m.setMasterVolume(0.5);
      m.setMusicVolume(0.5);
      m.setSFXVolume(0.5);
      m.setNotificationVolume(0.5);
      m.muteAll();
      m.unmuteAll();
      m.setDucked(true);
      m.update(16);
      m.destroy();
    }).not.toThrow();
    expect(m.stats().state).toBe('none');
    expect(m.stats().active).toBe(0);
  });

  it('unlocked: playSFX at distance 12 creates no source', () => {
    const h = fakeHost(false);
    const m = readyManager(h);
    m.setListener({ tx: 20, ty: 20 }, () => true);
    m.playSFX('sword_hit', 1, { tx: 32, ty: 20 });
    expect(h.sources).toHaveLength(0);
    m.playSFX('sword_hit', 1, { tx: 23, ty: 20 });
    expect(h.sources).toHaveLength(1);
  });

  it('tile not audible → no source', () => {
    const h = fakeHost(false);
    const m = readyManager(h);
    m.setListener({ tx: 20, ty: 20 }, (tx, ty) => !(tx === 21 && ty === 20));
    m.playSFX('arrow_shot', 1, { tx: 21, ty: 20 });
    expect(h.sources).toHaveLength(0);
    m.playSFX('arrow_shot', 1, { tx: 20, ty: 21 });
    expect(h.sources).toHaveLength(1);
  });

  it('a positional sound with no listener yet is dropped', () => {
    const h = fakeHost(false);
    const m = readyManager(h);
    m.playSFX('unit_die', 1, { tx: 0, ty: 0 });
    expect(h.sources).toHaveLength(0);
  });

  it('settings change updates the channel gains', () => {
    const h = fakeHost(false);
    const store = createSettingsStore(null);
    const m = readyManager(h, store);
    store.getState().setVolume('sfx', 50);
    expect(m.stats().gains.sfx).toBeCloseTo(channelGain(store.getState(), 'sfx'));
    expect(h.gains.some((g) => Math.abs(g.value - channelGain(store.getState(), 'sfx')) < 1e-9)).toBe(true);
    m.setNotificationVolume(0.25);
    expect(store.getState().volume.notifications).toBe(25);
    m.muteAll();
    expect(m.stats().gains).toEqual({ master: 0, music: 0, sfx: 0, notifications: 0 });
    m.unmuteAll();
    expect(m.stats().gains.master).toBeGreaterThan(0);
    m.setDucked(true);
    expect(m.stats().gains.music).toBeCloseTo(channelGain(store.getState(), 'music') * 0.5);
    m.destroy();
    store.getState().setVolume('sfx', 10);
    expect(m.stats().gains.sfx).toBeCloseTo(0.25 * 0.64);
  });

  it('counts played and dropped sounds per key, and frees voices when they end', () => {
    const h = fakeHost(false);
    const m = readyManager(h);
    m.setListener({ tx: 0, ty: 0 }, () => true);
    for (let i = 0; i < 100; i++) m.playSFX('sword_hit', 1, { tx: 0, ty: 0 });
    const s = m.stats();
    expect(s.played.sword_hit).toBeGreaterThan(0);
    expect(s.dropped.sword_hit).toBeGreaterThan(0);
    expect(s.active).toBe(s.played.sword_hit);
    for (const src of h.sources) src.onended?.();
    expect(m.stats().active).toBe(0);
  });

  it('an ended voice disconnects its nodes; a stolen one ramps linearly to 0 before it stops', () => {
    const h = fakeHost(false);
    const m = readyManager(h);
    m.setListener({ tx: 0, ty: 0 }, () => true);
    disconnects = 0;
    m.playSFX('cannon_shot', 1, { tx: 3, ty: 0 });
    h.sources[0]!.onended?.();
    // Source, amp and panner (the sound is panned).
    expect(disconnects).toBe(3);
    // Fill cannon_shot's voices quietly, then a louder one steals the oldest.
    clock += 1000;
    const cap = SFX_CATALOGUE.cannon_shot.maxVoices;
    for (let i = 0; i < cap; i++) {
      clock += 200;
      m.playSFX('cannon_shot', 0.2, { tx: 0, ty: 0 });
    }
    clock += 200;
    disconnects = 0;
    m.playSFX('cannon_shot', 1, { tx: 0, ty: 0 });
    const stolen = h.sources[1]!;
    expect(stolen.stoppedAt).toBeCloseTo(0.035);
    expect(m.stats().active).toBe(cap);
    expect(disconnects).toBe(0);
    stolen.onended?.();
    expect(disconnects).toBe(2);
    expect(h.gains.some((g) => g.ramp !== null && g.ramp[0] === 0 && Math.abs(g.ramp[1] - 0.03) < 1e-9)).toBe(true);
  });

  it('a click right after a UI cue of the same click stays silent', () => {
    const h = fakeHost(false);
    const m = readyManager(h);
    clock += 1000;
    m.playSFX('ui_error');
    m.playSFX('ui_click');
    expect(m.stats().played.ui_click).toBeUndefined();
    clock += 500;
    m.playSFX('ui_click');
    expect(m.stats().played.ui_click).toBe(1);
  });

  it('an error sound that was requested but dropped still silences the click', () => {
    const h = fakeHost(false);
    const m = readyManager(h);
    clock += 1000;
    m.playSFX('ui_error');
    clock += 100;
    // Inside ui_error's repeat interval: the error is dropped, the click stays silent too.
    m.playSFX('ui_error');
    m.playSFX('ui_click');
    expect(m.stats().dropped.ui_error).toBe(1);
    expect(m.stats().played.ui_click).toBeUndefined();
  });

  it('clearListener drops positional sounds; a closed context counts as none', () => {
    const h = fakeHost(false);
    const m = readyManager(h);
    m.setListener({ tx: 0, ty: 0 }, () => true);
    m.clearListener();
    m.playSFX('unit_die', 1, { tx: 0, ty: 0 });
    expect(h.sources).toHaveLength(0);
    expect(m.hasContext()).toBe(true);
    h.ctx.state = 'closed';
    expect(m.hasContext()).toBe(false);
  });

  it('destroy runs the added disposers once', () => {
    const h = fakeHost(false);
    const m = new AudioManager(h.host, { settings: createSettingsStore(null), now });
    let n = 0;
    m.addDisposer(() => n++);
    m.destroy();
    m.destroy();
    expect(n).toBe(1);
  });

  it('music: nothing before the unlock; the menu scene plays the menu track once audio is unlocked', () => {
    const h = fakeHost(true);
    const m = new AudioManager(h.host, { settings: createSettingsStore(null), now });
    m.setMusicScene('menu');
    m.playMusic('combat', 1000);
    for (let i = 0; i < 20; i++) m.update(16);
    expect(m.stats().music?.track).toBeNull();
    expect(h.oscillators.count).toBe(0);
    h.unlock();
    m.update(16);
    expect(m.stats().music).toMatchObject({ track: 'menu', scene: 'menu' });
    // The first notes are scheduled within the lookahead.
    h.ctx.currentTime = 0.06;
    m.update(16);
    expect(h.oscillators.count).toBeGreaterThan(0);
  });

  it('music: the game feeds age and combat; a registered music_<track> buffer plays looped instead', () => {
    const h = fakeHost(false);
    const m = readyManager(h);
    m.setMusicScene('game');
    m.feedMusic(2, false);
    m.update(16);
    expect(m.stats().music).toMatchObject({ track: 'calm_a', age: 2 });
    const buffer = h.ctx.createBuffer(2, 100, 8000) as unknown as AudioBuffer;
    m.registerSound('music_combat', buffer);
    const before = h.sources.length;
    m.feedMusic(2, true);
    m.update(16);
    expect(m.stats().music).toMatchObject({ track: 'combat', age: 2 });
    const loop = h.sources.slice(before).find((s) => s.buffer === buffer) as { loop?: boolean } | undefined;
    expect(loop?.loop).toBe(true);
  });

  it('music: a victory stinger replaces the game music', () => {
    const h = fakeHost(false);
    const m = readyManager(h);
    m.setMusicScene('game');
    m.update(16);
    m.setMusicScene('victory');
    m.update(16);
    expect(m.stats().music?.track).toBe('victory');
  });
});
