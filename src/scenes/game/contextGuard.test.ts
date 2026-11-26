import { describe, expect, it } from 'vitest';
import { handleContextLost, installContextGuard, type ContextLostState, type GuardedMatch } from './contextGuard';
import type { SaveOutcome } from './MatchSave';

function recorder(): { states: ContextLostState[]; show: (s: ContextLostState) => void } {
  const states: ContextLostState[] = [];
  return { states, show: (s) => void states.push(s) };
}

const matchSaving = (outcome: SaveOutcome | Error): GuardedMatch & { calls: number } => {
  const m = {
    calls: 0,
    emergencySave(): Promise<SaveOutcome> {
      m.calls++;
      return outcome instanceof Error ? Promise.reject(outcome) : Promise.resolve(outcome);
    },
  };
  return m;
};

describe('handleContextLost', () => {
  it('saves the running match and reports it saved', async () => {
    const r = recorder();
    const match = matchSaving({ ok: true });
    expect(await handleContextLost({ match: () => match, show: r.show })).toBe('saved');
    expect(match.calls).toBe(1);
    expect(r.states).toEqual(['saving', 'saved']);
  });

  it('reports a failed or rejected save as not saved', async () => {
    for (const outcome of [{ ok: false, reason: 'failed' } as const, { ok: false, reason: 'unavailable' } as const, new Error('boom')]) {
      const r = recorder();
      expect(await handleContextLost({ match: () => matchSaving(outcome), show: r.show })).toBe('notSaved');
      expect(r.states).toEqual(['saving', 'notSaved']);
    }
  });

  it('offers a plain reload outside a match, for a decided match, or when the match getter throws', async () => {
    const cases: Array<() => GuardedMatch | null> = [
      () => null,
      () => ({ emergencySave: () => null }),
      () => {
        throw new Error('no scene');
      },
    ];
    for (const match of cases) {
      const r = recorder();
      expect(await handleContextLost({ match, show: r.show })).toBe('noMatch');
      expect(r.states).toEqual(['noMatch']);
    }
  });
});

describe('installContextGuard', () => {
  it('runs once per page on webglcontextlost and stops after uninstall', async () => {
    const canvas = new EventTarget();
    const r = recorder();
    const match = matchSaving({ ok: true });
    const uninstall = installContextGuard(canvas, { match: () => match, show: r.show });
    canvas.dispatchEvent(new Event('webglcontextlost'));
    canvas.dispatchEvent(new Event('webglcontextlost'));
    await Promise.resolve();
    await Promise.resolve();
    expect(match.calls).toBe(1);
    expect(r.states).toEqual(['saving', 'saved']);
    uninstall();

    const other = matchSaving({ ok: true });
    const r2 = recorder();
    const un2 = installContextGuard(canvas, { match: () => other, show: r2.show });
    un2();
    canvas.dispatchEvent(new Event('webglcontextlost'));
    expect(other.calls).toBe(0);
  });
});
