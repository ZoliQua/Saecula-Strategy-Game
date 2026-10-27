import { describe, expect, it } from 'vitest';
import type { CivId } from '../../types';
import type { Entity } from '../components';
import { toSelectedInfo } from './selectedInfo';

const civOf = (playerId: number): CivId => (playerId === 2 ? 'english' : 'hungarian');

function barracks(playerId: number): Entity {
  return {
    id: 7,
    position: { tx: 4, ty: 5 },
    building: { type: 'barracks', footprint: { width: 3, height: 3 } },
    health: { current: 900, max: 1000 },
    selectable: { selected: true },
    owner: { playerId },
    trainingQueue: { entries: [{ unitType: 'swordsman', elapsed: 5, totalTime: 10 }] },
  } as Entity;
}

describe('toSelectedInfo', () => {
  it("gives a building its owner's civ (queue thumbnails of an enemy building show the enemy's look)", () => {
    const info = toSelectedInfo(barracks(2) as Parameters<typeof toSelectedInfo>[0], civOf);
    expect(info?.kind).toBe('building');
    expect(info && info.kind === 'building' ? info.civ : null).toBe('english');
    expect(info && info.kind === 'building' ? info.queue : null).toEqual([{ unitType: 'swordsman', progress: 0.5 }]);
  });

  it("gives a unit its owner's civ", () => {
    const unit = {
      id: 3,
      position: { tx: 1, ty: 1 },
      unit: { unitType: 'archer' },
      health: { current: 30, max: 30 },
      selectable: { selected: true },
      owner: { playerId: 1 },
    } as Entity;
    const info = toSelectedInfo(unit as Parameters<typeof toSelectedInfo>[0], civOf);
    expect(info && info.kind === 'unit' ? info.civ : null).toBe('hungarian');
  });

  it('reports a gatherer\'s load in whole units (no float noise in the HUD)', () => {
    const unit = {
      id: 4,
      position: { tx: 1, ty: 1 },
      unit: { unitType: 'villager' },
      health: { current: 25, max: 25 },
      selectable: { selected: true },
      owner: { playerId: 2 },
      gatherer: { carryingType: 'food', carrying: 0.2857740000128747 },
    } as unknown as Entity;
    const info = toSelectedInfo(unit as Parameters<typeof toSelectedInfo>[0], civOf);
    expect(info && info.kind === 'unit' ? info.carrying : null).toEqual({ type: 'food', amount: 0 });
  });
});
