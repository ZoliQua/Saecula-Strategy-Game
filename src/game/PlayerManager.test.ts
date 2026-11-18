import { describe, expect, it } from 'vitest';
import { createPlayer } from './Player';
import { createDefaultPlayers, createPlayers, PlayerManager } from './PlayerManager';

describe('PlayerManager', () => {
  it('returns human and AI correctly', () => {
    const mgr = createDefaultPlayers();
    expect(mgr.human()?.id).toBe(1);
    expect(mgr.ais().map((p) => p.id)).toEqual([2]);
  });

  it('activeOpponents excludes the viewer and defeated players', () => {
    const mgr = new PlayerManager([
      createPlayer({ id: 1, isHuman: true }),
      createPlayer({ id: 2 }),
      createPlayer({ id: 3, defeated: true }),
    ]);
    const human = mgr.human()!;
    const opponents = mgr.activeOpponents(human);
    expect(opponents.map((p) => p.id)).toEqual([2]);
  });

  it('markDefeated flips the defeated flag', () => {
    const mgr = createDefaultPlayers();
    mgr.markDefeated(2);
    expect(mgr.get(2)?.defeated).toBe(true);
  });

  it('PLAYER_COLORS wrap past 6', () => {
    const p7 = createPlayer({ id: 7 });
    const p1 = createPlayer({ id: 1 });
    expect(p7.color).toBe(p1.color);
  });

  it('createPlayers gives every AI its own id and colour', () => {
    const mgr = createPlayers('hungarian', ['english', 'hungarian', 'english', 'english', 'hungarian']);
    expect(mgr.all().map((p) => p.id)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(mgr.ais()).toHaveLength(5);
    expect(new Set(mgr.all().map((p) => p.color)).size).toBe(6);
  });

  it('createPlayers gives each player its assigned civ', () => {
    const mgr = createPlayers('english', ['hungarian', 'english']);
    expect(mgr.all().map((p) => p.civ)).toEqual(['english', 'hungarian', 'english']);
  });
});

describe('createPlayers starting resources (M16)', () => {
  it('defaults to the normal preset and copies a given stock per player', () => {
    expect(createPlayers('hungarian', ['english']).all().map((p) => p.resources)).toEqual([
      { food: 200, wood: 200, gold: 100 },
      { food: 200, wood: 200, gold: 100 },
    ]);
    const stock = { food: 5, wood: 6, gold: 7 };
    const mgr = createPlayers('hungarian', ['english', 'german'], stock);
    expect(mgr.all().map((p) => p.resources)).toEqual([stock, stock, stock]);
    mgr.human()!.resources.food = 0;
    expect(mgr.ais()[0]!.resources.food).toBe(5);
    expect(stock.food).toBe(5);
  });
});
