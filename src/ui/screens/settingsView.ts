import { hu } from '../../i18n/hu';
import type { RebindResult } from '../keymap';

export interface SettingsNotice {
  readonly text: string;
  readonly tone: 'info' | 'ok' | 'error';
}

/** What the settings card says after a key press (`code`) in capture mode: a refusal, a swap, or nothing. */
export function rebindNotice(result: RebindResult, code = ''): SettingsNotice | null {
  if (!result.ok) return { text: code === 'Tab' ? hu.settings.reservedTab : hu.settings.reserved, tone: 'error' };
  if (result.swappedWith !== undefined) return { text: hu.settings.swapped(hu.settings.actions[result.swappedWith]), tone: 'info' };
  return null;
}
