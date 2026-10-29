import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION } from '../schema';
import { MIGRATIONS, migrate, type Migration } from './index';

describe('save migrations', () => {
  it('v2 has the one v1→v2 step', () => {
    expect(SCHEMA_VERSION).toBe(2);
    expect(Object.keys(MIGRATIONS)).toEqual(['1']);
  });

  it('current version passes through', () => {
    const data = { schemaVersion: SCHEMA_VERSION, gameTimeMs: 5 };
    expect(migrate(data)).toEqual({ ok: true, data });
  });

  it('a fake v1→v2→v3 chain is applied in order', () => {
    const seen: number[] = [];
    const chain: Record<number, Migration> = {
      1: (d) => {
        seen.push(1);
        return { ...d, log: [...(d['log'] as string[]), 'a'] };
      },
      2: (d) => {
        seen.push(2);
        return { ...d, log: [...(d['log'] as string[]), 'b'] };
      },
    };
    const result = migrate({ schemaVersion: 1, log: [] }, 3, chain);
    expect(seen).toEqual([1, 2]);
    expect(result).toEqual({ ok: true, data: { schemaVersion: 3, log: ['a', 'b'] } });
  });

  it('missing step → corrupt', () => {
    const chain: Record<number, Migration> = { 1: (d) => d };
    expect(migrate({ schemaVersion: 1 }, 3, chain)).toEqual({ ok: false, reason: 'corrupt' });
  });

  it('a migration that throws → corrupt', () => {
    const chain: Record<number, Migration> = {
      1: () => {
        throw new Error('boom');
      },
    };
    expect(migrate({ schemaVersion: 1 }, 2, chain)).toEqual({ ok: false, reason: 'corrupt' });
  });

  it('schemaVersion above current → newer', () => {
    expect(migrate({ schemaVersion: SCHEMA_VERSION + 1 })).toEqual({ ok: false, reason: 'newer' });
  });

  it('non-object / missing schemaVersion → corrupt', () => {
    for (const raw of [null, undefined, 42, 'save', [], [1], {}, { schemaVersion: '1' }, { schemaVersion: 0 }, { schemaVersion: 1.5 }]) {
      expect(migrate(raw)).toEqual({ ok: false, reason: 'corrupt' });
    }
  });

  it('never mutates its input', () => {
    const input = { schemaVersion: 1, log: [] as string[] };
    migrate(input, 2, { 1: (d) => ({ ...d, log: ['x'] }) });
    expect(input).toEqual({ schemaVersion: 1, log: [] });
  });
});
