import { describe, expect, it } from 'vitest';
import { clickKind } from './commandGesture';

const ev = (o: Partial<{ button: number; ctrlKey: boolean; metaKey: boolean; altKey: boolean }>) => ({
  button: 0,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  ...o,
});

describe('clickKind', () => {
  it('the right button always commands', () => {
    for (const g of ['ctrl', 'meta', 'alt', 'none'] as const) expect(clickKind(ev({ button: 2 }), g)).toBe('command');
  });

  it('a plain left click selects', () => {
    expect(clickKind(ev({}), 'ctrl')).toBe('select');
  });

  it("a left click with the gesture's modifier commands", () => {
    expect(clickKind(ev({ ctrlKey: true }), 'ctrl')).toBe('command');
    expect(clickKind(ev({ metaKey: true }), 'meta')).toBe('command');
    expect(clickKind(ev({ altKey: true }), 'alt')).toBe('command');
  });

  it('another modifier, or the none gesture, leaves a left click a selection (Mac Ctrl+click included)', () => {
    expect(clickKind(ev({ ctrlKey: true }), 'meta')).toBe('select');
    expect(clickKind(ev({ ctrlKey: true }), 'none')).toBe('select');
    expect(clickKind(ev({ altKey: true }), 'ctrl')).toBe('select');
  });

  it('the middle button does neither', () => {
    expect(clickKind(ev({ button: 1 }), 'ctrl')).toBe('other');
  });
});
