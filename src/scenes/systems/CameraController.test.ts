import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';

// Phaser needs a browser; the controller only uses event names and Clamp from it.
vi.mock('phaser', () => ({
  default: {
    Input: { Events: { POINTER_WHEEL: 'wheel', POINTER_MOVE: 'pointermove' } },
    Scenes: { Events: { SHUTDOWN: 'shutdown' } },
    Math: { Clamp: (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v)) },
  },
}));

import type Phaser from 'phaser';
import { CameraController } from './CameraController';

type Listener = (e: unknown) => void;

/** Counts live listeners per event type. */
function listenerTarget() {
  const live = new Map<string, Set<Listener>>();
  return {
    count: () => [...live.values()].reduce((n, s) => n + s.size, 0),
    addEventListener: (type: string, fn: Listener) => void live.set(type, (live.get(type) ?? new Set()).add(fn)),
    removeEventListener: (type: string, fn: Listener) => void live.get(type)?.delete(fn),
  };
}

/** The slice of a Phaser scene the controller touches, with a real emitter for its events and input. */
function fakeScene(canvas: ReturnType<typeof listenerTarget>) {
  return {
    events: new EventEmitter(),
    input: new EventEmitter(),
    cameras: { main: { zoom: 1, scrollX: 0, scrollY: 0 } },
    game: { canvas },
    scale: { width: 1280, height: 720 },
  };
}

describe('CameraController', () => {
  it('releases its window key, canvas and input listeners on every scene shutdown (two matches in a row)', () => {
    const keys = listenerTarget();
    const canvas = listenerTarget();
    const scene = fakeScene(canvas);
    for (let match = 0; match < 2; match++) {
      new CameraController(scene as unknown as Phaser.Scene, { keyTarget: keys });
      expect(keys.count()).toBe(3);
      expect(canvas.count()).toBe(2);
      scene.events.emit('shutdown');
      expect(keys.count()).toBe(0);
      expect(canvas.count()).toBe(0);
      expect(scene.input.listenerCount('wheel') + scene.input.listenerCount('pointermove')).toBe(0);
    }
  });
});
