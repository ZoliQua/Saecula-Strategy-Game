import { UNIQUE_BUILDINGS } from '../../config/balance';
import type { EcsWorld } from '../../ecs/world';
import { countPlayerBuildings } from '../../game/buildRules';
import type { PlayerManager } from '../../game/PlayerManager';
import { wonderClocks, type WonderClockInfo } from '../../game/wonderClocks';
import { uiStore } from '../../ui/store';

/**
 * Once-a-second ECS → UI store copies the HUD needs beyond the per-frame
 * systems: which limited buildings (wonder) the human already has, for
 * the build menu, and the running Wonder countdowns (none when the
 * match cannot be won by a Wonder).
 */
export class HudSync {
  constructor(
    private readonly world: EcsWorld,
    private readonly players: PlayerManager,
    /** Wonder hold time; null = conquest only (no countdowns). */
    private readonly wonderHoldMs: number | null,
  ) {}

  secondTick(): void {
    this.syncUniqueBuildings();
    if (this.wonderHoldMs !== null) this.syncWonders(this.wonderHoldMs);
  }

  private syncUniqueBuildings(): void {
    const human = this.players.human();
    if (!human) return;
    const owned = [...UNIQUE_BUILDINGS].filter((t) => countPlayerBuildings(this.world.entities, human.id, t) > 0);
    const prev = uiStore.getState().uniqueBuilt;
    if (owned.length !== prev.length || owned.some((t, i) => t !== prev[i])) {
      uiStore.getState().setUniqueBuilt(owned);
    }
  }

  private syncWonders(holdMs: number): void {
    const next = wonderClocks(this.world, this.players, holdMs);
    if (!sameClocks(next, uiStore.getState().wonders)) uiStore.getState().setWonders(next);
  }
}

function sameClocks(a: readonly WonderClockInfo[], b: readonly WonderClockInfo[]): boolean {
  return a.length === b.length && a.every((c, i) => {
    const d = b[i];
    return d !== undefined && c.entityId === d.entityId && c.playerId === d.playerId && c.remainingMs === d.remainingMs;
  });
}
