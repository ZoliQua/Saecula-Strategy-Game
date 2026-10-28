import { describe, expect, it } from 'vitest';
import { hu } from '../../i18n/hu';
import type { SlotSummary } from '../../save/storage';
import { needsConfirm, slotRows } from './slotRows';

const CREATED = '2026-10-28T14:30:00.000Z';
const filled = (slot: SlotSummary['slot']): SlotSummary => ({
  slot,
  state: 'ok',
  meta: { humanCiv: 'english', humanAge: 2, template: 'islands', mapSize: 'large', difficulty: 'hard', aiCount: 3 },
  createdAt: CREATED,
  gameTimeMs: 754_000,
});

const summaries: SlotSummary[] = [
  filled(1),
  { slot: 2, state: 'empty' },
  { slot: 3, state: 'corrupt' },
  { slot: 4, state: 'newer' },
  { slot: 5, state: 'unavailable' },
  filled('auto'),
];

describe('slotRows', () => {
  it('save mode: 5 rows, no auto, filled rows enabled', () => {
    const rows = slotRows(summaries, 'save');
    expect(rows.map((r) => r.slot)).toEqual([1, 2, 3, 4, 5]);
    expect(rows.map((r) => r.title)).toEqual([1, 2, 3, 4, 5].map((n) => hu.save.slotName(n)));
    expect(rows[0]).toMatchObject({ status: 'ok', disabled: false });
    // An empty or unreadable slot can be (over)written; only an unavailable store cannot.
    expect(rows[1]).toEqual({ slot: 2, title: '2. hely', detail: hu.save.empty, disabled: false, status: 'empty' });
    expect(rows[2]).toMatchObject({ status: 'error', disabled: false, detail: hu.save.errors.corrupt });
    expect(rows[3]).toMatchObject({ status: 'error', disabled: false, detail: hu.save.errors.newer });
    expect(rows[4]).toMatchObject({ status: 'error', disabled: true, detail: hu.save.errors.unavailable });
  });

  it('load mode: 6 rows, empty, corrupt and unavailable disabled with their Hungarian reason', () => {
    const rows = slotRows(summaries, 'load');
    expect(rows.map((r) => r.slot)).toEqual([1, 2, 3, 4, 5, 'auto']);
    expect(rows[5]).toMatchObject({ title: hu.save.autoSlot, status: 'ok', disabled: false });
    expect(rows[0]).toMatchObject({ status: 'ok', disabled: false });
    expect(rows[1]).toMatchObject({ status: 'empty', disabled: true, detail: 'Üres hely' });
    expect(rows[2]).toMatchObject({ status: 'error', disabled: true, detail: 'Sérült mentés — nem tölthető be' });
    expect(rows[3]).toMatchObject({ status: 'error', disabled: true, detail: hu.save.errors.newer });
    expect(rows[4]).toMatchObject({ status: 'error', disabled: true, detail: hu.save.errors.unavailable });
  });

  it('detail joins civ, age, template, size, clock and date', () => {
    const [row] = slotRows([filled(1)], 'load');
    const date = new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(CREATED));
    expect(row?.detail).toBe(`Angol · 2. kor · Szigetek · Nagy · 12:34 · ${date}`);
    // The Hungarian form itself, not just "whatever the formatter gives".
    expect(row?.detail).toMatch(/ · 2026\. okt\. 28\. \d{1,2}:\d{2}$/);
  });
});

describe('needsConfirm', () => {
  const [ok, empty, corrupt] = slotRows(summaries, 'save');
  it('save mode asks before writing over anything but an empty slot', () => {
    expect(ok && needsConfirm('save', ok, false)).toBe(true);
    expect(corrupt && needsConfirm('save', corrupt, false)).toBe(true);
    expect(empty && needsConfirm('save', empty, false)).toBe(false);
  });

  it('load mode asks only when loading would replace a running match (confirmLoad)', () => {
    const [save] = slotRows(summaries, 'load');
    expect(save && needsConfirm('load', save, true)).toBe(true);
    expect(save && needsConfirm('load', save, false)).toBe(false);
  });
});
