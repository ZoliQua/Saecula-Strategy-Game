import type { EcsWorld } from '../ecs/world';
import type { PlayerManager } from './PlayerManager';
import { timeLeader, type TimeVictoryRule } from './timeVictory';

/** How a match was decided. */
export type VictoryCause = 'conquest' | 'wonder' | 'time' | 'mission';
export const VICTORY_CAUSES: readonly VictoryCause[] = ['conquest', 'wonder', 'time', 'mission'];

export type VictoryState =
  | { kind: 'playing' }
  | { kind: 'victory'; winnerId: number; cause: VictoryCause }
  | { kind: 'defeat'; winnerId: number; cause: VictoryCause };

/**
 * Conquest victory: a player is defeated once they own zero active
 * (non-dying) town centres. The human wins when every AI is defeated
 * and loses as soon as their own town centres are gone, whatever the
 * AIs are still doing to each other.
 *
 * Wonder victory (when `wonderHoldMs` is set, checked after conquest):
 * the owner of a standing Wonder whose clock (WonderSystem) has reached
 * the hold wins outright, unless that owner is already defeated. With
 * several past the hold, the one held longest wins.
 *
 * Mission victory (M13, when `mission` is set, right after conquest): the
 * human wins once every objective of the mission is done.
 *
 * Time victory (when `time` is set, checked last): once the clock reaches
 * the limit the standing player with the best score wins (timeLeader).
 */
export class VictoryChecker {
  constructor(
    private readonly world: EcsWorld,
    private readonly players: PlayerManager,
    /** Wonder hold time; null = conquest only. */
    private readonly wonderHoldMs: number | null,
    /** Time victory rule; null = no time limit. */
    private readonly time: TimeVictoryRule | null = null,
    /** A campaign mission (M13): every objective done is a victory; null = no mission. */
    private readonly mission: { complete(): boolean } | null = null,
  ) {}

  check(): VictoryState {
    for (const player of this.players.all()) {
      if (player.defeated) continue;
      const hasTc = this.hasLiveTownCenter(player.id);
      if (!hasTc) this.players.markDefeated(player.id);
    }
    const human = this.players.human();
    if (!human) return { kind: 'playing' };
    if (human.defeated) {
      const winner = this.players.ais().find((p) => !p.defeated);
      return { kind: 'defeat', winnerId: winner?.id ?? 0, cause: 'conquest' };
    }
    const ais = this.players.ais();
    if (ais.length > 0 && ais.every((p) => p.defeated)) {
      return { kind: 'victory', winnerId: human.id, cause: 'conquest' };
    }
    if (this.mission?.complete()) return { kind: 'victory', winnerId: human.id, cause: 'mission' };
    const wonderWinner = this.wonderWinner();
    if (wonderWinner !== null) {
      return { kind: wonderWinner === human.id ? 'victory' : 'defeat', winnerId: wonderWinner, cause: 'wonder' };
    }
    if (this.time && this.time.nowMs() >= this.time.limitMs) {
      const leader = timeLeader(this.players.all(), this.time.standing);
      if (leader !== null) return { kind: leader === human.id ? 'victory' : 'defeat', winnerId: leader, cause: 'time' };
    }
    return { kind: 'playing' };
  }

  /** Owner of the longest-held standing Wonder past the hold, or null. */
  private wonderWinner(): number | null {
    if (this.wonderHoldMs === null) return null;
    let best: { playerId: number; heldMs: number } | null = null;
    for (const e of this.world.with('wonder', 'owner')) {
      if (e.dying || e.wonder.heldMs < this.wonderHoldMs) continue;
      if (this.players.get(e.owner.playerId)?.defeated !== false) continue;
      if (!best || e.wonder.heldMs > best.heldMs) best = { playerId: e.owner.playerId, heldMs: e.wonder.heldMs };
    }
    return best?.playerId ?? null;
  }

  private hasLiveTownCenter(playerId: number): boolean {
    for (const entity of this.world.with('building', 'owner')) {
      if (entity.owner.playerId !== playerId) continue;
      if (entity.building.type !== 'town_center') continue;
      if (entity.dying) continue;
      return true;
    }
    return false;
  }
}
