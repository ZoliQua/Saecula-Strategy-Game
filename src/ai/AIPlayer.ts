import { AI_COMMON } from '../config/aiBalance';
import { FogOfWarSystem } from '../ecs/systems/FogOfWarSystem';
import type { EcsWorld } from '../ecs/world';
import type { Player } from '../game/Player';
import { FogOfWarData } from '../map/FogOfWarData';
import type { MapData } from '../map/MapData';
import type { StatefulRng } from '../map/random';
import type { AIPlayerState, StrategyState } from './strategyState';
import type { AIThoughts } from './thoughts';

/**
 * Thin context object handed to each AIStrategy tick. Strategies
 * never mutate ECS directly — they queue intents on entities via
 * `world.addComponent`, identical to player inputs.
 */
export interface AIContext {
  readonly world: EcsWorld;
  readonly mapData: MapData;
  readonly player: Player;
  /** Player the AI attacks (the human); any opponent when unset. */
  readonly enemyPlayerId?: number;
  /** The match can be won by holding a Wonder (absent = false): the AI builds and hunts Wonders. */
  readonly wonderVictory?: boolean;
  /** Whether a player is out of the match (public knowledge); absent = nobody is. */
  readonly isDefeated?: (playerId: number) => boolean;
  /** Absolute game time in ms. */
  readonly timeMs: number;
  /** This AI's own fog of war: the only window its perception looks through (§10.4). */
  readonly fog: FogOfWarData;
}

export interface AIStrategy {
  readonly name: string;
  update(ctx: AIContext, deltaMs: number): void;
  /** Dev overlay snapshot; strategies without one show nothing. */
  thoughts?(): AIThoughts;
  /** JSON-safe state for a saved game. */
  snapshot(): StrategyState;
  /** Takes over a snapshot's state; TypeError when it is another strategy's (`kind` mismatch). */
  restore(state: StrategyState): void;
}

export interface AIPlayerOptions {
  /** Pre-built fog (so other systems can read it before the first tick). */
  readonly fog?: FogOfWarData;
  /** Delays the first fog scan, so several AIs do not all scan on the same frame. */
  readonly fogPhaseMs?: number;
  /** The generator the strategy draws from (its `next`), so the AI's RNG state can be saved. */
  readonly rng?: StatefulRng;
}

/**
 * One AI player: owns its fog of war (rescanned every AI_COMMON.fogScanMs,
 * less often than the human's) and ticks its strategy with it.
 */
export class AIPlayer {
  private elapsedMs = 0;
  private fogData: FogOfWarData | null;
  private fogSystem: FogOfWarSystem | null = null;
  private fogDelayMs: number;
  private readonly rng: StatefulRng | null;

  constructor(
    public readonly player: Player,
    public readonly strategy: AIStrategy,
    options: AIPlayerOptions = {},
  ) {
    this.fogData = options.fog ?? null;
    this.fogDelayMs = options.fogPhaseMs ?? 0;
    this.rng = options.rng ?? null;
  }

  /**
   * JSON-safe state for a saved game: the AI clock, the fog-scan delay,
   * the RNG and the strategy. The fog itself is saved through
   * FogOfWarData; the FogOfWarSystem scan phase is not (it restarts).
   */
  snapshot(): AIPlayerState {
    return {
      elapsedMs: this.elapsedMs,
      fogDelayMs: this.fogDelayMs,
      rngState: this.rng?.getState() ?? 0,
      strategy: this.strategy.snapshot(),
    };
  }

  /** Takes over a snapshot (RNG state included); throws when built without an `rng`. */
  restore(state: AIPlayerState): void {
    if (!this.rng) throw new Error('AIPlayer.restore needs the AI built with an rng');
    this.strategy.restore(state.strategy);
    this.elapsedMs = state.elapsedMs;
    this.fogDelayMs = state.fogDelayMs;
    this.rng.setState(state.rngState);
  }

  /** The AI's fog, or null before its first tick when none was given. */
  get fog(): FogOfWarData | null {
    return this.fogData;
  }

  update(ctx: Omit<AIContext, 'timeMs' | 'player' | 'fog'>, deltaMs: number): void {
    this.elapsedMs += deltaMs;
    const fog = (this.fogData ??= new FogOfWarData(ctx.mapData.width, ctx.mapData.height));
    this.fogSystem ??= new FogOfWarSystem(ctx.world, fog, this.player.id, AI_COMMON.fogScanMs);
    if (this.fogDelayMs > 0) this.fogDelayMs -= deltaMs;
    else this.fogSystem.update(deltaMs);
    this.strategy.update({ ...ctx, player: this.player, timeMs: this.elapsedMs, fog }, deltaMs);
  }
}
