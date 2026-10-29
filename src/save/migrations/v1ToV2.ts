import type { Migration } from './index';
import { zeroStats, type MatchStatsSnapshot } from '../../stats/MatchStats';

/**
 * v1 (M6) → v2 (M7): adds the match statistics, zeroed for every saved
 * player, with an empty timeline (the next sample falls on the next
 * whole minute of game time). A v1 save has no record of what happened
 * before it, so nothing is estimated.
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
  return { ...data, stats };
};
