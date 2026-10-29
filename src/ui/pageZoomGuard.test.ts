import { describe, expect, it } from 'vitest';
import { blocksPageZoom, guardPageZoom } from './pageZoomGuard';

/** A cancelable event of `type`, with `ctrlKey` (a pinch reaches the page as a ctrl+wheel). */
function event(type: string, ctrlKey = false): Event {
  return Object.assign(new Event(type, { cancelable: true }), { ctrlKey });
}

/** An EventTarget that also remembers the options each listener was added with. */
function target() {
  const t = new EventTarget();
  const options: Record<string, AddEventListenerOptions | boolean | undefined> = {};
  const add = t.addEventListener.bind(t);
  t.addEventListener = (type, listener, opts) => {
    options[type] = opts;
    add(type, listener, opts);
  };
  return { t, options };
}

describe('the page zoom guard over the DOM HUD (final review)', () => {
  it('a pinch is a ctrl wheel; a plain wheel or scroll is not', () => {
    expect(blocksPageZoom({ ctrlKey: true })).toBe(true);
    expect(blocksPageZoom({ ctrlKey: false })).toBe(false);
  });

  it('cancels a pinch over the UI root (non-passive listener) and leaves a plain wheel alone', () => {
    const root = target();
    const doc = target();
    const dispose = guardPageZoom(root.t, doc.t);
    expect(root.options['wheel']).toEqual({ passive: false });
    const pinch = event('wheel', true);
    const scroll = event('wheel', false);
    root.t.dispatchEvent(pinch);
    root.t.dispatchEvent(scroll);
    expect(pinch.defaultPrevented).toBe(true);
    expect(scroll.defaultPrevented).toBe(false);
    dispose();
  });

  it("cancels Safari's gesture events on the document while installed, and nothing after dispose", () => {
    const root = target();
    const doc = target();
    const dispose = guardPageZoom(root.t, doc.t);
    for (const type of ['gesturestart', 'gesturechange']) {
      const e = event(type);
      doc.t.dispatchEvent(e);
      expect(e.defaultPrevented).toBe(true);
      expect(doc.options[type]).toEqual({ passive: false });
    }
    dispose();
    const later = [event('wheel', true), event('gesturestart'), event('gesturechange')];
    root.t.dispatchEvent(later[0]!);
    doc.t.dispatchEvent(later[1]!);
    doc.t.dispatchEvent(later[2]!);
    expect(later.map((e) => e.defaultPrevented)).toEqual([false, false, false]);
  });
});
