import { afterEach, describe, expect, it } from 'vitest';
import { SFX_GLOBAL_VOICES } from '../config/audio';
import type { Entity } from '../ecs/components';
import { createEcsWorld, type EcsWorld } from '../ecs/world';
import { gameEvents } from '../game/events';
import type { TileCoord } from '../iso/coordinates';
import type { ProjectileKind, ResourceType } from '../types';
import type { AudioSink } from './AudioManager';
import { AudioWatch } from './AudioWatch';
import { SFX_CATALOGUE, type SfxKey } from './sfx/catalogue';
import { VoiceLimiter } from './sfx/VoiceLimiter';

interface Played {
  key: SfxKey;
  position: TileCoord | undefined;
}

function recorder(): AudioSink & { played: Played[]; keys(): SfxKey[]; clear(): void } {
  const played: Played[] = [];
  return {
    played,
    playSFX: (key, _volume, position) => played.push({ key, position }),
    keys: () => played.map((p) => p.key),
    clear: () => played.splice(0),
  };
}

const HUMAN = 1;
let watch: AudioWatch | null = null;
afterEach(() => watch?.destroy());

function setup(camera: TileCoord = { tx: 10, ty: 10 }) {
  const world = createEcsWorld();
  const sink = recorder();
  let cam = camera;
  watch = new AudioWatch(world, sink, HUMAN, () => cam);
  return { world, sink, w: watch, moveCamera: (c: TileCoord) => (cam = c) };
}

let nextId = 100;
const unit = (world: EcsWorld, tx: number, ty: number, playerId = 2): Entity =>
  world.add({ id: nextId++, position: { tx, ty }, unit: { unitType: 'swordsman' }, health: { current: 40, max: 40 }, owner: { playerId } });
const building = (world: EcsWorld, tx: number, ty: number, playerId = 2, extra: Partial<Entity> = {}): Entity =>
  world.add({
    id: nextId++,
    position: { tx, ty },
    building: { type: 'house', footprint: { width: 2, height: 2 } },
    health: { current: 500, max: 500 },
    owner: { playerId },
    ...extra,
  });

function shot(world: EcsWorld, kind: ProjectileKind, targetId = 0, to = { x: 11, y: 10 }): Entity {
  return world.add({
    projectile: {
      kind,
      from: { x: 9, y: 10 },
      to,
      elapsedMs: 0,
      durationMs: 300,
      arcHeight: 1,
      ownerId: 2,
      payload: { meleeAtk: 0, pierceAtk: 5, bonusVsCavalry: 0 },
      targetId,
      aoeRadius: kind === 'cannonball' ? 1 : 0,
    },
  });
}

/** Lands a shot the way ProjectileSystem does: flight complete, then removed. */
function land(world: EcsWorld, e: Entity): void {
  e.projectile!.elapsedMs = e.projectile!.durationMs;
  world.remove(e);
}

