import { areEnemies, type TeamLookup } from './diplomacy';

/**
 * The treaty (M16, CLAUDE.md §9 "Fegyverszünet"): for the setup's
 * `treatyMin` game minutes no fighting happens between players of different
 * teams (with no allies: between any two players). Gaia stays a target.
 *
 * The state is derived from the setup and the game clock only, never saved:
 * a save loaded mid-treaty continues the countdown from its game time.
 */

const MS_PER_MINUTE = 60_000;

/** The setup field the treaty reads. */
export interface TreatySetup {
  readonly treatyMin: number;
}

/** True while the treaty holds; the systems ask it each tick (no sticky state on units). */
export type TreatyGate = () => boolean;

/** No treaty: tests, headless defaults and campaign missions. */
export const NO_TREATY: TreatyGate = () => false;

/** Whether the treaty still holds at `gameTimeMs`. */
export function treatyActive(setup: TreatySetup, gameTimeMs: number): boolean {
  return gameTimeMs < setup.treatyMin * MS_PER_MINUTE;
}

/** Treaty time left at `gameTimeMs` (0 once it is over, or with no treaty). */
export function treatyLeftMs(setup: TreatySetup, gameTimeMs: number): number {
  return Math.max(0, setup.treatyMin * MS_PER_MINUTE - gameTimeMs);
}

/**
 * Whether the treaty forbids `a` and `b` from fighting now: two players of
 * different teams while it holds. Never between a player and Gaia.
 */
export function truceBetween(treaty: TreatyGate, teams: TeamLookup, a: number, b: number): boolean {
  return areEnemies(teams, a, b) && treaty();
}

/**
 * The match's treaty clock: game time from `startMs` (a save's clock),
 * advanced by each step's delta. `gate` is the TreatyGate the systems share.
 */
export class TreatyClock {
  private nowMs: number;
  readonly gate: TreatyGate = () => treatyActive(this.setup, this.nowMs);

  constructor(
    private readonly setup: TreatySetup,
    startMs = 0,
  ) {
    this.nowMs = startMs;
  }

  advance(deltaMs: number): void {
    this.nowMs += deltaMs;
  }

  /** Treaty time left (0: over or none). */
  leftMs(): number {
    return treatyLeftMs(this.setup, this.nowMs);
  }
}
