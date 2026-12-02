import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { FogOfWarData } from '../../map/FogOfWarData';
import { FX_KEYS } from '../../iso/textures';
import { killEntity } from '../../game/kill';
import { createUnit } from '../archetypes/createUnit';
import type { Entity } from '../components';
import { createEcsWorld, type EcsWorld } from '../world';
import { CrownSystem } from './CrownSystem';
import { isVisibleToViewer, type Renderable } from './renderPlacement';

interface FakeImage {
  key: string;
  x: number;
  y: number;
  depth: number;
  visible: boolean;
  destroyed: boolean;
}

function fakeScene() {
  const images: FakeImage[] = [];
  const image = (x: number, y: number, key: string) => {
    const state: FakeImage = { key, x, y, depth: 0, visible: true, destroyed: false };
    images.push(state);
    const img = {
      setScale: () => img,
      setOrigin: () => img,
      setPosition: (nx: number, ny: number) => ((state.x = nx), (state.y = ny), img),
      setDepth: (d: number) => ((state.depth = d), img),
      setVisible: (v: boolean) => ((state.visible = v), img),
      destroy: () => void (state.destroyed = true),
    };
    return img;
  };
  return { scene: { add: { image } } as unknown as Phaser.Scene, live: () => images.filter((i) => !i.destroyed) };
}

/** The sprite RenderSystem would have given the unit. */
function drawn(world: EcsWorld, type: 'king' | 'knight', playerId: number, depth = 10.3) {
  const unit = createUnit(world, { type, tile: { tx: 5, ty: 5 }, playerId });
  unit.sprite = { x: 100, y: 200, depth, visible: true } as Phaser.GameObjects.Sprite;
  return unit as Entity & { health: { current: number; max: number }; sprite: Phaser.GameObjects.Sprite };
}

describe('CrownSystem (M19)', () => {
  it('only a king wears a crown: above its head, just over its sprite', () => {
    const world = createEcsWorld();
    drawn(world, 'king', 1);
    drawn(world, 'knight', 1);
    const { scene, live } = fakeScene();
    new CrownSystem(scene, world).update();
    expect(live()).toHaveLength(1);
    const crown = live()[0]!;
    expect(crown.key).toBe(FX_KEYS.crown);
    expect(crown.x).toBe(100);
    expect(crown.y).toBeLessThan(200 - 30);
    expect(crown.depth).toBeGreaterThan(10.3001); // over the team layer
    expect(crown.depth).toBeLessThan(10.31);
  });

  it('follows the unit without making a second one', () => {
    const world = createEcsWorld();
    const king = drawn(world, 'king', 1);
    const { scene, live } = fakeScene();
    const crowns = new CrownSystem(scene, world);
    crowns.update();
    const before = { ...live()[0]! };
    Object.assign(king.sprite, { x: 132, y: 216, depth: 11.3 });
    crowns.update();
    expect(live()).toHaveLength(1);
    expect(live()[0]!.x - before.x).toBe(32);
    expect(live()[0]!.y - before.y).toBe(16);
    expect(live()[0]!.depth - before.depth).toBeCloseTo(1);
  });

  it('is hidden with the unit in fog, and back with it', () => {
    const world = createEcsWorld();
    const king = drawn(world, 'king', 2);
    const fog = new FogOfWarData(16, 16);
    const { scene, live } = fakeScene();
    const crowns = new CrownSystem(scene, world);
    const frame = () => {
      (king.sprite as { visible: boolean }).visible = isVisibleToViewer(king as Renderable, fog, 1);
      crowns.update();
    };
    frame();
    expect(live()[0]!.visible).toBe(false);
    fog.markVisible(5, 5);
    frame();
    expect(live()[0]!.visible).toBe(true);
  });

  it('is raised with an occluded king, as its selection ring is', () => {
    const world = createEcsWorld();
    drawn(world, 'king', 1);
    const { scene, live } = fakeScene();
    new CrownSystem(scene, world, () => 14.2).update();
    expect(live()[0]!.depth).toBe(14.2);
  });

  it('waits for the sprite', () => {
    const world = createEcsWorld();
    createUnit(world, { type: 'king', tile: { tx: 1, ty: 1 }, playerId: 1 });
    const { scene, live } = fakeScene();
    new CrownSystem(scene, world).update();
    expect(live()).toEqual([]);
  });

  it('goes when the king dies', () => {
    const world = createEcsWorld();
    const king = drawn(world, 'king', 1);
    const { scene, live } = fakeScene();
    const crowns = new CrownSystem(scene, world);
    crowns.update();
    killEntity(world, king);
    crowns.update();
    expect(live()).toEqual([]);
  });

  it('goes aboard with it and comes back ashore', () => {
    const world = createEcsWorld();
    const king = drawn(world, 'king', 1);
    const { scene, live } = fakeScene();
    const crowns = new CrownSystem(scene, world);
    crowns.update();
    world.remove(king);
    crowns.update();
    expect(live()).toEqual([]);
    world.add(king);
    crowns.update();
    expect(live()).toHaveLength(1);
  });

  it('destroy leaves none behind, and a new match builds its own', () => {
    const world = createEcsWorld();
    drawn(world, 'king', 1);
    const { scene, live } = fakeScene();
    const crowns = new CrownSystem(scene, world);
    crowns.update();
    crowns.destroy();
    expect(live()).toEqual([]);
    new CrownSystem(scene, world).update();
    expect(live()).toHaveLength(1);
  });
});
