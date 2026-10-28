import { SCHEMA_VERSION } from '../schema';

/**
 * One schema step: takes a save of version N (the key it is registered
 * under) and returns its content as version N + 1. `migrate` writes the
 * new `schemaVersion`, so a migration only reshapes the data.
 */
export type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

/** Migrations by from-version. Empty in v1: no save has shipped yet (M6 Decision 1). */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {};

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
