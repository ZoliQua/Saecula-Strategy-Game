import { MATCH_LOG_CAP } from '../config/constants';
import { MatchRecordSchema, type MatchRecord } from './matchRecord';

/** The part of localforage's API the match log uses. */
export interface MatchStore {
  getItem(key: string): Promise<unknown>;
  setItem(key: string, value: string): Promise<unknown>;
  removeItem(key: string): Promise<unknown>;
  keys(): Promise<string[]>;
}

const PREFIX = 'match:';

/** A record's storage key: 'match:<createdAt ISO>' (ISO strings sort by time). */
export const matchKey = (createdAt: string): string => `${PREFIX}${createdAt}`;

/** Every record that could be read, oldest first; `corrupt` counts the ones skipped. `ok` false: the store is unavailable. */
export interface MatchLogRead {
  ok: boolean;
  records: MatchRecord[];
  corrupt: number;
}

function parseRecord(raw: unknown): MatchRecord | null {
  if (typeof raw !== 'string') return null;
  try {
    const parsed = MatchRecordSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * The local match log (M7 Decision 11): one JSON record per match in a
 * key-value store (IndexedDB 'isorts' / 'matches' in the browser), at
 * most `cap` records, the oldest dropped first. Nothing here throws:
 * a missing or failing store is reported as unavailable.
 */
export class MatchLog {
  constructor(
    private readonly store: MatchStore | null,
    private readonly cap = MATCH_LOG_CAP,
  ) {}

  /** Writes `record`, then trims the log to the cap. False when it could not be written. */
  async append(record: MatchRecord): Promise<boolean> {
    if (!this.store) return false;
    try {
      await this.store.setItem(matchKey(record.createdAt), JSON.stringify(record));
    } catch {
      return false;
    }
    try {
      const keys = (await this.store.keys()).filter((k) => k.startsWith(PREFIX)).sort();
      for (const key of keys.slice(0, Math.max(0, keys.length - this.cap))) await this.store.removeItem(key);
    } catch {
      // The record is stored; trimming is retried on the next write.
    }
    return true;
  }

  async readAll(): Promise<MatchLogRead> {
    if (!this.store) return { ok: false, records: [], corrupt: 0 };
    try {
      const keys = (await this.store.keys()).filter((k) => k.startsWith(PREFIX)).sort();
      const records: MatchRecord[] = [];
      let corrupt = 0;
      for (const key of keys) {
        // One unreadable record is skipped as corrupt; only a failing key listing makes the log unavailable.
        const raw = await this.store.getItem(key).catch(() => null);
        const record = parseRecord(raw);
        if (record) records.push(record);
        else corrupt++;
      }
      return { ok: true, records, corrupt };
    } catch {
      return { ok: false, records: [], corrupt: 0 };
    }
  }
}
