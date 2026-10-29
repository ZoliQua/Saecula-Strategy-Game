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

/** A 0xRRGGBB colour as a CSS hex string ("#4a8ad0"). */
export const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

/** A player's colour as a CSS hex string. */
export function playerColorCss(playerId: number): string {
  return hex(playerColor(playerId));
}

/** A whole number with thousands split by a thin space, Hungarian style (12 345); rounded first. */
export const grouped = (n: number): string => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
