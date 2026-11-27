import type { EcsWorld } from '../ecs/world';
import { isFriendly } from './diplomacy';
import type { PlayerManager } from './PlayerManager';

/** One running Wonder countdown, for the HUD. */
export interface WonderClockInfo {
  readonly entityId: number;
  readonly playerId: number;
  /** Owner's player colour (0xRRGGBB). */
  readonly color: number;
  /** The human's own Wonder or an ally's (M16): a win for the human's team. */
  readonly friendly: boolean;
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
  const humanId = players.human()?.id ?? 1;
  for (const e of world.with('wonder', 'owner')) {
    if (e.dying) continue;
    const owner = players.get(e.owner.playerId);
    if (!owner || owner.defeated) continue;
    out.push({
      entityId: e.id ?? -1,
      playerId: owner.id,
      color: owner.color,
      friendly: isFriendly(players, owner.id, humanId),
      remainingMs: Math.max(0, holdMs - e.wonder.heldMs),
    });
  }
  return out.sort((a, b) => a.remainingMs - b.remainingMs || a.entityId - b.entityId);
}
