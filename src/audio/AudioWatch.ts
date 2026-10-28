import {
  ATTACK_NOTICE_DISTANCE_TILES,
  ATTACK_NOTICE_INTERVAL_MS,
  BUILDING_DAMAGE_INTERVAL_MS,
  COMBAT_MUSIC_RADIUS,
  GATHER_SOUND_INTERVAL_MS,
} from '../config/audio';
import type { Entity } from '../ecs/components';
import type { EcsWorld } from '../ecs/world';
import { gameEvents } from '../game/events';
import { isAgeUp } from '../game/technologies';
import type { TileCoord } from '../iso/coordinates';
import type { ProjectileKind, ResourceType } from '../types';
import type { AudioSink } from './AudioManager';
import { tileDistance } from './mix';
import type { SfxKey } from './sfx/catalogue';

const SHOT_SOUND: Readonly<Record<ProjectileKind, SfxKey>> = {
  arrow: 'arrow_shot',
  bolt: 'arrow_shot',
  bullet: 'musket_shot',
  cannonball: 'cannon_shot',
};

const GATHER_SOUND: Readonly<Record<ResourceType, SfxKey>> = {
  wood: 'gather_wood',
  gold: 'gather_gold',
  food: 'gather_food',
};

type Shot = NonNullable<Entity['projectile']>;

/** Where a sound of `e` comes from: its tile, or a building's footprint centre. */
function soundTile(e: Entity & { position: TileCoord }): TileCoord {
  const f = e.building?.footprint;
  if (!f) return e.position;
  return { tx: e.position.tx + (f.width - 1) / 2, ty: e.position.ty + (f.height - 1) / 2 };
}

/**
 * Game sounds from watching the ECS (it never writes it) and the game
 * events: shots and impacts, blows, damage, deaths, construction,
 * gathering, and the human's notifications. Positions are entity tiles;
 * the sink applies falloff and fog. `combatNear()` reports hp loss close
 * to the camera this frame (the combat music trigger, Task 9).
 */
export class AudioWatch {
  private readonly hp = new Map<Entity, number>();
  private readonly carrying = new Map<Entity, number>();
  private readonly lastGather = new Map<Entity, number>();
  private readonly lastDamage = new Map<Entity, number>();
  private readonly unsubscribe: Array<() => void> = [];
  /** Shots that landed since the last update: their targets, and the cannon blasts. */
  private readonly shotTargets = new Set<number>();
  private readonly blasts: { x: number; y: number; r: number }[] = [];
  private lastAttackNotice = -Infinity;
  private near = false;

  constructor(
    private readonly world: EcsWorld,
    private readonly sink: AudioSink,
    private readonly humanId: number | undefined,
    private readonly camera: () => TileCoord,
  ) {
    const shots = world.with('projectile');
    const dying = world.with('dying');
    const sites = world.with('underConstruction', 'position');
    const health = world.with('health', 'position');
    const gatherers = world.with('gatherer', 'position');
    this.unsubscribe.push(
      shots.onEntityAdded.subscribe((e) => this.onFired(e.projectile)),
      shots.onEntityRemoved.subscribe((e) => this.onLanded(e.projectile)),
      dying.onEntityAdded.subscribe((e) => {
        if (!e.position) return;
        this.sink.playSFX(e.building ? 'building_destroyed' : 'unit_die', 1, soundTile(e as Entity & { position: TileCoord }));
      }),
      sites.onEntityAdded.subscribe((e) => this.sink.playSFX('building_start', 1, soundTile(e))),
      // Removed with its work done: finished. A razed site leaves the world unfinished.
      sites.onEntityRemoved.subscribe((e) => {
        const c = e.underConstruction;
        if (c.elapsed >= c.totalTime) this.sink.playSFX('building_complete', 1, soundTile(e));
      }),
      health.onEntityRemoved.subscribe((e) => {
        this.hp.delete(e);
        this.lastDamage.delete(e);
      }),
      gatherers.onEntityRemoved.subscribe((e) => {
        this.carrying.delete(e);
        this.lastGather.delete(e);
      }),
      gameEvents.on('ageChanged', ({ playerId }) => {
        if (playerId === this.humanId) this.sink.playSFX('notification_age_up');
      }),
      gameEvents.on('techResearched', ({ playerId, techId }) => {
        // An age-up tech already played the age-up fanfare.
        if (playerId === this.humanId && !isAgeUp(techId)) this.sink.playSFX('notification_research_complete');
      }),
      gameEvents.on('wonderCompleted', () => this.sink.playSFX('notification_wonder')),
    );
  }

