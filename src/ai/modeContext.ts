import type { EcsWorld } from '../ecs/world';
import { hillState, type HillState } from '../game/hill';
import type { PlayerManager } from '../game/PlayerManager';

/** The hill as every AI may know it: public, like the human's HUD. The units on it only through fog. */
export interface AIHill extends HillState {
  /** Teams with a player still in the match: only their clocks can win. */
  readonly standingTeams: ReadonlySet<number>;
}

/** What the AIs are told of an M19 mode; empty in every other mode. */
export interface AIModeContext {
  /** Regicide: the AI minds its king and hunts the others'. */
  readonly regicide?: boolean;
  /** King of the Hill: the hill. */
  readonly hill?: AIHill;
}

/** Built alike for the live game (SystemRunner) and the headless match. */
export function aiModeContext(world: EcsWorld, players: Pick<PlayerManager, 'all'>, regicide: boolean): AIModeContext {
  if (regicide) return { regicide };
  const hill = hillState(world);
  if (!hill) return {};
  const standingTeams = new Set<number>();
  for (const p of players.all()) if (!p.defeated) standingTeams.add(p.team);
  return { hill: { ...hill, standingTeams } };
}
