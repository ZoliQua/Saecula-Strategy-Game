import { UNIQUE_BUILDINGS } from '../../config/balance';
import type { EcsWorld } from '../../ecs/world';
import { countPlayerBuildings } from '../../game/buildRules';
import type { PlayerManager } from '../../game/PlayerManager';
import { wonderClocks, type WonderClockInfo } from '../../game/wonderClocks';
import type { MatchStats } from '../../stats/MatchStats';
import { VILLAGER_ACTIVITIES, villagerActivity, type VillagerActivity } from '../../stats/villagerActivity';
import { uiStore, type ScoreRowInfo } from '../../ui/store';

/**
 * Once-a-second ECS → UI store copies the HUD needs beyond the per-frame
 * systems: which limited buildings (wonder) the human already has, for
 * the build menu, and the running Wonder countdowns (none when the
 * match cannot be won by a Wonder), and the side panel's every-player
 * scores (highest first) and the human's villager activity counts.
 */
export class HudSync {
  constructor(
    private readonly world: EcsWorld,
    private readonly players: PlayerManager,
    /** Wonder hold time; null = conquest only (no countdowns). */
    private readonly wonderHoldMs: number | null,
    /** The match statistics (null: no score rows). */
    private readonly stats: MatchStats | null = null,
  ) {}

  secondTick(): void {
    this.syncUniqueBuildings();
    if (this.wonderHoldMs !== null) this.syncWonders(this.wonderHoldMs);
    this.syncScores();
    this.syncVillagers();
  }

  private syncScores(): void {
    const stats = this.stats;
    if (!stats) return;
    const rows: ScoreRowInfo[] = this.players
      .all()
      .map((p) => ({ playerId: p.id, civ: p.civ, color: p.color, isHuman: p.isHuman, score: stats.scoreOf(p.id), defeated: p.defeated }))
      .sort((a, b) => b.score - a.score || a.playerId - b.playerId);
    const prev = uiStore.getState().scores;
    const same =
      rows.length === prev.length &&
      rows.every((r, i) => {
        const q = prev[i];
        return q !== undefined && q.playerId === r.playerId && q.score === r.score && q.defeated === r.defeated;
      });
    if (!same) uiStore.getState().setScores(rows);
  }

  private syncVillagers(): void {
    const human = this.players.human();
    if (!human) return;
    const ids = villagerActivity(this.world, human.id);
    const counts = {} as Record<VillagerActivity, number>;
    for (const a of VILLAGER_ACTIVITIES) counts[a] = ids[a].length;
    const prev = uiStore.getState().villagerCounts;
    if (VILLAGER_ACTIVITIES.some((a) => prev[a] !== counts[a])) uiStore.getState().setVillagerCounts(counts);
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
