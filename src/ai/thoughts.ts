/**
 * What an AI is "thinking", for the dev-only thoughts overlay
 * (PROGRAM_TERV.md §10.4). Plain data: the overlay renders it, the game
 * never reads it.
 */
export type ThoughtKind =
  | 'train'
  | 'build'
  | 'research'
  | 'ageUp'
  | 'attack'
  | 'defend'
  | 'retreat'
  | 'scout'
  | 'explore'
  | 'rebalance'
  | 'harass'
  | 'flank'
  | 'stance';

export interface Thought {
  readonly timeMs: number;
  readonly kind: ThoughtKind;
  /** A unit / building / tech / resource id, or a count. */
  readonly detail: string;
}

/** Strategy phases shown in the overlay. */
export type AIPhase = 'opening' | 'ageUp' | 'buildUp' | 'attacking' | 'defending';

export interface AIThoughts {
  readonly strategy: string;
  readonly phase: AIPhase;
  /** Hard AI strategy stance (balanced / turtle / rush / tech); absent for the other strategies. */
  readonly stance?: string;
  /** Next planned steps (building / unit / tech ids). */
  readonly plan: readonly string[];
  /** Newest last. */
  readonly recent: readonly Thought[];
}

const KEEP = 10;

/** Ring buffer of recent decisions plus the current phase and plan. */
export class ThoughtLog {
  phase: AIPhase = 'opening';
  stance: string | null = null;
  plan: string[] = [];
  private readonly entries: Thought[] = [];

  add(timeMs: number, kind: ThoughtKind, detail: string): void {
    this.entries.push({ timeMs, kind, detail });
    if (this.entries.length > KEEP) this.entries.shift();
  }

  snapshot(strategy: string): AIThoughts {
    const base = { strategy, phase: this.phase, plan: [...this.plan], recent: [...this.entries] };
    return this.stance === null ? base : { ...base, stance: this.stance };
  }
}
