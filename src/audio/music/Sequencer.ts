import { MUSIC_LOOKAHEAD_S, MUSIC_MAX_VOICES, MUSIC_REENTER_MIN_S, MUSIC_VOICES } from '../../config/audio';
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

/** Held instruments whose long notes come back after a stall (a plucked or struck note is not played again). */
const SUSTAINED: ReadonlySet<VoiceId> = new Set<VoiceId>(['drone', 'strings', 'pad']);

const longest = new WeakMap<Piece, number>();

/**
 * Sustained notes that started in the skipped beats [fromBeat, beat) and
 * are still held at `beat` with at least `minLeft` beats to go, as notes
 * entering at `beat` with what is left of them (re-entered after a stall).
 */
export function heldAt(piece: Piece, fromBeat: number, beat: number, minLeft: number): NoteEvent[] {
  let max = longest.get(piece);
  if (max === undefined) {
    max = piece.events.reduce((m, e) => Math.max(m, e.beats), 0);
    longest.set(piece, max);
  }
  return eventsInWindow(piece, Math.max(fromBeat, beat - max), beat)
    .filter((e) => SUSTAINED.has(e.voice) && e.beat + e.beats >= beat + minLeft)
    .map((e) => ({ ...e, beat, beats: e.beat + e.beats - beat }));
}

/** Who scheduled a note: a piece that is stopping (fading out) gives way to the incoming one. */
export interface VoiceOwner {
  readonly stopping: boolean;
}

/** What the steal choice knows of a note. */
export interface StealCandidate {
  /** Its piece is the outgoing one (fading out). */
  readonly outgoing: boolean;
  /** Note-off time (after it only the release tail sounds). */
  readonly off: number;
  readonly end: number;
}

/**
 * Which note makes room at `at` (index into `candidates`, oldest first):
 * the outgoing piece's notes already in release (soonest end), then the
 * outgoing piece's oldest; only when the outgoing piece has none, the
 * incoming piece's releasing notes before held ones, soonest end first.
 */
export function pickSteal(candidates: readonly StealCandidate[], at: number): number {
  let best = -1;
  let bestRank = Number.POSITIVE_INFINITY;
  let bestEnd = Number.POSITIVE_INFINITY;
  candidates.forEach((c, i) => {
    const releasing = c.off <= at;
    // Ranks: 0 outgoing releasing, 1 outgoing held (oldest = first seen), 2 releasing, 3 held.
    const rank = c.outgoing ? (releasing ? 0 : 1) : releasing ? 2 : 3;
    const end = rank === 1 ? 0 : c.end;
    if (rank < bestRank || (rank === bestRank && end < bestEnd)) {
      best = i;
      bestRank = rank;
      bestEnd = end;
    }
  });
  return best;
}

const NO_OWNER: VoiceOwner = { stopping: false };

/**
 * The music's voice budget, shared by every sequencer (both buses of a
 * crossfade): at most `cap` notes. A note that has to make room is chosen
 * by `pickSteal` (the fading piece gives way first).
 */
export class VoicePool {
  private entries: Array<{ voice: Voice; owner: VoiceOwner }> = [];
  /** Notes cut short to make room. */
  stolen = 0;

  constructor(private readonly cap = MUSIC_MAX_VOICES) {}

  get size(): number {
    return this.entries.length;
  }

  /** Frees ended notes, then releases notes (fast, from `at`) until a new one fits. */
  admit(now: number, at: number): void {
    this.entries = this.entries.filter((e) => e.voice.end > now);
    while (this.entries.length >= this.cap) {
      const pick = pickSteal(
        this.entries.map((e) => ({ outgoing: e.owner.stopping, off: e.voice.off, end: e.voice.end })),
        at,
      );
      const [e] = this.entries.splice(Math.max(0, pick), 1);
      e?.voice.release(at);
      this.stolen++;
    }
  }

  add(voice: Voice, owner: VoiceOwner = NO_OWNER): void {
    this.entries.push({ voice, owner });
  }
}

/**
 * Plays a piece on the audio clock: each `update` schedules the notes
 * starting within the next MUSIC_LOOKAHEAD_S, within a voice budget
 * shared with the other bus (VoicePool). After a stall, missed notes are
 * skipped and long held ones re-enter. `stop` ends the scheduling at a
 * time and releases whatever still sounds then.
 */
export class Sequencer implements VoiceOwner {
  private piece: Piece | null = null;
  private startTime = 0;
  /** Beats scheduled so far (exclusive), from the piece start. */
  private scheduled = 0;
  private stopAt = Number.POSITIVE_INFINITY;
  private voices: Voice[] = [];
  private readonly channels = new Map<VoiceId, AudioNode>();
  private readonly owned: AudioNode[] = [];
  /** Notes started (stats). */
  played = 0;

  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly out: AudioNode,
    /** The reverb input (each instrument sends its share), if any. */
    private readonly send: AudioNode | null = null,
    /** The voice budget (shared by the music's buses). */
    private readonly pool: VoicePool = new VoicePool(),
  ) {}

  play(piece: Piece, atTime: number): void {
    this.piece = piece;
    this.startTime = atTime;
    this.scheduled = 0;
    this.stopAt = Number.POSITIVE_INFINITY;
  }

  /** The piece is stopping (fading out): its notes give way first at the voice cap. */
  get stopping(): boolean {
    return this.stopAt !== Number.POSITIVE_INFINITY;
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
    // Missed notes (the tab was hidden) are skipped, not played as a burst; long held ones re-enter.
    const late = (now - LATE_S - this.startTime) / spb;
    const from = Math.max(this.scheduled, late);
    const to = (horizon - this.startTime) / spb;
    if (to <= from) return;
    if (late > this.scheduled && now < this.stopAt) {
      for (const e of heldAt(p, this.scheduled, late, MUSIC_REENTER_MIN_S / spb)) this.schedule(e, now, e.beats * spb);
    }
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
    this.pool.admit(this.ctx.currentTime, at);
    const voice = playNote(this.ctx, this.channel(e.voice), e.voice, e.midi, e.velocity, at, dur);
    // Scheduled during a fade-out: it lets go when the piece stops.
    if (this.stopAt !== Number.POSITIVE_INFINITY) voice.release(this.stopAt);
    this.voices.push(voice);
    this.pool.add(voice, this);
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
