import { describe, expect, it } from 'vitest';
import { AUTOSAVE_INTERVAL_MS } from '../config/constants';
import { AutosaveClock } from './autosave';

describe('AutosaveClock', () => {
  it('the default interval is 5 game minutes', () => {
    expect(AUTOSAVE_INTERVAL_MS).toBe(300_000);
  });

  it('true at 300 000 ms of summed deltas, not before', () => {
    const clock = new AutosaveClock();
    let fired = 0;
    for (let t = 0; t < 299_900; t += 100) if (clock.tick(100)) fired++;
    expect(fired).toBe(0);
    expect(clock.tick(100)).toBe(true);
  });

  it('once per interval', () => {
    const clock = new AutosaveClock(1000);
    const fires: number[] = [];
    for (let i = 1; i <= 35; i++) if (clock.tick(100)) fires.push(i * 100);
    expect(fires).toEqual([1000, 2000, 3000]);
    // A long frame fires once, not once per interval it spans.
    const big = new AutosaveClock(1000);
    expect(big.tick(5000)).toBe(true);
    expect(big.tick(100)).toBe(false);
  });

  it('reset restarts', () => {
    const clock = new AutosaveClock(1000);
    clock.tick(900);
    clock.reset();
    expect(clock.tick(900)).toBe(false);
    expect(clock.tick(100)).toBe(true);
  });
});
