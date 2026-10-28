import { z } from 'zod';
import { BUILDING_BALANCE, PROJECTILE_BALANCE, TECH_BALANCE, UNIT_BALANCE } from '../config/balance';
import { CIV_IDS } from '../config/civs';
import type { ResourceType } from '../types';

/*
 * Shared building blocks of the save schemas (schema.ts, aiSchema.ts):
 * id enums taken from the game's own tables, and the compile-time
 * check that a schema and the type it saves stay the same shape.
 */

/** A string that is one of `values`. */
export function enumOf<T extends string>(values: readonly T[]): z.ZodType<T> {
  const allowed: readonly string[] = values;
  return z.custom<T>((v) => typeof v === 'string' && allowed.includes(v));
}

/** The keys of a table keyed by every member of a union (so none is missed). */
const keysOf = <K extends string>(table: Readonly<Record<K, unknown>>): K[] => Object.keys(table) as K[];

const RESOURCE_TABLE: Readonly<Record<ResourceType, true>> = { food: true, wood: true, gold: true };

export const civId = enumOf(CIV_IDS);
export const unitType = enumOf(keysOf(UNIT_BALANCE));
export const buildingType = enumOf(keysOf(BUILDING_BALANCE));
export const techId = enumOf(keysOf(TECH_BALANCE));
export const projectileKind = enumOf(keysOf(PROJECTILE_BALANCE));
export const resourceType = enumOf(keysOf(RESOURCE_TABLE));
export const ageId = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const num = z.number().finite();
export const int = z.number().int();
export const tile = z.object({ tx: num, ty: num }).strict();
export const footprint = z.object({ width: int.positive(), height: int.positive() }).strict();

/** Keys of `T` that are optional or whose value may be undefined. */
type UndefinedKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? K : T extends Record<K, T[K]> ? never : K;
}[keyof T];

/**
 * `T` as it comes back from JSON: a key whose value may be undefined
 * becomes optional (JSON drops undefined), and every optional key also
 * takes undefined, deeply. zod infers optional keys the same way, so a
 * schema is compared against `Loose<T>`.
 */
export type Loose<T> = T extends readonly unknown[]
  ? { [I in keyof T]: Loose<T[I]> }
  : T extends object
    ? { [K in Exclude<keyof T, UndefinedKeys<T>>]: Loose<T[K]> } & { [K in UndefinedKeys<T>]?: Loose<T[K]> | undefined }
    : T;

/** True when each of A and B is assignable to the other. */
export type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/** Every key path of `T` ('a', 'a.b', …), through optional values, arrays and unions. */
type KeyPaths<T> = T extends readonly (infer U)[]
  ? KeyPaths<U>
  : T extends object
    ? { [K in keyof T & string]-?: K | `${K}.${KeyPaths<NonNullable<T[K]>>}` }[keyof T & string]
    : never;

/**
 * True when A and B are mutually assignable and have the same key paths:
 * an optional key one side has and the other lacks counts as a difference
 * (plain assignability would let it through).
 */
export type Exact<A, B> = Same<A, B> extends true ? Same<KeyPaths<A>, KeyPaths<B>> : false;

/** Fails to compile unless `T` is true. */
export type Assert<T extends true> = T;
