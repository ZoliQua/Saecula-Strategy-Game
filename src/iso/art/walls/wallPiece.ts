import {
  WALL_E,
  WALL_N,
  WALL_NE,
  WALL_NW,
  WALL_S,
  WALL_SE,
  WALL_SW,
  WALL_W,
} from '../../../game/wallNeighbours';

/** Straight wall runs carry a post (pier, tower stub) every this many tiles. */
export const WALL_POST_EVERY = 4;

const POST_BIT = 256;
const ARM_BITS = 0xff;

/** Each diagonal join and the two cardinals that make it redundant. */
const DIAGONALS: ReadonlyArray<readonly [number, number]> = [
  [WALL_NE, WALL_N | WALL_E],
  [WALL_SE, WALL_S | WALL_E],
  [WALL_SW, WALL_S | WALL_W],
  [WALL_NW, WALL_N | WALL_W],
];

/** Pairs of arms that form a straight run, with the tile axis counting along it. */
const STRAIGHT: ReadonlyArray<readonly [number, 'tx' | 'ty']> = [
  [WALL_E | WALL_W, 'tx'],
  [WALL_N | WALL_S, 'ty'],
  [WALL_NE | WALL_SW, 'tx'],
  [WALL_NW | WALL_SE, 'tx'],
];

/**
 * The sprite a wall segment shows, from its neighbour mask
 * (wallNeighbourMask): the arms it joins plus whether it has a post.
 * A diagonal joins only when neither cardinal beside it does, so the
 * corners of a stair-stepped line don't sprout a third arm. Corners,
 * ends, junctions and lone segments get a post; straight runs get one
 * every WALL_POST_EVERY tiles. Pure; the result is a small integer
 * (arm bits | 256 for the post) used in texture keys.
 */
export function wallPiece(mask: number, tx: number, ty: number): number {
  let arms = mask & 0x0f;
  for (const [diagonal, cardinals] of DIAGONALS) {
    if (mask & diagonal && !(mask & cardinals)) arms |= diagonal;
  }
  const straight = STRAIGHT.find(([pair]) => arms === pair);
  const post = straight ? (straight[1] === 'tx' ? tx : ty) % WALL_POST_EVERY === 0 : true;
  return arms | (post ? POST_BIT : 0);
}

/** Neighbour bits (WALL_N … WALL_NW) the piece joins. */
export function pieceArms(piece: number): number {
  return piece & ARM_BITS;
}

export function pieceHasPost(piece: number): boolean {
  return (piece & POST_BIT) !== 0;
}
