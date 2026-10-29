import type { MatchRecord } from '../../stats/matchRecord';

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

/** Thousands with a thin space (12 345). */
export const grouped = (n: number): string => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');

/** The export file's local date part (YYYY-MM-DD). */
export function exportDate(now: Date): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** The exported JSON: every record, oldest first, with when and what it is. */
export function exportPayload(records: readonly MatchRecord[], now: Date): string {
  return JSON.stringify({ app: 'isorts', kind: 'match-log', version: 1, exportedAt: now.toISOString(), count: records.length, records }, null, 2);
}
