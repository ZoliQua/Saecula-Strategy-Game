import { SPEED_CHOICES, START_RESOURCE_IDS, TREATY_MINUTES, type GameSetupConfig } from '../../game/GameSetupConfig';
import { hu } from '../../i18n/hu';
import type { SegmentItem } from './Segmented';

/*
 * The M16 rows of the setup card (allies, treaty, starting resources,
 * speed) as segmented-control items. Segmented works on string values,
 * so numbers travel as their decimal text.
 */

/** 0..aiCount - 1 allies (at least one AI stays an enemy). */
export function alliesItems(aiCount: number): SegmentItem<string>[] {
  return Array.from({ length: Math.max(1, aiCount) }, (_, n) => ({ value: String(n), label: String(n) }));
}

export function treatyItems(): SegmentItem<string>[] {
  return TREATY_MINUTES.map((m) => ({ value: String(m), label: hu.setup.treatyLabel(m) }));
}

export function startResourceItems(): SegmentItem<GameSetupConfig['startResources']>[] {
  return START_RESOURCE_IDS.map((id) => ({ value: id, label: hu.setup.startResourceNames[id] }));
}

export function speedItems(): SegmentItem<string>[] {
  return SPEED_CHOICES.map((s) => ({ value: String(s), label: hu.setup.speedLabel(s) }));
}

/** A treaty / speed item's value back as the setup's number (unknown text falls back in withSetup). */
export function parseChoice<T extends number>(value: string, choices: readonly T[]): T | undefined {
  return choices.find((c) => String(c) === value);
}
