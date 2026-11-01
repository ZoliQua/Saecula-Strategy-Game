import { hu } from '../../i18n/hu';
import { exportSaveText } from '../../save/share';
import type { SaveStorage, SlotId } from '../../save/storage';
import { downloadText, exportDate } from '../../ui/download';
import { readErrorText } from './MatchRestore';

/** The shared file's name for `slot`'s save (hu.save.exportFile). */
export function exportFileName(slot: SlotId, now: Date): string {
  return hu.save.exportFile(String(slot), exportDate(now));
}

/**
 * Downloads `slot`'s save as a JSON file (M10 export), at the current
 * schema version (an older save is migrated on read). Resolves with the
 * notice to show: the download started, or why the slot cannot be shared.
 */
export async function exportSlot(
  storage: SaveStorage,
  slot: SlotId,
  download: (fileName: string, text: string) => void = downloadText,
  now: Date = new Date(),
): Promise<{ ok: boolean; message: string }> {
  const result = await storage.read(slot);
  if (!result.ok) return { ok: false, message: readErrorText(result.reason) };
  download(exportFileName(slot, now), exportSaveText(result.save));
  return { ok: true, message: hu.save.exported };
}
