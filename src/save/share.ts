import { SAVE_SHARE } from '../config/constants';
import { parseSave } from './parse';
import type { SaveData } from './schema';

/** What an import reads (a browser File, or a stand-in in tests). */
export interface ImportSource {
  readonly size: number;
  text(): Promise<string>;
}

export type ImportResult = { ok: true; save: SaveData } | { ok: false; reason: 'tooLarge' | 'unreadable' | 'corrupt' | 'newer' };

/** A save as the text of a shared JSON file (the same JSON a slot stores). */
export function exportSaveText(save: SaveData): string {
  return JSON.stringify(save);
}

/**
 * Reads a shared save file: refused above SAVE_SHARE.maxBytes before it
 * is read, then checked exactly like a stored save (parseSave: migration,
 * zod, consistency). Never throws or rejects.
 */
export async function importSaveFile(file: ImportSource, maxBytes: number = SAVE_SHARE.maxBytes): Promise<ImportResult> {
  if (!(file.size <= maxBytes)) return { ok: false, reason: 'tooLarge' };
  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, reason: 'unreadable' };
  }
  if (text.length > maxBytes) return { ok: false, reason: 'tooLarge' };
  return parseSave(text);
}
