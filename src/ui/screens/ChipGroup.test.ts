import { beforeEach, describe, expect, it } from 'vitest';

/*
 * Accessible name and description of a chip (Task 2 review N1): a chip
 * with a description ("Vegyes", described as "véletlen") must be named by
 * its label alone, so a screen reader does not read the description
 * twice (once in the name from content, once as the description).
 */

interface FakeNode {
  tag: string;
  attrs: Record<string, string>;
  children: Array<FakeNode | string>;
  className: string;
  tabIndex: number;
  setAttribute(k: string, v: string): void;
  getAttribute(k: string): string | null;
  append(...c: Array<FakeNode | string>): void;
  addEventListener(): void;
  focus(): void;
}

function fakeNode(tag: string): FakeNode {
  return {
    tag,
    attrs: {},
    children: [],
    className: '',
    tabIndex: 0,
    setAttribute(k, v) {
      this.attrs[k] = v;
    },
    getAttribute(k) {
      return this.attrs[k] ?? null;
    },
    append(...c) {
      this.children.push(...c);
    },
    addEventListener: () => undefined,
    focus: () => undefined,
  };
}

const text = (n: FakeNode | string): string => (typeof n === 'string' ? n : n.children.map(text).join(' ').trim());
const all = (n: FakeNode): FakeNode[] => [n, ...n.children.flatMap((c) => (typeof c === 'string' ? [] : all(c)))];
const byIds = (root: FakeNode, ids: string | null): string => (ids ?? '').split(' ').filter(Boolean).map((id) => text(all(root).find((n) => n.attrs['id'] === id) ?? '')).join(' ');

/** The accessible name (aria-labelledby, else the content) and description of a button inside `root`. */
function a11y(root: FakeNode, b: FakeNode): { name: string; description: string } {
  const labelledBy = b.getAttribute('aria-labelledby');
  return { name: labelledBy ? byIds(root, labelledBy) : text(b), description: byIds(root, b.getAttribute('aria-describedby')) };
}

describe('ChipGroup accessibility', () => {
  beforeEach(() => {
    (globalThis as Record<string, unknown>)['document'] = { createElement: (tag: string) => fakeNode(tag) };
  });

  it('names a described chip by its label only and reads the description once', async () => {
    const { ChipGroup } = await import('./ChipGroup');
    const group = new ChipGroup('ai-civs', 'Ellenfelek népe', [
      { value: 'mixed', label: 'Vegyes', swatch: 'red', description: 'véletlen' },
      { value: 'hungarian', label: 'Magyar', swatch: 'green' },
    ], 'mixed', () => undefined);
    const root = group.root as unknown as FakeNode;
    const chips = all(root).filter((n) => n.tag === 'button');
    expect(chips.map((b) => a11y(root, b))).toEqual([
      { name: 'Vegyes', description: 'véletlen' },
      { name: 'Magyar', description: '' },
    ]);
  });
});
