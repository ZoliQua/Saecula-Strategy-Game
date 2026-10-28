import { hu } from '../../i18n/hu';
import type { SlotId, SlotSummary } from '../../save/storage';
import { formatClock } from '../dom';

/** One row of the save / load slot list (SaveSlots). */
export interface SlotRow {
  slot: SlotId;
  title: string;
  /** The save's description, "Üres hely", or why the slot cannot be used. */
  detail: string;
  disabled: boolean;
  status: 'empty' | 'ok' | 'error';
}

const DATE = new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeStyle: 'short' });

/** The save's line: civ · age · template · size · game time · saved date. */
function describe(summary: SlotSummary): string {
  const { meta, createdAt, gameTimeMs } = summary;
  if (!meta) return '';
  const parts = [
    hu.civs[meta.humanCiv],
    hu.gameOver.ageLabel(meta.humanAge),
    hu.setup.templates[meta.template].name,
    hu.setup.sizes[meta.mapSize],
    formatClock(gameTimeMs ?? 0),
  ];
  const date = createdAt ? new Date(createdAt) : null;
  if (date && !Number.isNaN(date.getTime())) parts.push(DATE.format(date));
  return parts.join(' · ');
}

/**
 * The slot list's rows (pure). Save mode lists the manual slots only;
 * anything but an unavailable store can be written. Load mode adds the
 * autosave, and only usable saves can be picked; the rest show why.
 */
export function slotRows(summaries: readonly SlotSummary[], mode: 'save' | 'load'): SlotRow[] {
  return summaries
    .filter((s) => mode === 'load' || s.slot !== 'auto')
    .map((s): SlotRow => {
      const title = s.slot === 'auto' ? hu.save.autoSlot : hu.save.slotName(s.slot);
      if (s.state === 'ok') return { slot: s.slot, title, detail: describe(s), disabled: false, status: 'ok' };
      if (s.state === 'empty') return { slot: s.slot, title, detail: hu.save.empty, disabled: mode === 'load', status: 'empty' };
      const disabled = mode === 'load' || s.state === 'unavailable';
      return { slot: s.slot, title, detail: hu.save.errors[s.state], disabled, status: 'error' };
    });
}
