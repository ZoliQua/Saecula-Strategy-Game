import type { EcsWorld } from '../ecs/world';
import type { PlayerManager } from './PlayerManager';

/** One running Wonder countdown, for the HUD. */
export interface WonderClockInfo {
  readonly entityId: number;
  readonly playerId: number;
  /** Owner's player colour (0xRRGGBB). */
  readonly color: number;
  /** Time left until the owner wins (never negative). */
  readonly remainingMs: number;
}

/**
 * Every standing Wonder with a running clock, soonest win first. Shown
 * whatever the fog (AoE convention); Wonders of defeated owners are left
 * out, since they can no longer win.
 */
export function wonderClocks(world: EcsWorld, players: PlayerManager, holdMs: number): WonderClockInfo[] {
  const out: WonderClockInfo[] = [];
  for (const e of world.with('wonder', 'owner')) {
    if (e.dying) continue;
    const owner = players.get(e.owner.playerId);
    if (!owner || owner.defeated) continue;
    out.push({
      entityId: e.id ?? -1,
      playerId: owner.id,
      color: owner.color,
      remainingMs: Math.max(0, holdMs - e.wonder.heldMs),
    });
  }
  return out.sort((a, b) => a.remainingMs - b.remainingMs || a.entityId - b.entityId);
}
