import { decodeBytes } from './base64';
import { migrate } from './migrations';
import { positionsOnMap } from './positions';
import { SaveDataSchema, type SaveData } from './schema';

export type ParseResult = { ok: true; save: SaveData } | { ok: false; reason: 'corrupt' | 'newer' };

const CORRUPT = { ok: false, reason: 'corrupt' } as const;
/** Highest fog tile state (FOG_VISIBLE). */
const MAX_FOG_STATE = 2;

/** Whether `text` decodes to exactly `length` bytes, each at most `max`. */
function bytesFit(text: string, length: number, max = 255): boolean {
  try {
    return decodeBytes(text, length).every((b) => b <= max);
  } catch {
    return false;
  }
}

/**
 * What zod cannot see: byte-array lengths, unique ids, exactly one human,
 * records keyed by real players (stats by every player), timeline samples
 * of one value per player, and every tile on the map.
 */
function consistent(save: SaveData): boolean {
  const size = save.map.width * save.map.height;
  if (!bytesFit(save.map.terrain, size) || !bytesFit(save.map.blocked, size, 1)) return false;
  if (!Object.values(save.fogOfWar).every((text) => bytesFit(text, size, MAX_FOG_STATE))) return false;
  const playerIds = new Set(save.players.map((p) => p.id));
  if (playerIds.size !== save.players.length) return false;
  if (save.players.filter((p) => p.isHuman).length !== 1) return false;
  if (!Object.keys(save.fogOfWar).every((id) => playerIds.has(Number(id)))) return false;
  const aiIds = new Set(save.players.filter((p) => !p.isHuman).map((p) => p.id));
  if (!Object.keys(save.ai).every((id) => aiIds.has(Number(id)))) return false;
  const entityIds = new Set(save.entities.map((e) => e.id));
  if (entityIds.size !== save.entities.length) return false;
  if (!save.entities.every((e) => e.id < save.nextEntityId)) return false;
  const statIds = Object.keys(save.stats.players);
  if (statIds.length !== playerIds.size || !statIds.every((id) => playerIds.has(Number(id)))) return false;
  if (!save.stats.timeline.every((t) => t.scores.length === playerIds.size && t.pops.length === playerIds.size)) return false;
  return positionsOnMap(save);
}

/**
 * A stored save (its JSON string, or the parsed object) checked for use:
 * migrated to the current schema, validated by zod, then checked for
 * consistency. 'newer' = written by a newer game; anything else unusable
 * is 'corrupt'. Never throws.
 */
export function parseSave(raw: unknown): ParseResult {
  try {
    const value: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const migrated = migrate(value);
    if (!migrated.ok) return migrated;
    const result = SaveDataSchema.safeParse(migrated.data);
    if (!result.success || !consistent(result.data)) return CORRUPT;
    return { ok: true, save: result.data };
  } catch {
    return CORRUPT;
  }
}
