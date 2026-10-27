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
 * square corners and a lone post.
 */
export const COMMON_WALL_PIECES: readonly number[] = [
  ...RUNS,
  ...RUNS.map((r) => r | POST),
  ...ARMS.map((a) => a | POST),
  ...CORNERS.map((c) => c | POST),
  POST,
];

/**
 * Paints the common wall pieces of the requested (age, civ) styles ahead
 * of need, one per step (a first paint costs 7-17 ms; a new wall line
 * used to paint several in one frame). GameScene runs the steps behind
 * the loading card, for all three ages of each civ in play, so no game
 * frame pays for them; keys() / commonWallPieceKeys tell the periodic
 * eviction which pieces to keep.
 */
export class WallArtPrewarm {
  private readonly queue: Array<[number, AgeId, CivId]> = [];
  private readonly requested = new Set<string>();
  private readonly styles: Array<[AgeId, CivId]> = [];

  constructor(
    private readonly paint: (piece: number, age: AgeId, civ: CivId) => void,
    private readonly keyOf: PieceKeyOf = wallPieceKey,
  ) {}

  /** Queues the common pieces of a civ's age style (once each). */
  request(age: AgeId, civ: CivId): void {
    const id = `${age}/${civ}`;
    if (this.requested.has(id)) return;
    this.requested.add(id);
    this.styles.push([age, civ]);
    for (const piece of COMMON_WALL_PIECES) this.queue.push([piece, age, civ]);
  }

  /** Paints the next queued piece; false when nothing was left. */
  step(): boolean {
    const next = this.queue.shift();
    if (!next) return false;
    this.paint(next[0], next[1], next[2]);
    return true;
  }

  /** Texture keys of the common pieces of every requested style. */
  keys(): Set<string> {
    const out = new Set<string>();
    for (const [age, civ] of this.styles) for (const key of commonWallPieceKeys([age], [civ], this.keyOf)) out.add(key);
    return out;
  }

  /** Pieces still to paint. */
  get remaining(): number {
    return this.queue.length;
  }
}

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
