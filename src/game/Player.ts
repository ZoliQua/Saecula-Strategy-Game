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

export function createPlayer(partial: Partial<Player> & { id: number }): Player {
  return {
    isHuman: false,
    civ: DEFAULT_CIV,
    color: PLAYER_COLORS[(partial.id - 1) % PLAYER_COLORS.length] ?? 0xffffff,
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
