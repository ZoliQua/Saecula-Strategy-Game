import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';
import { createSettingsStore } from '../../ui/settings';
import { onKeyAction, type KeyActionHost } from './KeyActions';

type Listener = (e: unknown) => void;

function host(active = { value: true }) {
  const listeners = new Set<Listener>();
  const events = new EventEmitter();
  const target = {
    addEventListener: (_t: string, fn: Listener) => void listeners.add(fn),
    removeEventListener: (_t: string, fn: Listener) => void listeners.delete(fn),
  };
  const h: KeyActionHost = { sys: { isActive: () => active.value }, events: { once: (e, fn) => void events.once(e, fn) } };
  const press = (o: Partial<KeyboardEvent> & { code: string }) => {
    const e = { key: '', repeat: false, ctrlKey: false, metaKey: false, altKey: false, defaultPrevented: false, target: null, prevented: false, ...o };
    const ev = { ...e, preventDefault: () => void (ev.prevented = true) };
    for (const fn of [...listeners]) fn(ev);
    return ev;
  };
  return { h, target, press, listeners, events, active };
}

describe('onKeyAction', () => {
  it('fires on the bound code (read at press time), prevents its default, and ignores other keys', () => {
    const store = createSettingsStore(null);
    const { h, target, press } = host();
    const got: boolean[] = [];
    onKeyAction(h, 'scorePanel', (e) => got.push(e.repeat), { target, store });
    expect(press({ code: 'Tab' }).prevented).toBe(true);
    expect(press({ code: 'KeyQ' }).prevented).toBe(false);
    store.getState().rebind('scorePanel', { code: 'KeyP', label: 'P' });
    press({ code: 'Tab' });
    press({ code: 'KeyP', repeat: true });
    expect(got).toEqual([false, true]);
  });

  it('ignores a press while typing, with a browser modifier, already handled, or with the scene paused', () => {
    const store = createSettingsStore(null);
    const t = host();
    let n = 0;
    onKeyAction(t.h, 'home', () => n++, { target: t.target, store });
    t.press({ code: 'KeyH', target: { tagName: 'input' } as unknown as EventTarget });
    t.press({ code: 'KeyH', metaKey: true });
    t.press({ code: 'KeyH', ctrlKey: true });
    t.press({ code: 'KeyH', defaultPrevented: true });
    t.active.value = false;
    t.press({ code: 'KeyH' });
    expect(n).toBe(0);
    t.active.value = true;
    t.press({ code: 'KeyH', shiftKey: true });
    expect(n).toBe(1);
  });

  it('unwires on scene shutdown and through the returned function', () => {
    const store = createSettingsStore(null);
    const t = host();
    onKeyAction(t.h, 'home', () => {}, { target: t.target, store });
    const off = onKeyAction(t.h, 'techTree', () => {}, { target: t.target, store });
    expect(t.listeners.size).toBe(2);
    off();
    expect(t.listeners.size).toBe(1);
    t.events.emit('shutdown');
    expect(t.listeners.size).toBe(0);
  });

  it('Backspace is a fixed second key for deleteBuilding only (a MacBook delete key), repeats included', () => {
    const store = createSettingsStore(null);
    const t = host();
    const del: boolean[] = [];
    let home = 0;
    onKeyAction(t.h, 'deleteBuilding', (e) => del.push(e.repeat), { target: t.target, store });
    onKeyAction(t.h, 'home', () => home++, { target: t.target, store });
    expect(t.press({ code: 'Backspace' }).prevented).toBe(true);
    t.press({ code: 'Backspace', repeat: true });
    t.press({ code: 'Backspace', target: { tagName: 'TEXTAREA' } as unknown as EventTarget });
    store.getState().rebind('deleteBuilding', { code: 'KeyX', label: 'X' });
    t.press({ code: 'Backspace' });
    t.press({ code: 'KeyX' });
    expect(del).toEqual([false, true, false, false]);
    expect(home).toBe(0);
  });

  it('a press while a modal card is open (game over, settings) is left alone, so Tab keeps moving focus there', () => {
    const store = createSettingsStore(null);
    const t = host();
    let modal = true;
    let n = 0;
    onKeyAction(t.h, 'scorePanel', () => n++, { target: t.target, store, modalOpen: () => modal });
    expect(t.press({ code: 'Tab' }).prevented).toBe(false);
    modal = false;
    expect(t.press({ code: 'Tab' }).prevented).toBe(true);
    expect(n).toBe(1);
  });
});
