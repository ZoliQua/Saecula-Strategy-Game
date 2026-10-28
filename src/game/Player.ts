import type { AgeId, CivId, Resources, TechId } from '../types';
import { DEFAULT_CIV } from '../config/civs';
import type { PersonalityId } from '../config/aiPersonality';

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
    resources: { food: 200, wood: 200, gold: 100 },
    age: 1,
    researched: new Set<TechId>(),
    defeated: false,
    gatherHandicap: 1,
    ...partial,
  };
}
