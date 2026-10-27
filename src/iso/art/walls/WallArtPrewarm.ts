import { WALL_E, WALL_N, WALL_NE, WALL_NW, WALL_S, WALL_SE, WALL_SW, WALL_W } from '../../../game/wallNeighbours';
import type { AgeId } from '../../../types';
import { wallPieceKey } from './paintWall';

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
 * Paints the common wall pieces of the requested ages ahead of need, one
 * per step (a first paint costs 7-17 ms; a new wall line used to paint
 * several in one frame). GameScene runs the steps behind the loading
 * card, for all three ages, so no game frame pays for them; keys() /
 * commonWallPieceKeys tell the periodic eviction which pieces to keep.
 */
export class WallArtPrewarm {
  private readonly queue: Array<[number, AgeId]> = [];
  private readonly ages = new Set<AgeId>();

  constructor(
    private readonly paint: (piece: number, age: AgeId) => void,
    private readonly keyOf: (piece: number, age: AgeId) => string = wallPieceKey,
  ) {}

  /** Queues an age's common pieces (once per age). */
  request(age: AgeId): void {
    if (this.ages.has(age)) return;
    this.ages.add(age);
    for (const piece of COMMON_WALL_PIECES) this.queue.push([piece, age]);
  }

  /** Paints the next queued piece; false when nothing was left. */
  step(): boolean {
    const next = this.queue.shift();
    if (!next) return false;
    this.paint(next[0], next[1]);
    return true;
  }

  /** Texture keys of the common pieces of every requested age. */
  keys(): Set<string> {
    return commonWallPieceKeys([...this.ages], this.keyOf);
  }

  /** Pieces still to paint. */
  get remaining(): number {
    return this.queue.length;
  }
}

/** Texture keys of the common wall pieces of `ages`. */
export function commonWallPieceKeys(
  ages: readonly AgeId[],
  keyOf: (piece: number, age: AgeId) => string = wallPieceKey,
): Set<string> {
  const out = new Set<string>();
  for (const age of ages) for (const piece of COMMON_WALL_PIECES) out.add(keyOf(piece, age));
  return out;
}
