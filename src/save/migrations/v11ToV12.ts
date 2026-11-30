import type { Migration } from './index';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * v11 (M17) → v12 (M18): every player's match statistics gain the repair
 * count (a v11 player never repaired, so 0) and gathered-by-type (unknown
 * for v11, so zeros: the total `gathered` is kept); a value already there is kept. Villagers gained the
 * `repairIntent` component, which no v11 save has. Stats that are not
 * objects are left for the schema to reject.
 */
export const v11ToV12: Migration = (data) => {
  const stats = data['stats'];
  if (!isRecord(stats) || !isRecord(stats['players'])) return data;
  const players: Record<string, unknown> = {};
  for (const [id, s] of Object.entries(stats['players'])) players[id] = isRecord(s) ? { ...s, repairsDone: s['repairsDone'] ?? 0, gatheredBy: s['gatheredBy'] ?? { food: 0, wood: 0, gold: 0 } } : s;
  return { ...data, stats: { ...stats, players } };
};
