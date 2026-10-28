import type { AIContext, AIStrategy } from '../AIPlayer';
import { expectKind, type StrategyState } from '../strategyState';

export class NullStrategy implements AIStrategy {
  readonly name = 'null';
  update(_ctx: AIContext, _deltaMs: number): void {
    // No-op.
  }

  snapshot(): StrategyState {
    return { kind: 'null' };
  }

  restore(state: StrategyState): void {
    expectKind(state, 'null');
  }
}
