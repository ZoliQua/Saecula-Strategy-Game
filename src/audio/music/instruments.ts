import { MUSIC_VOICES } from '../../config/audio';
import type { VoiceId } from './composer';

/**
 * The music instruments, built per note from WebAudio oscillators, one
 * shared noise buffer, biquads and gain envelopes. Every attack ramps
 * from silence and every end decays (no clicks); bright waves are always
 * low-passed. Each note unwires its nodes when its last source ends.
 */

/** A sounding note. */
export interface Voice {
  /** Audio-clock time its sources stop. */
  readonly end: number;
  /** Audio-clock time of its note-off (after it, only the release tail sounds). */
  readonly off: number;
  /** Fades the note out from `at` and stops it shortly after (a piece stopping). */
  release(at: number): void;
}

const hz = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

/** One second of seeded white noise per context, shared by every note. */
function noise(ctx: BaseAudioContext): AudioBuffer {
  let buf = noiseBuffers.get(ctx);
  if (!buf) {
    buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let s = 0x1234567;
    for (let i = 0; i < data.length; i++) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      data[i] = s / 2147483648 - 1;
    }
    noiseBuffers.set(ctx, buf);
  }
  return buf;
}

/** Collects a note's nodes; `done` wires the cleanup and returns the voice. */
class Note {
  readonly amp: GainNode;
  private readonly nodes: AudioNode[] = [];
  private readonly sources: AudioScheduledSourceNode[] = [];

  constructor(
    readonly ctx: BaseAudioContext,
    dest: AudioNode,
  ) {
    this.amp = ctx.createGain();
    this.amp.gain.value = 0;
    this.amp.connect(dest);
    this.nodes.push(this.amp);
  }

  osc(type: OscillatorType, freq: number, detuneCents = 0): OscillatorNode {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detuneCents;
    this.track(o);
    return o;
  }

  noise(): AudioBufferSourceNode {
    const n = this.ctx.createBufferSource();
    n.buffer = noise(this.ctx);
    n.loop = true;
    this.track(n);
    return n;
  }

  filter(type: BiquadFilterType, freq: number, q: number): BiquadFilterNode {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    this.nodes.push(f);
    return f;
  }

  gain(value: number): GainNode {
    const g = this.ctx.createGain();
    g.gain.value = value;
    this.nodes.push(g);
    return g;
  }

  /** A delayed vibrato on `params` (Hz), from `t + delay`. */
  vibrato(params: readonly AudioParam[], t: number, delay: number, rate: number, depth: number): void {
    const lfo = this.osc('sine', rate);
    const amount = this.gain(0);
    amount.gain.setValueAtTime(0, t + delay);
    amount.gain.linearRampToValueAtTime(depth, t + delay + 0.4);
    lfo.connect(amount);
    for (const p of params) amount.connect(p);
  }

  /** Starts every source at `t`, stops them at `end`, unwires on the last end. */
  done(t: number, end: number, off: number): Voice {
    const sources = this.sources;
    const nodes = this.nodes;
    let ended = 0;
    const cleanup = () => {
      if (++ended < sources.length) return;
      for (const s of sources) s.onended = null;
      for (const n of nodes) n.disconnect();
    };
    for (const s of sources) {
      s.onended = cleanup;
      s.start(t);
      s.stop(end);
    }
    const amp = this.amp.gain;
    let stopAt = end;
    return {
      get end() {
        return stopAt;
      },
      off,
      release: (at: number) => {
        if (at >= stopAt) return;
        const from = holdAt(amp, Math.max(at, this.ctx.currentTime), this.ctx.currentTime);
        amp.setTargetAtTime(0, from, 0.03);
        stopAt = Math.max(from + 0.15, t + 0.01);
        for (const s of sources) {
          try {
            s.stop(stopAt);
          } catch {
            // Already stopped.
          }
        }
      },
    };
  }

  private track(s: AudioScheduledSourceNode): void {
    this.sources.push(s);
    this.nodes.push(s);
  }
}

/** A release this close to the clock counts as "now" (a steal). */
const RELEASE_NOW_S = 0.005;

