import type { EcsWorld } from '../../ecs/world';
import type { GameSetupConfig } from '../../game/GameSetupConfig';
import type { PlayerManager } from '../../game/PlayerManager';
import type { VictoryState } from '../../game/VictoryChecker';
import { browserMatchStore } from '../../save/browserStore';
import { MatchLog } from '../../stats/matchLog';
import { buildMatchRecord, type MatchEnd, type MatchRecord } from '../../stats/matchRecord';
import type { MatchStats } from '../../stats/MatchStats';

/** What the recorder writes to (MatchLog.append). */
export interface MatchLogWriter {
  append(record: MatchRecord): Promise<boolean>;
}

/**
 * Writes the running match to the local match log once (M7 Decision 11):
 * when the game-over screen appears, or as 'abandoned' when the player
 * leaves from the pause ("Kilépés a főmenübe", or a load over the match). A match whose game time never moved (a save
 * loaded and left at once) writes nothing. The record is built
 * synchronously, before the scene goes; the write itself runs on.
 */
export class MatchRecorder {
  private written = false;

  constructor(
    private readonly log: MatchLogWriter,
    private readonly build: (end: MatchEnd, durationMs: number) => MatchRecord,
    private readonly startMs: number,
    private readonly now: () => number,
  ) {}

  /** The browser match log of a live match. */
  static forMatch(m: { setup: GameSetupConfig; world: EcsWorld; players: PlayerManager; stats: MatchStats; startMs: number; now: () => number }): MatchRecorder {
    const build = (end: MatchEnd, durationMs: number): MatchRecord =>
      buildMatchRecord({ createdAt: new Date(), setup: m.setup, players: m.players.all(), stats: m.stats, world: m.world, durationMs, end });
    return new MatchRecorder(new MatchLog(browserMatchStore()), build, m.startMs, m.now);
  }

  /** The game-over screen appeared. */
  gameOver(end: MatchEnd): void {
    this.write(end);
  }

  /** The VictoryChecker state at game over, as a MatchEnd. */
  static endOf(state: Exclude<VictoryState, { kind: 'playing' }>, winnerId: number | null): MatchEnd {
    return { kind: state.kind, winnerId, cause: state.cause };
  }

  /** The player left the match from the pause: "Kilépés a főmenübe", or a load over it. */
  abandon(): void {
    this.write({ kind: 'abandoned' });
  }

  private write(end: MatchEnd): void {
    if (this.written) return;
    const durationMs = this.now();
    if (durationMs === this.startMs) return;
    this.written = true;
    let record: MatchRecord;
    try {
      record = this.build(end, durationMs);
    } catch (err) {
      if (import.meta.env.DEV) console.warn('match record failed', err);
      return;
    }
    void this.log.append(record);
  }
}
