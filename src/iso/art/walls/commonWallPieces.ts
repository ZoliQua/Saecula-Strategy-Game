import { WALL_E, WALL_N, WALL_NE, WALL_NW, WALL_S, WALL_SE, WALL_SW, WALL_W } from '../../../game/wallNeighbours';
import type { AgeId, CivId } from '../../../types';
import { wallPieceKey } from '../artKeys';

type PieceKeyOf = (piece: number, age: AgeId, civ: CivId) => string;

const POST = 256;
const ARMS = [WALL_N, WALL_E, WALL_S, WALL_W, WALL_NE, WALL_SE, WALL_SW, WALL_NW] as const;
const RUNS = [WALL_E | WALL_W, WALL_N | WALL_S, WALL_NE | WALL_SW, WALL_NW | WALL_SE] as const;
const CORNERS = [WALL_N | WALL_E, WALL_E | WALL_S, WALL_S | WALL_W, WALL_W | WALL_N] as const;

/**
 * Wall pieces (wallPiece values) nearly every wall line uses: straight
 * runs with and without their rhythm post, the eight ends, the four
 * square corners and a lone post. They are painted ahead of need (a
 * first paint costs 5-17 ms; a new wall line used to paint several in
 * one frame): age 1 behind the loading card, ages 2-3 in spare frame
 * time during play (scenes/game/artLoadPlan.ts). The periodic eviction
 * keeps them (commonWallPieceKeys).
 */
export const COMMON_WALL_PIECES: readonly number[] = [
  ...RUNS,
  ...RUNS.map((r) => r | POST),
  ...ARMS.map((a) => a | POST),
  ...CORNERS.map((c) => c | POST),
  POST,
];

/** Texture keys of the common wall pieces of `ages` for each of `civs`. */
export function commonWallPieceKeys(
  ages: readonly AgeId[],
  civs: readonly CivId[],
  keyOf: PieceKeyOf = wallPieceKey,
): Set<string> {
  const out = new Set<string>();
  for (const civ of civs) for (const age of ages) for (const piece of COMMON_WALL_PIECES) out.add(keyOf(piece, age, civ));
  return out;
}