/**
 * Freezes a param's automation at `at` (cancelAndHold where supported) and
 * returns the time the release starts from. Without it (Firefox):
 * - a release now (a steal) reads the current value and holds it now; a
 *   value read now and held at a later time would jump a decayed note back
 *   up (a click);
 * - a release in the future (the end of a crossfade) only drops the
 *   automation from `at` on; the caller's setTarget then starts from
 *   whatever value the envelope has at `at`, so the note keeps sounding
 *   (and fading with its bus) until then.
 */
function holdAt(p: AudioParam, at: number, now: number): number {
  const hold = (p as AudioParam & { cancelAndHoldAtTime?: (t: number) => AudioParam }).cancelAndHoldAtTime;
  if (typeof hold === 'function') {
    hold.call(p, at);
    return at;
  }
  if (at > now + RELEASE_NOW_S) {
    p.cancelScheduledValues(at);
    return at;
  }
  const v = p.value;
  p.cancelScheduledValues(now);
  p.setValueAtTime(v, now);
  return now;
}

/** Attack from silence, then a natural decay (time constant `decay`), damped at `off`. */
function pluck(g: AudioParam, t: number, peak: number, attack: number, decay: number, off: number, damp: number): void {
  g.setValueAtTime(0, t);
  g.linearRampToValueAtTime(peak, t + attack);
  g.setTargetAtTime(0, t + attack, decay);
  // A later setTarget takes over from the value the first reached (the damper).
  g.setTargetAtTime(0, Math.max(off, t + attack), damp);
}

/** Attack, hold, release (time constant `rel` from `off`). */
function sustain(g: AudioParam, t: number, peak: number, attack: number, off: number, rel: number): void {
  g.setValueAtTime(0, t);
  g.linearRampToValueAtTime(peak, Math.min(t + attack, off));
  g.setValueAtTime(peak, Math.max(off, t + attack));
  g.setTargetAtTime(0, Math.max(off, t + attack), rel);
}

