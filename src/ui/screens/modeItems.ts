import {
  DEFAULT_VICTORY,
  hasHill,
  HILL_TEMPLATES,
  SPEED_CHOICES,
  START_RESOURCE_IDS,
  TREATY_MINUTES,
  VICTORY_MODES,
  victoryAllowed,
  type GameSetupConfig,
  type VictoryMode,
} from '../../game/GameSetupConfig';
import { hu } from '../../i18n/hu';
import type { MapTemplate } from '../../map/generator';
import type { SegmentItem } from './Segmented';

/*
 * The setup card's mode rows (victory, M19; allies, treaty, starting
 * resources, speed, M16) as segmented-control items. Segmented works on string values,
 * so numbers travel as their decimal text.
 */

/** The victory options in one row of four (the old modes) and one of two (M19). */
export const VICTORY_PER_ROW = 4;

export function victoryItems(): SegmentItem<VictoryMode>[] {
  return VICTORY_MODES.map((id) => ({ value: id, label: hu.setup.victories[id] }));
}

/** The victory row on `template`: the options it has no place for and the line under the row ('' = none). */
export function victoryRowView(template: MapTemplate, reset: boolean): { disabled: VictoryMode[]; hint: string; warn: boolean } {
  const disabled = VICTORY_MODES.filter((mode) => !victoryAllowed(mode, template));
  if (disabled.length === 0) return { disabled, hint: '', warn: false };
  const t = hu.setup;
  const hint = reset
    ? t.hillReset(t.victories[DEFAULT_VICTORY])
    : t.hillOnly(HILL_TEMPLATES.map((id) => t.templates[id].name));
  return { disabled, hint, warn: reset };
}

/**
 * Whether the row still has to say that the template took the hill away:
 * from that switch until a mode is picked or a hill map is back.
 */
export function victoryWasReset(was: boolean, before: GameSetupConfig, change: Partial<GameSetupConfig>, after: GameSetupConfig): boolean {
  if (change.victory !== undefined || victoryAllowed('hill', after.template)) return false;
  return was || hasHill(before.victory);
}

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
