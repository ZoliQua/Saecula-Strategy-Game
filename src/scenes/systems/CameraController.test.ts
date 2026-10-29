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

  it('a trackpad swipe pans the camera; a mouse notch and a pinch zoom it around the pointer', () => {
    const scene = fakeScene(listenerTarget());
    const cam = {
      zoom: 1,
      scrollX: 0,
      scrollY: 0,
      setZoom(z: number) {
        this.zoom = z;
      },
      getWorldPoint(x: number, y: number) {
        return { x: this.scrollX + x / this.zoom, y: this.scrollY + y / this.zoom };
      },
    };
    const s = { ...scene, cameras: { main: cam }, input: Object.assign(scene.input, { activePointer: { x: 100, y: 50 } }) };
    const ctl = new CameraController(s as unknown as Phaser.Scene, { keyTarget: listenerTarget() });
    const wheel = (o: object) => {
      const event = { deltaX: 0, deltaY: 0, deltaMode: 0, ctrlKey: false, ...o };
      s.input.emit('wheel', { x: 100, y: 50, event }, [], event.deltaX, event.deltaY);
    };
    wheel({ deltaX: 3, deltaY: 1.5 });
    expect(cam).toMatchObject({ zoom: 1, scrollX: 3, scrollY: 1.5 });
    wheel({ deltaY: -100 });
    expect(cam.zoom).toBeCloseTo(1.1);
    // The world point under the pointer stays put.
    const p = cam.getWorldPoint(100, 50);
    expect(p.x).toBeCloseTo(103);
    expect(p.y).toBeCloseTo(51.5);
    wheel({ deltaY: 5, ctrlKey: true });
    expect(cam.zoom).toBeCloseTo(1.1 * Math.exp(-0.05));
    scene.events.emit('shutdown');
    void ctl;
  });

  it('zoomStep zooms one notch around the screen centre within the limits; centerOnTile centres on the tile', () => {
    const scene = fakeScene(listenerTarget());
    const cam = {
      zoom: 1,
      scrollX: 0,
      scrollY: 0,
      width: 1280,
      height: 720,
      centred: null as { x: number; y: number } | null,
      setZoom(z: number) {
        this.zoom = z;
      },
      centerOn(x: number, y: number) {
        this.centred = { x, y };
      },
      getWorldPoint(x: number, y: number) {
        return { x: this.scrollX + x / this.zoom, y: this.scrollY + y / this.zoom };
      },
    };
    const s = { ...scene, cameras: { main: cam } };
    const ctl = new CameraController(s as unknown as Phaser.Scene, { keyTarget: listenerTarget() });
    ctl.zoomStep(1);
    expect(cam.zoom).toBeCloseTo(1.1);
    const c = cam.getWorldPoint(640, 360);
    expect(c.x).toBeCloseTo(640);
    expect(c.y).toBeCloseTo(360);
    for (let i = 0; i < 20; i++) ctl.zoomStep(1);
    expect(cam.zoom).toBe(2);
    for (let i = 0; i < 40; i++) ctl.zoomStep(-1);
    expect(cam.zoom).toBe(0.5);
    ctl.centerOnTile({ tx: 11, ty: 6 });
    expect(cam.centred).toEqual({ x: (11 - 6) * 32, y: (11 + 6) * 16 });
    scene.events.emit('shutdown');
  });
});
