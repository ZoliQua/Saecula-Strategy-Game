import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * SystemRunner needs a live Phaser scene (renderers, timers, cameras), so
 * its tick cannot be built in a test; this pins the hill's wiring in the
 * source instead, as civSurface.test.ts does for civ ids (M19).
 */
describe('SystemRunner wires the hill clocks (M19)', () => {
  const source = readFileSync(new URL('./SystemRunner.ts', import.meta.url), 'utf8');
  const tick = source.slice(source.indexOf('this.wonders.update(delta)'));

  it('builds the HillSystem with the match players and the treaty gate', () => {
    expect(source).toContain('this.hill = new HillSystem(world, players, this.treaty);');
  });

  it('ticks it once per update, after the deaths and Wonders, before the AIs and the victory clocks', () => {
    expect(source.match(/this\.hill\.update\(delta\)/g)).toHaveLength(1);
    const order = ['this.death.update(delta)', 'this.wonders.update(delta)', 'this.hill.update(delta)', 'this.timeLimit?.advance(delta)', 'ai.update('];
    const at = order.map((call) => source.indexOf(call));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(tick).toContain('this.hill.update(delta)');
  });
});
