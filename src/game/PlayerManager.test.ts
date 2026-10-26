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
    const mgr = createPlayers('hungarian', 5);
    expect(mgr.all().map((p) => p.id)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(mgr.ais()).toHaveLength(5);
    expect(new Set(mgr.all().map((p) => p.color)).size).toBe(6);
  });
});
