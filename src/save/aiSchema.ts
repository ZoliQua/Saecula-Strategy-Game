import { z } from 'zod';
import type { Stance } from '../ai/decisions/stance';
import type { AIPlayerState } from '../ai/strategyState';
import { buildingType, enumOf, footprint, int, num, tile, unitType, type Assert, type Exact } from './schemaKit';

/*
 * zod schema of AIPlayerState (src/ai/strategyState.ts), the AI state a
 * save holds outside the ECS. `null` times stand for "never". The check
 * at the bottom fails to compile when the schema and the type part.
 */

const STANCE_TABLE: Readonly<Record<Stance, true>> = { balanced: true, turtle: true, rush: true, tech: true };
const stance = enumOf(Object.keys(STANCE_TABLE) as Stance[]);
const time = num.nullable();
const ids = z.array(int).readonly();

const knownBuilding = z.object({ id: int, type: buildingType, ownerId: int, position: tile, footprint }).strict();

const perception = z
  .object({
    memory: z.array(knownBuilding).readonly(),
    sightings: z.record(unitType, num).readonly(),
    villagerMemory: z.array(z.object({ id: int, ownerId: int, position: tile, seenAtMs: num }).strict()).readonly(),
    lastMs: time,
  })
  .strict();

const base = z.object({ nextUpkeepMs: num, nextDecisionMs: num, perception }).strict();
const army = z.object({ wave: ids, waveTarget: knownBuilding.nullable(), exploreGoal: tile.nullable() }).strict();

const mediumFields = {
  base,
  army,
  wonderSite: z.object({ nextSearchMs: time, found: z.boolean() }).strict(),
  pressure: z.object({ sent: z.boolean(), raidOutSinceMs: time }).strict(),
  firstAttackAtMs: num,
  lastScoutMs: time,
};

const hardFields = {
  ...mediumFields,
  stance: z.object({ stance, sinceMs: num }).strict(),
  aggression: num,
  sensedAtMs: num,
  threatFrom: tile.nullable(),
  wallLinesLaid: int,
  rebalancedAtMs: time,
  harass: z
    .object({
      raid: ids,
      target: z.object({ position: tile, villagers: int }).strict().nullable(),
      raidsSent: int,
      endedAtMs: time,
    })
    .strict(),
};

const flank = z
  .object({
    members: ids,
    reorders: z.array(z.tuple([int, int]).readonly()).readonly(),
    target: knownBuilding.nullable(),
    count: int,
  })
  .strict();

const strategy = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('null') }).strict(),
  z.object({ kind: z.literal('easy'), base, army, ageUpFromMs: time, firstAttackAtMs: num }).strict(),
  z.object({ kind: z.literal('medium'), ...mediumFields }).strict(),
  z.object({ kind: z.literal('hard'), ...hardFields }).strict(),
  z.object({ kind: z.literal('master'), ...hardFields, flank }).strict(),
]);

export const AIPlayerStateSchema = z
  .object({
    elapsedMs: num,
    fogDelayMs: num,
    fogSinceScanMs: time,
    rngState: int.nonnegative(),
    strategy,
  })
  .strict();

/** A new AIPlayerState field without a schema entry (or the reverse) fails `tsc` here. */
export type AIPlayerStateSchemaCheck = Assert<Exact<z.infer<typeof AIPlayerStateSchema>, AIPlayerState>>;
