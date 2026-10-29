import { describe, expect, it } from 'vitest';
import { exportDate, exportPayload, formatLength, formatRate, formatWhen } from './statsView';

describe('statsView', () => {
  it('formats rates and lengths', () => {
    expect([formatRate(null), formatRate(0), formatRate(2 / 3), formatRate(1)]).toEqual(['–', '0\u202f%', '67\u202f%', '100\u202f%']);
    expect([formatLength(null), formatLength(65_400), formatLength(3_725_000)]).toEqual(['–', '1:05', '1:02:05']);
  });

  it('dates are local and zero-padded', () => {
    const d = new Date(2026, 0, 5, 9, 7);
    expect(formatWhen(d.toISOString())).toBe('2026. 01. 05. 09:07');
    expect(exportDate(d)).toBe('2026-01-05');
  });

  it('the export holds every record', () => {
    const now = new Date('2026-10-29T10:00:00.000Z');
    const parsed = JSON.parse(exportPayload([], now)) as Record<string, unknown>;
    expect(parsed).toEqual({ app: 'saecula', kind: 'match-log', version: 1, exportedAt: '2026-10-29T10:00:00.000Z', count: 0, records: [] });
  });
});
