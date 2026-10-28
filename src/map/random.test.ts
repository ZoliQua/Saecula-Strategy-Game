import { describe, expect, it } from 'vitest';
import { createRng, createStatefulRng } from './random';

describe('createStatefulRng', () => {
  it('createStatefulRng matches createRng for 1000 draws', () => {
    const plain = createRng(1234);
    const stateful = createStatefulRng(1234);
    for (let i = 0; i < 1000; i++) expect(stateful.next()).toBe(plain());
  });

  it('setState(getState()) after 37 draws continues the same sequence', () => {
    const a = createStatefulRng(99);
    for (let i = 0; i < 37; i++) a.next();
    const b = createStatefulRng(7);
    b.setState(a.getState());
    for (let i = 0; i < 100; i++) expect(b.next()).toBe(a.next());
  });

  it('next works detached from the object', () => {
    const rng = createStatefulRng(5);
    const next = rng.next;
    expect(next()).toBe(createRng(5)());
  });
});
