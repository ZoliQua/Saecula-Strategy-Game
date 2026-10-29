import { describe, expect, it } from 'vitest';
import { hu } from '../../i18n/hu';
import { DEFAULT_KEYS, rebind } from '../keymap';
import { rebindNotice } from './settingsView';

describe('rebindNotice', () => {
  it('a reserved key shows the refusal', () => {
    expect(rebindNotice(rebind(DEFAULT_KEYS, 'panUp', { code: 'Escape', label: 'ESC' }))).toEqual({ text: hu.settings.reserved, tone: 'error' });
  });

  it('a swap names the action that took the old key', () => {
    const notice = rebindNotice(rebind(DEFAULT_KEYS, 'panUp', { code: 'KeyA', label: 'A' }));
    expect(notice).toEqual({ text: 'Csere: a(z) „Kamera balra” megkapta a korábbi billentyűt', tone: 'info' });
  });

  it('a free key or the same key says nothing', () => {
    expect(rebindNotice(rebind(DEFAULT_KEYS, 'panUp', { code: 'KeyI', label: 'I' }))).toBeNull();
    expect(rebindNotice(rebind(DEFAULT_KEYS, 'panUp', { code: 'KeyW', label: 'W' }))).toBeNull();
  });

  it('Tab on another action says it belongs to the score panel', () => {
    expect(rebindNotice(rebind(DEFAULT_KEYS, 'home', { code: 'Tab', label: 'Tab' }), 'Tab')).toEqual({ text: hu.settings.reservedTab, tone: 'error' });
  });
});
