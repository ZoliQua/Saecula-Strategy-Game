import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { RowEmitters } from './RowEmitters';

class FakeEmitter {
  depth = 0;
  emitted: Array<[number, number]> = [];
  setDepth(d: number): this {
    this.depth = d;
    return this;
  }
  emitParticleAt(x: number, y: number): void {
    this.emitted.push([x, y]);
  }
  destroy(): void {}
}

describe('RowEmitters', () => {
  it('draws each puff at its row depth, reusing an emitter already on the row, else the least recently used', () => {
    const made: FakeEmitter[] = [];
    const rows = new RowEmitters(() => {
      const e = new FakeEmitter();
      made.push(e);
      return e as unknown as Phaser.GameObjects.Particles.ParticleEmitter;
    });
    rows.emitParticleAt(10, 160); // row 10
    expect(made[0]?.depth).toBeCloseTo(10.6);
    rows.emitParticleAt(20, 161); // same row → same emitter
    expect(made[0]?.emitted.length).toBe(2);
    for (let r = 1; r < made.length; r++) rows.emitParticleAt(0, 160 + r * 16);
    // Every emitter in use; a new row takes the least recently used one (row 10's emitter).
    rows.emitParticleAt(0, 999 * 16);
    expect(made[0]?.depth).toBeCloseTo(999.6);
  });
});
