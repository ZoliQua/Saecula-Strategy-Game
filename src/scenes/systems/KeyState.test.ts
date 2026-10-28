import { describe, expect, it } from 'vitest';
import { KeyState } from './KeyState';

type Listener = (e: unknown) => void;

function fakeTarget() {
  const listeners = new Map<string, Listener[]>();
  return {
    listeners,
    addEventListener: (type: string, fn: Listener) => listeners.set(type, [...(listeners.get(type) ?? []), fn]),
    removeEventListener: (type: string, fn: Listener) => listeners.set(type, (listeners.get(type) ?? []).filter((f) => f !== fn)),
    fire(type: string, e: unknown = {}) {
      for (const fn of listeners.get(type) ?? []) fn(e);
    },
  };
}

const make = () => {
  const target = fakeTarget();
  // The fake only needs the two listener methods KeyState uses.
  const keys = new KeyState(target as unknown as Pick<Window, 'addEventListener' | 'removeEventListener'>);
  return { target, keys };
};

describe('KeyState', () => {
  it('keydown/keyup track codes', () => {
    const { target, keys } = make();
    target.fire('keydown', { code: 'KeyW', target: null });
    target.fire('keydown', { code: 'ArrowLeft', target: null });
    expect(keys.isDown('KeyW')).toBe(true);
    expect(keys.isDown('ArrowLeft')).toBe(true);
    target.fire('keyup', { code: 'KeyW', target: null });
    expect(keys.isDown('KeyW')).toBe(false);
    expect(keys.isDown('ArrowLeft')).toBe(true);
  });

  it('event from an input element is ignored', () => {
    const { target, keys } = make();
    target.fire('keydown', { code: 'KeyW', target: { tagName: 'INPUT' } });
    target.fire('keydown', { code: 'KeyA', target: { tagName: 'TEXTAREA' } });
    target.fire('keydown', { code: 'KeyS', target: { tagName: 'DIV', isContentEditable: true } });
    target.fire('keydown', { code: 'KeyD', target: { tagName: 'SELECT' } });
    expect(['KeyW', 'KeyA', 'KeyS', 'KeyD'].some((c) => keys.isDown(c))).toBe(false);
    target.fire('keydown', { code: 'KeyD', target: { tagName: 'BUTTON' } });
    expect(keys.isDown('KeyD')).toBe(true);
  });

  it('blur clears all', () => {
    const { target, keys } = make();
    target.fire('keydown', { code: 'KeyW', target: null });
    target.fire('keydown', { code: 'KeyD', target: null });
    target.fire('blur');
    expect(keys.isDown('KeyW')).toBe(false);
    expect(keys.isDown('KeyD')).toBe(false);
  });

  it('releasing Cmd clears the keys whose keyup macOS swallowed during the chord', () => {
    const { target, keys } = make();
    target.fire('keydown', { code: 'MetaLeft', target: null });
    target.fire('keydown', { code: 'KeyA', target: null });
    target.fire('keyup', { code: 'MetaLeft', target: null });
    expect(keys.isDown('KeyA')).toBe(false);
  });

  it('destroy removes its listeners', () => {
    const { target, keys } = make();
    keys.destroy();
    expect([...target.listeners.values()].every((l) => l.length === 0)).toBe(true);
    target.fire('keydown', { code: 'KeyW', target: null });
    expect(keys.isDown('KeyW')).toBe(false);
  });
});
