/**
 * Who fights whom (M16, CLAUDE.md §9 "Csapatok és játékmódok"): fixed teams
 * derived from the setup. Every enemy-meaning check asks this module; the
 * own-only checks (gathering, drop-off, building, boarding, walls, research,
 * population, orders) stay owner === player.
 *
 * Gaia (player 0) is nobody's ally. `areEnemies` leaves Gaia out (the rule
 * for towers, splash, breaching, conversion, AI perception); the call sites
 * that treat Gaia as a valid target (an explicit attack order, CombatSystem)
 * use `isFriendly` instead, so Gaia stays attackable there exactly as before.
 */

/** A player's team by id (the PlayerManager); an unknown id is its own team. */
export interface TeamLookup {
  teamOf(playerId: number): number;
  /** True when the match has teams (setup allies > 0); absent = no teams. */
  hasTeams?(): boolean;
}

/** No teams: every player is its own team (today's free-for-all; tests and headless defaults). */
export const NO_TEAMS: TeamLookup = { teamOf: (playerId) => playerId };

/**
 * The team of player `id` in a match with `allies` allied AIs (M16): the
 * human (1) and players 2..1+allies are team 1, every other AI team 2.
 * With no allies each player is its own team, so everyone is hostile.
 */
export function teamFor(id: number, allies: number): number {
  if (allies <= 0) return id;
  return id >= 1 && id <= 1 + allies ? 1 : 2;
}

/** Two different, non-Gaia players on the same team. */
export function areAllies(teams: TeamLookup, a: number, b: number): boolean {
  return a !== b && a !== 0 && b !== 0 && teams.teamOf(a) === teams.teamOf(b);
}

/** Two different, non-Gaia players on different teams. */
export function areEnemies(teams: TeamLookup, a: number, b: number): boolean {
  return a !== b && a !== 0 && b !== 0 && teams.teamOf(a) !== teams.teamOf(b);
}

/** The same player or an ally: never a target (Gaia is neither, so it stays a target where it was one). */
export function isFriendly(teams: TeamLookup, a: number, b: number): boolean {
  return a === b || areAllies(teams, a, b);
}
