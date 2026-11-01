import { TIME_VICTORY } from '../config/balance';
import { hasTimeVictory, type VictoryMode } from './GameSetupConfig';

/** What decides a time victory for one player. */
export interface TimeStanding {
  readonly score: number;
  /** Tie-break: value of the enemy units and buildings destroyed. */
  readonly killValue: number;
}

/** The time-victory rule handed to VictoryChecker. */
export interface TimeVictoryRule {
  readonly limitMs: number;
  /** The match clock (game time). */
  readonly nowMs: () => number;
  readonly standing: (playerId: number) => TimeStanding;
}

/** The time limit as the AI and the HUD see it (scores are public, M7). */
export interface TimeLimitView {
  readonly remainingMs: number;
  /** Who would win if the clock ran out now (null: nobody standing). */
  readonly leaderId: number | null;
}

/**
 * The player who wins on time: the highest score among the standing
 * players; ties go to the higher kill value, then the lower player id.
 */
export function timeLeader(
  players: readonly { readonly id: number; readonly defeated: boolean }[],
  standing: (playerId: number) => TimeStanding,
): number | null {
  let best: { id: number; s: TimeStanding } | null = null;
  for (const p of players) {
    if (p.defeated) continue;
    const s = standing(p.id);
    const better =
      !best ||
      s.score > best.s.score ||
      (s.score === best.s.score && (s.killValue > best.s.killValue || (s.killValue === best.s.killValue && p.id < best.id)));
    if (better) best = { id: p.id, s };
  }
  return best?.id ?? null;
}

/** True when `playerId` leads inside the final TIME_VICTORY.holdLeadMs: it keeps its army home. */
export function holdsTimeLead(playerId: number, view: TimeLimitView | undefined): boolean {
  return view !== undefined && view.leaderId === playerId && view.remainingMs <= TIME_VICTORY.holdLeadMs;
}

/** The statistics a time standing is read from (MatchStats). */
export interface StandingSource {
  scoreOf(playerId: number): number;
  of(playerId: number): { readonly killValue: number };
}

/** A player's time standing from the match statistics. */
export function standingFrom(stats: StandingSource): (playerId: number) => TimeStanding {
  return (id) => ({ score: stats.scoreOf(id), killValue: stats.of(id).killValue });
}

/**
 * The running time limit for the AIs: a clock advanced with the game, and
 * the leader re-read from the (public) scores at most every `refreshMs`,
 * since a score walks the world's buildings.
 */
export class TimeLimitWatch {
  private clockMs: number;
  private leader: number | null = null;
  private nextRefreshMs: number;

  constructor(
    private readonly players: { all(): readonly { readonly id: number; readonly defeated: boolean }[] },
    private readonly stats: StandingSource,
    startMs = 0,
    private readonly limitMs: number = TIME_VICTORY.limitMs,
    private readonly refreshMs = 1000,
  ) {
    this.clockMs = startMs;
    this.nextRefreshMs = startMs;
  }

  advance(deltaMs: number): void {
    this.clockMs += deltaMs;
  }

  view(): TimeLimitView {
    if (this.clockMs >= this.nextRefreshMs) {
      this.leader = timeLeader(this.players.all(), standingFrom(this.stats));
      this.nextRefreshMs = this.clockMs + this.refreshMs;
    }
    return { remainingMs: Math.max(0, this.limitMs - this.clockMs), leaderId: this.leader };
  }
}

/** The time rule of a match with `mode` (null when it has no time limit), read from `stats` and the game clock. */
export function timeRuleFor(mode: VictoryMode, stats: StandingSource, nowMs: () => number): TimeVictoryRule | null {
  return hasTimeVictory(mode) ? { limitMs: TIME_VICTORY.limitMs, nowMs, standing: standingFrom(stats) } : null;
}
