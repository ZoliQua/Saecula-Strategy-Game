import {
  DEFAULT_VICTORY,
  HILL_TEMPLATES,
  REGICIDE_TEMPLATES,
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

/**
 * The victory row on `template`: the options it has no place for and the line
 * under the row ('' = none). `reset` is the mode a template switch took away
 * (victoryResetMode), named instead of the plain rule.
 */
export function victoryRowView(template: MapTemplate, reset: VictoryMode | null): { disabled: VictoryMode[]; hint: string; warn: boolean } {
  const disabled = VICTORY_MODES.filter((mode) => !victoryAllowed(mode, template));
  const t = hu.setup;
  const names = (templates: readonly MapTemplate[]) => templates.map((id) => t.templates[id].name);
  if (reset !== null) {
    const fallback = t.victories[DEFAULT_VICTORY];
    return { disabled, hint: reset === 'regicide' ? t.regicideReset(fallback) : t.hillReset(fallback), warn: true };
  }
  const lines: string[] = [];
  if (disabled.includes('regicide')) lines.push(t.regicideOnly(names(REGICIDE_TEMPLATES)));
  if (disabled.includes('hill')) lines.push(t.hillOnly(names(HILL_TEMPLATES)));
  return { disabled, hint: lines.join(' '), warn: false };
}

/**
 * The mode a template switch took away, while the row still has to say so:
 * from that switch until a mode is picked or a template allows it again
 * (null = nothing to say).
 */
export function victoryResetMode(
  was: VictoryMode | null,
  before: GameSetupConfig,
  change: Partial<GameSetupConfig>,
  after: GameSetupConfig,
): VictoryMode | null {
  if (change.victory !== undefined) return null;
  const lost = was ?? before.victory;
  return victoryAllowed(lost, after.template) ? null : lost;
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
