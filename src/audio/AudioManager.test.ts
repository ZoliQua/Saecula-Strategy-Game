import { describe, expect, it } from 'vitest';
import { createSettingsStore } from '../ui/settings';
import { AudioManager, type AudioHost } from './AudioManager';
import { channelGain } from './mix';
import { SFX_KEYS } from './sfx/catalogue';

interface FakeParam {
  value: number;
  setTargetAtTime(v: number): void;
}
const param = (value: number): FakeParam => ({
  value,
  setTargetAtTime(v: number) {
    this.value = v;
  },
});
const node = <T extends object>(extra: T) => Object.assign(extra, { connect: <N>(n: N) => n, disconnect: () => {} });

/** A context that records every node it creates; enough of BaseAudioContext for the manager. */
function fakeContext() {
  const sources: { started: number; buffer: unknown; onended: (() => void) | null }[] = [];
  const gains: FakeParam[] = [];
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
    createBuffer: (channels: number, length: number, sampleRate: number) => ({
      numberOfChannels: channels,
      length,
      sampleRate,
      duration: length / sampleRate,
      copyToChannel: () => {},
    }),
    createBufferSource: () => {
      const s = {
        started: 0,
        buffer: null as unknown,
        onended: null as (() => void) | null,
        playbackRate: param(1),
        start() {
          s.started++;
        },
        stop() {},
      };
      sources.push(s);
      return node(s);
    },
  };
  return { ctx, sources, gains };
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
});
