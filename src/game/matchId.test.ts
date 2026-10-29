import { describe, expect, it } from 'vitest';
import { newMatchId } from './matchId';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newMatchId', () => {
  it('is a v4 UUID, different every time', () => {
    const a = newMatchId();
    const b = newMatchId();
    expect(a).toMatch(UUID);
    expect(b).toMatch(UUID);
    expect(a).not.toBe(b);
  });

  it('falls back to a random v4 UUID without crypto.randomUUID', () => {
    let n = 0;
    const ids = [newMatchId(null, () => (n++ % 16) / 16), newMatchId(null, Math.random)];
    for (const id of ids) expect(id).toMatch(UUID);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('uses crypto.randomUUID when it is there', () => {
    expect(newMatchId({ randomUUID: () => '00000000-0000-4000-8000-000000000000' })).toBe('00000000-0000-4000-8000-000000000000');
  });
});
