import type { AgeId, CivId, Resources, TechId } from '../types';
import { DEFAULT_CIV } from '../config/civs';
import type { PersonalityId } from '../config/aiPersonality';
import { MARKET, START_RESOURCES } from '../config/balance';

export interface Player {
  id: number;
  isHuman: boolean;
  civ: CivId;
  color: number;
  resources: Resources;
  age: AgeId;
  /** Technologies already researched (each can be researched once). */
  researched: Set<TechId>;
  defeated: boolean;
  /**
   * Difficulty handicap on every gather rate (§10.3: the Hard AI gathers
   * 20% faster); 1 for the human and the other difficulties.
   */
  gatherHandicap: number;
  /**
   * Team (M16): derived from the setup's `allies` (teamFor), never saved.
   * Players on one team are allies; with no allies each player is its own team.
   */
  team: number;
  /** Market prices (M17, src/game/market.ts): gold per MARKET.lot of food and of wood; saved. */
  marketPrices: { food: number; wood: number };
  /**
   * Has a finished, standing landmark (M17): derived each tick by
   * LandmarkSystem (refreshLandmarks), never saved. Modifier landmarks
   * join the effects only while it is true (game/modifiers.ts).
   */
  landmarkActive: boolean;
  /** Fraction carried between ticks by the landmark (M17): mint gold or sauna HP not yet whole; saved. */
  landmarkCarry: number;
  /** Seeded AI personality (Medium, Hard and Mesteri AIs only; absent for the human and Easy). */
  personality?: PersonalityId;
}

export const PLAYER_COLORS: readonly number[] = [
  0x4a8ad0, // 1 — kék (human default)
  0xd04a4a, // 2 — vörös
  0x4ad068, // 3 — zöld
  0xd0a84a, // 4 — sárga
  0xa04ad0, // 5 — lila
  0x4ad0c0, // 6 — türkíz
];

/** Okabe-Ito colour-blind-safe team colours (M18). */
export const CB_PLAYER_COLORS: readonly number[] = [0xe69f00, 0x56b4e9, 0x009e73, 0xf0e442, 0x0072b2, 0xd55e00];

export type TeamPalette = 'default' | 'colorblind';
export const TEAM_PALETTES: readonly TeamPalette[] = ['default', 'colorblind'];

let activePalette: TeamPalette = 'default';

/** Picks the palette `playerColor` reads (applied at match start, so one match never mixes palettes); true when it changed. */
export function setTeamPalette(p: TeamPalette): boolean {
  const changed = p !== activePalette;
  activePalette = p;
  return changed;
}

export function getTeamPalette(): TeamPalette {
  return activePalette;
}

/** The team colour of player `id` (1-based, wrapping) under the active palette; Gaia (0) and below are white. */
export function playerColor(id: number): number {
  if (id < 1) return 0xffffff;
  const colors = activePalette === 'colorblind' ? CB_PLAYER_COLORS : PLAYER_COLORS;
  return colors[(id - 1) % colors.length] ?? 0xffffff;
}

export function createPlayer(partial: Partial<Player> & { id: number }): Player {
  return {
    isHuman: false,
    civ: DEFAULT_CIV,
    color: playerColor(partial.id),
    resources: { ...START_RESOURCES.normal },
    age: 1,
    researched: new Set<TechId>(),
    defeated: false,
    gatherHandicap: 1,
    team: partial.id,
    marketPrices: { ...MARKET.startPrice },
    landmarkActive: false,
    landmarkCarry: 0,
    ...partial,
  };
}
