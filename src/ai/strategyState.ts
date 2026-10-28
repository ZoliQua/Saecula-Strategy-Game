import type { TileCoord } from '../iso/coordinates';
import type { UnitType } from '../types';
import type { HarassTarget } from './decisions/harass';
import type { StanceState } from './decisions/stance';
import type { KnownBuilding, VillagerSighting } from './perception';

/*
 * JSON-safe snapshots of the AI state that lives outside the ECS (saved
 * games). Only finite numbers, strings, booleans, arrays and plain
 * objects: `null` stands for "never" where the code holds -Infinity (or
 * Infinity for Easy's age-up), and arrays replace Sets and Maps (in their
 * insertion order, which the AI's iteration depends on).
 *
 * Not saved (rebuilt as in a fresh match, harmless — M6 decisions 3, 4):
 * the dev ThoughtLog (overlay only: phase, plan, stance, recent entries)
 * and each AIPlayer's FogOfWarSystem scan phase (the next scan comes at
 * most one AI_COMMON.fogScanMs late). Tuning tables and the personality
 * are not strategy state: they come from the difficulty and Player.personality
 * (pickPersonality(seed, id)) when the strategy is rebuilt.
 */

export interface PerceptionState {
  readonly memory: readonly KnownBuilding[];
  readonly sightings: Readonly<Partial<Record<UnitType, number>>>;
  readonly villagerMemory: readonly VillagerSighting[];
  readonly lastMs: number | null;
}

export interface ArmyState {
  readonly wave: readonly number[];
  readonly waveTarget: KnownBuilding | null;
  readonly exploreGoal: TileCoord | null;
}

export interface HarassState {
  readonly raid: readonly number[];
  readonly target: HarassTarget | null;
  readonly raidsSent: number;
  readonly endedAtMs: number | null;
}

export interface FlankState {
  readonly members: readonly number[];
  /** [unit id, march orders given while idle] pairs. */
  readonly reorders: readonly (readonly [number, number])[];
  readonly target: KnownBuilding | null;
  readonly count: number;
}

/** WonderPlay's cached "is there a Wonder site" answer and when it is checked again. */
export interface WonderSiteState {
  readonly nextSearchMs: number | null;
  readonly found: boolean;
}

export interface BaseState {
  readonly nextUpkeepMs: number;
  readonly nextDecisionMs: number;
  readonly perception: PerceptionState;
}

export interface EasyState {
  readonly kind: 'easy';
  readonly base: BaseState;
  readonly army: ArmyState;
  /** null: this game never ages up. */
  readonly ageUpFromMs: number | null;
  readonly firstAttackAtMs: number;
}

/** Medium's fields (Hard and Mesteri extend them). */
export interface MediumFields {
  readonly base: BaseState;
  readonly army: ArmyState;
  readonly wonderSite: WonderSiteState;
  readonly firstAttackAtMs: number;
  readonly lastScoutMs: number | null;
  readonly pressureSent: boolean;
  /** When the pressure raid left, until the main wave first goes (Mesteri's raid recall). */
  readonly raidOutSinceMs: number | null;
}

export interface MediumState extends MediumFields {
  readonly kind: 'medium';
}

/** Hard's fields on top of Medium's (Mesteri extends them). */
export interface HardFields extends MediumFields {
  readonly stance: StanceState;
  readonly aggression: number;
  readonly sensedAtMs: number;
  readonly threatFrom: TileCoord | null;
  readonly wallLinesLaid: number;
  readonly rebalancedAtMs: number | null;
  readonly harass: HarassState;
}

export interface HardState extends HardFields {
  readonly kind: 'hard';
}

export interface MasterState extends HardFields {
  readonly kind: 'master';
  readonly flank: FlankState;
}

/** One strategy's state; `kind` is the strategy's `name`. */
export type StrategyState = { readonly kind: 'null' } | EasyState | MediumState | HardState | MasterState;

export interface AIPlayerState {
  /** The AI's own clock (its strategy's `timeMs`). */
  readonly elapsedMs: number;
  readonly fogDelayMs: number;
  readonly rngState: number;
  readonly strategy: StrategyState;
}

/** `state` narrowed to `kind`; a TypeError when it was taken from another strategy. */
export function expectKind<K extends StrategyState['kind']>(
  state: StrategyState,
  kind: K,
): Extract<StrategyState, { kind: K }> {
  if (state.kind !== kind) throw new TypeError(`Cannot restore a '${state.kind}' AI state into a '${kind}' strategy`);
  return state as Extract<StrategyState, { kind: K }>;
}

/** A time that may be -Infinity ("never"), as saved: null for -Infinity. */
export function savedTime(ms: number): number | null {
  return ms === -Infinity ? null : ms;
}

/** A saved time back in memory: null becomes -Infinity. */
export function loadedTime(ms: number | null): number {
  return ms ?? -Infinity;
}

/** Deep copies of the saved records, so a snapshot never aliases live AI state. */
export const copyTile = (t: TileCoord): TileCoord => ({ tx: t.tx, ty: t.ty });

export function copyKnown(b: KnownBuilding): KnownBuilding {
  return { id: b.id, type: b.type, ownerId: b.ownerId, position: copyTile(b.position), footprint: { ...b.footprint } };
}