  /** Per frame, after the game systems: diffs hp and loads against the last frame. */
  update(realNowMs: number): void {
    const cam = this.camera();
    this.near = false;
    for (const e of this.world.with('health', 'position')) {
      const prev = this.hp.get(e);
      const cur = e.health.current;
      this.hp.set(e, cur);
      if (prev === undefined || cur >= prev) continue;
      this.onHurt(e, cam, realNowMs);
    }
    for (const e of this.world.with('gatherer', 'position')) {
      const prev = this.carrying.get(e);
      const { carrying, carryingType } = e.gatherer;
      this.carrying.set(e, carrying);
      if (prev === undefined) continue;
      if (carrying > prev && carryingType) {
        const last = this.lastGather.get(e) ?? -Infinity;
        if (realNowMs - last < GATHER_SOUND_INTERVAL_MS) continue;
        this.lastGather.set(e, realNowMs);
        this.sink.playSFX(GATHER_SOUND[carryingType], 1, e.position);
      } else if (carrying === 0 && prev > 0) {
        this.sink.playSFX('resource_deposit', 1, e.position);
      }
    }
    this.shotTargets.clear();
    this.blasts.length = 0;
  }

  /** True when hp was lost within COMBAT_MUSIC_RADIUS of the camera in the last update. */
  combatNear(): boolean {
    return this.near;
  }

  destroy(): void {
    for (const off of this.unsubscribe.splice(0)) off();
  }

  private onFired(shot: Shot): void {
    this.sink.playSFX(SHOT_SOUND[shot.kind], 1, { tx: shot.from.x, ty: shot.from.y });
  }

  private onLanded(shot: Shot): void {
    // Only a shot that completed its flight landed (not one cleared with the world).
    if (shot.elapsedMs < shot.durationMs) return;
    this.shotTargets.add(shot.targetId);
    if (shot.kind !== 'cannonball') return;
    this.blasts.push({ x: shot.to.x, y: shot.to.y, r: shot.aoeRadius + 0.5 });
    this.sink.playSFX('cannon_impact', 1, { tx: shot.to.x, ty: shot.to.y });
  }

  private onHurt(e: Entity & { position: TileCoord }, cam: TileCoord, nowMs: number): void {
    const at = soundTile(e);
    const distance = tileDistance(at, cam);
    if (distance <= COMBAT_MUSIC_RADIUS) this.near = true;
    if (e.building) {
      const last = this.lastDamage.get(e) ?? -Infinity;
      if (nowMs - last >= BUILDING_DAMAGE_INTERVAL_MS) {
        this.lastDamage.set(e, nowMs);
        this.sink.playSFX('building_damage', 1, at);
      }
    } else if (!this.hitByShot(e)) {
      this.sink.playSFX('sword_hit', 1, at);
    }
    const mine = this.humanId !== undefined && e.owner?.playerId === this.humanId;
    if (mine && distance > ATTACK_NOTICE_DISTANCE_TILES && nowMs - this.lastAttackNotice >= ATTACK_NOTICE_INTERVAL_MS) {
      this.lastAttackNotice = nowMs;
      this.sink.playSFX('notification_attacked');
    }
  }

  /** A shot that landed this frame accounts for the hp loss (its own sound already played). */
  private hitByShot(e: Entity & { position: TileCoord }): boolean {
    if (e.id !== undefined && this.shotTargets.has(e.id)) return true;
    return this.blasts.some((b) => Math.hypot(e.position.tx - b.x, e.position.ty - b.y) <= b.r);
  }
}
