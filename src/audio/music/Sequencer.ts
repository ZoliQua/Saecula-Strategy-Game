import { MUSIC_LOOKAHEAD_S, MUSIC_MAX_VOICES, MUSIC_VOICES } from '../../config/audio';
import type { NoteEvent, Piece, VoiceId } from './composer';
import { playNote, type Voice } from './instruments';

/** First index of `events` (sorted by beat) whose beat is ≥ `beat`. */
function lowerBound(events: readonly NoteEvent[], beat: number): number {
  let lo = 0;
  let hi = events.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if ((events[mid]?.beat ?? Infinity) < beat) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * The events with `fromBeat ≤ beat < toBeat`, in order. A looping piece
 * repeats every `piece.beats`; its events come back with absolute
 * (unwrapped) beats.
 */
export function eventsInWindow(piece: Piece, fromBeat: number, toBeat: number): NoteEvent[] {
  const { events } = piece;
  if (!(toBeat > fromBeat) || events.length === 0) return [];
  const out: NoteEvent[] = [];
  const take = (offset: number) => {
    for (let i = lowerBound(events, fromBeat - offset); i < events.length; i++) {
      const e = events[i];
      if (!e || e.beat + offset >= toBeat) break;
      out.push(offset === 0 ? e : { ...e, beat: e.beat + offset });
    }
  };
  if (!piece.loop) {
    take(0);
    return out;
  }
  const len = piece.beats;
  for (let k = Math.max(0, Math.floor(fromBeat / len)); k * len < toBeat; k++) take(k * len);
  return out;
}

/** A note missed by more than this (a hidden tab, a long frame) is skipped, not played late. */
const LATE_S = 0.03;

/**
 * Plays a piece on the audio clock: each `update` schedules the notes
 * starting within the next MUSIC_LOOKAHEAD_S, at most MUSIC_MAX_VOICES
 * sounding at once (a new note cuts the oldest one short). `stop` ends the scheduling at a time and releases
 * whatever still sounds then.
 */
export class Sequencer {
  private piece: Piece | null = null;
  private startTime = 0;
  /** Beats scheduled so far (exclusive), from the piece start. */
  private scheduled = 0;
  private stopAt = Number.POSITIVE_INFINITY;
  private voices: Voice[] = [];
  private readonly channels = new Map<VoiceId, AudioNode>();
  private readonly owned: AudioNode[] = [];
  /** Notes started, and old notes cut short at the voice cap (stats). */
  played = 0;
  stolen = 0;

  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly out: AudioNode,
    /** The reverb input (each instrument sends its share), if any. */
    private readonly send: AudioNode | null = null,
  ) {}

  play(piece: Piece, atTime: number): void {
    this.piece = piece;
    this.startTime = atTime;
    this.scheduled = 0;
    this.stopAt = Number.POSITIVE_INFINITY;
  }

  stop(atTime: number): void {
    this.stopAt = Math.min(this.stopAt, atTime);
    for (const v of this.voices) v.release(this.stopAt);
  }

  /** Audio-clock time a non-looping piece ends (null: looping, stopped or idle). */
  endTime(): number | null {
    const p = this.piece;
    if (!p || p.loop || this.stopAt !== Number.POSITIVE_INFINITY) return null;
    return this.startTime + (p.beats * 60) / p.bpm;
  }

  /** Nothing more will sound: the piece ended or was stopped, and every note has stopped. */
  finished(): boolean {
    const p = this.piece;
    const now = this.ctx.currentTime;
    const over = !p || now >= this.stopAt || (!p.loop && this.scheduled >= p.beats);
    return over && this.voices.every((v) => v.end <= now);
  }

  /** Notes sounding now. */
  get sounding(): number {
    const now = this.ctx.currentTime;
    return this.voices.reduce((n, v) => n + (v.end > now ? 1 : 0), 0);
  }

  update(): void {
    const now = this.ctx.currentTime;
    this.voices = this.voices.filter((v) => v.end > now);
    const p = this.piece;
    if (!p) return;
    const spb = 60 / p.bpm;
    const horizon = Math.min(now + MUSIC_LOOKAHEAD_S, this.stopAt);
    // Missed notes (the tab was hidden) are skipped, not played as a burst.
    const from = Math.max(this.scheduled, (now - LATE_S - this.startTime) / spb);
    const to = (horizon - this.startTime) / spb;
    if (to <= from) return;
    for (const e of eventsInWindow(p, from, to)) this.schedule(e, Math.max(now, this.startTime + e.beat * spb), e.beats * spb);
    this.scheduled = to;
  }

  /** Unwires the instrument channels (the sequencer is done). */
  dispose(): void {
    for (const v of this.voices) v.release(this.ctx.currentTime);
    for (const n of this.owned) n.disconnect();
    this.owned.length = 0;
    this.channels.clear();
  }

  private schedule(e: NoteEvent, at: number, dur: number): void {
    if (this.voices.length >= MUSIC_MAX_VOICES) {
      // At the cap the oldest note (most likely a fading tail) makes room, fading out fast.
      this.voices.shift()?.release(at);
      this.stolen++;
    }
    const voice = playNote(this.ctx, this.channel(e.voice), e.voice, e.midi, e.velocity, at, dur);
    // Scheduled during a fade-out: it lets go when the piece stops.
    if (this.stopAt !== Number.POSITIVE_INFINITY) voice.release(this.stopAt);
    this.voices.push(voice);
    this.played++;
  }

  /** Per instrument: a stereo position and a reverb send, built once. */
  private channel(voice: VoiceId): AudioNode {
    const existing = this.channels.get(voice);
    if (existing) return existing;
    const spec = MUSIC_VOICES[voice];
    const input = this.ctx.createGain();
    let tail: AudioNode = input;
    if (spec.pan !== 0 && typeof this.ctx.createStereoPanner === 'function') {
      const pan = this.ctx.createStereoPanner();
      pan.pan.value = spec.pan;
      input.connect(pan);
      this.owned.push(pan);
      tail = pan;
    }
    tail.connect(this.out);
    if (this.send) {
      const send = this.ctx.createGain();
      send.gain.value = spec.send;
      tail.connect(send).connect(this.send);
      this.owned.push(send);
    }
    this.owned.push(input);
    this.channels.set(voice, input);
    return input;
  }
}
