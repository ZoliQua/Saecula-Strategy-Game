import { hasHill, hasRegicide, type VictoryMode } from '../../game/GameSetupConfig';
import { hu } from '../../i18n/hu';
import type { MatchRecord } from '../../stats/matchRecord';

/**
 * The mode line of a logged match: the M19 modes only (the old modes' rows
 * stay as they were), with what decided it when that was not the mode itself.
 */
export function matchModeTexts({ setup, cause }: { setup: { victory: VictoryMode }; cause: MatchRecord['cause'] }): string[] {
  const mode = setup.victory;
  if (!hasRegicide(mode) && !hasHill(mode)) return [];
  const name = hu.setup.victories[mode];
  return cause === null || cause === mode ? [name] : [name, `${hu.gameOver.causeLabel}: ${hu.gameOver.causes[cause]}`];
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** A record's local date and time, Hungarian style ("2026. 10. 29. 14:05"). */
export function formatWhen(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}. ${pad(d.getMonth() + 1)}. ${pad(d.getDate())}. ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** A 0..1 rate as a whole percent with a thin space ("67 %"); "–" for none. */
export function formatRate(rate: number | null): string {
  return rate === null ? '–' : `${Math.round(rate * 100)}\u202f%`;
}

/** A match length: "m:ss", or "h:mm:ss" from an hour; "–" for none. */
export function formatLength(ms: number | null): string {
  if (ms === null) return '–';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** The exported JSON: every record, oldest first, with when and what it is. */
export function exportPayload(records: readonly MatchRecord[], now: Date): string {
  return JSON.stringify({ app: 'saecula', kind: 'match-log', version: 1, exportedAt: now.toISOString(), count: records.length, records }, null, 2);
}
