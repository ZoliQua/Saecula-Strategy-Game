import { PLAYER_COLORS } from '../game/Player';

const STAT = new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 1 });

/** A HUD stat value: at most one decimal, Hungarian decimal comma ("2,6", "5"). */
export function formatStat(value: number): string {
  return STAT.format(value);
}

/** A player's colour (0xRRGGBB, as createPlayer assigns it); Gaia (0) is white. */
export function playerColor(playerId: number): number {
  return playerId > 0 ? (PLAYER_COLORS[(playerId - 1) % PLAYER_COLORS.length] ?? 0xffffff) : 0xffffff;
}

/** A player's colour as a CSS hex string. */
export function playerColorCss(playerId: number): string {
  return `#${playerColor(playerId).toString(16).padStart(6, '0')}`;
}
