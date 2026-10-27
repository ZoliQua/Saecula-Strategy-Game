import { describe, expect, it } from 'vitest';
import { liveView } from './liveView';

describe('liveView', () => {
  it('is the view from the current scroll and zoom, not the last rendered worldView (a minimap jump)', () => {
    const cam = { width: 800, height: 600, zoom: 1, scrollX: 1000, scrollY: 400, worldView: { x: 0, y: 0, width: 800, height: 600 } };
    expect(liveView(cam)).toEqual({ x: 1000, y: 400, width: 800, height: 600, right: 1800, bottom: 1000 });
  });

  it('zooms around the camera centre like Phaser', () => {
    const v = liveView({ width: 800, height: 600, zoom: 2, scrollX: 0, scrollY: 0 });
    expect(v).toEqual({ x: 200, y: 150, width: 400, height: 300, right: 600, bottom: 450 });
  });
});
