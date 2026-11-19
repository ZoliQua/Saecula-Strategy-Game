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
  /** Who would win if the clock ran out now (null: nobody standing); in a team match the leading team's lowest-id standing player. */
  readonly leaderId: number | null;
  /** The leading team (M16; with no allies the leader's own id); absent = compare `leaderId` only. */
  readonly leaderTeam?: number | null;
}

/** A player as the time rule reads it; `team` absent = its own team (no allies). */
export interface TimePlayer {
  readonly id: number;
  readonly defeated: boolean;
  readonly team?: number;
}

/**
 * The team that wins on time and the player named its winner (M16): the
 * team with the highest summed score of its standing players; ties go to
 * the higher summed kill value, then the team whose lowest standing id is
 * lower. The winner named is that lowest-id standing player. With no
 * allies every player is its own team, so this is the old per-player rule.
 */
export function timeLeading(players: readonly TimePlayer[], standing: (playerId: number) => TimeStanding): { id: number; team: number } | null {
  const teams = new Map<number, { id: number; score: number; killValue: number }>();
  for (const p of players) {
    if (p.defeated) continue;
    const s = standing(p.id);
    const team = p.team ?? p.id;
    const t = teams.get(team);
    if (t) {
      t.id = Math.min(t.id, p.id);
      t.score += s.score;
      t.killValue += s.killValue;
    } else teams.set(team, { id: p.id, score: s.score, killValue: s.killValue });
  }
  let best: { team: number; id: number; score: number; killValue: number } | null = null;
  for (const [team, t] of teams) {
    const better =
      !best ||
      t.score > best.score ||
      (t.score === best.score && (t.killValue > best.killValue || (t.killValue === best.killValue && t.id < best.id)));
    if (better) best = { team, ...t };
  }
  return best && { id: best.id, team: best.team };
}

/** The player named the time winner (timeLeading), or null when nobody stands. */
export function timeLeader(players: readonly TimePlayer[], standing: (playerId: number) => TimeStanding): number | null {
  return timeLeading(players, standing)?.id ?? null;
}

/**
 * True when `playerId` (on `team`; default its own) leads inside the final
 * TIME_VICTORY.holdLeadMs: it keeps its army home. In a team match the
 * whole leading team holds.
 */
export function holdsTimeLead(playerId: number, view: TimeLimitView | undefined, team: number = playerId): boolean {
  if (view === undefined || view.remainingMs > TIME_VICTORY.holdLeadMs) return false;
  return view.leaderTeam !== undefined ? view.leaderTeam === team : view.leaderId === playerId;
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
  private leader: { id: number; team: number } | null = null;
  private nextRefreshMs: number;

  constructor(
    /** `hasTeams` (PlayerManager): when true the view also names the leading team (holdsTimeLead per team). */
    private readonly players: { all(): readonly TimePlayer[]; hasTeams?(): boolean },
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
      this.leader = timeLeading(this.players.all(), standingFrom(this.stats));
      this.nextRefreshMs = this.clockMs + this.refreshMs;
    }
    const remainingMs = Math.max(0, this.limitMs - this.clockMs);
    const leaderId = this.leader?.id ?? null;
    if (this.players.hasTeams?.() !== true) return { remainingMs, leaderId };
    return { remainingMs, leaderId, leaderTeam: this.leader?.team ?? null };
  }
}

/** The time rule of a match with `mode` (null when it has no time limit), read from `stats` and the game clock. */
export function timeRuleFor(mode: VictoryMode, stats: StandingSource, nowMs: () => number): TimeVictoryRule | null {
  return hasTimeVictory(mode) ? { limitMs: TIME_VICTORY.limitMs, nowMs, standing: standingFrom(stats) } : null;
}