/** Plays one note on `voice` into `dest`; `velocity` 0–1. */
export function playNote(ctx: BaseAudioContext, dest: AudioNode, voice: VoiceId, midi: number, velocity: number, t: number, dur: number): Voice {
  const n = new Note(ctx, dest);
  const f = hz(midi);
  const level = MUSIC_VOICES[voice].level * velocity ** 1.3;
  const tail = MUSIC_VOICES[voice].tailS;
  const off = t + dur;
  const g = n.amp.gain;
  const bright = 0.7 + 0.5 * velocity;
  switch (voice) {
    case 'lyre':
    case 'harp':
    case 'harpsichord': {
      const harpsichord = voice === 'harpsichord';
      const main = n.osc(voice === 'harp' ? 'triangle' : 'sawtooth', f, harpsichord ? 0 : -3);
      const upper = n.osc(harpsichord ? 'sawtooth' : 'sine', f * 2, 3);
      const upperGain = n.gain(harpsichord ? 0.22 : 0.25);
      const lp = n.filter('lowpass', Math.min(f * (harpsichord ? 10 : 7) * bright, harpsichord ? 6500 : 5000), 0.6);
      lp.frequency.setTargetAtTime(f * (harpsichord ? 3 : 2), t + 0.005, harpsichord ? 0.12 : 0.25);
      main.connect(lp);
      upper.connect(upperGain).connect(lp);
      lp.connect(n.amp);
      const decay = voice === 'harp' ? 0.9 : harpsichord ? 0.45 : 0.6;
      pluck(g, t, level, harpsichord ? 0.002 : 0.004, decay, off, harpsichord ? 0.03 : 0.09);
      return n.done(t, off + tail, off);
    }
    case 'aulos':
    case 'drone':
    case 'strings':
    case 'pad': {
      const spread = voice === 'aulos' ? 6 : voice === 'drone' ? 4 : 8;
      const a = n.osc('sawtooth', f, -spread);
      const b = n.osc(voice === 'pad' || voice === 'aulos' ? 'triangle' : 'sawtooth', f, spread);
      const cutoff = voice === 'aulos' ? Math.min(f * 2.2, 1800) : voice === 'drone' ? Math.min(f * 2.5, 900) : voice === 'strings' ? Math.min(f * 3, 2200) : 1100;
      const lp = n.filter('lowpass', cutoff * (voice === 'aulos' ? bright : 1), voice === 'aulos' ? 0.9 : 0.5);
      a.connect(lp);
      b.connect(lp);
      lp.connect(n.amp);
      if (voice === 'aulos' || voice === 'strings') n.vibrato([a.detune, b.detune], t, voice === 'aulos' ? 0.25 : 0.4, voice === 'aulos' ? 5.2 : 5.5, voice === 'aulos' ? 9 : 6);
      const attack = voice === 'aulos' ? 0.06 : voice === 'strings' ? 0.35 : voice === 'drone' ? 1.2 : 1.4;
      const rel = voice === 'aulos' ? 0.05 : voice === 'strings' ? 0.15 : voice === 'drone' ? 0.45 : 0.6;
      sustain(g, t, level, attack, off, rel);
      return n.done(t, off + tail, off);
    }
    case 'recorder':
    case 'flute': {
      const flute = voice === 'flute';
      const body = n.osc('sine', f);
      const over = n.osc(flute ? 'sine' : 'triangle', flute ? f * 2 : f);
      const overGain = n.gain(flute ? 0.12 : 0.22);
      body.connect(n.amp);
      over.connect(overGain).connect(n.amp);
      const breath = n.noise();
      const bp = n.filter('bandpass', Math.min(f * (flute ? 1.5 : 2), 6000), flute ? 1 : 3);
      const breathGain = n.gain(0);
      breath.connect(bp).connect(breathGain).connect(n.amp);
      // Flute: a little breath all along; recorder: a chiff at the start.
      breathGain.gain.setValueAtTime(0, t);
      breathGain.gain.linearRampToValueAtTime(flute ? 0.08 : 0.3, t + 0.012);
      breathGain.gain.setTargetAtTime(flute ? 0.035 : 0, t + 0.012, 0.03);
      if (dur > 0.35) n.vibrato([body.frequency, over.frequency], t, flute ? 0.35 : 0.3, 5, f * 0.004);
      sustain(g, t, level, flute ? 0.07 : 0.035, off, flute ? 0.05 : 0.035);
      return n.done(t, off + tail, off);
    }
    case 'bell': {
      const carrier = n.osc('sine', f);
      const mod = n.osc('sine', f * 3.5);
      const index = n.gain(f * 1.4);
      index.gain.setTargetAtTime(f * 0.15, t, 0.35);
      mod.connect(index).connect(carrier.frequency);
      carrier.connect(n.amp);
      pluck(g, t, level, 0.005, 0.75, t + tail, 0.3);
      return n.done(t, t + tail + 0.6, t);
    }
    case 'timpani': {
      const body = n.osc('sine', f * 1.05);
      body.frequency.setTargetAtTime(f, t, 0.04);
      const partial = n.osc('sine', f * 1.5);
      const partialGain = n.gain(0.3);
      partialGain.gain.setTargetAtTime(0, t, 0.15);
      const thump = n.noise();
      const lp = n.filter('lowpass', 320, 0.7);
      const thumpGain = n.gain(0.6);
      thumpGain.gain.setTargetAtTime(0, t + 0.004, 0.03);
      body.connect(n.amp);
      partial.connect(partialGain).connect(n.amp);
      thump.connect(lp).connect(thumpGain).connect(n.amp);
      pluck(g, t, level, 0.004, 0.45, t + tail, 0.2);
      return n.done(t, t + tail + 0.5, t);
    }
    case 'frameDrum':
    case 'tabor': {
      const low = midi < 56;
      const frame = voice === 'frameDrum';
      const skin = n.noise();
      const band = n.filter(low ? 'bandpass' : 'highpass', low ? (frame ? 420 : 900) : frame ? 2000 : 2600, low ? 0.9 : 0.7);
      const skinGain = n.gain(low ? (frame ? 0.35 : 0.6) : 0.5);
      skinGain.gain.setTargetAtTime(0, t + 0.003, low ? 0.05 : 0.025);
      skin.connect(band).connect(skinGain).connect(n.amp);
      if (low) {
        const body = n.osc('sine', frame ? 115 : 200);
        body.frequency.setTargetAtTime(frame ? 62 : 145, t, 0.05);
        body.connect(n.amp);
      }
      pluck(g, t, level * (low ? 1 : 0.6), 0.003, low ? (frame ? 0.14 : 0.08) : 0.04, t + tail, 0.05);
      return n.done(t, t + tail + 0.1, t);
    }
  }
}
