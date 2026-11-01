import { hu } from '../../i18n/hu';
import { exportSaveText } from '../../save/share';
import type { SaveStorage, SlotId } from '../../save/storage';
import { downloadText } from '../../ui/download';
import { readErrorText } from './MatchRestore';

/** The local calendar date as YYYY-MM-DD. */
function isoDay(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** The shared file's name for `slot`'s save (hu.save.exportFile). */
export function exportFileName(slot: SlotId, now: Date): string {
  return hu.save.exportFile(String(slot), isoDay(now));
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
