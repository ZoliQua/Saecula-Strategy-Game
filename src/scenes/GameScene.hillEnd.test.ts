import { beforeEach, describe, expect, it, vi } from 'vitest';

// GameScene only needs Phaser's base classes to exist: nothing here boots the engine.
vi.mock('phaser', () => {
  const any: unknown = new Proxy(class {}, { get: (target, key) => (key === 'prototype' ? target.prototype : any) });
  return { default: any };
});

import { GameScene } from './GameScene';
import { HILL } from '../config/balance';
import { createHill } from '../ecs/archetypes/hill';
import { createEcsWorld } from '../ecs/world';
import { createPlayers } from '../game/PlayerManager';
import { MapData } from '../map/MapData';
import { resetUiStore, uiStore } from '../ui/store';
import { hillClockView } from '../ui/panels/HillClock';
import { HudSync } from './game/HudSync';

describe('the match ends on the hill (M19)', () => {
  beforeEach(() => resetUiStore());

  it('publishes the hill once more, so the clock behind the game-over card reads 0:00', () => {
    const world = createEcsWorld();
    const players = createPlayers('hungarian', ['english']);
    const hill = createHill(world, new MapData(20, 20), { tx: 10, ty: 10 }).hill!;
    Object.assign(hill, { holderTeam: 1, heldMs: { 1: HILL.holdMs - 700 } });
    const scene = Object.assign(Object.create(GameScene.prototype) as object, {
      gameOverTriggered: false,
      gameElapsedMs: 600_700,
      difficulty: 'medium',
      players,
      hudSync: new HudSync(world, players, null),
      victoryChecker: { check: () => ({ kind: 'victory', cause: 'hill', winnerId: 1 }) },
      scene: { launch: vi.fn(), bringToTop: vi.fn(), pause: vi.fn() },
    }) as unknown as { checkVictory(): void };
    expect(hillClockView(uiStore.getState().hill!).rows[0]?.time).toBe('0:01');

    // The last 700 ms fall between two once-a-second copies.
    hill.heldMs[1] = HILL.holdMs;
    scene.checkVictory();
    expect(hillClockView(uiStore.getState().hill!).rows[0]?.time).toBe('0:00');
  });
});