describe('AudioWatch', () => {
  it('a projectile fires its shot sound by kind, and a landed cannonball its impact', () => {
    const { world, sink, w } = setup();
    shot(world, 'arrow');
    shot(world, 'bolt');
    shot(world, 'bullet');
    const ball = shot(world, 'cannonball', 0, { x: 12, y: 11 });
    expect(sink.keys()).toEqual(['arrow_shot', 'arrow_shot', 'musket_shot', 'cannon_shot']);
    expect(sink.played[0]!.position).toEqual({ tx: 9, ty: 10 });
    sink.clear();
    land(world, ball);
    w.update(0);
    expect(sink.played).toEqual([{ key: 'cannon_impact', position: { tx: 12, ty: 11 } }]);
  });

  it('a unit losing hp with no projectile landing on it plays a sword hit', () => {
    const { world, sink, w } = setup();
    const u = unit(world, 11, 10);
    w.update(0);
    expect(sink.played).toHaveLength(0);
    u.health!.current -= 5;
    w.update(16);
    expect(sink.played).toEqual([{ key: 'sword_hit', position: { tx: 11, ty: 10 } }]);
    sink.clear();
    // An arrow lands on it this frame: the shot covers the hit, no sword.
    const arrow = shot(world, 'arrow', u.id);
    sink.clear();
    land(world, arrow);
    u.health!.current -= 5;
    w.update(32);
    expect(sink.keys()).toEqual([]);
    // Units caught in a cannon blast get no sword hit either.
    const ball = shot(world, 'cannonball', 0, { x: 11, y: 10 });
    sink.clear();
    land(world, ball);
    u.health!.current -= 5;
    w.update(48);
    expect(sink.keys()).toEqual(['cannon_impact']);
  });

  it('a building losing hp plays its damage sound at most once per 2 s', () => {
    const { world, sink, w } = setup();
    const b = building(world, 10, 10);
    w.update(0);
    b.health!.current -= 10;
    w.update(100);
    b.health!.current -= 10;
    w.update(1500);
    expect(sink.played).toEqual([{ key: 'building_damage', position: { tx: 10.5, ty: 10.5 } }]);
    b.health!.current -= 10;
    w.update(2200);
    expect(sink.keys()).toEqual(['building_damage', 'building_damage']);
  });

  it('dying plays the unit death or the building collapse', () => {
    const { world, sink } = setup();
    const u = unit(world, 10, 11);
    const b = building(world, 12, 12);
    world.addComponent(u, 'dying', { ttlMs: 1000 });
    world.addComponent(b, 'dying', { ttlMs: 1000 });
    expect(sink.keys()).toEqual(['unit_die', 'building_destroyed']);
  });

  it('a site placed starts, and a finished one completes; a razed site never completes', () => {
    const { world, sink } = setup();
    const site = building(world, 10, 10, 1, { underConstruction: { totalTime: 10, elapsed: 0 } });
    expect(sink.keys()).toEqual(['building_start']);
    site.underConstruction!.elapsed = 10;
    world.removeComponent(site, 'underConstruction');
    expect(sink.keys()).toEqual(['building_start', 'building_complete']);
    sink.clear();
    const razed = building(world, 14, 14, 1, { underConstruction: { totalTime: 10, elapsed: 3 } });
    world.remove(razed);
    expect(sink.keys()).toEqual(['building_start']);
  });

  it('a gatherer filling up plays its resource (once per 1.5 s), and emptying plays the deposit', () => {
    const { world, sink, w } = setup();
    const v = world.add({
      id: nextId++,
      position: { tx: 10, ty: 10 },
      gatherer: { carryingType: null as ResourceType | null, carrying: 0, capacity: 10, gatherRate: 1, targetNodeId: undefined, dropoffId: undefined },
    });
    const g = v.gatherer!;
    w.update(0);
    g.carryingType = 'wood';
    g.carrying = 1;
    w.update(100);
    g.carrying = 2;
    w.update(900);
    expect(sink.keys()).toEqual(['gather_wood']);
    g.carrying = 3;
    w.update(1700);
    expect(sink.keys()).toEqual(['gather_wood', 'gather_wood']);
    g.carrying = 0;
    g.carryingType = null;
    w.update(1800);
    expect(sink.keys()).toEqual(['gather_wood', 'gather_wood', 'resource_deposit']);
    sink.clear();
    g.carryingType = 'gold';
    g.carrying = 1;
    w.update(4000);
    g.carrying = 0;
    g.carryingType = 'food';
    w.update(4100);
    g.carrying = 1;
    w.update(6000);
    expect(sink.keys()).toEqual(['gather_gold', 'resource_deposit', 'gather_food']);
  });

  it('a human unit hit far from the camera, twice within 20 s → one notification', () => {
    const { world, sink, w } = setup({ tx: 10, ty: 10 });
    const mine = unit(world, 40, 40, HUMAN);
    w.update(0);
    mine.health!.current -= 3;
    w.update(1000);
    mine.health!.current -= 3;
    w.update(15_000);
    expect(sink.played.filter((p) => p.key === 'notification_attacked')).toEqual([{ key: 'notification_attacked', position: undefined }]);
    mine.health!.current -= 3;
    w.update(21_500);
    expect(sink.keys().filter((k) => k === 'notification_attacked')).toHaveLength(2);
    // Near the camera, no notice: the player is watching.
    sink.clear();
    const near = unit(world, 12, 10, HUMAN);
    w.update(50_000);
    near.health!.current -= 3;
    w.update(50_100);
    expect(sink.keys()).toEqual(['sword_hit']);
  });

  it('combatNear() is true for an hp drop within 8 tiles of the camera this frame only', () => {
    const { world, w } = setup({ tx: 10, ty: 10 });
    const near = unit(world, 15, 10);
    const far = unit(world, 30, 10);
    w.update(0);
    far.health!.current -= 1;
    w.update(16);
    expect(w.combatNear()).toBe(false);
    near.health!.current -= 1;
    w.update(32);
    expect(w.combatNear()).toBe(true);
    w.update(48);
    expect(w.combatNear()).toBe(false);
  });

  it('events: the human age-up, research and anyone\'s Wonder play their notifications', () => {
    const { sink } = setup();
    gameEvents.emit('ageChanged', { playerId: HUMAN, age: 2 });
    // The age-up tech's own techResearched plays nothing more.
    gameEvents.emit('techResearched', { playerId: HUMAN, techId: 'feudalism' });
    gameEvents.emit('techResearched', { playerId: HUMAN, techId: 'blade_sharpening_1' });
    gameEvents.emit('ageChanged', { playerId: 2, age: 2 });
    gameEvents.emit('techResearched', { playerId: 2, techId: 'armor_1' });
    gameEvents.emit('wonderCompleted', { playerId: 3, entityId: 9 });
    expect(sink.played).toEqual([
      { key: 'notification_age_up', position: undefined },
      { key: 'notification_research_complete', position: undefined },
      { key: 'notification_wonder', position: undefined },
    ]);
  });

  it('destroy() stops every subscription', () => {
    const { world, sink, w } = setup();
    w.destroy();
    shot(world, 'arrow');
    gameEvents.emit('wonderCompleted', { playerId: 1, entityId: 1 });
    expect(sink.played).toHaveLength(0);
  });

  it('a world with 200 fighting units produces ≤ SFX_GLOBAL_VOICES sounds per frame through the limiter', () => {
    const world = createEcsWorld();
    const limiter = new VoiceLimiter(SFX_GLOBAL_VOICES);
    let now = 0;
    let frame = 0;
    const sink: AudioSink = {
      playSFX: (key) => {
        if (limiter.request(key, SFX_CATALOGUE[key].gain, now, SFX_CATALOGUE[key]) !== null) frame++;
      },
    };
    watch = new AudioWatch(world, sink, HUMAN, () => ({ tx: 10, ty: 10 }));
    const units = Array.from({ length: 200 }, (_, i) => unit(world, 5 + (i % 10), 5 + Math.floor(i / 20), i % 2 === 0 ? HUMAN : 2));
    watch.update(now);
    for (let f = 0; f < 60; f++) {
      now += 16;
      frame = 0;
      for (const [i, u] of units.entries()) {
        u.health!.current -= 0.1;
        if (f % 6 === i % 6) shot(world, i % 3 === 0 ? 'arrow' : 'bullet');
      }
      watch.update(now);
      expect(frame).toBeLessThanOrEqual(SFX_GLOBAL_VOICES);
      expect(limiter.active).toBeLessThanOrEqual(SFX_GLOBAL_VOICES);
    }
  });
});
