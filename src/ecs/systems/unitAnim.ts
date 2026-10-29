import { ANIM_FRAMES, WALK_CYCLE_TILES, type UnitAnim } from '../../iso/art/units/layout';
import type { Direction } from '../../types';
import type { Entity } from '../components';
import { onFootprintRing } from '../footprint';
import type { EcsWorld } from '../world';

/** Total time a dying entity stays in the world (CombatSystem DEATH_TTL_MS). */
export const DYING_MS = 900;
/** Each death frame shows this long; the corpse then lies still and fades. */
const DEATH_FRAME_MS = 120;
const IDLE_FRAME_MS = 700;
const WORK_FRAME_MS = 150;
/** Strike frames (2, 3, 4) after the blow lands, ms since the swing. */
const STRIKE_END_MS = [110, 220, 340] as const;
/** Wind-up frames (0, 1) shown during the last part of the cooldown. */
const WINDUP_MS = [300, 150] as const;
const FALLBACK_WALK_CYCLE_MS = 420;

export interface UnitAnimState {
  readonly anim: UnitAnim;
  /** Frame within the animation. */
  readonly i: number;
  /** Tile-compass heading (movable.facing). */
  readonly heading: Direction;
}

/**
 * Chooses a unit's animation, frame and heading. Pure so it can be
 * unit tested without Phaser.
 *  - dying → the fall plays once, then the last frame holds;
 *  - moving → walk / gallop / rolling wheels, cycle length tied to speed
 *    so feet don't skate;
 *  - attacking → wind-up before the cooldown ends, strike + follow
 *    through right after a blow lands, ready stance in between;
 *  - working (gathering, building) → tool swing; with `siteOf`, a builder
 *    swings only on the ring around its site (not while it waits for a
 *    path, nor inside the footprint it is stepping out of);
 *  - else a slow breathing idle, desynchronised per entity.
 */
export function unitAnimState(entity: Entity, now: number, siteOf?: SiteLookup): UnitAnimState {
  const heading = entity.movable?.facing ?? 'SE';
  const phase = ((entity.id ?? 0) * 397) % 10_000;
  if (entity.dying) {
    const elapsed = DYING_MS - entity.dying.ttlMs;
    return { anim: 'death', i: Math.min(ANIM_FRAMES.death - 1, Math.max(0, Math.floor(elapsed / DEATH_FRAME_MS))), heading };
  }
  const mv = entity.movable;
  if (mv && mv.path.length > 0) {
    const type = entity.unit?.unitType;
    const cycleMs = type && mv.speed > 0 ? (WALK_CYCLE_TILES[type] / mv.speed) * 1000 : FALLBACK_WALK_CYCLE_MS;
    const i = Math.floor(((now + phase) / cycleMs) * ANIM_FRAMES.walk) % ANIM_FRAMES.walk;
    return { anim: 'walk', i, heading };
  }
  const a = entity.attacker;
  if (a && entity.attackIntent) return { anim: 'attack', i: attackFrame(a.cooldownMs, a.cooldownRemaining), heading };
  const g = entity.gatherer;
  const working = (!!g && g.targetNodeId !== undefined && g.carrying < g.capacity) || isBuilding(entity, siteOf);
  if (working) return { anim: 'work', i: Math.floor((now + phase) / WORK_FRAME_MS) % ANIM_FRAMES.work, heading };
  return { anim: 'idle', i: Math.floor((now + phase) / IDLE_FRAME_MS) % ANIM_FRAMES.idle, heading };
}

/** Construction sites by id (the builders' targets). */
export type SiteLookup = (id: number) => Entity | undefined;

/** A per-frame lookup of the world's construction sites (there are few), for `unitAnimState`. */
export function siteLookup(world: EcsWorld): SiteLookup {
  const sites = new Map<number, Entity>();
  for (const s of world.with('building', 'underConstruction', 'position')) if (s.id !== undefined) sites.set(s.id, s);
  return (id) => sites.get(id);
}

function isBuilding(entity: Entity, siteOf: SiteLookup | undefined): boolean {
  const cmd = entity.buildCommand;
  if (!cmd) return false;
  if (!siteOf) return true;
  const site = siteOf(cmd.targetId);
  if (!site?.position || !site.building || !entity.position) return false;
  return onFootprintRing(entity.position, site.position, site.building.footprint);
}

/** Attack frame from the weapon cooldown (a blow lands when the cooldown restarts). */
export function attackFrame(cooldownMs: number, remaining: number): number {
  const since = cooldownMs - remaining;
  if (remaining > 0) {
    for (let k = 0; k < STRIKE_END_MS.length; k++) if (since < (STRIKE_END_MS[k] ?? 0)) return 2 + k;
  }
  if (remaining < WINDUP_MS[1]) return 1;
  if (remaining < WINDUP_MS[0]) return 0;
  return 4;
}

/** Corpse opacity: solid while falling, fading out over the last part. */
export function dyingAlpha(ttlMs: number): number {
  const FADE_MS = 360;
  return Math.max(0, Math.min(1, ttlMs / FADE_MS));
}
