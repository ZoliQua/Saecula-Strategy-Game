import type { Migration } from './index';
import { newMatchId } from '../../game/matchId';
import { zeroStats, type MatchStatsSnapshot } from '../../stats/MatchStats';

/**
 * A v1 save's match id. v1 had none, and nothing in it names the match;
 * derived from its seed and write time, so loading the same v1 save
 * again gives the same id (one match log record), random without them.
 */
function v1MatchId(data: Record<string, unknown>): string {
  const createdAt = data['createdAt'];
  const setup = data['setup'];
  const seed: unknown = typeof setup === 'object' && setup !== null ? (setup as Record<string, unknown>)['seed'] : undefined;
  return typeof createdAt === 'string' && createdAt.length <= 40 ? `v1-${typeof seed === 'number' ? seed : 'x'}-${createdAt}` : newMatchId();
}

/**
 * v1 (M6) → v2 (M7): adds the match statistics, zeroed for every saved
 * player, with an empty timeline (the next sample falls on the next
 * whole minute of game time), and the match id (v1MatchId). A v1 save
 * has no record of what happened before it, so nothing is estimated.
 */
export const v1ToV2: Migration = (data) => {
  const players: MatchStatsSnapshot['players'] = {};
  const saved: unknown = data['players'];
  if (Array.isArray(saved)) {
    for (const p of saved) {
      const id: unknown = typeof p === 'object' && p !== null ? (p as Record<string, unknown>)['id'] : undefined;
      if (typeof id === 'number') players[String(id)] = zeroStats();
    }
  }
  const stats: MatchStatsSnapshot = { players, timeline: [] };
  return { ...data, stats, matchId: v1MatchId(data) };
};
