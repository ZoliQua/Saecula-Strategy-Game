import type { EcsWorld } from '../ecs/world';
import { areAllies, areEnemies } from './diplomacy';
import type { PlayerManager } from './PlayerManager';
import { timeLeading, type TimeVictoryRule } from './timeVictory';

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
 * the limit the standing player with the best score wins (timeLeading).
 *
 * Teams (M16): the human's team wins once every enemy-team player is
 * defeated (an ally may have fallen); the human loses when their own town
 * centres are gone, whatever their allies still hold. A Wonder held by
 * the human or an ally is a victory, by an enemy a defeat; time compares
 * the teams' summed scores. A team result names the winning team's
 * lowest-id standing player as `winnerId`. With no allies every player is
 * its own team and every result is the free-for-all one.
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
    const ais = this.players.ais();
    const enemies = ais.filter((p) => areEnemies(this.players, human.id, p.id));
    if (human.defeated) {
      // Never an ally: with every enemy fallen in the same tick nobody is named (0).
      const winner = enemies.find((p) => !p.defeated);
      return { kind: 'defeat', winnerId: winner?.id ?? 0, cause: 'conquest' };
    }
    if (enemies.length > 0 && enemies.every((p) => p.defeated)) {
      return { kind: 'victory', winnerId: human.id, cause: 'conquest' };
    }
    if (this.mission?.complete()) return { kind: 'victory', winnerId: human.id, cause: 'mission' };
    const wonderWinner = this.wonderWinner();
    if (wonderWinner !== null) {
      const ours = this.onHumanTeam(human.id, wonderWinner);
      return { kind: ours ? 'victory' : 'defeat', winnerId: this.teamWinnerId(wonderWinner), cause: 'wonder' };
    }
    if (this.time && this.time.nowMs() >= this.time.limitMs) {
      const leader = timeLeading(this.players.all(), this.time.standing);
      if (leader !== null) {
        const ours = this.onHumanTeam(human.id, leader.id);
        return { kind: ours ? 'victory' : 'defeat', winnerId: leader.id, cause: 'time' };
      }
    }
    return { kind: 'playing' };
  }

  private onHumanTeam(humanId: number, playerId: number): boolean {
    return playerId === humanId || areAllies(this.players, humanId, playerId);
  }

  /** The winner named for `playerId`'s team: its lowest-id standing player (just `playerId` with no allies). */
  private teamWinnerId(playerId: number): number {
    const team = this.players.teamOf(playerId);
    return this.players.all().find((p) => !p.defeated && this.players.teamOf(p.id) === team)?.id ?? playerId;
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
