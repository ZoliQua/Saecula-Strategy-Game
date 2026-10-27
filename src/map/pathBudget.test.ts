import { describe, expect, it } from 'vitest';
import { PathBudget, UNLIMITED_PATHS } from './pathBudget';

describe('PathBudget', () => {
  it('grants the per-frame number of searches, then refuses until the next tick', () => {
    const b = new PathBudget(5);
    b.reset(1000 / 60);
    for (let i = 0; i < 5; i++) expect(b.take()).toBe(true);
    expect(b.take()).toBe(false);
    b.reset(1000 / 60);
    expect(b.take()).toBe(true);
  });

  it('never grants fewer than one frame worth on short (120 Hz) frames', () => {
    const b = new PathBudget(5);
    b.reset(1000 / 120);
    let n = 0;
    while (b.take()) n++;
    expect(n).toBe(5);
  });

  it('scales with game time on long ticks (headless 100 ms steps, time scale)', () => {
    const b = new PathBudget(5);
    b.reset(100);
    let n = 0;
    while (b.take()) n++;
    expect(n).toBe(30);
  });

  it('unused searches do not carry over', () => {
    const b = new PathBudget(5);
    b.reset(100);
    b.reset(1000 / 60);
    let n = 0;
    while (b.take()) n++;
    expect(n).toBe(5);
  });

  it('the unlimited budget always grants', () => {
    for (let i = 0; i < 1000; i++) expect(UNLIMITED_PATHS.take()).toBe(true);
  });
});
