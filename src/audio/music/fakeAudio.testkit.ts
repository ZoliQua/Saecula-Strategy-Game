/**
 * A minimal recording WebAudio context for the music tests: params keep
 * their automation calls, nodes count disconnects, sources fire `onended`
 * when the clock passes their stop time.
 */

export interface FakeParam {
  value: number;
  readonly events: Array<[string, number, number]>;
  setValueAtTime(v: number, t: number): void;
  linearRampToValueAtTime(v: number, t: number): void;
  setTargetAtTime(v: number, t: number, c: number): void;
  cancelScheduledValues(t: number): void;
  cancelAndHoldAtTime?: (t: number) => void;
}

function param(value: number, hold: boolean): FakeParam {
  const p: FakeParam = {
    value,
    events: [],
    setValueAtTime(v, t) {
      p.events.push(['set', v, t]);
      p.value = v;
    },
    linearRampToValueAtTime(v, t) {
      p.events.push(['ramp', v, t]);
      p.value = v;
    },
    setTargetAtTime(v, t) {
      p.events.push(['target', v, t]);
    },
    cancelScheduledValues(t) {
      p.events.push(['cancel', 0, t]);
    },
  };
  if (hold) p.cancelAndHoldAtTime = (t) => p.events.push(['hold', 0, t]);
  return p;
}

export interface FakeSource {
  buffer: unknown;
  loop: boolean;
  startedAt: number | null;
  stoppedAt: number | null;
  onended: (() => void) | null;
}

export function fakeAudio(options: { hold?: boolean } = {}) {
  const hold = options.hold ?? true;
  let disconnects = 0;
  const sources: FakeSource[] = [];
  const gains: FakeParam[] = [];
  const node = <T extends object>(extra: T) =>
    Object.assign(extra, {
      connect: <N>(n: N) => n,
      disconnect: () => {
        disconnects++;
      },
    });
  const source = <T extends object>(extra: T) => {
    const s = node({ ...extra, buffer: null as unknown, loop: false, startedAt: null as number | null, stoppedAt: null as number | null, onended: null as (() => void) | null });
    Object.assign(s, {
      start(t = 0) {
        s.startedAt = t;
      },
      stop(t = 0) {
        s.stoppedAt = t;
      },
    });
    sources.push(s);
    return s;
  };
  const ctx = {
    sampleRate: 8000,
    currentTime: 0,
    destination: node({}),
    createGain: () => {
      const g = param(1, hold);
      gains.push(g);
      return node({ gain: g });
    },
    createOscillator: () => source({ type: 'sine', frequency: param(440, hold), detune: param(0, hold) }),
    createBufferSource: () => source({ playbackRate: param(1, hold) }),
    createBiquadFilter: () => node({ type: 'lowpass', frequency: param(350, hold), Q: param(1, hold) }),
    createStereoPanner: () => node({ pan: param(0, hold) }),
    createConvolver: () => node({ normalize: true, buffer: null as unknown }),
    createBuffer: (channels: number, length: number, sampleRate: number) => {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      return { numberOfChannels: channels, length, sampleRate, duration: length / sampleRate, getChannelData: (ch: number) => data[ch] };
    },
  };
  /** Moves the clock and ends the sources whose stop time has passed. */
  const advance = (t: number) => {
    ctx.currentTime = t;
    for (const s of sources) {
      if (s.stoppedAt !== null && s.stoppedAt <= t && s.onended) {
        const cb = s.onended;
        s.onended = null;
        cb();
      }
    }
  };
  return { ctx, audio: ctx as unknown as BaseAudioContext, sources, gains, advance, disconnects: () => disconnects };
}
