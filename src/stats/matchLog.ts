import { MATCH_LOG_CAP } from '../config/constants';
import { StoredMatchRecordSchema, type MatchRecord } from './matchRecord';

/** The part of localforage's API the match log uses. */
export interface MatchStore {
  getItem(key: string): Promise<unknown>;
  setItem(key: string, value: string): Promise<unknown>;
  removeItem(key: string): Promise<unknown>;
  keys(): Promise<string[]>;
}

const PREFIX = 'match:';

/** A record's storage key: 'match:<matchId>' (one key per match, however often it is saved and resumed). */
export const matchKey = (matchId: string): string => `${PREFIX}${matchId}`;

/** Every record that could be read, oldest first; `corrupt` counts the ones skipped. `ok` false: the store is unavailable. */
export interface MatchLogRead {
  ok: boolean;
  records: MatchRecord[];
  corrupt: number;
}

/** The record stored under `key`, or null; a record of the dev build before match ids takes its id from the key. */
function parseRecord(key: string, raw: unknown): MatchRecord | null {
  if (typeof raw !== 'string') return null;
  try {
    const parsed = StoredMatchRecordSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    return { ...parsed.data, matchId: parsed.data.matchId ?? key.slice(PREFIX.length) };
  } catch {
    return null;
  }
}

/** A stored record's key and what it reads as (null: unreadable). */
interface Entry {
  key: string;
  record: MatchRecord | null;
}

/** Oldest first by createdAt (unreadable records first of all), ties by key. */
function byAge(a: Entry, b: Entry): number {
  const ta = a.record?.createdAt ?? '';
  const tb = b.record?.createdAt ?? '';
  if (ta !== tb) return ta < tb ? -1 : 1;
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
}

/**
 * The local match log (M7 Decision 11): one JSON record per match in a
 * key-value store (IndexedDB 'isorts' / 'matches' in the browser), keyed
 * by the match id, so a later end of the same match (resumed from a
 * save) replaces its earlier record, except that an abandon never replaces
 * a decided result. At most `cap` records; the oldest
 * by createdAt (unreadable ones first) are dropped. Nothing here throws:
 * a missing or failing store is reported as unavailable.
 */
export class MatchLog {
  constructor(
    private readonly store: MatchStore | null,
    private readonly cap = MATCH_LOG_CAP,
  ) {}

  /** The last queued write (append runs one at a time). */
  private writes: Promise<void> = Promise.resolve();

  /**
   * Writes `record`, then trims the log to the cap. An 'abandoned' record
   * never replaces a decided ('victory' / 'defeat') record of the same
   * match: the decided result is kept (true). False when it could not be written.
   */
  append(record: MatchRecord): Promise<boolean> {
    // One write at a time: an abandon's read-then-write must not interleave with a decided write.
    const next = this.writes.then(() => this.write(record));
    this.writes = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  private async write(record: MatchRecord): Promise<boolean> {
    if (!this.store) return false;
    try {
      if (record.outcome === 'abandoned') {
        const key = matchKey(record.matchId);
        const earlier = parseRecord(key, await this.store.getItem(key).catch(() => null));
        if (earlier && earlier.outcome !== 'abandoned') return true;
      }
      await this.store.setItem(matchKey(record.matchId), JSON.stringify(record));
    } catch {
      return false;
    }
    try {
      const entries = await this.entries();
      for (const { key } of entries.slice(0, Math.max(0, entries.length - this.cap))) await this.store.removeItem(key);
    } catch {
      // The record is stored; trimming is retried on the next write.
    }
    return true;
  }

  async readAll(): Promise<MatchLogRead> {
    if (!this.store) return { ok: false, records: [], corrupt: 0 };
    try {
      const entries = await this.entries();
      const records = entries.flatMap((e) => (e.record ? [e.record] : []));
      return { ok: true, records, corrupt: entries.length - records.length };
    } catch {
      return { ok: false, records: [], corrupt: 0 };
    }
  }

  /** Every stored record, oldest first (byAge). Rejects only when the key listing fails. */
  private async entries(): Promise<Entry[]> {
    const store = this.store;
    if (!store) return [];
    const keys = (await store.keys()).filter((k) => k.startsWith(PREFIX));
    const entries: Entry[] = [];
    for (const key of keys) {
      // One unreadable record is skipped as corrupt; only a failing key listing makes the log unavailable.
      const raw = await store.getItem(key).catch(() => null);
      entries.push({ key, record: parseRecord(key, raw) });
    }
    return entries.sort(byAge);
  }
}
