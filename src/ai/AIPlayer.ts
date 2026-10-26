import type { MapData } from '../map/MapData';
import type { Player } from '../game/Player';
import type { EcsWorld } from '../ecs/world';

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
  /** Absolute game time in ms. */
  readonly timeMs: number;
}

export interface AIStrategy {
  readonly name: string;
  update(ctx: AIContext, deltaMs: number): void;
}

export class AIPlayer {
  private elapsedMs = 0;

  constructor(
    public readonly player: Player,
    private readonly strategy: AIStrategy,
  ) {}

  update(ctx: Omit<AIContext, 'timeMs' | 'player'>, deltaMs: number): void {
    this.elapsedMs += deltaMs;
    this.strategy.update(
      { ...ctx, player: this.player, timeMs: this.elapsedMs },
      deltaMs,
    );
  }
}
