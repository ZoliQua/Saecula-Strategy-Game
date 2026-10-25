import { UNIT_FRAMES } from '../../iso/art/units';
import type { Entity } from '../components';

const WALK_STEP_MS = 160;
const WORK_STEP_MS = 380;
const SWING_SHOW_MS = 260;

/**
 * Chooses the animation frame for a unit and a small vertical bob
 * (screen px). Pure so it can be unit tested without Phaser.
 */
export function unitAnimFrame(entity: Entity, now: number): { frame: number; bob: number } {
  const mv = entity.movable;
  const moving = !!mv && mv.path.length > 0;
  if (moving) {
    const step = Math.floor(now / WALK_STEP_MS) % 2;
    return {
      frame: step === 0 ? UNIT_FRAMES.walkA : UNIT_FRAMES.walkB,
      bob: Math.abs(Math.sin((now / WALK_STEP_MS) * Math.PI)) * 1.5,
    };
  }
  const a = entity.attacker;
  if (a && entity.attackIntent && a.cooldownRemaining > a.cooldownMs - SWING_SHOW_MS) {
    return { frame: UNIT_FRAMES.attack, bob: 0 };
  }
  const g = entity.gatherer;
  const working =
    (!!g && g.targetNodeId !== undefined && g.carrying < g.capacity) || !!entity.buildCommand;
  if (working) {
    const swing = Math.floor(now / WORK_STEP_MS) % 2 === 1;
    return { frame: swing ? UNIT_FRAMES.attack : UNIT_FRAMES.idle, bob: 0 };
  }
  // Idle breathing.
  return { frame: UNIT_FRAMES.idle, bob: (Math.sin(now / 700 + (entity.id ?? 0)) + 1) * 0.35 };
}
