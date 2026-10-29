import { describe, expect, it } from 'vitest';
import { gameEvents } from '../../game/events';
import { savableMatch, STEP_MS } from '../../save/savedMatch.testkit';

describe('headless match statistics', () => {
  it('count only while run() steps: a finished run leaves no listener behind', () => {
    const match = savableMatch();
    let inside = -1;
    match.run(STEP_MS, STEP_MS, () => {
      const before = match.stats.of(2).gathered;
      gameEvents.emit('resourcesDelivered', { world: match.world, playerId: 2, amount: 7 });
      inside = match.stats.of(2).gathered - before;
    });
    expect(inside).toBe(7);
    const after = match.stats.of(2).gathered;
    gameEvents.emit('resourcesDelivered', { world: match.world, playerId: 2, amount: 7 });
    expect(match.stats.of(2).gathered).toBe(after);
  });
});
