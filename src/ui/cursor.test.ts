import { describe, expect, it } from 'vitest';
import { cursorFor, type CursorContext } from './cursor';

const villager = { attacks: false, gathers: true };
const soldier = { attacks: true, gathers: false };
const base: CursorContext = { placing: false, units: [villager], target: { kind: 'none' }, passable: true };

describe('cursorFor', () => {
  it('no own unit selected (nothing, or only a building) keeps the default cursor', () => {
    expect(cursorFor({ ...base, units: [] })).toBe('default');
  });

  it('placement mode keeps the default cursor (the ghost is the feedback)', () => {
    expect(cursorFor({ ...base, placing: true, target: { kind: 'enemy' } })).toBe('default');
  });

  it('off the map keeps the default cursor', () => {
    expect(cursorFor({ ...base, passable: null })).toBe('default');
  });

  it('free ground is a move, blocked ground without a target is forbidden', () => {
    expect(cursorFor(base)).toBe('move');
    expect(cursorFor({ ...base, passable: false })).toBe('forbidden');
  });

  it('an enemy is an attack when any selected unit attacks, else a move (or forbidden on its building)', () => {
    expect(cursorFor({ ...base, units: [villager, soldier], target: { kind: 'enemy' } })).toBe('attack');
    expect(cursorFor({ ...base, target: { kind: 'enemy' } })).toBe('move');
    expect(cursorFor({ ...base, target: { kind: 'enemy' }, passable: false })).toBe('forbidden');
  });

  it('an own site is build for villagers', () => {
    expect(cursorFor({ ...base, target: { kind: 'ownSite' }, passable: false })).toBe('build');
    expect(cursorFor({ ...base, units: [soldier], target: { kind: 'ownSite' }, passable: false })).toBe('forbidden');
  });

  it('a resource node is the gather kind of its resource for villagers', () => {
    expect(cursorFor({ ...base, target: { kind: 'resource', resource: 'wood' }, passable: false })).toBe('gatherWood');
    expect(cursorFor({ ...base, target: { kind: 'resource', resource: 'gold' }, passable: false })).toBe('gatherGold');
    expect(cursorFor({ ...base, target: { kind: 'resource', resource: 'food' } })).toBe('gatherFood');
    expect(cursorFor({ ...base, units: [soldier], target: { kind: 'resource', resource: 'wood' }, passable: false })).toBe('forbidden');
    expect(cursorFor({ ...base, units: [soldier], target: { kind: 'resource', resource: 'food' } })).toBe('move');
  });
});

describe('cursorCss', () => {
  it('every kind but default is a data-URI SVG with a hotspot inside the 32×32 image and a fallback', async () => {
    const { cursorCss } = await import('./cursors');
    const { CURSOR_KINDS } = await import('./cursor');
    expect(cursorCss('default')).toBe('');
    for (const kind of CURSOR_KINDS.filter((k) => k !== 'default')) {
      const m = /^url\("data:image\/svg\+xml,[^"]+"\) (\d+) (\d+), [a-z-]+$/.exec(cursorCss(kind));
      expect(m, kind).not.toBeNull();
      for (const v of [Number(m?.[1]), Number(m?.[2])]) expect(v >= 0 && v < 32).toBe(true);
    }
  });
});
