import { SAVE_SLOTS } from '../config/constants';
import { parseSave } from './parse';
import type { SaveData } from './schema';

/** A manual slot (1..5) or the autosave slot. */
export type SlotId = 1 | 2 | 3 | 4 | 5 | 'auto';

/** Every slot in list order: the manual slots, then the autosave. */
export const SLOT_IDS: readonly SlotId[] = [...Array.from({ length: SAVE_SLOTS }, (_, i) => (i + 1) as SlotId), 'auto'];

/** The storage key of a slot (CLAUDE.md §5.4): 'save:1' … 'save:5', 'save:auto'. */
export function saveKey(slot: SlotId): string {
  return `save:${slot}`;
}

/** The part of localforage's API the saves use. */
export interface KeyValueStore {
  getItem(key: string): Promise<unknown>;
  setItem(key: string, value: string): Promise<unknown>;
}

export type WriteResult = { ok: true } | { ok: false; reason: 'unavailable' };
export type ReadResult = { ok: true; save: SaveData } | { ok: false; reason: 'empty' | 'corrupt' | 'newer' | 'unavailable' };

export interface SlotSummary {
  slot: SlotId;
  state: 'empty' | 'ok' | 'corrupt' | 'newer' | 'unavailable';
  meta?: SaveData['meta'];
  createdAt?: string;
  gameTimeMs?: number;
}

/**
 * Save slots over a key-value store (Decision 5): each slot holds the
 * save's JSON string. A missing store (`null`) or a failing call means
 * 'unavailable'; nothing here ever throws or rejects.
 */
export class SaveStorage {
  constructor(private readonly store: KeyValueStore | null) {}

  async write(slot: SlotId, save: SaveData): Promise<WriteResult> {
    if (!this.store) return { ok: false, reason: 'unavailable' };
    try {
      await this.store.setItem(saveKey(slot), JSON.stringify(save));
      return { ok: true };
    } catch {
      return { ok: false, reason: 'unavailable' };
    }
  }

  async read(slot: SlotId): Promise<ReadResult> {
    if (!this.store) return { ok: false, reason: 'unavailable' };
    let raw: unknown;
    try {
      raw = await this.store.getItem(saveKey(slot));
    } catch {
      return { ok: false, reason: 'unavailable' };
    }
    if (raw === null || raw === undefined) return { ok: false, reason: 'empty' };
    // Slots hold strings; anything else was not written by this game.
    if (typeof raw !== 'string') return { ok: false, reason: 'corrupt' };
    return parseSave(raw);
  }

  /** Every slot (1..5, then 'auto') with its state, and the save's meta when it can be used. */
  async list(): Promise<SlotSummary[]> {
    return Promise.all(
      SLOT_IDS.map(async (slot): Promise<SlotSummary> => {
        const result = await this.read(slot);
        if (!result.ok) return { slot, state: result.reason };
        const { meta, createdAt, gameTimeMs } = result.save;
        return { slot, state: 'ok', meta, createdAt, gameTimeMs };
      }),
    );
  }
}
