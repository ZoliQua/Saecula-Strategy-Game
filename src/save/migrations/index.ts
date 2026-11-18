import { SCHEMA_VERSION } from '../schema';
import { v1ToV2 } from './v1ToV2';
import { v2ToV3 } from './v2ToV3';
import { v3ToV4 } from './v3ToV4';
import { v4ToV5 } from './v4ToV5';
import { v5ToV6 } from './v5ToV6';
import { v6ToV7 } from './v6ToV7';
import { v7ToV8 } from './v7ToV8';
import { v8ToV9 } from './v8ToV9';
import { v9ToV10 } from './v9ToV10';

/**
 * One schema step: takes a save of version N (the key it is registered
 * under) and returns its content as version N + 1. `migrate` writes the
 * new `schemaVersion`, so a migration only reshapes the data.
 */
export type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

/** Migrations by from-version. */
export const MIGRATIONS: Readonly<Record<number, Migration>> = { 1: v1ToV2, 2: v2ToV3, 3: v3ToV4, 4: v4ToV5, 5: v5ToV6, 6: v6ToV7, 7: v7ToV8, 8: v8ToV9, 9: v9ToV10 };

export type MigrateResult = { ok: true; data: Record<string, unknown> } | { ok: false; reason: 'corrupt' | 'newer' };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Brings a parsed save up to `current`: 'newer' when it was written by a
 * newer game, 'corrupt' when it is not an object with a positive integer
 * `schemaVersion`, a step is missing, or a step throws. Never throws and
 * never mutates `raw`.
 */
export function migrate(
  raw: unknown,
  current: number = SCHEMA_VERSION,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
): MigrateResult {
  if (!isRecord(raw)) return { ok: false, reason: 'corrupt' };
  const version = raw['schemaVersion'];
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) return { ok: false, reason: 'corrupt' };
  if (version > current) return { ok: false, reason: 'newer' };
  let data: Record<string, unknown> = raw;
  for (let v = version; v < current; v++) {
    const step = migrations[v];
    if (!step) return { ok: false, reason: 'corrupt' };
    try {
      const next = step({ ...data });
      if (!isRecord(next)) return { ok: false, reason: 'corrupt' };
      data = { ...next, schemaVersion: v + 1 };
    } catch {
      return { ok: false, reason: 'corrupt' };
    }
  }
  return { ok: true, data };
}
