import type { GameSetupConfig } from './GameSetupConfig';

/**
 * The M16 mode fields of today's game (no allies, no treaty, normal
 * starting resources, 1× speed): new setups, campaign missions and old
 * saves use these. Its own module so campaign/missions.ts can read it
 * without a value cycle through GameSetupConfig (which imports the missions).
 */
export const MODE_DEFAULTS = { allies: 0, treatyMin: 0, startResources: 'normal', speed: 1 } as const satisfies Pick<
  GameSetupConfig,
  'allies' | 'treatyMin' | 'startResources' | 'speed'
>;
