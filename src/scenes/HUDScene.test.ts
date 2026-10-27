import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';

const hudUpdates = vi.hoisted(() => ({ count: 0 }));

// Phaser needs a browser; the scene only uses its event bus, which a Node emitter stands in for.
vi.mock('phaser', () => {
  class Scene {
    readonly events = new EventEmitter();
    readonly textures = {};
    constructor(_config: unknown) {}
  }
  return { default: { Scene, Scenes: { Events: { UPDATE: 'update', SHUTDOWN: 'shutdown' } } } };
});

vi.mock('../ui/HUD', () => ({
  Hud: class {
    update(): void {
      hudUpdates.count++;
    }
    destroy(): void {}
  },
}));

const { HUDScene } = await import('./HUDScene');

describe('HUDScene', () => {
  it('refreshes the HUD once per frame however many games the session has played', () => {
    const scene = new HUDScene();
    const events = (scene as unknown as { events: EventEmitter }).events;
    // Like Phaser's Systems.step: emit UPDATE, then call the scene's update().
    const frame = (): void => {
      events.emit('update', 0, 16);
      (scene as unknown as { update?: (t: number, d: number) => void }).update?.(0, 16);
    };
    for (let game = 0; game < 3; game++) {
      scene.create();
      hudUpdates.count = 0;
      frame();
      expect(hudUpdates.count).toBe(1);
      // Phaser's shutdown fires SHUTDOWN but does not clear the scene's event bus.
      events.emit('shutdown');
    }
  });
});
