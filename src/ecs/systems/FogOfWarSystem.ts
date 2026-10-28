import type { FogOfWarData } from '../../map/FogOfWarData';
import type { EcsWorld } from '../world';

/** Default scan interval: the human's fog (AIs pass a longer one). */
export const FOG_SCAN_INTERVAL_MS = 250;

/**
 * Recomputes per-tile visibility for one viewing player (the human, or
 * an AI for its own perception). On each scan:
 *   1) All currently-visible tiles drop to 'explored'.
 *   2) Every player-owned entity with a fogEmitter stamps a circular
 *      Chebyshev-distance area back to 'visible'.
 * Runs every `intervalMs` (250 ms by default — plenty for unit motion at
 * 2.5 tiles/s). The first update always scans.
 */
export class FogOfWarSystem {
  private elapsedMs: number;

  constructor(
    private readonly world: EcsWorld,
    private readonly fog: FogOfWarData,
    private readonly viewerPlayerId: number,
    private readonly intervalMs = FOG_SCAN_INTERVAL_MS,
  ) {
    this.elapsedMs = intervalMs;
  }

  /** Time since the last scan (saved games keep each AI's scan phase). */
  get sinceScanMs(): number {
    return this.elapsedMs;
  }

  set sinceScanMs(ms: number) {
    this.elapsedMs = ms;
  }

  update(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    if (this.elapsedMs < this.intervalMs) return;
    this.elapsedMs = 0;

    this.fog.dimVisibleToExplored();
    const emitters = this.world.with('position', 'fogEmitter', 'owner');
    for (const e of emitters) {
      if (e.owner.playerId !== this.viewerPlayerId) continue;
      const range = e.fogEmitter.sightRange;
      for (let dy = -range; dy <= range; dy++) {
        for (let dx = -range; dx <= range; dx++) {
          if (dx * dx + dy * dy > range * range + range) continue;
          this.fog.markVisible(e.position.tx + dx, e.position.ty + dy);
        }
      }
    }
    // Signal renderers that the fog state changed so they repaint.
    this.fog.revision++;
  }
}
