import { describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { FogOfWarData } from '../../map/FogOfWarData';
import { createUnit } from '../archetypes/createUnit';
import { createEcsWorld } from '../world';

vi.mock('phaser', () => ({ default: {} }));

const { HealthBarSystem } = await import('./HealthBarSystem');

/** A scene that counts the rectangles still on screen. */
function fakeScene() {
  const live = new Set<object>();
  const rectangle = () => {
    const r = {
      setStrokeStyle: () => r,
      setOrigin: () => r,
      setPosition: () => r,
      setSize: () => r,
      setDepth: () => r,
      setFillStyle: () => r,
      destroy: () => void live.delete(r),
    };
    live.add(r);
    return r;
  };
  return { scene: { add: { rectangle } } as unknown as Phaser.Scene, bars: () => live.size / 2 };
}

const VIEWER = 1;
const AT = { tx: 5, ty: 5 };

function setup(playerId: number) {
  const world = createEcsWorld();
  const fog = new FogOfWarData(16, 16);
  const unit = createUnit(world, { type: 'swordsman', tile: AT, playerId });
  unit.health!.current -= 5;
  const { scene, bars } = fakeScene();
  const system = new HealthBarSystem(scene, world);
  system.setFogContext(fog, VIEWER);
  return { fog, system, bars };
}

describe('HealthBarSystem under fog', () => {
  it('draws no bar for a damaged enemy on unexplored ground', () => {
    const { system, bars } = setup(2);
    system.update();
    expect(bars()).toBe(0);
  });

  it('draws the bar while the enemy is in sight and drops it on explored ground out of sight', () => {
    const { fog, system, bars } = setup(2);
    fog.markVisible(AT.tx, AT.ty);
    system.update();
    expect(bars()).toBe(1);

    fog.dimVisibleToExplored();
    system.update();
    expect(bars()).toBe(0);

    fog.markVisible(AT.tx, AT.ty);
    system.update();
    expect(bars()).toBe(1);
  });

  it("always draws the viewer's own bar", () => {
    const { system, bars } = setup(VIEWER);
    system.update();
    expect(bars()).toBe(1);
  });
});
